/**
 * API de Notificação Individual
 * 
 * PATCH /api/notificacoes/[id] - Marca como lida/não lida
 * DELETE /api/notificacoes/[id] - Remove notificação
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

// PATCH /api/notificacoes/[id] - Marca como lida
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { user, workspaceId } = ctx;
    const { id } = params;
    const body = await request.json();
    const { lida } = body;

    if (typeof lida !== 'boolean') {
      return NextResponse.json(
        { error: 'Campo lida deve ser boolean' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE notificacoes 
       SET lida = $1, lida_em = CASE WHEN $1 = true THEN NOW() ELSE NULL END
       WHERE id = $2 AND user_id = $3 AND workspace_id = $4
       RETURNING *`,
      [lida, id, user.id, workspaceId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error: any) {
    console.error('[Notificações] PATCH error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar notificação' },
      { status: 500 }
    );
  }
}

// DELETE /api/notificacoes/[id] - Remove notificação
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { user, workspaceId } = ctx;
    const { id } = params;

    const result = await pool.query(
      `DELETE FROM notificacoes 
       WHERE id = $1 AND user_id = $2 AND workspace_id = $3
       RETURNING id`,
      [id, user.id, workspaceId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Notificações] DELETE error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover notificação' },
      { status: 500 }
    );
  }
}
