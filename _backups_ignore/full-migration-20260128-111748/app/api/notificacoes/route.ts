import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

/**
 * GET /api/notificacoes
 * Lista notificações
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const corretor_id = searchParams.get('corretor_id') || 'default-user';

    const { rows } = await dbQuery(
      `
      SELECT n.*, l.name as lead_nome, l.phone as lead_telefone
      FROM notificacoes n
      LEFT JOIN leads l ON n.lead_id = l.id
      WHERE n.corretor_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2
      `,
      [corretor_id, limit]
    );

    return NextResponse.json({ notificacoes: rows, total: rows.length });
  } catch (error: any) {
    console.error('[GET /api/notificacoes] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar notificações', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notificacoes
 * Cria nova notificação
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { corretor_id, lead_id, tipo, mensagem, link_acao, metadata } = body;

    if (!corretor_id || !tipo || !mensagem) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: corretor_id, tipo, mensagem' },
        { status: 400 }
      );
    }

    const { rows } = await dbQuery(
      `
      INSERT INTO notificacoes (corretor_id, lead_id, tipo, mensagem, link_acao, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [corretor_id, lead_id || null, tipo, mensagem, link_acao || null, metadata || {}]
    );

    return NextResponse.json({ success: true, notificacao: rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/notificacoes] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar notificação', details: error.message },
      { status: 500 }
    );
  }
}
