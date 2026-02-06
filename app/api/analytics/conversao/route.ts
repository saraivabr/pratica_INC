import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant-context';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30d';

    const periodoMap: Record<string, string> = {
      '7d': "AND l.created_at >= NOW() - INTERVAL '7 days'",
      '30d': "AND l.created_at >= NOW() - INTERVAL '30 days'",
      '90d': "AND l.created_at >= NOW() - INTERVAL '90 days'",
      'all': '',
    };
    const dateFilter = periodoMap[periodo] || periodoMap['30d'];

    return await withTenant(ctx.workspaceId, async (client) => {
      const { rows: totalRows } = await client.query(`SELECT COUNT(*) as total FROM leads l WHERE l.workspace_id = $1 ${dateFilter}`, [ctx.workspaceId]);
      const total_leads = parseInt(totalRows[0].total, 10);

      const { rows: agendadosRows } = await client.query(
        `SELECT COUNT(DISTINCT a.lead_id) as total FROM agendamentos a JOIN leads l ON a.lead_id = l.id WHERE l.workspace_id = $1 AND a.status IN ('confirmado', 'realizado') ${dateFilter}`,
        [ctx.workspaceId]
      );
      const leads_agendados = parseInt(agendadosRows[0].total, 10);

      const { rows: convertidosRows } = await client.query(
        `SELECT COUNT(*) as total FROM leads l WHERE l.workspace_id = $1 AND (l.temperature = 'hot' OR l.score > 80) ${dateFilter}`,
        [ctx.workspaceId]
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
    });
  } catch (error: any) {
    console.error('[GET /api/analytics/conversao] Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
