import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateRequest, UserUpdateSchema } from '@/lib/validation-schemas';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request as NextRequest);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const validation = await validateRequest(request, UserUpdateSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { userId, nome } = validation.data;

    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Não autorizado a atualizar outro usuário' },
        { status: 403 }
      );
    }

    const { rows } = await dbQuery(
      `update users set nome = $1 where id = $2 returning *`,
      [nome.trim(), userId]
    );
    const updatedUser = rows[0];

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error in user update:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
