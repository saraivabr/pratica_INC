import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30d';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const periodoMap: Record<string, string> = {
      '7d': "AND created_at >= NOW() - INTERVAL '7 days'",
      '30d': "AND created_at >= NOW() - INTERVAL '30 days'",
      '90d': "AND created_at >= NOW() - INTERVAL '90 days'",
      'all': '',
    };
    const dateFilter = periodoMap[periodo] || periodoMap['30d'];

    const { rows: agendamentosRows } = await dbQuery(
      `
      SELECT
        COALESCE(a.imovel_id, a.empreendimento_id) as imovel_id,
        COALESCE(a.imovel_nome, e.nome, 'Sem nome') as imovel_nome,
        COUNT(*) as total_agendamentos,
        COUNT(*) FILTER (WHERE a.status = 'realizado') as visitas_realizadas
      FROM agendamentos a
      LEFT JOIN cvcrm_empreendimentos e ON e.cvcrm_id = a.empreendimento_id
      WHERE a.workspace_id = $1 AND COALESCE(a.imovel_id, a.empreendimento_id) IS NOT NULL ${dateFilter.replace('created_at', 'a.created_at')}
      GROUP BY COALESCE(a.imovel_id, a.empreendimento_id), COALESCE(a.imovel_nome, e.nome, 'Sem nome')
      ORDER BY total_agendamentos DESC
      LIMIT $2
      `,
      [ctx.workspaceId, limit]
    );

    return NextResponse.json({
      periodo,
      top_imoveis: agendamentosRows.map((row) => ({
        imovel_id: row.imovel_id,
        imovel_nome: row.imovel_nome,
        total_agendamentos: parseInt(row.total_agendamentos, 10),
        visitas_realizadas: parseInt(row.visitas_realizadas, 10),
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/analytics/top-imoveis] Error:', error);
    return NextResponse.json({ error: 'Erro ao calcular top imóveis', details: error.message }, { status: 500 });
  }
}
