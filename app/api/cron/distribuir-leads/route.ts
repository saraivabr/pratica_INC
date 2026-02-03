/**
 * Cron: Distribuição Automática de Leads
 *
 * GET/POST /api/cron/distribuir-leads
 *
 * Processa leads sem corretor atribuído e distribui para corretores no plantão.
 * Deve ser executado a cada 5 minutos.
 *
 * Regras:
 * - Busca plantões ativos em todos os workspaces
 * - Para cada plantão, busca leads disponíveis do CV CRM
 * - Distribui para o próximo corretor da fila (respeitando limite de 5 leads ativos)
 * - Envia notificação WhatsApp para o corretor
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendTextMessage, formatPhoneNumber, isInstanceConnected } from '@/lib/evolution-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minuto max

// Configurações
const MAX_LEADS_POR_EXECUCAO = 10; // Máximo de leads distribuídos por execução
const MAX_LEADS_ATIVOS = 5; // Máximo de leads ativos por corretor

interface PlantaoAtivo {
  plantao_id: string;
  workspace_id: number;
  local_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  instance_name: string | null;
}

interface LeadParaDistribuir {
  id: number;
  cvcrm_id: number;
  nome: string;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  workspace_id: number;
}

interface DistribuicaoResult {
  atribuicao_id: string | null;
  corretor_user_id: string | null;
  corretor_nome: string | null;
  corretor_telefone: string | null;
  sucesso: boolean;
  mensagem: string;
}

/**
 * Valida autenticação do cron
 */
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // SECURITY: Sempre exigir CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron Auth] CRON_SECRET não configurado. Rejeitando request.');
    return false;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Busca plantões ativos com corretores disponíveis
 */
async function buscarPlantoesAtivos(): Promise<PlantaoAtivo[]> {
  const result = await pool.query<PlantaoAtivo>(`
    SELECT DISTINCT
      pl.id AS plantao_id,
      pl.workspace_id,
      l.nome AS local_nome,
      pl.data::TEXT,
      pl.hora_inicio::TEXT,
      pl.hora_fim::TEXT,
      (
        SELECT u.evolution_instance_name
        FROM users u
        JOIN recepcao_presencas rp ON rp.user_id = u.id
        WHERE rp.plantao_id = pl.id
          AND rp.status = 'presente'
          AND u.evolution_connected = true
          AND u.evolution_instance_name IS NOT NULL
        LIMIT 1
      ) AS instance_name
    FROM recepcao_plantoes pl
    JOIN recepcao_locais l ON l.id = pl.local_id
    WHERE pl.status = 'ativo'
      AND pl.data = CURRENT_DATE
      AND CURRENT_TIME BETWEEN pl.hora_inicio AND pl.hora_fim
      AND EXISTS (
        SELECT 1 FROM recepcao_presencas rp
        WHERE rp.plantao_id = pl.id
          AND rp.status = 'presente'
          AND rp.em_atendimento = false
          AND rp.pausado = false
          AND rp.feedback_pendente = false
          AND rp.leads_ativos < $1
      )
  `, [MAX_LEADS_ATIVOS]);

  return result.rows;
}

/**
 * Busca leads disponíveis para distribuição em um workspace
 */
async function buscarLeadsDisponiveis(workspaceId: number, limite: number): Promise<LeadParaDistribuir[]> {
  const result = await pool.query<LeadParaDistribuir>(`
    SELECT
      l.id,
      l.cvcrm_id,
      l.nome,
      l.telefone,
      l.celular,
      l.email,
      l.workspace_id
    FROM cvcrm_leads l
    WHERE l.workspace_id = $1
      AND l.corretor_id IS NULL
      AND l.situacao_nome NOT IN ('Fechado', 'Perdido', 'Descartado', 'Inativo')
      -- Evitar leads já distribuídos recentemente
      AND NOT EXISTS (
        SELECT 1 FROM recepcao_atribuicoes ra
        WHERE ra.cvcrm_lead_id = l.cvcrm_id
          AND ra.atribuido_at > NOW() - INTERVAL '24 hours'
      )
    ORDER BY l.created_at ASC
    LIMIT $2
  `, [workspaceId, limite]);

  return result.rows;
}

/**
 * Envia notificação WhatsApp para o corretor
 */
async function enviarNotificacaoWhatsApp(
  instanceName: string,
  corretorTelefone: string,
  corretorNome: string,
  lead: LeadParaDistribuir
): Promise<boolean> {
  try {
    // Verificar se instância está conectada
    const connected = await isInstanceConnected(instanceName);
    if (!connected) {
      console.log(`[Distribuir Leads] Instância ${instanceName} não conectada`);
      return false;
    }

    const leadTelefone = lead.celular || lead.telefone || 'Não informado';

    const mensagem = `🔔 *Novo Lead Atribuído!*

👤 Nome: ${lead.nome}
📱 Telefone: ${leadTelefone}
📍 Origem: Sistema (distribuição automática)

Acesse o sistema para iniciar o atendimento.
⏰ Prazo para feedback: 24 horas`;

    await sendTextMessage(instanceName, {
      number: formatPhoneNumber(corretorTelefone),
      text: mensagem,
    });

    console.log(`[Distribuir Leads] Notificação enviada para ${corretorNome}`);
    return true;
  } catch (error) {
    console.error(`[Distribuir Leads] Erro ao enviar notificação:`, error);
    return false;
  }
}

