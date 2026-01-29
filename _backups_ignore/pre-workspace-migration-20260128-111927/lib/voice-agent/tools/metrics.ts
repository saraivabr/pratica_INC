/**
 * Voice Agent Metrics Tools
 *
 * Tools for querying CRM metrics, rankings, and analytics via voice commands
 */

import { dbQuery } from '../db'
import { VoiceAgentToolDefinition } from '../types'

// ============================================================================
// Helper Functions
// ============================================================================

function getPeriodFilter(periodo?: 'mes' | 'trimestre' | 'ano'): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  switch (periodo) {
    case 'trimestre':
      start.setMonth(now.getMonth() - 3)
      break
    case 'ano':
      start.setFullYear(now.getFullYear() - 1)
      break
    case 'mes':
    default:
      start.setMonth(now.getMonth() - 1)
      break
  }

  return { start, end }
}

function getWhatsAppPeriodFilter(periodo?: 'hoje' | 'semana' | 'mes'): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  switch (periodo) {
    case 'semana':
      start.setDate(now.getDate() - 7)
      break
    case 'mes':
      start.setMonth(now.getMonth() - 1)
      break
    case 'hoje':
    default:
      start.setHours(0, 0, 0, 0)
      break
  }

  return { start, end }
}

// ============================================================================
// Tool: get_conversion_metrics
// ============================================================================

const getConversionMetrics: VoiceAgentToolDefinition = {
  name: 'get_conversion_metrics',
  description: 'Obtém métricas de conversão e dados do funil de vendas. Retorna total de leads, leads ganhos, leads perdidos e taxa de conversão.',
  parameters: {
    type: 'object',
    properties: {
      periodo: {
        type: 'string',
        description: 'Período para análise das métricas',
        enum: ['mes', 'trimestre', 'ano']
      }
    }
  },
  execute: async (args: Record<string, any>, tenantId: number) => {
    const periodo = args.periodo as 'mes' | 'trimestre' | 'ano' | undefined
    const { start, end } = getPeriodFilter(periodo)

    // Query leads grouped by status (situacao)
    const result = await dbQuery<{
      situacao_nome: string
      total: string
    }>(
      `SELECT
        COALESCE(situacao_nome, 'Sem Status') as situacao_nome,
        COUNT(*) as total
      FROM cvcrm_leads
      WHERE synced_at >= $1 AND synced_at <= $2
      GROUP BY situacao_nome
      ORDER BY total DESC`,
      [start.toISOString(), end.toISOString()]
    )

    // Calculate metrics
    let totalLeads = 0
    let leadsGanhos = 0
    let leadsPerdidos = 0
    const statusBreakdown: Record<string, number> = {}

    for (const row of result.rows) {
      const count = parseInt(row.total, 10)
      totalLeads += count
      statusBreakdown[row.situacao_nome] = count

      // Identify won/lost leads by common status names
      const statusLower = row.situacao_nome.toLowerCase()
      if (
        statusLower.includes('ganho') ||
        statusLower.includes('venda') ||
        statusLower.includes('convertido') ||
        statusLower.includes('fechado')
      ) {
        leadsGanhos += count
      } else if (
        statusLower.includes('perdido') ||
        statusLower.includes('perdid') ||
        statusLower.includes('cancelado') ||
        statusLower.includes('desistiu')
      ) {
        leadsPerdidos += count
      }
    }

    const taxaConversao = totalLeads > 0
      ? ((leadsGanhos / totalLeads) * 100).toFixed(2)
      : '0.00'

    return {
      periodo: periodo || 'mes',
      periodo_inicio: start.toISOString().split('T')[0],
      periodo_fim: end.toISOString().split('T')[0],
      total_leads: totalLeads,
      leads_ganhos: leadsGanhos,
      leads_perdidos: leadsPerdidos,
      leads_em_andamento: totalLeads - leadsGanhos - leadsPerdidos,
      taxa_conversao: `${taxaConversao}%`,
      breakdown_por_status: statusBreakdown
    }
  }
}

