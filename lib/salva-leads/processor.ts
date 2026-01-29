/**
 * Salva-Leads Processor
 *
 * Orquestra o processo diario de recuperacao de leads abandonados.
 * Integra com CV CRM para buscar candidatos, IA para classificar e gerar mensagens,
 * e Evolution API para envio via WhatsApp.
 */

import { dbQuery } from '@/lib/db';
import { getWorkspace } from '@/lib/tenant-context';
import {
  sendTextMessage as sendEvolutionMessage,
  formatPhoneNumber,
  isWhatsAppNumber,
} from '@/lib/evolution-api';
import { getLeadsCVCRM } from '@/lib/cvcrm-client';
import { leadsCache } from '@/lib/cache';
import {
  SalvaLeadsConversation,
  SalvaLeadsRun,
} from './types';
import {
  getOrCreateConversation as getOrCreateConversationDB,
  addMessage as addMessageDB,
  updateConversationStatus as updateConversationStatusDB,
} from './conversation';

// Conditional logging - only in development
const isDev = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => isDev && console.log(...args);

// ============================================================================
// TYPES - Re-export from types.ts
// ============================================================================

export type { SalvaLeadsConversation, SalvaLeadsRun } from './types';

/**
 * Candidato a lead para recuperacao
 */
export interface LeadCandidate {
  atendimentoId: string;
  leadPhone: string;
  leadName: string;
  corretorId: string;
  corretorPhone: string;
  diasInativo: number;
  ultimaInteracao: string;
  interesse: string;
}

/**
 * Resultado do processamento de um lead
 */
export interface ProcessorResult {
  lead: string;
  status: 'sent' | 'skipped' | 'error' | 'dry_run';
  reason?: string;
  message?: string;
  error?: string;
}

/**
 * Resultado da execucao do processor
 */
