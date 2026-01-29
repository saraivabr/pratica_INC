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

    // 1. Performance por corretor
    const corretoresRes = await dbQuery(`
      SELECT
        corretor_id,
        corretor::json->>'nome' as corretor_nome,
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ) as conversions,
        COALESCE(AVG(score), 0) as avg_score,
        COALESCE(SUM(valor_negocio) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ), 0) as total_revenue
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND corretor_id IS NOT NULL
      AND data_cad >= $2
      GROUP BY corretor_id, corretor::json->>'nome'
      ORDER BY conversions DESC, total_leads DESC
      LIMIT 20
    `, [workspaceId, startOfMonth.toISOString()]);

    // Calcular métricas adicionais para cada corretor
    const corretoresWithMetrics = corretoresRes.rows.map((row, index) => {
      const totalLeads = parseInt(row.total_leads);
      const conversions = parseInt(row.conversions);
      const conversionRate = totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0;

      // Score de performance: conversões * 10 + leads * 1
      const performanceScore = (conversions * 10) + totalLeads;

      return {
        rank: index + 1,
        id: row.corretor_id,
        nome: row.corretor_nome || `Corretor #${row.corretor_id}`,
        totalLeads,
        conversions,
        conversionRate,
        avgScore: Math.round(parseFloat(row.avg_score) || 0),
        totalRevenue: parseFloat(row.total_revenue) || 0,
        performanceScore
      };
    });

    // 2. Tempo médio de resposta (baseado na diferença entre data_cad e ultima_data_conversao)
    const responseTimeRes = await dbQuery(`
      SELECT
        corretor_id,
        corretor::json->>'nome' as corretor_nome,
        AVG(
          EXTRACT(EPOCH FROM (ultima_data_conversao::timestamp - data_cad::timestamp)) / 3600
        ) as avg_response_hours
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND corretor_id IS NOT NULL
      AND data_cad IS NOT NULL
      AND ultima_data_conversao IS NOT NULL
      AND ultima_data_conversao > data_cad
      AND data_cad >= $2
      GROUP BY corretor_id, corretor::json->>'nome'
    `, [workspaceId, startOfMonth.toISOString()]);

    // Criar mapa de tempo de resposta
    const responseTimeMap: Record<number, number> = {};
    responseTimeRes.rows.forEach(row => {
      responseTimeMap[row.corretor_id] = Math.round(parseFloat(row.avg_response_hours) || 0);
    });

    // Adicionar tempo de resposta aos corretores
    const corretoresComplete = corretoresWithMetrics.map(c => ({
      ...c,
      avgResponseHours: responseTimeMap[c.id] || null
    }));

    // 3. Total de interações por corretor (da tabela interacoes)
    const interacoesRes = await dbQuery(`
      SELECT
        corretor_id,
        COUNT(*) as total_interactions,
        COUNT(DISTINCT empreendimento_id) as empreendimentos_ativos,
        COUNT(DISTINCT lead_id) FILTER (WHERE lead_id IS NOT NULL) as leads_contactados
      FROM interacoes
      WHERE created_at >= $1
      GROUP BY corretor_id
    `, [startOfMonth.toISOString()]);

    const interacoesMap: Record<string, any> = {};
    interacoesRes.rows.forEach(row => {
      interacoesMap[row.corretor_id] = {
        totalInteractions: parseInt(row.total_interactions),
        empreendimentosAtivos: parseInt(row.empreendimentos_ativos),
        leadsContactados: parseInt(row.leads_contactados)
      };
    });

    // 4. Últimas interações da equipe
    const recentActivitiesRes = await dbQuery(`
      SELECT
        i.id,
        i.corretor_id,
        u.nome as corretor_nome,
        i.tipo_material,
        i.empreendimento_nome,
        i.lead_nome,
        i.created_at
      FROM interacoes i
      LEFT JOIN users u ON u.id = i.corretor_id
      ORDER BY i.created_at DESC
      LIMIT 10
    `);

    const recentActivities = recentActivitiesRes.rows.map(row => ({
      id: row.id,
      corretorId: row.corretor_id,
      corretorNome: row.corretor_nome || 'Corretor',
      tipo: row.tipo_material,
      empreendimento: row.empreendimento_nome,
      leadNome: row.lead_nome,
      createdAt: row.created_at
    }));

    // 5. Estatísticas gerais da equipe
    const teamStatsRes = await dbQuery(`
      SELECT
        COUNT(DISTINCT corretor_id) as total_corretores,
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ) as total_conversions,
        COALESCE(SUM(valor_negocio) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ), 0) as total_revenue
      FROM cvcrm_leads
      WHERE workspace_id = $1
      AND corretor_id IS NOT NULL
      AND data_cad >= $2
    `, [workspaceId, startOfMonth.toISOString()]);

    const teamStats = {
      totalCorretores: parseInt(teamStatsRes.rows[0]?.total_corretores || 0),
      totalLeads: parseInt(teamStatsRes.rows[0]?.total_leads || 0),
      totalConversions: parseInt(teamStatsRes.rows[0]?.total_conversions || 0),
      totalRevenue: parseFloat(teamStatsRes.rows[0]?.total_revenue || 0),
      avgLeadsPerCorretor: 0,
      avgConversionRate: 0
    };

    if (teamStats.totalCorretores > 0) {
      teamStats.avgLeadsPerCorretor = Math.round(teamStats.totalLeads / teamStats.totalCorretores);
      teamStats.avgConversionRate = teamStats.totalLeads > 0
        ? Math.round((teamStats.totalConversions / teamStats.totalLeads) * 100)
        : 0;
    }

    return NextResponse.json({
      corretores: corretoresComplete,
      interacoes: interacoesMap,
      recentActivities,
      teamStats,
      period: {
        start: startOfMonth.toISOString(),
        end: now.toISOString()
      }
    });
  } catch (error) {
    console.error("Team Metrics Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
