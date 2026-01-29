import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * POST /api/admin/users/promote-gerente
 * Promover um corretor a gerente
 * 
 * Body: { user_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    const { rows } = await dbQuery(
      `UPDATE users SET role = 'gerente', gerente_id = NULL, updated_at = now()
       WHERE id = $1
       RETURNING id, nome, role`,
      [user_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: rows[0],
      message: `${rows[0].nome} promovido a gerente`,
    });
  } catch (error: any) {
    console.error('[Promote Gerente] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/promote-gerente
 * Rebaixar gerente para corretor
 * 
 * Body: { user_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    // Remover gerente_id dos corretores dessa equipe
    await dbQuery(
      `UPDATE users SET gerente_id = NULL WHERE gerente_id = $1`,
      [user_id]
    );

    // Rebaixar para corretor
    const { rows } = await dbQuery(
      `UPDATE users SET role = 'corretor', updated_at = now()
       WHERE id = $1
       RETURNING id, nome, role`,
      [user_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: rows[0],
      message: `${rows[0].nome} rebaixado para corretor`,
    });
  } catch (error: any) {
    console.error('[Demote Gerente] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
