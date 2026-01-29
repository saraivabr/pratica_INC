import { NextResponse, NextRequest } from 'next/server';
import { dbQuery } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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

    // Also check for pratica-session cookie (JSON with sessionId inside)
    if (!sessionId) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        // Try pratica-session first (the actual cookie used by the app)
        const praticaMatch = cookieHeader.match(/pratica-session=([^;]+)/);
        if (praticaMatch) {
          try {
            const decoded = decodeURIComponent(praticaMatch[1]);
            const parsed = JSON.parse(decoded);
            sessionId = parsed.sessionId || null;
          } catch {
            // Not JSON, use as-is
            sessionId = praticaMatch[1];
          }
        }
        // Fallback to plain session cookie
        if (!sessionId) {
          const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
          if (match) {
            sessionId = match[1];
          }
        }
      }
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Find and validate session
    const { rows } = await dbQuery(
      `select s.*, u.id as user_id, u.telefone, u.nome, u.role, u.gerente_id, u.avatar_url, u.is_active, u.imobiliaria_id, u.workspace_id,
              i.nome as imobiliaria_nome
       from sessions s
       join users u on u.id = s.user_id
       left join imobiliarias i on i.id = u.imobiliaria_id
       where s.id = $1 and s.is_verified = true and s.expires_at > now()
       limit 1`,
      [sessionId]
    );
    const session = rows[0];

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada' },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (!session.is_active) {
      return NextResponse.json(
        { error: 'Usuário inativo' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: session.user_id,
        telefone: session.telefone,
        nome: session.nome,
        role: session.role,
        gerente_id: session.gerente_id,
        avatar_url: session.avatar_url,
        workspace_id: session.workspace_id,
        imobiliaria_id: session.imobiliaria_id,
        imobiliaria: session.imobiliaria_nome,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