export interface RunResult {
  processed: number;
  sent: number;
  results: ProcessorResult[];
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * Executa recuperacao de leads para um corretor especifico
 */
export async function runLeadRecoveryForCorretor(
  workspaceId: number,
  corretorId: string,
  options: {
    dryRun?: boolean;
    maxLeads?: number;
    corretorName?: string;
    startTime?: number;
    evolutionInstance?: string;
  } = {}
): Promise<RunResult> {
  const { dryRun = false, maxLeads = 10, corretorName, startTime, evolutionInstance } = options;
  const MAX_TIME_MS = 20000; // 20 seconds max per corretor
  const MESSAGE_DELAY_MS = 3000; // 3 segundos entre mensagens (anti-spam)

  if (process.env.NODE_ENV === 'development') {
    log(`[Salva-Leads] Iniciando recuperacao para corretor ${corretorId} (tenant: ${workspaceId})`);
  }

  // 1. Buscar leads candidatos usando funcao existente do lead-recovery
  const candidates = await fetchCandidates(workspaceId, corretorId, maxLeads, corretorName);
  if (process.env.NODE_ENV === 'development') {
    log(`[Salva-Leads] Encontrados ${candidates.length} candidatos`);
  }

  const results: ProcessorResult[] = [];
  let sent = 0;

  // Usar instância do corretor (não do tenant)
  const instanceName = evolutionInstance;

  if (!instanceName) {
    if (process.env.NODE_ENV === 'development') {
      log(`[Salva-Leads] Corretor ${corretorId} sem instância Evolution configurada`);
    }
    return { processed: 0, sent: 0, results: [] };
  }

  for (const lead of candidates) {
    // Check timeout
    if (startTime && Date.now() - startTime > MAX_TIME_MS) {
      if (process.env.NODE_ENV === 'development') {
        log(`[Salva-Leads] Timeout approaching, stopping early`);
      }
      break;
    }

    try {
      // 2. Verificar se ja foi processado recentemente
      const alreadyProcessed = await wasRecentlyProcessed(workspaceId, lead.atendimentoId);
      if (alreadyProcessed) {
        results.push({
          lead: lead.atendimentoId,
          status: 'skipped',
          reason: 'ja_processado_recentemente',
        });
        continue;
      }

      // 3. Classificar potencial (reutiliza IA do lead-recovery)
      const potential = await classifyPotential(lead);

      if (potential !== 'tem_potencial') {
        results.push({
          lead: lead.atendimentoId,
          status: 'skipped',
          reason: 'sem_potencial',
        });
        continue;
      }

      // 4. Gerar mensagem personalizada
      const message = await generateRecoveryMessage(lead);

      if (!message) {
        results.push({
          lead: lead.atendimentoId,
          status: 'skipped',
          reason: 'mensagem_vazia',
        });
        continue;
      }

      if (dryRun) {
        results.push({
          lead: lead.atendimentoId,
          status: 'dry_run',
          message,
        });
        continue;
      }

      // 5. Validar se o telefone existe no WhatsApp
      if (instanceName) {
        const isValidWhatsApp = await isWhatsAppNumber(instanceName, lead.leadPhone);
        if (!isValidWhatsApp) {
          // Marcar lead como telefone inválido para não tentar novamente
          await markPhoneAsInvalid(workspaceId, lead.atendimentoId, lead.leadPhone);
          results.push({
            lead: lead.atendimentoId,
            status: 'skipped',
            reason: 'telefone_nao_whatsapp',
          });
          continue;
        }
      }

      // 6. Criar conversa no banco
      const conversation = await getOrCreateConversationDB({
        workspaceId,
        atendimentoId: lead.atendimentoId,
        leadPhone: lead.leadPhone,
        leadName: lead.leadName,
        corretorId: lead.corretorId,
        corretorPhone: lead.corretorPhone,
      });

      // 7. Enviar mensagem via WhatsApp (Evolution API)
      if (instanceName) {
        await sendWhatsAppMessage(instanceName, lead.leadPhone, message);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Salva-Leads] Tenant ${workspaceId} sem instance Evolution configurada`);
        }
        results.push({
          lead: lead.atendimentoId,
          status: 'error',
          error: 'sem_instance_whatsapp',
        });
        continue;
      }

      // 8. Atualizar status da conversa
      await updateConversationAfterSend(conversation.id, message);

      sent++;
      results.push({
        lead: lead.atendimentoId,
        status: 'sent',
        message,
      });

      // Delay entre mensagens para evitar detecção de spam
      if (sent < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY_MS));
      }
    } catch (error: any) {
      console.error(`[Salva-Leads] Erro processando lead ${lead.atendimentoId}:`, error);
      results.push({
        lead: lead.atendimentoId,
        status: 'error',
        error: error.message,
      });
    }
  }

  // 9. Registrar execucao
  await logRun(workspaceId, corretorId, candidates.length, sent, results);

  if (process.env.NODE_ENV === 'development') {
    log(`[Salva-Leads] Concluido: ${candidates.length} processados, ${sent} enviados`);
  }

  return { processed: candidates.length, sent, results };
}

// ============================================================================
// CANDIDATE FETCHING
// ============================================================================

/**
 * Busca leads do CV CRM com cache para evitar múltiplas chamadas
 */
async function getCachedLeadsFromCVCRM(workspaceId: number): Promise<any[]> {
  const cacheKey = `tenant:${workspaceId}:leads`;

  return leadsCache.getOrSet(cacheKey, async () => {
    console.log(`[Salva-Leads] Buscando leads do CV CRM para tenant ${workspaceId}...`);
    const response = await getLeadsCVCRM({ limit: 200, offset: 0 });
    const leads = (response as any).leads || (response as any).data || [];
    console.log(`[Salva-Leads] ${leads.length} leads carregados do CV CRM`);
    return leads;
  });
}

/**
 * Normaliza string para comparação (remove acentos, lowercase)
 */
function normalizeString(input?: string | null): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Verifica se nome do corretor corresponde
 */
function matchCorretor(candidateName?: string | null, userName?: string | null): boolean {
  if (!candidateName || !userName) return false;
  const a = normalizeString(candidateName);
  const b = normalizeString(userName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Calcula dias de inatividade baseado nas interações
 */
function calculateDaysInactive(interacoes?: Array<{ data_cad?: string }>, dataCriacao?: string): number {
  const now = Date.now();
  const IRREGULAR_DIAS = 7;

  if (interacoes && interacoes.length > 0) {
    const lastInteractionMs = interacoes
      .map((i: any) => (i?.data_cad ? Date.parse(i.data_cad) : 0))
      .reduce((max, cur) => (cur > max ? cur : max), 0);

    if (lastInteractionMs) {
      return Math.floor((now - lastInteractionMs) / (1000 * 60 * 60 * 24));
    }
  }

  if (dataCriacao) {
    return Math.floor((now - Date.parse(dataCriacao)) / (1000 * 60 * 60 * 24));
  }

  return IRREGULAR_DIAS + 1; // Assumir inativo se não tem data
}

/**
 * Busca candidatos para recuperacao usando CV CRM com cache
 * Uma única chamada à API serve todos os corretores
 */
async function fetchCandidates(
  workspaceId: number,
  corretorId: string,
  maxLeads: number,
  corretorName?: string
): Promise<LeadCandidate[]> {
  try {
    // Busca leads com cache (uma única chamada para todos os corretores)
    const allLeads = await getCachedLeadsFromCVCRM(workspaceId);

    const candidates: LeadCandidate[] = [];
    const seenPhones = new Set<string>();

    for (const lead of allLeads) {
      const phone = lead.telefone || lead.celular || '';
      if (!phone) continue;

      // Deduplicar por telefone
      const phoneKey = phone.replace(/\D/g, '');
      if (seenPhones.has(phoneKey)) continue;

      // Filtrar por corretor
      const leadCorretorNome = lead.corretor?.nome || '';
      if (corretorName && !matchCorretor(leadCorretorNome, corretorName)) {
        continue;
      }

      // Calcular dias de inatividade
      const interacoes = lead.interacao || [];
      const diasInativo = calculateDaysInactive(interacoes, lead.data_cad);

      // Apenas leads inativos há 7+ dias
      if (diasInativo < 7) continue;

      seenPhones.add(phoneKey);

      const empreendimento = Array.isArray(lead.empreendimento) ? lead.empreendimento[0] : null;
      const interesse = [
        empreendimento?.nome,
        empreendimento?.bairro,
        empreendimento?.cidade,
      ].filter(Boolean).join(' - ') || 'imóveis';

      candidates.push({
        atendimentoId: String(lead.idlead || lead.id || phoneKey),
        leadPhone: phone,
        leadName: lead.nome || 'Cliente',
        corretorId: corretorId,
        corretorPhone: '',
        diasInativo,
        ultimaInteracao: lead.data_cad || '',
        interesse,
      });

      if (candidates.length >= maxLeads) break;
    }

    return candidates;
  } catch (error) {
    console.error('[Salva-Leads] Erro ao buscar candidatos:', error);
    return [];
  }
}


// ============================================================================
// CLASSIFICATION & MESSAGE GENERATION
// ============================================================================

/**
 * Classifica potencial de recuperacao do lead
 * Usa IA para analisar historico e determinar se vale a pena tentar recuperar
 */
async function classifyPotential(
  lead: LeadCandidate
): Promise<'tem_potencial' | 'sem_potencial'> {
  // Criterios basicos de classificacao:
  // - Leads muito antigos (> 90 dias) tem menor potencial
  // - Leads com interesse definido tem maior potencial

  if (lead.diasInativo > 90) {
    return 'sem_potencial';
  }

  // Por padrao, considerar que tem potencial
  // A IA mais sofisticada pode ser adicionada posteriormente
  return 'tem_potencial';
}

/**
 * Gera mensagem personalizada de recuperacao
 */
async function generateRecoveryMessage(lead: LeadCandidate): Promise<string> {
  const primeiroNome = lead.leadName?.split(' ')[0] || 'Oi';
  const interesse = lead.interesse || 'imóveis';

  // Saudações variadas
  const saudacoes = ['Oi', 'Olá', 'E aí', 'Bom dia', 'Boa tarde'];
  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];

  // Perguntas de fechamento variadas
  const fechamentos = [
    'Posso te ajudar?',
    'Quer conversar sobre isso?',
    'Tem interesse?',
    'O que acha?',
    'Me conta!',
    'Vamos conversar?',
  ];
  const fechamento = fechamentos[Math.floor(Math.random() * fechamentos.length)];

  // Mensagens muito variadas para evitar detecção de spam
  const mensagens = {
    recente: [
      `${saudacao} ${primeiroNome}! Tudo bem? Vi que você estava procurando ${interesse}. ${fechamento}`,
      `${primeiroNome}, como você está? Lembrei de você sobre ${interesse}. ${fechamento}`,
      `${saudacao}! ${primeiroNome}, surgiu algo interessante em ${interesse}. ${fechamento}`,
      `${primeiroNome}, tudo certo? Ainda está na busca por ${interesse}? ${fechamento}`,
    ],
    medio: [
      `${saudacao} ${primeiroNome}! Faz um tempo que conversamos sobre ${interesse}. ${fechamento}`,
      `${primeiroNome}, como vai? Apareceram novidades em ${interesse}. ${fechamento}`,
      `${saudacao}! ${primeiroNome}, lembrei da nossa conversa sobre ${interesse}. ${fechamento}`,
      `${primeiroNome}, passando aqui! Ainda está interessado em ${interesse}? ${fechamento}`,
    ],
    antigo: [
      `${saudacao} ${primeiroNome}! Há um tempo você procurava ${interesse}. Ainda posso ajudar?`,
      `${primeiroNome}, quanto tempo! Está na busca por ${interesse}? ${fechamento}`,
      `${saudacao}! ${primeiroNome}, me lembrei que você buscava ${interesse}. ${fechamento}`,
      `${primeiroNome}, tudo bem? Queria saber se ainda tem interesse em ${interesse}.`,
    ],
  };

  let categoria: keyof typeof mensagens;
  if (lead.diasInativo <= 14) {
    categoria = 'recente';
  } else if (lead.diasInativo <= 45) {
    categoria = 'medio';
  } else {
    categoria = 'antigo';
  }

  const opcoes = mensagens[categoria];
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

/**
 * Atualiza conversa apos envio de mensagem
 * Usa funcoes de conversation.ts para manter consistencia
 */
async function updateConversationAfterSend(
  conversationId: number,
  message: string
): Promise<void> {
  // Atualizar status para 'active'
  await updateConversationStatusDB(conversationId, 'active');
  // Adicionar mensagem ao historico
  await addMessageDB(conversationId, 'assistant', message);
}

// ============================================================================
// WHATSAPP INTEGRATION
// ============================================================================

/**
 * Obtem o nome da instancia Evolution para um tenant
 */
async function getEvolutionInstanceName(workspaceId: number): Promise<string | null> {
  const tenant = await getWorkspace(workspaceId);
  if (!tenant) return null;

  const instances = tenant.evolution_instances || [];
  const activeInstance = instances.find(
    (i) => i.status === 'connected' || i.status === 'open'
  );

  return activeInstance?.instance_name || instances[0]?.instance_name || null;
}

/**
 * Envia mensagem via WhatsApp (Evolution API)
 */
async function sendWhatsAppMessage(
  instanceName: string,
  phone: string,
  message: string
): Promise<void> {
  const formattedPhone = formatPhoneNumber(phone);

  if (process.env.NODE_ENV === 'development') {
    log(`[Salva-Leads] Enviando para ${formattedPhone} via ${instanceName}`);
  }

  await sendEvolutionMessage(instanceName, {
    number: formattedPhone,
    text: message,
  });
}

// ============================================================================
// RUN LOGGING
// ============================================================================

/**
 * Verifica se lead foi processado recentemente (ultimas 24h) ou tem telefone inválido
 */
async function wasRecentlyProcessed(
  workspaceId: number,
  atendimentoId: string
): Promise<boolean> {
  const { rows } = await dbQuery(
    `SELECT 1 FROM salva_leads_conversations
     WHERE workspace_id = $1
       AND atendimento_id = $2
       AND (
         (status = 'active' AND updated_at >= NOW() - INTERVAL '24 hours')
         OR status = 'invalid_phone'
       )
     LIMIT 1`,
    [workspaceId, atendimentoId]
  );

  return rows.length > 0;
}

/**
 * Marca telefone como inválido (não existe no WhatsApp)
 * Cria uma conversa com status 'invalid_phone' para não tentar novamente
 */
async function markPhoneAsInvalid(
  workspaceId: number,
  atendimentoId: string,
  phone: string
): Promise<void> {
  try {
    await dbQuery(
      `INSERT INTO salva_leads_conversations
         (workspace_id, atendimento_id, lead_phone, status, classification, context)
       VALUES ($1, $2, $3, 'invalid_phone', 'telefone_invalido', '{"reason": "not_on_whatsapp"}'::jsonb)
       ON CONFLICT (workspace_id, atendimento_id)
       DO UPDATE SET
         status = 'invalid_phone',
         classification = 'telefone_invalido',
         context = '{"reason": "not_on_whatsapp"}'::jsonb,
         updated_at = NOW()`,
      [workspaceId, atendimentoId, phone]
    );
  } catch (error) {
    console.error('[Salva-Leads] Erro ao marcar telefone inválido:', error);
  }
}

/**
 * Registra execucao do Salva-Leads
 */
async function logRun(
  workspaceId: number,
  corretorId: string,
  processed: number,
  sent: number,
  results: ProcessorResult[]
): Promise<void> {
  await dbQuery(
    `INSERT INTO salva_leads_runs
       (workspace_id, corretor_id, scheduled_for, status, leads_processed, leads_sent, results)
     VALUES ($1, $2, NOW(), 'completed', $3, $4, $5)`,
    [workspaceId, corretorId, processed, sent, JSON.stringify(results)]
  );
}

// ============================================================================
// TENANT & CORRETOR QUERIES
// ============================================================================

/**
 * Busca tenants ativos com instancia Evolution conectada
 */
export async function getActiveTenantsWithEvolution(): Promise<
  Array<{ id: number; name: string }>
> {
  const { rows } = await dbQuery<{ id: number; name: string }>(
    `SELECT t.id, t.name
     FROM tenants t
     WHERE t.status = 'active'
       AND t.evolution_instances IS NOT NULL
       AND jsonb_array_length(t.evolution_instances) > 0`
  );

  // Filtrar apenas os que tem instancia conectada
  const tenantsWithConnected: Array<{ id: number; name: string }> = [];

  for (const tenant of rows) {
    const fullTenant = await getWorkspace(tenant.id);
    if (!fullTenant) continue;

    const hasConnected = (fullTenant.evolution_instances || []).some(
      (i) => i.status === 'connected' || i.status === 'open'
    );

    if (hasConnected) {
      tenantsWithConnected.push({ id: tenant.id, name: tenant.name });
    }
  }

  return tenantsWithConnected;
}

/**
 * Busca corretores ativos COM instância Evolution conectada
 * Só retorna corretores que podem enviar mensagens
 */
export async function getCorretoresComWhatsAppAtivo(
  _workspaceId: number
): Promise<Array<{ id: string; phone: string; name?: string; evolutionInstance?: string }>> {
  // Buscar apenas corretores com Evolution conectada
  const { rows } = await dbQuery<{
    id: string;
    nome: string;
    telefone: string;
    evolution_instance_name: string | null;
  }>(
    `SELECT id, nome, telefone, evolution_instance_name
     FROM users
     WHERE role = 'corretor'
       AND is_active = true
       AND telefone IS NOT NULL
       AND telefone != ''
       AND onboarding_status = 'completed'
       AND evolution_instance_name IS NOT NULL
       AND evolution_connected = true
     ORDER BY nome ASC`,
    []
  );

  return rows.map((r) => ({
    id: r.id,
    phone: r.telefone,
    name: r.nome,
    evolutionInstance: r.evolution_instance_name || undefined,
  }));
}

/**
 * Executa Salva-Leads para todos os corretores de um tenant
 */
export async function runLeadRecoveryForTenant(
  workspaceId: number,
  options: { dryRun?: boolean; maxLeadsPerCorretor?: number; startTime?: number } = {}
): Promise<{ totalProcessed: number; totalSent: number; corretoresResults: any[] }> {
  const { dryRun = false, maxLeadsPerCorretor = 5, startTime = Date.now() } = options;

  if (process.env.NODE_ENV === 'development') {
    log(`[Salva-Leads] Iniciando execucao para tenant ${workspaceId}`);
  }

  const corretores = await getCorretoresComWhatsAppAtivo(workspaceId);
  if (process.env.NODE_ENV === 'development') {
    log(`[Salva-Leads] Encontrados ${corretores.length} corretores ativos`);
  }

  let totalProcessed = 0;
  let totalSent = 0;
  const corretoresResults: any[] = [];

  for (const corretor of corretores) {
    const result = await runLeadRecoveryForCorretor(workspaceId, corretor.id, {
      dryRun,
      maxLeads: maxLeadsPerCorretor,
      corretorName: corretor.name,
      startTime,
      evolutionInstance: corretor.evolutionInstance,
    });

    totalProcessed += result.processed;
    totalSent += result.sent;
    corretoresResults.push({
      corretorId: corretor.id,
      corretorName: corretor.name,
      ...result,
    });
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[Salva-Leads] Tenant ${workspaceId} concluido: ${totalProcessed} processados, ${totalSent} enviados`
    );
  }

  return { totalProcessed, totalSent, corretoresResults };
}

/**
 * Executa Salva-Leads para todos os tenants ativos
 */
export async function runDailySalvaLeads(
  options: { dryRun?: boolean } = {}
): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] Iniciando execucao diaria');
  }

  const tenants = await getActiveTenantsWithEvolution();
  if (process.env.NODE_ENV === 'development') {
    log(`[Salva-Leads] ${tenants.length} tenants com Evolution ativa`);
  }

  for (const tenant of tenants) {
    try {
      await runLeadRecoveryForTenant(tenant.id, {
        dryRun: options.dryRun,
        maxLeadsPerCorretor: 5,
      });
    } catch (error) {
      console.error(`[Salva-Leads] Erro no tenant ${tenant.id}:`, error);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] Execucao diaria concluida');
  }
}
