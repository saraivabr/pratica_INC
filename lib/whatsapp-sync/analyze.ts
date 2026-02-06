/**
 * @fileoverview Servico de analise e cruzamento de chats WhatsApp com leads
 * @module lib/whatsapp-sync/analyze
 * @description Cruza os chats sincronizados com os leads do CV CRM
 * para identificar oportunidades de recuperacao.
 */

import pool from '@/lib/db';
import {
  WhatsAppSyncedChat,
  RecoveryOpportunity,
  SyncAnalysisResult,
  RecoveryPotential,
} from './types';

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Normaliza um numero de telefone para comparacao
 * Remove caracteres especiais e mantem apenas digitos
 * @param phone - Numero de telefone em qualquer formato
 * @returns Numero normalizado (apenas digitos)
 */
function normalizePhoneForComparison(phone: string): string {
  if (!phone) return '';
  // Remove tudo que nao for digito
  return phone.replace(/\D/g, '');
}

/**
 * Extrai os ultimos N digitos de um telefone para matching flexivel
 * @param phone - Numero de telefone normalizado
 * @param digits - Quantidade de digitos finais (default: 9)
 * @returns Ultimos N digitos do telefone
 */
function getLastDigits(phone: string, digits: number = 9): string {
  const normalized = normalizePhoneForComparison(phone);
  if (normalized.length <= digits) return normalized;
  return normalized.slice(-digits);
}

/**
 * Calcula dias desde uma data ate hoje
 * @param date - Data de referencia
 * @returns Numero de dias desde a data
 */
