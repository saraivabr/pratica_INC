import { NextResponse, NextRequest } from 'next/server';
import { dbQuery } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get session ID from Authorization header or Cookie
    let sessionId: string | null = null;

    // Try Authorization header first (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7);
    }

    // Try Cookie if no auth header
    if (!sessionId) {
      const cookieStore = await cookies();
      sessionId = cookieStore.get('session')?.value ?? null;
    }

    // Also check for session cookie in request header
    if (!sessionId) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/session=([^;]+)/);
        if (match) {
          sessionId = match[1];
        }
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
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
