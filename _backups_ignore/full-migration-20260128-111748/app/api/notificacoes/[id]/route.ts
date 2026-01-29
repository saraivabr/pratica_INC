import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/notificacoes/[id]
 * Atualiza notificação (marcar como lida/não lida)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { lida } = body;

    if (typeof lida !== 'boolean') {
      return NextResponse.json(
        { error: 'Campo obrigatório: lida (boolean)' },
        { status: 400 }
      );
    }

    const { rows } = await dbQuery(
      `UPDATE notificacoes SET lida = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [lida, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, notificacao: rows[0] });
  } catch (error: any) {
    console.error('[PUT /api/notificacoes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar notificação', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notificacoes/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await dbQuery(`DELETE FROM notificacoes WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: 'Notificação deletada' });
  } catch (error: any) {
    console.error('[DELETE /api/notificacoes/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar notificação', details: error.message },
      { status: 500 }
    );
  }
}
