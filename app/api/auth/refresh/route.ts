import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbQuery } from '@/lib/db';
import { parseSessionCookie, createSessionCookie } from '@/lib/session-utils';

/**
 * Auto-refresh Token Endpoint
 * 
 * Renova sessão antes de expirar para UX perfeita (usuário nunca precisa fazer login de novo)
 * Chamado automaticamente pelo frontend a cada X dias
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pratica-session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 401 }
      );
    }

    const parsed = parseSessionCookie(sessionCookie);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Sessão inválida' },
        { status: 401 }
      );
    }

    // Verificar se sessão ainda é válida
    const { rows } = await dbQuery(
      `SELECT s.id, s.user_id, s.expires_at, s.is_verified,
              u.telefone, u.nome, u.role, u.is_active, u.workspace_id,
              u.gerente_id, u.avatar_url, u.imobiliaria_id, u.email,
              i.nome as imobiliaria_nome
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN imobiliarias i ON i.id = u.imobiliaria_id
       WHERE s.id = $1 AND s.is_verified = true AND s.expires_at > now()
       LIMIT 1`,
      [parsed.sessionId]
    );

    const session = rows[0];
    if (!session) {
      return NextResponse.json(
        { error: 'Sessão expirada ou inválida' },
        { status: 401 }
      );
    }

    if (!session.is_active) {
      return NextResponse.json(
        { error: 'Usuário inativo' },
        { status: 403 }
      );
    }

    // Renovar sessão (extender expiração por mais 30 dias)
    await dbQuery(
      `UPDATE sessions 
       SET expires_at = now() + interval '30 days',
           updated_at = now()
       WHERE id = $1`,
      [session.id]
    );

    // Atualizar last_login
    await dbQuery(
      `UPDATE users SET last_login = now() WHERE id = $1`,
      [session.user_id]
    );

    const userData = {
      id: session.user_id,
      telefone: session.telefone,
      nome: session.nome,
      email: session.email,
      role: session.role,
      gerente_id: session.gerente_id,
      avatar_url: session.avatar_url,
      workspace_id: session.workspace_id,
      workspaceId: session.workspace_id,
      imobiliaria_id: session.imobiliaria_id,
      imobiliaria: session.imobiliaria_nome,
      is_active: session.is_active,
    };

    // Criar novo cookie seguro (httpOnly, secure em prod, 30 dias)
    const newSessionCookie = createSessionCookie({
      userId: session.user_id,
      phone: session.telefone,
      sessionId: session.id,
      role: session.role,
      workspaceId: session.workspace_id,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Sessão renovada com sucesso',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      user: userData,
    });

    response.headers.set('Set-Cookie', newSessionCookie);
    return response;
  } catch (error) {
    console.error('[refresh] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao renovar sessão' },
      { status: 500 }
    );
  }
}
