import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30'; // dias

    // Métricas gerais
    const metricsQuery = `
      WITH periodo AS (
        SELECT NOW() - INTERVAL '${periodo} days' as inicio
      )
      SELECT 
        -- Total de leads
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE created_at >= (SELECT inicio FROM periodo)) as leads_periodo,
        
        -- Conversões
        COUNT(*) FILTER (WHERE status = 'ganho') as total_ganhos,
        COUNT(*) FILTER (WHERE status = 'ganho' AND created_at >= (SELECT inicio FROM periodo)) as ganhos_periodo,
        
        -- Taxa de conversão
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'ganho') / NULLIF(COUNT(*), 0), 
          1
        ) as taxa_conversao,
        
        -- Tempo médio de conversão (em dias)
        ROUND(
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) 
          FILTER (WHERE status = 'ganho'),
          1
        ) as tempo_medio_conversao,
        
        -- Valor total de vendas
        SUM(valor) FILTER (WHERE status = 'ganho') as valor_total_vendas,
        SUM(valor) FILTER (WHERE status = 'ganho' AND created_at >= (SELECT inicio FROM periodo)) as valor_periodo
        
      FROM cvcrm_leads
    `;

    const metricsResult = await pool.query(metricsQuery);
    const metrics = metricsResult.rows[0];

    // Leads por status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM cvcrm_leads
      WHERE created_at >= NOW() - INTERVAL '${periodo} days'
      GROUP BY status
      ORDER BY count DESC
    `;

    const statusResult = await pool.query(statusQuery);

    // Leads por dia (últimos 30 dias)
    const timelineQuery = `
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as leads,
        COUNT(*) FILTER (WHERE status = 'ganho') as conversoes
      FROM cvcrm_leads
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY data ASC
    `;

    const timelineResult = await pool.query(timelineQuery);

    // Top empreendimentos
    const topEmpreendimentosQuery = `
      SELECT 
        e.nome,
        COUNT(l.id) as leads_count,
        COUNT(l.id) FILTER (WHERE l.status = 'ganho') as vendas,
        SUM(l.valor) FILTER (WHERE l.status = 'ganho') as valor_total
      FROM cvcrm_leads l
      JOIN cvcrm_empreendimentos e ON e.id = l.empreendimento_id
      WHERE l.created_at >= NOW() - INTERVAL '${periodo} days'
      GROUP BY e.id, e.nome
      ORDER BY vendas DESC
      LIMIT 5
    `;

    const topEmpreendimentosResult = await pool.query(topEmpreendimentosQuery);

    // Atividades recentes
    const atividadesQuery = `
      SELECT 
        l.nome as lead_nome,
        l.status,
        l.proximo_contato,
        e.nome as empreendimento_nome,
        l.updated_at
      FROM cvcrm_leads l
      LEFT JOIN cvcrm_empreendimentos e ON e.id = l.empreendimento_id
      WHERE l.updated_at >= NOW() - INTERVAL '7 days'
      ORDER BY l.updated_at DESC
      LIMIT 10
    `;

    const atividadesResult = await pool.query(atividadesQuery);

    return NextResponse.json({
      success: true,
      periodo: parseInt(periodo),
      metricas: {
        total_leads: parseInt(metrics.total_leads) || 0,
        leads_periodo: parseInt(metrics.leads_periodo) || 0,
        total_ganhos: parseInt(metrics.total_ganhos) || 0,
        ganhos_periodo: parseInt(metrics.ganhos_periodo) || 0,
        taxa_conversao: parseFloat(metrics.taxa_conversao) || 0,
        tempo_medio_conversao: parseFloat(metrics.tempo_medio_conversao) || 0,
        valor_total_vendas: parseFloat(metrics.valor_total_vendas) || 0,
        valor_periodo: parseFloat(metrics.valor_periodo) || 0
      },
      leads_por_status: statusResult.rows,
      timeline: timelineResult.rows,
      top_empreendimentos: topEmpreendimentosResult.rows,
      atividades_recentes: atividadesResult.rows
    });

  } catch (error: any) {
    console.error('[Performance API] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
