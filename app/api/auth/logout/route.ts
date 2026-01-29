import { NextResponse, NextRequest } from 'next/server';
import { dbQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { clearSessionCookie, parseSessionCookie } from '@/lib/session-utils';

export async function POST(request: NextRequest) {
  try {
    // Get session ID from Cookie
    let sessionId: string | null = null;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pratica-session')?.value;
    
    if (sessionCookie) {
      const parsed = parseSessionCookie(sessionCookie);
      if (parsed) {
        sessionId = parsed.sessionId;
      }
    }

    if (sessionId) {
      // Invalidate the session
      await dbQuery(
        `delete from sessions where id = $1`,
        [sessionId]
      );
    }

    // Clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });

    response.headers.set('Set-Cookie', clearSessionCookie());
    return response;
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
