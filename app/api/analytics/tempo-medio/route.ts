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

    const { rows: tempoAgendamentoRows } = await dbQuery(
      `SELECT AVG(EXTRACT(EPOCH FROM (a.created_at - l.created_at)) / 3600) as horas FROM leads l JOIN agendamentos a ON a.lead_id = l.id WHERE 1=1 ${dateFilter}`,
      []
    );

    const { rows: tempoVisitaRows } = await dbQuery(
      `SELECT AVG(EXTRACT(EPOCH FROM (a.data_visita - l.created_at)) / 86400) as dias FROM leads l JOIN agendamentos a ON a.lead_id = l.id WHERE a.status = 'realizado' ${dateFilter}`,
      []
    );

    return NextResponse.json({
      periodo,
      resumo: {
        horas_ate_agendamento: parseFloat((tempoAgendamentoRows[0]?.horas || 0).toFixed(2)),
        dias_ate_visita: parseFloat((tempoVisitaRows[0]?.dias || 0).toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/analytics/tempo-medio] Error:', error);
    return NextResponse.json({ error: 'Erro ao calcular tempo médio', details: error.message }, { status: 500 });
  }
}
