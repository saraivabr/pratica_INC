import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30d';

    const periodoMap: Record<string, string> = {
      '7d': "AND created_at >= NOW() - INTERVAL '7 days'",
      '30d': "AND created_at >= NOW() - INTERVAL '30 days'",
      '90d': "AND created_at >= NOW() - INTERVAL '90 days'",
      'all': '',
    };
    const dateFilter = periodoMap[periodo] || periodoMap['30d'];

    const { rows: agendamentosRows } = await dbQuery(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'realizado') as realizados FROM agendamentos WHERE workspace_id = $1 ${dateFilter}`,
      [ctx.workspaceId]
    );
    const agendamentos = agendamentosRows[0];

    const { rows: simulacoesRows } = await dbQuery(
      `SELECT COUNT(*) as total, 0 as enviadas FROM cvcrm_venda_simulacoes WHERE workspace_id = $1 ${dateFilter.replace('created_at', 'synced_at')}`,
      [ctx.workspaceId]
    );
    const simulacoes = simulacoesRows[0];

    return NextResponse.json({
      periodo,
      agendamentos: {
        total: parseInt(agendamentos.total, 10),
        realizados: parseInt(agendamentos.realizados, 10),
      },
      simulacoes: {
        total: parseInt(simulacoes.total, 10),
        enviadas: parseInt(simulacoes.enviadas, 10),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/analytics/vendas] Error:', error);
    return NextResponse.json({ error: 'Erro ao calcular vendas', details: error.message }, { status: 500 });
  }
}