// ============================================================================
// Tool: get_corretor_ranking
// ============================================================================

const getCorretorRanking: VoiceAgentToolDefinition = {
  name: 'get_corretor_ranking',
  description: 'Obtém ranking dos melhores corretores por vendas. Retorna nome do corretor, quantidade de vendas e valor total.',
  parameters: {
    type: 'object',
    properties: {
      limite: {
        type: 'number',
        description: 'Número máximo de corretores no ranking (padrão: 5)'
      },
      periodo: {
        type: 'string',
        description: 'Período para análise do ranking',
        enum: ['mes', 'trimestre', 'ano']
      }
    }
  },
  execute: async (args: Record<string, any>, tenantId: number) => {
    const limite = args.limite || 5
    const periodo = args.periodo as 'mes' | 'trimestre' | 'ano' | undefined
    const { start, end } = getPeriodFilter(periodo)

    const result = await dbQuery<{
      corretor_id: number
      corretor_nome: string
      total_vendas: string
      valor_total: string
    }>(
      `SELECT
        r.corretor_id,
        COALESCE(r.corretor_nome, 'Corretor Desconhecido') as corretor_nome,
        COUNT(*) as total_vendas,
        COALESCE(SUM(r.valor_venda), 0) as valor_total
      FROM cvcrm_reservas r
      WHERE r.data_venda >= $1
        AND r.data_venda <= $2
        AND r.status IN ('vendido', 'concluido', 'ativo', 'aprovado')
      GROUP BY r.corretor_id, r.corretor_nome
      ORDER BY total_vendas DESC, valor_total DESC
      LIMIT $3`,
      [start.toISOString(), end.toISOString(), limite]
    )

    const ranking = result.rows.map((row, index) => ({
      posicao: index + 1,
      corretor_id: row.corretor_id,
      corretor_nome: row.corretor_nome,
      total_vendas: parseInt(row.total_vendas, 10),
      valor_total: parseFloat(row.valor_total),
      valor_total_formatado: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(parseFloat(row.valor_total))
    }))

    return {
      periodo: periodo || 'mes',
      periodo_inicio: start.toISOString().split('T')[0],
      periodo_fim: end.toISOString().split('T')[0],
      total_corretores: ranking.length,
      ranking
    }
  }
}

// ============================================================================
// Tool: get_dashboard_summary
// ============================================================================

