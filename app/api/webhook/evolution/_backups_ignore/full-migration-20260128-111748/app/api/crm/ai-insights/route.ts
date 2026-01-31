import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

// Cache para insights por tenant (1 hora)
const insightsCache = new Map<number, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

async function generateGeminiInsight(statsData: any): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.warn("GOOGLE_AI_API_KEY não configurada");
    return null;
  }

  const prompt = `Você é Sofia, a IA da Pratica Incorporadora, especializada em análise de dados imobiliários.

Analise os seguintes dados do CRM deste mês:

📊 MÉTRICAS GERAIS:
- Total de leads: ${statsData.totalLeads} (${statsData.leadsVariation > 0 ? '+' : ''}${statsData.leadsVariation}% vs mês anterior)
- Taxa de conversão: ${statsData.conversion.rate}% (${statsData.conversion.won} vendas de ${statsData.conversion.total} leads)
- Receita do mês: R$ ${statsData.revenue.current.toLocaleString('pt-BR')}
- Score médio dos leads: ${statsData.avgScore}

🎯 INSIGHTS DE ORIGEM:
${statsData.originStats.slice(0, 5).map((o: any) =>
  `- ${o.origem}: ${o.total} leads, ${o.conversionRate}% conversão, ticket médio R$ ${o.avgTicket.toLocaleString('pt-BR')}`
).join('\n')}

⚠️ ALERTAS:
- Leads quentes sem contato há 24h: ${statsData.insights.hotLeadsNoContact}
- Melhor dia para conversão: ${statsData.insights.bestDay?.day || 'N/A'}
- Horário de pico: ${statsData.insights.peakHour}h
- Melhor origem: ${statsData.insights.bestOrigin?.origem || 'N/A'} (${statsData.insights.bestOrigin?.conversionRate || 0}% conversão)

Gere 2-3 insights CURTOS e ACIONÁVEIS em português brasileiro.
Foque em:
1. Uma oportunidade de melhoria imediata
2. Um alerta importante (se houver leads quentes sem contato)
3. Uma recomendação estratégica

Responda em formato JSON:
{
  "insights": [
    { "type": "opportunity", "icon": "💡", "title": "...", "description": "..." },
    { "type": "alert", "icon": "⚠️", "title": "...", "description": "..." },
    { "type": "recommendation", "icon": "🎯", "title": "...", "description": "..." }
  ],
  "summary": "Uma frase resumindo a situação geral"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return text || null;
  } catch (error) {
    console.error("Gemini API error:", error);
    return null;
  }
}

function generateStaticInsights(statsData: any) {
  const insights = [];

  // Insight de melhor origem
  if (statsData.insights.bestOrigin && statsData.insights.bestOrigin.conversionRate > 0) {
    const origin = statsData.insights.bestOrigin;
    insights.push({
      type: "opportunity",
      icon: "💡",
      title: `${origin.origem} é sua melhor fonte`,
      description: `Leads de ${origin.origem} convertem ${origin.conversionRate}% - ${origin.conversionRate > 10 ? 'acima da média' : 'considere investir mais'}. Ticket médio: R$ ${origin.avgTicket.toLocaleString('pt-BR')}.`
    });
  }

  // Alerta de leads quentes sem contato
  if (statsData.insights.hotLeadsNoContact > 0) {
    insights.push({
      type: "alert",
      icon: "⚠️",
      title: `${statsData.insights.hotLeadsNoContact} leads quentes aguardando`,
      description: `Há ${statsData.insights.hotLeadsNoContact} leads com score alto sem contato nas últimas 24h. Priorize esses contatos hoje!`
    });
  }

  // Insight de melhor dia
  if (statsData.insights.bestDay) {
    insights.push({
      type: "recommendation",
      icon: "📅",
      title: `${statsData.insights.bestDay.day} é o dia de ouro`,
      description: `Historicamente, ${statsData.insights.bestDay.day} tem ${statsData.insights.bestDay.conversions} conversões - concentre follow-ups neste dia.`
    });
  }

  // Insight de horário de pico
  if (statsData.insights.peakHour !== null) {
    insights.push({
      type: "recommendation",
      icon: "⏰",
      title: `Pico de leads às ${statsData.insights.peakHour}h`,
      description: `A maioria dos leads entra às ${statsData.insights.peakHour}h. Garanta equipe disponível neste horário.`
    });
  }

  // Insight de variação de leads
  if (statsData.leadsVariation !== 0) {
    const isPositive = statsData.leadsVariation > 0;
    insights.push({
      type: isPositive ? "opportunity" : "alert",
      icon: isPositive ? "📈" : "📉",
      title: `Leads ${isPositive ? 'em alta' : 'em queda'}: ${isPositive ? '+' : ''}${statsData.leadsVariation}%`,
      description: isPositive
        ? `Volume de leads cresceu ${statsData.leadsVariation}% vs mês anterior. Mantenha a estratégia atual!`
        : `Volume de leads caiu ${Math.abs(statsData.leadsVariation)}% vs mês anterior. Revise campanhas de aquisição.`
    });
  }

  return {
    insights: insights.slice(0, 3),
    summary: `Este mês: ${statsData.totalLeads} leads, ${statsData.conversion.rate}% conversão, R$ ${statsData.revenue.current.toLocaleString('pt-BR')} em vendas.`
  };
}

export async function GET(request: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;

    // Verificar cache para este tenant
    const cached = insightsCache.get(tenantId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Buscar dados de stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Métricas principais
    const leadsRes = await dbQuery(`
      SELECT
        COUNT(*) FILTER (WHERE data_cad >= $1) as this_month,
        COUNT(*) FILTER (WHERE data_cad >= $2 AND data_cad < $1) as last_month
      FROM cvcrm_leads
      WHERE tenant_id = $3
    `, [startOfMonth.toISOString(), startOfLastMonth.toISOString(), tenantId]);

    const thisMonth = parseInt(leadsRes.rows[0]?.this_month || 0);
    const lastMonth = parseInt(leadsRes.rows[0]?.last_month || 0);
    const leadsVariation = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

    // Conversão
    const conversionRes = await dbQuery(`
      SELECT
        COUNT(*) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ) as won,
        COUNT(*) as total,
        COALESCE(SUM(valor_negocio) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
          OR LOWER(situacao::text) LIKE '%vend%'
        ), 0) as revenue
      FROM cvcrm_leads
      WHERE tenant_id = $1 AND data_cad >= $2
    `, [tenantId, startOfMonth.toISOString()]);

    const won = parseInt(conversionRes.rows[0]?.won || 0);
    const total = parseInt(conversionRes.rows[0]?.total || 0);
    const revenue = parseFloat(conversionRes.rows[0]?.revenue || 0);

    // Score médio
    const scoreRes = await dbQuery(`
      SELECT AVG(score) as avg_score
      FROM cvcrm_leads
      WHERE tenant_id = $1 AND score > 0
    `, [tenantId]);

    // Origens com conversão
    const originsRes = await dbQuery(`
      SELECT
        COALESCE(origem, midia_principal, 'Outros') as origem,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
        ) as converted,
        COALESCE(AVG(valor_negocio) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
        ), 0) as avg_ticket
      FROM cvcrm_leads
      WHERE tenant_id = $1
      GROUP BY COALESCE(origem, midia_principal, 'Outros')
      ORDER BY total DESC
      LIMIT 10
    `, [tenantId]);

    const originStats = originsRes.rows.map(row => ({
      origem: row.origem,
      total: parseInt(row.total),
      converted: parseInt(row.converted),
      conversionRate: row.total > 0 ? Math.round((row.converted / row.total) * 100) : 0,
      avgTicket: parseFloat(row.avg_ticket) || 0
    }));

    // Melhor dia
    const bestDayRes = await dbQuery(`
      SELECT
        EXTRACT(DOW FROM data_cad) as day_of_week,
        COUNT(*) FILTER (WHERE
          LOWER(situacao::text) LIKE '%ganho%'
          OR LOWER(situacao::text) LIKE '%fechado%'
        ) as converted
      FROM cvcrm_leads
      WHERE tenant_id = $1 AND data_cad IS NOT NULL
      GROUP BY EXTRACT(DOW FROM data_cad)
      ORDER BY converted DESC
      LIMIT 1
    `, [tenantId]);

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const bestDay = bestDayRes.rows[0]
      ? { day: dayNames[parseInt(bestDayRes.rows[0].day_of_week)], conversions: parseInt(bestDayRes.rows[0].converted) }
      : null;

    // Horário de pico
    const peakHourRes = await dbQuery(`
      SELECT EXTRACT(HOUR FROM data_cad) as hour, COUNT(*) as count
      FROM cvcrm_leads
      WHERE tenant_id = $1 AND data_cad IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM data_cad)
      ORDER BY count DESC
      LIMIT 1
    `, [tenantId]);

    const peakHour = peakHourRes.rows[0] ? parseInt(peakHourRes.rows[0].hour) : null;

    // Leads quentes sem contato
    const hotLeadsRes = await dbQuery(`
      SELECT COUNT(*) as count
      FROM cvcrm_leads
      WHERE tenant_id = $1
      AND score >= 70
      AND (ultima_data_conversao IS NULL OR ultima_data_conversao < NOW() - INTERVAL '24 hours')
    `, [tenantId]);

    const hotLeadsNoContact = parseInt(hotLeadsRes.rows[0]?.count || 0);

    // Montar dados para análise
    const statsData = {
      totalLeads: thisMonth,
      leadsVariation,
      avgScore: Math.round(scoreRes.rows[0]?.avg_score || 0),
      conversion: {
        won,
        total,
        rate: total > 0 ? Math.round((won / total) * 100) : 0
      },
      revenue: { current: revenue },
      originStats,
      insights: {
        bestDay,
        peakHour,
        hotLeadsNoContact,
        bestOrigin: originStats.length > 0
          ? originStats.reduce((best, curr) => curr.conversionRate > best.conversionRate ? curr : best)
          : null
      }
    };

    // Tentar gerar insights com Gemini
    let aiInsights = null;
    const geminiResponse = await generateGeminiInsight(statsData);

    if (geminiResponse) {
      try {
        aiInsights = JSON.parse(geminiResponse);
      } catch (e) {
        console.error("Erro ao parsear resposta do Gemini:", e);
      }
    }

    // Fallback para insights estáticos
    const finalInsights = aiInsights || generateStaticInsights(statsData);

    // Adicionar métricas calculadas
    const result = {
      ...finalInsights,
      metrics: {
        totalLeads: thisMonth,
        leadsVariation,
        conversionRate: statsData.conversion.rate,
        revenue: revenue,
        avgScore: statsData.avgScore,
        hotLeadsNoContact,
        bestOrigin: statsData.insights.bestOrigin?.origem || null,
        bestOriginRate: statsData.insights.bestOrigin?.conversionRate || 0,
        bestDay: bestDay?.day || null,
        peakHour
      },
      generatedBy: aiInsights ? 'gemini' : 'static',
      generatedAt: new Date().toISOString()
    };

    // Salvar no cache para este tenant
    insightsCache.set(tenantId, {
      data: result,
      timestamp: Date.now()
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Insights Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
