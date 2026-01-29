import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30d';

    const periodoMap: Record<string, string> = {
      '7d': "AND l.created_at >= NOW() - INTERVAL '7 days'",
      '30d': "AND l.created_at >= NOW() - INTERVAL '30 days'",
      '90d': "AND l.created_at >= NOW() - INTERVAL '90 days'",
      'all': '',
    };
    const dateFilter = periodoMap[periodo] || periodoMap['30d'];

    const { rows: totalRows } = await dbQuery(`SELECT COUNT(*) as total FROM leads l WHERE 1=1 ${dateFilter}`, []);
    const total_leads = parseInt(totalRows[0].total, 10);

    const { rows: agendadosRows } = await dbQuery(
      `SELECT COUNT(DISTINCT a.lead_id) as total FROM agendamentos a JOIN leads l ON a.lead_id = l.id WHERE a.status IN ('confirmado', 'realizado') ${dateFilter}`,
      []
    );
    const leads_agendados = parseInt(agendadosRows[0].total, 10);

    const { rows: convertidosRows } = await dbQuery(
      `SELECT COUNT(*) as total FROM leads l WHERE (l.temperature = 'hot' OR l.score > 80) ${dateFilter}`,
      []
    );
    const leads_convertidos = parseInt(convertidosRows[0].total, 10);

    const taxa_agendamento = total_leads > 0 ? (leads_agendados / total_leads) * 100 : 0;
    const taxa_conversao = total_leads > 0 ? (leads_convertidos / total_leads) * 100 : 0;

    return NextResponse.json({
      periodo,
      total_leads,
      leads_agendados,
      leads_convertidos,
      taxa_agendamento: parseFloat(taxa_agendamento.toFixed(2)),
      taxa_conversao: parseFloat(taxa_conversao.toFixed(2)),
    });
  } catch (error: any) {
    console.error('[GET /api/analytics/conversao] Error:', error);
    return NextResponse.json({ error: 'Erro ao calcular conversão', details: error.message }, { status: 500 });
  }
}
