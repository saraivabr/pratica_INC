/**
 * API: Contagem de Leads Disponíveis
 *
 * GET /api/recepcao/leads-disponiveis - Retorna contagem de leads no pool
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    return await withTenant(workspaceId, async (client) => {
      const result = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE motivo = 'sem_corretor') AS sem_corretor,
           COUNT(*) FILTER (WHERE motivo = 'abandonado') AS abandonados,
           COUNT(*) AS total
         FROM v_leads_para_distribuir
         WHERE workspace_id = $1`,
        [workspaceId]
      );

      const row = result.rows[0] || { total: 0, sem_corretor: 0, abandonados: 0 };

      return NextResponse.json({
        success: true,
        data: {
          total: parseInt(row.total) || 0,
          sem_corretor: parseInt(row.sem_corretor) || 0,
          abandonados: parseInt(row.abandonados) || 0,
        },
      });
    });
  } catch (error) {
    console.error('Erro ao contar leads disponíveis:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao contar leads disponíveis' },
      { status: 500 }
    );
  }
}