/**
 * GET /api/cron/distribuir-leads
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Validar autenticação
  if (!validateCronAuth(request)) {
    console.error('[Distribuir Leads] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar plantões ativos
    const plantoes = await buscarPlantoesAtivos();

    if (plantoes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum plantão ativo com corretores disponíveis',
        duration: Date.now() - startTime,
        distribuicoes: 0,
      });
    }

    console.log(`[Distribuir Leads] ${plantoes.length} plantão(ões) ativo(s) encontrado(s)`);

    const resultados: {
      plantao_id: string;
      local_nome: string;
      distribuicoes: number;
      erros: number;
    }[] = [];

    let totalDistribuicoes = 0;
    let totalErros = 0;

    // Processar cada plantão
    for (const plantao of plantoes) {
      let distribuicoesPlantao = 0;
      let errosPlantao = 0;

      // Calcular quantos leads ainda podemos distribuir
      const leadsRestantes = MAX_LEADS_POR_EXECUCAO - totalDistribuicoes;
      if (leadsRestantes <= 0) break;

      // Buscar leads disponíveis para este workspace
      const leads = await buscarLeadsDisponiveis(plantao.workspace_id, leadsRestantes);

      if (leads.length === 0) {
        console.log(`[Distribuir Leads] Nenhum lead disponível para workspace ${plantao.workspace_id}`);
        continue;
      }

      console.log(`[Distribuir Leads] ${leads.length} lead(s) para distribuir no plantão ${plantao.plantao_id}`);

      // Distribuir cada lead
      for (const lead of leads) {
        try {
          // Chamar função de distribuição automática
          const result = await pool.query<DistribuicaoResult>(
            `SELECT * FROM distribuir_lead_auto($1, $2, $3, $4, $5, $6, $7)`,
            [
              plantao.workspace_id,
              plantao.plantao_id,
              lead.cvcrm_id,
              lead.nome,
              lead.celular || lead.telefone,
              lead.email,
              MAX_LEADS_ATIVOS,
            ]
          );

          const distribuicao = result.rows[0];

          if (distribuicao.sucesso && distribuicao.corretor_user_id) {
            distribuicoesPlantao++;
            totalDistribuicoes++;

            console.log(
              `[Distribuir Leads] ✓ Lead "${lead.nome}" → ${distribuicao.corretor_nome}`
            );

            // Registrar no log
            await pool.query(
              `INSERT INTO recepcao_distribuicao_log
               (workspace_id, plantao_id, atribuicao_id, cvcrm_lead_id, corretor_user_id, sucesso, mensagem)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                plantao.workspace_id,
                plantao.plantao_id,
                distribuicao.atribuicao_id,
                lead.cvcrm_id,
                distribuicao.corretor_user_id,
                true,
                distribuicao.mensagem,
              ]
            );

            // Tentar enviar notificação WhatsApp
            if (plantao.instance_name && distribuicao.corretor_telefone) {
              const notificacaoEnviada = await enviarNotificacaoWhatsApp(
                plantao.instance_name,
                distribuicao.corretor_telefone,
                distribuicao.corretor_nome || 'Corretor',
                lead
              );

              // Atualizar log com status da notificação
              await pool.query(
                `UPDATE recepcao_distribuicao_log
                 SET notificacao_enviada = $1, notificacao_tipo = $2
                 WHERE atribuicao_id = $3`,
                [notificacaoEnviada, notificacaoEnviada ? 'whatsapp' : null, distribuicao.atribuicao_id]
              );
            }
          } else {
            // Sem corretor disponível ou erro
            console.log(`[Distribuir Leads] ✗ ${distribuicao.mensagem}`);

            // Registrar falha no log
            await pool.query(
              `INSERT INTO recepcao_distribuicao_log
               (workspace_id, plantao_id, cvcrm_lead_id, sucesso, mensagem)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                plantao.workspace_id,
                plantao.plantao_id,
                lead.cvcrm_id,
                false,
                distribuicao.mensagem,
              ]
            );

            // Se não há corretor disponível, parar de tentar neste plantão
            if (distribuicao.mensagem.includes('Nenhum corretor disponível')) {
              break;
            }

            errosPlantao++;
            totalErros++;
          }
        } catch (error: any) {
          console.error(`[Distribuir Leads] Erro ao distribuir lead ${lead.id}:`, error.message);
          errosPlantao++;
          totalErros++;
        }
      }

      resultados.push({
        plantao_id: plantao.plantao_id,
        local_nome: plantao.local_nome,
        distribuicoes: distribuicoesPlantao,
        erros: errosPlantao,
      });
    }

    return NextResponse.json({
      success: true,
      duration: Date.now() - startTime,
      plantoes_processados: plantoes.length,
      total_distribuicoes: totalDistribuicoes,
      total_erros: totalErros,
      resultados,
    });

  } catch (error: any) {
    console.error('[Distribuir Leads] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Suporte a POST para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}
