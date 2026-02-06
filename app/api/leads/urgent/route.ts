import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceContext } from "@/lib/api-helpers"
import { dbQuery } from "@/lib/db"

// SLA thresholds (in hours)
const SLA_THRESHOLDS = {
  FIRST_CONTACT_URGENT: 4,
  FIRST_CONTACT_CRITICAL: 8,
  FOLLOW_UP_ATTENTION: 24,
  MIN_LEAD_SCORE_FOR_SLA: 50,
}

/**
 * GET /api/leads/urgent
 *
 * Returns leads that require urgent attention based on SLA rules
 *
 * Query params:
 * - corretorId: Filter by specific corretor (optional)
 * - includeMetrics: Include SLA metrics in response (optional, default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    const { workspaceId } = ctx

    const searchParams = request.nextUrl.searchParams
    const corretorId = searchParams.get('corretorId') || undefined
    const includeMetrics = searchParams.get('includeMetrics') === 'true'

    // Buscar leads urgentes diretamente do banco
    let query = `
      SELECT
        idlead as id,
        nome,
        telefone,
        email,
        score,
        origem,
        empreendimento,
        data_cad,
        ultima_data_conversao,
        corretor,
        situacao_nome
      FROM cvcrm_leads
      WHERE workspace_id = $1
        AND (
          -- Leads sem contato há muito tempo com score alto
          (score >= $2 AND (ultima_data_conversao IS NULL OR ultima_data_conversao < NOW() - INTERVAL '${SLA_THRESHOLDS.FIRST_CONTACT_URGENT} hours'))
          OR
          -- Leads quentes sem contato
          (score >= 70 AND ultima_data_conversao IS NULL)
        )
      ORDER BY
        CASE WHEN score >= 70 AND ultima_data_conversao IS NULL THEN 0 ELSE 1 END,
        score DESC,
        data_cad ASC
      LIMIT 200
    `
    const params: any[] = [workspaceId, SLA_THRESHOLDS.MIN_LEAD_SCORE_FOR_SLA]

    if (corretorId) {
      const corretorIdInt = parseInt(corretorId, 10)
      if (!isNaN(corretorIdInt)) {
        query = query.replace('ORDER BY', `AND corretor_id = $3 ORDER BY`)
        params.push(corretorIdInt)
      }
    }

    const result = await dbQuery(query, params)

    // Transform to alerts format
    const alerts = result.rows.map((lead: any) => {
      const createdAt = new Date(lead.data_cad || Date.now())
      const lastContactAt = lead.ultima_data_conversao ? new Date(lead.ultima_data_conversao) : null
      const hoursSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60))
      const hoursSinceLastContact = lastContactAt ? Math.floor((Date.now() - lastContactAt.getTime()) / (1000 * 60 * 60)) : null

      const hasFirstContact = !!lastContactAt
      const leadScore = lead.score || 50

      let urgencyLevel: 'critical' | 'urgent' | 'attention' | 'normal' = 'normal'
      if (!hasFirstContact) {
        if (leadScore >= 70 && hoursSinceCreated >= SLA_THRESHOLDS.FIRST_CONTACT_CRITICAL) {
          urgencyLevel = 'critical'
        } else if (leadScore >= SLA_THRESHOLDS.MIN_LEAD_SCORE_FOR_SLA && hoursSinceCreated >= SLA_THRESHOLDS.FIRST_CONTACT_URGENT) {
          urgencyLevel = 'urgent'
        }
      } else if (hoursSinceLastContact !== null && hoursSinceLastContact >= SLA_THRESHOLDS.FOLLOW_UP_ATTENTION) {
        urgencyLevel = 'attention'
      }

      const corretor = typeof lead.corretor === 'string' ? JSON.parse(lead.corretor) : lead.corretor
      const empreendimento = typeof lead.empreendimento === 'string' ? JSON.parse(lead.empreendimento) : lead.empreendimento

      return {
        leadId: String(lead.id),
        leadName: lead.nome || 'Nome não informado',
        leadPhone: lead.telefone || '',
        leadEmail: lead.email || null,
        leadScore,
        leadOrigin: lead.origem || null,
        empreendimento: Array.isArray(empreendimento) ? empreendimento[0]?.nome : empreendimento?.nome || null,
        createdAt,
        lastContactAt,
        firstContactAt: lastContactAt,
        hoursSinceCreated,
        hoursSinceLastContact,
        urgencyLevel,
        slaViolated: urgencyLevel !== 'normal',
        violationType: !hasFirstContact && urgencyLevel !== 'normal' ? 'first_contact' : (urgencyLevel === 'attention' ? 'follow_up' : null),
        assignedCorretor: corretor?.nome || null,
        situacao: lead.situacao_nome || null,
      }
    }).filter((a: any) => a.urgencyLevel !== 'normal')

    // Optionally include SLA metrics
    let metrics = null
    if (includeMetrics) {
      // Calcular métricas de SLA
      const metricsQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE ultima_data_conversao IS NOT NULL) as contacted,
          AVG(EXTRACT(EPOCH FROM (COALESCE(ultima_data_conversao, NOW()) - data_cad)) / 3600)
            FILTER (WHERE ultima_data_conversao IS NOT NULL) as avg_response_hours
        FROM cvcrm_leads
        WHERE workspace_id = $1
      `
      const metricsResult = await dbQuery(metricsQuery, [workspaceId])

      const totalLeads = parseInt(metricsResult.rows[0]?.total || 0)
      const leadsViolatingSLA = alerts.length
      const leadsWithinSLA = totalLeads - leadsViolatingSLA

      metrics = {
        totalLeads,
        leadsWithinSLA,
        leadsViolatingSLA,
        avgResponseTimeHours: Math.round((parseFloat(metricsResult.rows[0]?.avg_response_hours || 0)) * 10) / 10,
        slaComplianceRate: totalLeads > 0 ? Math.round((leadsWithinSLA / totalLeads) * 1000) / 10 : 100,
        criticalAlerts: alerts.filter((a: any) => a.urgencyLevel === 'critical').length,
        urgentAlerts: alerts.filter((a: any) => a.urgencyLevel === 'urgent').length,
        attentionAlerts: alerts.filter((a: any) => a.urgencyLevel === 'attention').length,
      }
    }

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      metrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in /api/leads/urgent:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch urgent leads',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
