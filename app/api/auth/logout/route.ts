import { NextResponse, NextRequest } from 'next/server';
import { dbQuery } from '@/lib/db';
import { clearAuthCookie } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Try to extract sessionId from the signed auth cookie to invalidate the DB session
    let sessionId: string | null = null;

    // Try the signed auth cookie (pratica-auth)
    const authCookie = request.cookies.get('pratica-auth')?.value;
    if (authCookie) {
      try {
        const dotIndex = authCookie.lastIndexOf('.');
        if (dotIndex !== -1) {
          const payloadStr = authCookie.substring(0, dotIndex);
          const decoded = Buffer.from(payloadStr, 'base64').toString('utf-8');
          const payload = JSON.parse(decoded);
          if (payload.sessionId) {
            sessionId = payload.sessionId;
          }
        }
      } catch {
        // Failed to parse signed cookie, continue
      }
    }

    // Fallback: try legacy pratica-session cookie
    if (!sessionId) {
      const sessionCookie = request.cookies.get('pratica-session')?.value;
      if (sessionCookie) {
        try {
          const decoded = decodeURIComponent(sessionCookie);
          const data = JSON.parse(decoded);
          if (data.sessionId) {
            sessionId = data.sessionId;
          }
        } catch {
          // Failed to parse legacy cookie
        }
      }
    }

    // Fallback: try Authorization header
    if (!sessionId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7);
      }
    }

    // Invalidate session in database
    if (sessionId) {
      await dbQuery(
        `DELETE FROM sessions WHERE id = $1`,
        [sessionId]
      );
    }

    // Clear both auth cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });

    clearAuthCookie(response);

    return response;
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    // Still try to clear cookies even on error
    const response = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
    clearAuthCookie(response);
    return response;
  }
}
