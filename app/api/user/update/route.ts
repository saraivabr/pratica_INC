import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId, nome } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nome deve ter pelo menos 2 caracteres' },
        { status: 400 }
      );
    }

    const { rows } = await dbQuery(
      `update users set nome = $1 where id = $2 returning *`,
      [nome.trim(), userId]
    );
    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error in user update:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
