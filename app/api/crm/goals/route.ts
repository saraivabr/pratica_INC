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
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();

    // Buscar dados dos últimos 3 meses para calcular a meta
    const historicalData = [];

    for (let i = 1; i <= 3; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthDataRes = await dbQuery(`
        SELECT
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE
            LOWER(situacao::text) LIKE '%ganho%'
            OR LOWER(situacao::text) LIKE '%fechado%'
            OR LOWER(situacao::text) LIKE '%vend%'
          ) as conversions,
          COALESCE(SUM(valor_negocio) FILTER (WHERE
            LOWER(situacao::text) LIKE '%ganho%'
            OR LOWER(situacao::text) LIKE '%fechado%'
            OR LOWER(situacao::text) LIKE '%vend%'
          ), 0) as revenue
        FROM cvcrm_leads
        WHERE workspace_id = $1
        AND data_cad >= $2 AND data_cad <= $3
      `, [workspaceId, monthStart.toISOString(), monthEnd.toISOString()]);

      historicalData.push({
        month: monthStart.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
        leads: parseInt(monthDataRes.rows[0]?.total_leads || 0),
        conversions: parseInt(monthDataRes.rows[0]?.conversions || 0),
        revenue: parseFloat(monthDataRes.rows[0]?.revenue || 0)
      });
    }

    // Calcular médias dos últimos 3 meses
    const avgLeads = historicalData.reduce((sum, m) => sum + m.leads, 0) / 3;
    const avgConversions = historicalData.reduce((sum, m) => sum + m.conversions, 0) / 3;
    const avgRevenue = historicalData.reduce((sum, m) => sum + m.revenue, 0) / 3;

    // Meta = média + 10%
    const goals = {
      leads: Math.ceil(avgLeads * 1.10),
      conversions: Math.ceil(avgConversions * 1.10),
      revenue: Math.ceil(avgRevenue * 1.10)
    };

    // Dados do mês atual
    const currentMonthRes = await dbQuery(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ) as conversions,
        COALESCE(SUM(valor_negocio) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ), 0) as revenue
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND data_cad >= $2
    `, [workspaceId, startOfMonth.toISOString()]);

    const current = {
      leads: parseInt(currentMonthRes.rows[0]?.total_leads || 0),
      conversions: parseInt(currentMonthRes.rows[0]?.conversions || 0),
      revenue: parseFloat(currentMonthRes.rows[0]?.revenue || 0)
    };

    // Calcular progresso
    const progress = {
      leads: goals.leads > 0 ? Math.round((current.leads / goals.leads) * 100) : 0,
      conversions: goals.conversions > 0 ? Math.round((current.conversions / goals.conversions) * 100) : 0,
      revenue: goals.revenue > 0 ? Math.round((current.revenue / goals.revenue) * 100) : 0
    };

    // Projeção para o fim do mês (baseado no ritmo atual)
    const dailyRate = {
      leads: dayOfMonth > 0 ? current.leads / dayOfMonth : 0,
      conversions: dayOfMonth > 0 ? current.conversions / dayOfMonth : 0,
      revenue: dayOfMonth > 0 ? current.revenue / dayOfMonth : 0
    };

    const projection = {
      leads: Math.round(dailyRate.leads * daysInMonth),
      conversions: Math.round(dailyRate.conversions * daysInMonth),
      revenue: Math.round(dailyRate.revenue * daysInMonth)
    };

    // Status da meta
    const getStatus = (progressValue: number, projectionValue: number, goalValue: number) => {
      if (progressValue >= 100) return 'achieved';
      if (projectionValue >= goalValue) return 'on_track';
      if (projectionValue >= goalValue * 0.8) return 'warning';
      return 'behind';
    };

    const status = {
      leads: getStatus(progress.leads, projection.leads, goals.leads),
      conversions: getStatus(progress.conversions, projection.conversions, goals.conversions),
      revenue: getStatus(progress.revenue, projection.revenue, goals.revenue)
    };

    // Meta geral (média ponderada: conversões 50%, receita 30%, leads 20%)
    const overallProgress = Math.round(
      (progress.conversions * 0.5) + (progress.revenue * 0.3) + (progress.leads * 0.2)
    );

    return NextResponse.json({
      goals,
      current,
      progress,
      projection,
      status,
      overallProgress,
      historical: historicalData,
      period: {
        month: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
        dayOfMonth,
        daysInMonth,
        daysRemaining: daysInMonth - dayOfMonth
      }
    });
  } catch (error) {
    console.error("Goals API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
