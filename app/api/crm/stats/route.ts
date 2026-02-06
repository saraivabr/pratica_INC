import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Total de leads este mês vs mês anterior
    const leadsThisMonthRes = await dbQuery(`
      SELECT COUNT(*) as count
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= $2
    `, [workspaceId, startOfMonth.toISOString()]);

    const leadsLastMonthRes = await dbQuery(`
      SELECT COUNT(*) as count
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= $2 AND data_cad < $3
    `, [workspaceId, startOfLastMonth.toISOString(), startOfMonth.toISOString()]);

    const leadsThisMonth = parseInt(leadsThisMonthRes.rows[0]?.count || 0);
    const leadsLastMonth = parseInt(leadsLastMonthRes.rows[0]?.count || 0);
    const leadsVariation = leadsLastMonth > 0
      ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)
      : 0;

    // 2. Leads por temperatura (baseado em score)
    const tempRes = await dbQuery(`
      SELECT
        CASE
          WHEN score >= 70 THEN 'hot'
          WHEN score >= 40 THEN 'warm'
          ELSE 'cold'
        END as temperature,
        COUNT(*) as count
      FROM cvcrm_leads
      WHERE workspace_id = $1
      GROUP BY
        CASE
          WHEN score >= 70 THEN 'hot'
          WHEN score >= 40 THEN 'warm'
          ELSE 'cold'
        END
    `, [workspaceId]);

    // 3. Score médio dos leads
    const scoreRes = await dbQuery(`
      SELECT AVG(score) as avg_score
      FROM cvcrm_leads
      WHERE workspace_id = $1 AND score > 0
    `, [workspaceId]);

    // 4. Taxa de conversão real (leads com situação de ganho)
    const conversionRes = await dbQuery(`
      SELECT
        COUNT(*) FILTER (WHERE
          LOWER(situacao_nome) LIKE '%ganho%'
          OR LOWER(situacao_nome) LIKE '%fechado%'
          OR LOWER(situacao_nome) LIKE '%vend%'
        ) as won,
        COUNT(*) as total
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= $2
    `, [workspaceId, startOfMonth.toISOString()]);

    const won = parseInt(conversionRes.rows[0]?.won || 0);
    const totalLeadsMonth = parseInt(conversionRes.rows[0]?.total || 0);
    const conversionRate = totalLeadsMonth > 0 ? Math.round((won / totalLeadsMonth) * 100) : 0;

    // 5. Conversão mês anterior para comparação
    const conversionLastMonthRes = await dbQuery(`
      SELECT
        COUNT(*) FILTER (WHERE
          LOWER(situacao_nome) LIKE '%ganho%'
          OR LOWER(situacao_nome) LIKE '%fechado%'
          OR LOWER(situacao_nome) LIKE '%vend%'
        ) as won,
        COUNT(*) as total
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= $2 AND data_cad < $3
    `, [workspaceId, startOfLastMonth.toISOString(), startOfMonth.toISOString()]);

    const wonLastMonth = parseInt(conversionLastMonthRes.rows[0]?.won || 0);
    const totalLastMonth = parseInt(conversionLastMonthRes.rows[0]?.total || 0);
    const conversionRateLastMonth = totalLastMonth > 0 ? Math.round((wonLastMonth / totalLastMonth) * 100) : 0;
    const conversionVariation = conversionRateLastMonth > 0
      ? conversionRate - conversionRateLastMonth
      : 0;

    // 6. Receita estimada (soma dos valores de negócio dos leads ganhos)
    const revenueRes = await dbQuery(`
      SELECT COALESCE(SUM(valor_negocio), 0) as revenue
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= $2
      AND (
        LOWER(situacao_nome) LIKE '%ganho%'
        OR LOWER(situacao_nome) LIKE '%fechado%'
        OR LOWER(situacao_nome) LIKE '%vend%'
      )
    `, [workspaceId, startOfMonth.toISOString()]);

    const revenueLastMonthRes = await dbQuery(`
      SELECT COALESCE(SUM(valor_negocio), 0) as revenue
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= $2 AND data_cad < $3
      AND (
        LOWER(situacao_nome) LIKE '%ganho%'
        OR LOWER(situacao_nome) LIKE '%fechado%'
        OR LOWER(situacao_nome) LIKE '%vend%'
      )
    `, [workspaceId, startOfLastMonth.toISOString(), startOfMonth.toISOString()]);

    const revenue = parseFloat(revenueRes.rows[0]?.revenue || 0);
    const revenueLastMonth = parseFloat(revenueLastMonthRes.rows[0]?.revenue || 0);
    const revenueVariation = revenueLastMonth > 0
      ? Math.round(((revenue - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;

    // 7. Leads por origem com taxa de conversão
    const originStatsRes = await dbQuery(`
      SELECT
        COALESCE(origem, midia_principal, 'Outros') as origem,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE
          LOWER(situacao_nome) LIKE '%ganho%'
          OR LOWER(situacao_nome) LIKE '%fechado%'
          OR LOWER(situacao_nome) LIKE '%vend%'
        ) as converted,
        COALESCE(AVG(valor_negocio) FILTER (WHERE
          LOWER(situacao_nome) LIKE '%ganho%'
          OR LOWER(situacao_nome) LIKE '%fechado%'
          OR LOWER(situacao_nome) LIKE '%vend%'
        ), 0) as avg_ticket
      FROM cvcrm_leads
      WHERE workspace_id = $1
      GROUP BY COALESCE(origem, midia_principal, 'Outros')
      ORDER BY total DESC
      LIMIT 10
    `, [workspaceId]);

    const originStats = originStatsRes.rows.map(row => ({
      origem: row.origem,
      total: parseInt(row.total),
      converted: parseInt(row.converted),
      conversionRate: row.total > 0 ? Math.round((row.converted / row.total) * 100) : 0,
      avgTicket: parseFloat(row.avg_ticket) || 0
    }));

    // 8. Leads por situação (funil)
    const stagesRes = await dbQuery(`
      SELECT
        COALESCE(situacao_nome, 'Sem situação') as name,
        situacao_id,
        COUNT(*) as count
      FROM cvcrm_leads
      WHERE workspace_id = $1
      GROUP BY situacao_nome, situacao_id
      ORDER BY count DESC
    `, [workspaceId]);

    // 9. Leads por dia (últimos 30 dias)
    const leadsPerDayRes = await dbQuery(`
      SELECT
        DATE(data_cad) as date,
        COUNT(*) as count
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(data_cad)
      ORDER BY date ASC
    `, [workspaceId]);

    // 10. Melhor dia da semana para conversão
    const bestDayRes = await dbQuery(`
      SELECT
        EXTRACT(DOW FROM data_cad) as day_of_week,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE
          LOWER(situacao_nome) LIKE '%ganho%'
          OR LOWER(situacao_nome) LIKE '%fechado%'
        ) as converted
      FROM cvcrm_leads
      WHERE workspace_id = $1 AND data_cad IS NOT NULL
      GROUP BY EXTRACT(DOW FROM data_cad)
      ORDER BY converted DESC
      LIMIT 1
    `, [workspaceId]);

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const bestDay = bestDayRes.rows[0]
      ? {
          day: dayNames[parseInt(bestDayRes.rows[0].day_of_week)],
          conversions: parseInt(bestDayRes.rows[0].converted)
        }
      : null;

    // 11. Horário de pico de leads
    const peakHourRes = await dbQuery(`
      SELECT
        EXTRACT(HOUR FROM data_cad) as hour,
        COUNT(*) as count
      FROM cvcrm_leads
      WHERE workspace_id = $1 AND data_cad IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM data_cad)
      ORDER BY count DESC
      LIMIT 1
    `, [workspaceId]);

    const peakHour = peakHourRes.rows[0]
      ? parseInt(peakHourRes.rows[0].hour)
      : null;

    // 12. Leads quentes sem contato nas últimas 24h
    const hotLeadsNoContactRes = await dbQuery(`
      SELECT COUNT(*) as count
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND score >= 70
      AND (
        ultima_data_conversao IS NULL
        OR ultima_data_conversao < NOW() - INTERVAL '24 hours'
      )
    `, [workspaceId]);

    const hotLeadsNoContact = parseInt(hotLeadsNoContactRes.rows[0]?.count || 0);

    return NextResponse.json({
      // Métricas principais
      totalLeads: leadsThisMonth,
      leadsVariation,

      // Temperaturas
      temperatures: tempRes.rows,

      // Score médio
      avgScore: Math.round(scoreRes.rows[0]?.avg_score || 0),

      // Conversão
      conversion: {
        won,
        total: totalLeadsMonth,
        rate: conversionRate,
        variation: conversionVariation
      },

      // Receita
      revenue: {
        current: revenue,
        lastMonth: revenueLastMonth,
        variation: revenueVariation
      },

      // Analytics
      originStats,
      stages: stagesRes.rows,
      leadsPerDay: leadsPerDayRes.rows,

      // Insights data
      insights: {
        bestDay,
        peakHour,
        hotLeadsNoContact,
        bestOrigin: originStats.length > 0
          ? originStats.reduce((best, curr) =>
              curr.conversionRate > best.conversionRate ? curr : best
            )
          : null
      }
    });
  } catch (error) {
    console.error("CRM Stats Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