function daysSince(date: Date | string | null): number {
  if (!date) return Infinity;
  const then = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Analisa todos os chats sincronizados de um tenant
 * Cruza com cvcrm_leads pelo telefone
 * Identifica oportunidades de recuperacao
 * @param workspaceId - ID do tenant para analise
 * @returns Resultado consolidado da analise
 */
export async function analyzeChats(workspaceId: number): Promise<SyncAnalysisResult> {
  console.log(`[WhatsApp Analyze] Iniciando analise para tenant ${workspaceId}`);

  // Buscar todos os chats sincronizados do tenant (apenas individuais, nao grupos)
  const chatsResult = await pool.query<WhatsAppSyncedChat>(
    `SELECT * FROM whatsapp_synced_chats
     WHERE workspace_id = $1
       AND is_group = FALSE
     ORDER BY last_message_at DESC NULLS LAST`,
    [workspaceId]
  );

  const chats = chatsResult.rows;
  console.log(`[WhatsApp Analyze] Encontrados ${chats.length} chats individuais`);

  const opportunities: RecoveryOpportunity[] = [];
  let matchedToLeads = 0;
  let noMatch = 0;

  // Analisar cada chat
  for (const chat of chats) {
    try {
      // Tentar encontrar lead correspondente
      const lead = await matchChatToLead(workspaceId, chat.phone_number);

      if (lead) {
        matchedToLeads++;

        // Calcular dias sem resposta
        const lastMessageDate = chat.last_message_at
          ? new Date(chat.last_message_at)
          : null;
        const daysSinceLastMessage = daysSince(lastMessageDate);

        // Calcular potencial de recuperacao
        const recoveryPotential = calculateRecoveryPotential(
          daysSinceLastMessage,
          chat.last_message_from_me,
          lead.situacao
        );

        // Se ha potencial de recuperacao, criar oportunidade
        if (recoveryPotential !== 'none') {
          const suggestedMessage = await generateSuggestedMessage(
            lead.nome,
            daysSinceLastMessage,
            lead.empreendimento || null
          );

          // Atualizar chat com dados de analise
          await updateChatAnalysis(chat.id, {
            matched_lead_id: lead.id_lead,
            matched_lead_name: lead.nome,
            days_without_response: daysSinceLastMessage,
            recovery_potential: recoveryPotential,
            suggested_message: suggestedMessage,
          });

          // Mapear potencial para prioridade
          const priorityMap: Record<RecoveryPotential, 1 | 2 | 3> = {
            alto: 1,
            medio: 2,
            baixo: 3,
            none: 3,
          };

          opportunities.push({
            chat: {
              ...chat,
              matched_lead_id: lead.id_lead,
              matched_lead_name: lead.nome,
              days_without_response: daysSinceLastMessage,
              recovery_potential: recoveryPotential,
              suggested_message: suggestedMessage,
            },
            lead: {
              id_lead: lead.id_lead,
              nome: lead.nome,
              telefone: lead.telefone,
              situacao: lead.situacao,
              empreendimento: lead.empreendimento,
            },
            reason: buildRecoveryReason(
              daysSinceLastMessage,
              chat.last_message_from_me,
              lead.situacao
            ),
            priority: priorityMap[recoveryPotential],
          });
        } else {
          // Atualizar chat mesmo sem potencial de recuperacao
          await updateChatAnalysis(chat.id, {
            matched_lead_id: lead.id_lead,
            matched_lead_name: lead.nome,
            days_without_response: daysSinceLastMessage,
            recovery_potential: 'none',
            suggested_message: null,
          });
        }
      } else {
        noMatch++;
        // Atualizar chat sem lead correspondente
        await updateChatAnalysis(chat.id, {
          matched_lead_id: null,
          matched_lead_name: null,
          days_without_response: null,
          recovery_potential: 'none',
          suggested_message: null,
        });
      }
    } catch (error) {
      console.error(
        `[WhatsApp Analyze] Erro ao analisar chat ${chat.id}:`,
        error
      );
    }
  }

  // Ordenar oportunidades por prioridade
  opportunities.sort((a, b) => a.priority - b.priority);

  console.log(`[WhatsApp Analyze] Analise concluida:`);
  console.log(`  - Total de chats: ${chats.length}`);
  console.log(`  - Matched to leads: ${matchedToLeads}`);
  console.log(`  - Sem match: ${noMatch}`);
  console.log(`  - Oportunidades: ${opportunities.length}`);

  return {
    total_chats: chats.length,
    total_contacts: 0, // Nao usado nesta analise
    leads_matched: matchedToLeads,
    opportunities,
  };
}

/**
 * Cruza um chat com a base de leads
 * Retorna o lead correspondente se encontrado
 * @param workspaceId - ID do tenant
 * @param phoneNumber - Numero de telefone do chat
 * @returns Lead correspondente ou null
 */
export async function matchChatToLead(
  workspaceId: number,
  phoneNumber: string
): Promise<{
  id_lead: string;
  nome: string;
  telefone: string;
  situacao: string;
  empreendimento?: string;
  ultima_interacao?: string;
} | null> {
  if (!phoneNumber) return null;

  const normalizedPhone = normalizePhoneForComparison(phoneNumber);
  if (!normalizedPhone || normalizedPhone.length < 8) return null;

  // Extrair diferentes variantes do telefone para matching
  const lastNineDigits = getLastDigits(normalizedPhone, 9);
  const lastEightDigits = getLastDigits(normalizedPhone, 8);

  // Buscar leads que contenham o telefone
  // Usamos LIKE com os ultimos digitos para flexibilidade
  const result = await pool.query<{
    id_lead: number;
    nome: string;
    telefone: string;
    situacao_nome: any;
    empreendimento: any;
  }>(
    `SELECT
       id_lead,
       nome,
       telefone,
       situacao_nome,
       empreendimento
     FROM cvcrm_leads
     WHERE workspace_id = $1
       AND telefone IS NOT NULL
       AND (
         REGEXP_REPLACE(telefone, '[^0-9]', '', 'g') LIKE '%' || $2
         OR REGEXP_REPLACE(telefone, '[^0-9]', '', 'g') LIKE '%' || $3
       )
     ORDER BY data_cad DESC NULLS LAST
     LIMIT 1`,
    [workspaceId, lastNineDigits, lastEightDigits]
  );

  if (result.rows.length === 0) return null;

  const lead = result.rows[0];

  // Situacao nome is now a plain text column
  const situacaoNome = lead.situacao_nome || 'Desconhecido';

  // Extrair nome do empreendimento do JSONB array
  let empreendimentoNome: string | undefined;
  if (lead.empreendimento) {
    let empArray: any[];
    if (typeof lead.empreendimento === 'string') {
      try {
        empArray = JSON.parse(lead.empreendimento);
      } catch {
        empArray = [];
      }
    } else {
      empArray = lead.empreendimento;
    }
    if (Array.isArray(empArray) && empArray.length > 0) {
      empreendimentoNome = empArray[0]?.nome;
    }
  }

  // Buscar ultima interacao
  const interacaoResult = await pool.query<{ data_cad: string }>(
    `SELECT data_cad
     FROM cvcrm_leads_interacoes
     WHERE workspace_id = $1 AND id_lead = $2
     ORDER BY data_cad DESC
     LIMIT 1`,
    [workspaceId, lead.id_lead]
  );

  const ultimaInteracao = interacaoResult.rows[0]?.data_cad;

  return {
    id_lead: String(lead.id_lead),
    nome: lead.nome || 'Lead sem nome',
    telefone: lead.telefone || phoneNumber,
    situacao: situacaoNome,
    empreendimento: empreendimentoNome,
    ultima_interacao: ultimaInteracao,
  };
}

/**
 * Calcula o potencial de recuperacao baseado em:
 * - Dias sem resposta
 * - Situacao do lead
 * - Ultima mensagem foi nossa (sem resposta do cliente)
 *
 * Regras:
 * - alto: Lead ativo, sem resposta ha 3-14 dias, ultima msg foi nossa
 * - medio: Lead ativo, sem resposta ha 15-30 dias
 * - baixo: Lead irregular/perdido, ou sem resposta ha 30+ dias
 * - none: Nao e lead, ou conversa recente
 *
 * @param daysSinceLastMessage - Dias desde a ultima mensagem
 * @param lastMessageFromMe - Se a ultima mensagem foi enviada por nos
 * @param leadSituacao - Situacao atual do lead no CRM
 * @returns Potencial de recuperacao
 */
export function calculateRecoveryPotential(
  daysSinceLastMessage: number,
  lastMessageFromMe: boolean,
  leadSituacao: string | null
): RecoveryPotential {
  // Se nao temos dados suficientes
  if (daysSinceLastMessage === Infinity || daysSinceLastMessage < 0) {
    return 'none';
  }

  // Normalizar situacao para comparacao
  const situacaoLower = (leadSituacao || '').toLowerCase();

  // Identificar se lead esta em situacao "ativa"
  const situacoesAtivas = ['ativo', 'novo', 'quente', 'em atendimento', 'andamento'];
  const situacoesInativas = ['perdido', 'irregular', 'cancelado', 'encerrado', 'descartado'];

  const isAtivo = situacoesAtivas.some((s) => situacaoLower.includes(s));
  const isInativo = situacoesInativas.some((s) => situacaoLower.includes(s));

  // Conversa muito recente - sem necessidade de recuperacao
  if (daysSinceLastMessage < 3) {
    return 'none';
  }

  // ALTO: Lead ativo, sem resposta ha 3-14 dias, ultima msg foi nossa
  if (isAtivo && daysSinceLastMessage >= 3 && daysSinceLastMessage <= 14 && lastMessageFromMe) {
    return 'alto';
  }

  // MEDIO: Lead ativo, sem resposta ha 15-30 dias
  if (isAtivo && daysSinceLastMessage > 14 && daysSinceLastMessage <= 30) {
    return 'medio';
  }

  // Se lead esta ativo mas passou de 30 dias, ainda tem algum potencial
  if (isAtivo && daysSinceLastMessage > 30) {
    return 'baixo';
  }

  // BAIXO: Lead irregular/perdido
  if (isInativo && daysSinceLastMessage >= 3 && daysSinceLastMessage <= 30) {
    return 'baixo';
  }

  // Lead inativo ha mais de 30 dias - baixo potencial
  if (isInativo && daysSinceLastMessage > 30) {
    return 'baixo';
  }

  // Casos nao cobertos - verificar se ha potencial pelo tempo
  if (daysSinceLastMessage >= 3 && daysSinceLastMessage <= 14 && lastMessageFromMe) {
    return 'medio';
  }

  if (daysSinceLastMessage > 14 && daysSinceLastMessage <= 30) {
    return 'baixo';
  }

  // Default: sem potencial
  return 'none';
}

/**
 * Gera mensagem sugerida para recuperacao
 * Baseada no contexto do lead e tempo sem contato
 * @param leadName - Nome do lead
 * @param daysSinceContact - Dias desde o ultimo contato
 * @param empreendimento - Nome do empreendimento de interesse (opcional)
 * @returns Mensagem sugerida
 */
export async function generateSuggestedMessage(
  leadName: string,
  daysSinceContact: number,
  empreendimento: string | null
): Promise<string> {
  const firstName = (leadName || 'Cliente').split(' ')[0];

  // Mensagem baseada no tempo sem contato
  if (daysSinceContact <= 7) {
    if (empreendimento) {
      return `Ola ${firstName}, tudo bem? Vi que voce demonstrou interesse no ${empreendimento}. Posso te ajudar com mais informacoes?`;
    }
    return `Ola ${firstName}, tudo bem? Estou passando para ver se posso te ajudar com alguma duvida sobre os imoveis.`;
  }

  if (daysSinceContact <= 14) {
    if (empreendimento) {
      return `${firstName}, como vai? Lembrei de voce porque temos novidades sobre o ${empreendimento}. Gostaria de saber mais?`;
    }
    return `${firstName}, como vai? Faz um tempo que conversamos. Ainda esta buscando um imovel? Posso te apresentar algumas opcoes interessantes.`;
  }

  if (daysSinceContact <= 30) {
    if (empreendimento) {
      return `Ola ${firstName}! Temos condicoes especiais no ${empreendimento} este mes. Posso compartilhar com voce?`;
    }
    return `Ola ${firstName}! Apareceram novas oportunidades que podem te interessar. Quando podemos conversar?`;
  }

  // Mais de 30 dias
  if (empreendimento) {
    return `${firstName}, quanto tempo! Vi que voce tinha interesse no ${empreendimento}. O mercado mudou bastante. Que tal uma atualizacao?`;
  }
  return `${firstName}, quanto tempo! Espero que esteja bem. Se ainda tiver interesse em imoveis, estou a disposicao para ajudar.`;
}

/**
 * Atualiza os campos de analise em whatsapp_synced_chats
 * @param chatId - ID do chat a ser atualizado
 * @param analysis - Dados da analise
 */
export async function updateChatAnalysis(
  chatId: number,
  analysis: {
    matched_lead_id: string | null;
    matched_lead_name: string | null;
    days_without_response: number | null;
    recovery_potential: RecoveryPotential | null;
    suggested_message: string | null;
  }
): Promise<void> {
  await pool.query(
    `UPDATE whatsapp_synced_chats
     SET
       matched_lead_id = $2,
       matched_lead_name = $3,
       days_without_response = $4,
       recovery_potential = $5,
       suggested_message = $6,
       analyzed_at = NOW(),
       updated_at = NOW()
     WHERE id = $1`,
    [
      chatId,
      analysis.matched_lead_id,
      analysis.matched_lead_name,
      analysis.days_without_response,
      analysis.recovery_potential,
      analysis.suggested_message,
    ]
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Constroi a razao/motivo da oportunidade de recuperacao
 * @param daysSinceLastMessage - Dias desde a ultima mensagem
 * @param lastMessageFromMe - Se a ultima mensagem foi nossa
 * @param situacao - Situacao do lead
 * @returns Texto explicativo da oportunidade
 */
function buildRecoveryReason(
  daysSinceLastMessage: number,
  lastMessageFromMe: boolean,
  situacao: string
): string {
  const parts: string[] = [];

  if (lastMessageFromMe) {
    parts.push(`Lead nao respondeu ha ${daysSinceLastMessage} dias`);
  } else {
    parts.push(`Sem interacao ha ${daysSinceLastMessage} dias`);
  }

  if (situacao) {
    parts.push(`Situacao: ${situacao}`);
  }

  return parts.join('. ');
}

/**
 * Busca oportunidades de recuperacao por potencial
 * @param workspaceId - ID do tenant
 * @param potential - Filtrar por potencial especifico (opcional)
 * @param limit - Limite de resultados (default: 50)
 * @returns Lista de oportunidades
 */
export async function getRecoveryOpportunities(
  workspaceId: number,
  potential?: RecoveryPotential,
  limit: number = 50
): Promise<WhatsAppSyncedChat[]> {
  let query = `
    SELECT * FROM whatsapp_synced_chats
    WHERE workspace_id = $1
      AND recovery_potential IS NOT NULL
      AND recovery_potential != 'none'
      AND matched_lead_id IS NOT NULL
  `;

  const params: any[] = [workspaceId];

  if (potential) {
    query += ` AND recovery_potential = $${params.length + 1}`;
    params.push(potential);
  }

  query += `
    ORDER BY
      CASE recovery_potential
        WHEN 'alto' THEN 1
        WHEN 'medio' THEN 2
        WHEN 'baixo' THEN 3
        ELSE 4
      END,
      days_without_response ASC NULLS LAST
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  const result = await pool.query<WhatsAppSyncedChat>(query, params);
  return result.rows;
}

/**
 * Obtem estatisticas de analise para um tenant
 * @param workspaceId - ID do tenant
 * @returns Estatisticas consolidadas
 */
export async function getAnalysisStats(workspaceId: number): Promise<{
  totalChats: number;
  analyzedChats: number;
  matchedLeads: number;
  opportunities: {
    alto: number;
    medio: number;
    baixo: number;
  };
}> {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total_chats,
       COUNT(analyzed_at) as analyzed_chats,
       COUNT(matched_lead_id) as matched_leads,
       COUNT(*) FILTER (WHERE recovery_potential = 'alto') as opp_alto,
       COUNT(*) FILTER (WHERE recovery_potential = 'medio') as opp_medio,
       COUNT(*) FILTER (WHERE recovery_potential = 'baixo') as opp_baixo
     FROM whatsapp_synced_chats
     WHERE workspace_id = $1 AND is_group = FALSE`,
    [workspaceId]
  );

  const row = result.rows[0];

  return {
    totalChats: parseInt(row.total_chats) || 0,
    analyzedChats: parseInt(row.analyzed_chats) || 0,
    matchedLeads: parseInt(row.matched_leads) || 0,
    opportunities: {
      alto: parseInt(row.opp_alto) || 0,
      medio: parseInt(row.opp_medio) || 0,
      baixo: parseInt(row.opp_baixo) || 0,
    },
  };
}