const getDashboardSummary: VoiceAgentToolDefinition = {
  name: 'get_dashboard_summary',
  description: 'Obtém resumo geral do CRM para o dashboard. Retorna total de leads, leads de hoje, reservas ativas, vendas do mês e valor das vendas.',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async (args: Record<string, any>, tenantId: number) => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel
    const [
      totalLeadsResult,
      leadsHojeResult,
      reservasAtivasResult,
      vendasMesResult
    ] = await Promise.all([
      // Total leads
      dbQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM cvcrm_leads`
      ),

      // Leads de hoje
      dbQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM cvcrm_leads
         WHERE data_cadastro_cvcrm >= $1`,
        [todayStart.toISOString()]
      ),

      // Reservas ativas
      dbQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM cvcrm_reservas
         WHERE status IN ('ativo', 'pendente', 'em_analise', 'aguardando')`
      ),

      // Vendas do mês
      dbQuery<{ count: string; valor: string }>(
        `SELECT
          COUNT(*) as count,
          COALESCE(SUM(valor_venda), 0) as valor
        FROM cvcrm_reservas
        WHERE data_venda >= $1
          AND status IN ('vendido', 'concluido', 'aprovado')`,
        [monthStart.toISOString()]
      )
    ])

    const totalLeads = parseInt(totalLeadsResult.rows[0]?.count || '0', 10)
    const leadsHoje = parseInt(leadsHojeResult.rows[0]?.count || '0', 10)
    const reservasAtivas = parseInt(reservasAtivasResult.rows[0]?.count || '0', 10)
    const vendasMes = parseInt(vendasMesResult.rows[0]?.count || '0', 10)
    const valorVendasMes = parseFloat(vendasMesResult.rows[0]?.valor || '0')

    return {
      data_consulta: now.toISOString(),
      total_leads: totalLeads,
      leads_hoje: leadsHoje,
      reservas_ativas: reservasAtivas,
      vendas_mes: vendasMes,
      valor_vendas_mes: valorVendasMes,
      valor_vendas_mes_formatado: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valorVendasMes),
      mes_referencia: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
  }
}

// ============================================================================
// Tool: get_whatsapp_stats
// ============================================================================

const getWhatsAppStats: VoiceAgentToolDefinition = {
  name: 'get_whatsapp_stats',
  description: 'Obtém métricas de WhatsApp do módulo Salva-Leads. Retorna contagem de mensagens, conversas ativas e tempos de resposta.',
  parameters: {
    type: 'object',
    properties: {
      periodo: {
        type: 'string',
        description: 'Período para análise das métricas',
        enum: ['hoje', 'semana', 'mes']
      }
    }
  },
  execute: async (args: Record<string, any>, tenantId: number) => {
    const periodo = args.periodo as 'hoje' | 'semana' | 'mes' | undefined
    const { start, end } = getWhatsAppPeriodFilter(periodo)

    // Run queries in parallel
    const [
      conversationsResult,
      statusBreakdownResult,
      messagesStatsResult
    ] = await Promise.all([
      // Total conversations in period
      dbQuery<{ total: string; active: string }>(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active
        FROM salva_leads_conversations
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`,
        [tenantId, start.toISOString(), end.toISOString()]
      ),

      // Breakdown by status
      dbQuery<{ status: string; count: string }>(
        `SELECT
          status,
          COUNT(*) as count
        FROM salva_leads_conversations
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY status`,
        [tenantId, start.toISOString(), end.toISOString()]
      ),

      // Message stats (count messages in JSONB array)
      dbQuery<{
        total_conversations: string
        avg_messages: string
        conversations_with_messages: string
      }>(
        `SELECT
          COUNT(*) as total_conversations,
          AVG(jsonb_array_length(messages)) as avg_messages,
          COUNT(*) FILTER (WHERE jsonb_array_length(messages) > 0) as conversations_with_messages
        FROM salva_leads_conversations
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`,
        [tenantId, start.toISOString(), end.toISOString()]
      )
    ])

    const totalConversations = parseInt(conversationsResult.rows[0]?.total || '0', 10)
    const activeConversations = parseInt(conversationsResult.rows[0]?.active || '0', 10)

    const statusBreakdown: Record<string, number> = {}
    for (const row of statusBreakdownResult.rows) {
      statusBreakdown[row.status] = parseInt(row.count, 10)
    }

    const avgMessages = parseFloat(messagesStatsResult.rows[0]?.avg_messages || '0').toFixed(1)
    const conversationsWithMessages = parseInt(
      messagesStatsResult.rows[0]?.conversations_with_messages || '0',
      10
    )

    return {
      periodo: periodo || 'hoje',
      periodo_inicio: start.toISOString().split('T')[0],
      periodo_fim: end.toISOString().split('T')[0],
      total_conversas: totalConversations,
      conversas_ativas: activeConversations,
      conversas_com_mensagens: conversationsWithMessages,
      media_mensagens_por_conversa: parseFloat(avgMessages),
      breakdown_por_status: statusBreakdown,
      taxa_engajamento: totalConversations > 0
        ? `${((conversationsWithMessages / totalConversations) * 100).toFixed(1)}%`
        : '0%'
    }
  }
}

// ============================================================================
// Export
// ============================================================================

export const METRICS_TOOLS: VoiceAgentToolDefinition[] = [
  getConversionMetrics,
  getCorretorRanking,
  getDashboardSummary,
  getWhatsAppStats
]
