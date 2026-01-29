import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { createSessionCookie } from '@/lib/session-utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://corretorparceria.com.br';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=token_missing', BASE_URL));
    }

    // Find session by magic token
    const { rows } = await dbQuery(
      `select s.*, u.id as user_id, u.telefone, u.nome, u.role, u.gerente_id, u.is_active, u.workspace_id
       from sessions s
       join users u on u.id = s.user_id
       where s.otp_code = $1 and s.is_verified = false and s.otp_expires_at > now()
       limit 1`,
      [token]
    );

    const session = rows[0];
    if (!session) {
      return NextResponse.redirect(new URL('/login?error=link_expired', BASE_URL));
    }

    if (!session.is_active) {
      return NextResponse.redirect(new URL('/login?error=user_inactive', BASE_URL));
    }

    // Mark session as verified and clear the token
    await dbQuery(
      `update sessions set is_verified = true, otp_code = null where id = $1`,
      [session.id]
    );

    // Update user last login
    await dbQuery(
      `update users set last_login = now() where id = $1`,
      [session.user_id]
    );

    // Create auth data for client-side
    const authData = {
      sessionId: session.id,
      user: {
        id: session.user_id,
        telefone: session.telefone,
        nome: session.nome,
        role: session.role,
        gerente_id: session.gerente_id,
        workspace_id: session.workspace_id,
      },
    };

    // Criar cookie seguro (httpOnly, secure em prod, 30 dias)
    const sessionCookie = createSessionCookie({
      userId: session.user_id,
      phone: session.telefone,
      sessionId: session.id,
      role: session.role,
      workspaceId: session.workspace_id,
    });

    // Redirect to a page that will set the auth state
    const authUrl = new URL('/auth/callback', BASE_URL);
    authUrl.searchParams.set('data', Buffer.from(JSON.stringify(authData)).toString('base64'));

    const response = NextResponse.redirect(authUrl);
    response.headers.set('Set-Cookie', sessionCookie);
    return response;
  } catch (error) {
    console.error('Error in magic link:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', BASE_URL));
  }
}
