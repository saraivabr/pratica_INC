import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const corretor_id = searchParams.get('corretor_id') || 'default-user';

    const { rows } = await dbQuery(
      `SELECT COUNT(*) as count FROM notificacoes WHERE corretor_id = $1 AND lida = FALSE`,
      [corretor_id]
    );

    return NextResponse.json({ count: parseInt(rows[0].count, 10) });
  } catch (error: any) {
    console.error('[GET /api/notificacoes/unread-count] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao contar notificações', details: error.message },
      { status: 500 }
    );
  }
}
