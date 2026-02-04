import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { applyRateLimit } from '@/lib/rate-limit-helper';
import { validateRequest, NotificacaoCreateSchema } from '@/lib/validation-schemas';

/**
 * GET /api/notificacoes
 * Lista notificações do workspace autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { rows } = await dbQuery(
      `
      SELECT n.*, l.name as lead_nome, l.phone as lead_telefone
      FROM notificacoes n
      LEFT JOIN leads l ON n.lead_id = l.id
      WHERE n.workspace_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2
      `,
      [ctx.workspaceId, limit]
    );

    return NextResponse.json({ notificacoes: rows, total: rows.length });
  } catch (error: any) {
    console.error('[GET /api/notificacoes] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
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
    const rateLimited = await applyRateLimit(request, 'API_GENERAL');
    if (rateLimited) return rateLimited;

    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const validation = await validateRequest(request, NotificacaoCreateSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { corretor_id, lead_id, tipo, mensagem, link_acao, metadata } = validation.data;

    // Authorization: Verify corretor_id belongs to authenticated user or user is admin
    const userId = (ctx.user as any)?.id;
    const userRole = (ctx.user as any)?.hierarquia_slug;
    const isAdmin = ['master', 'diretor', 'gerente'].includes(userRole);

    if (corretor_id !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Não autorizado a criar notificações para outros usuários' },
        { status: 403 }
      );
    }

    const { rows } = await dbQuery(
      `
      INSERT INTO notificacoes (corretor_id, lead_id, tipo, mensagem, link_acao, metadata, workspace_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [corretor_id, lead_id || null, tipo, mensagem, link_acao || null, metadata || {}, ctx.workspaceId]
    );

    return NextResponse.json({ success: true, notificacao: rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/notificacoes] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar notificação' },
      { status: 500 }
    );
  }
}
