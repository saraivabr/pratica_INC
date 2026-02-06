import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    return await withTenant(ctx.workspaceId, async (client) => {
      const { rows } = await client.query(
        `SELECT COUNT(*) as count FROM notificacoes WHERE workspace_id = $1 AND corretor_id = $2 AND lida = FALSE`,
        [ctx.workspaceId, ctx.user.id]
      );

      return NextResponse.json({ count: parseInt(rows[0].count, 10) });
    });
  } catch (error: any) {
    console.error('[GET /api/notificacoes/unread-count] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao contar notificações', details: error.message },
      { status: 500 }
    );
  }
}
