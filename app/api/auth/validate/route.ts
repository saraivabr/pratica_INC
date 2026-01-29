import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ valid: false });
    }

    // Find and validate session
    const { rows } = await dbQuery(
      `select s.*, u.id as user_id, u.telefone, u.nome, u.role, u.gerente_id, u.avatar_url, u.is_active,
              u.workspace_id, u.imobiliaria_id, u.onboarding_status,
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
      return NextResponse.json({ valid: false });
    }

    // Check if user is still active
    if (!session.is_active) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      sessionId: sessionId,
      user: {
        id: session.user_id,
        telefone: session.telefone,
        nome: session.nome,
        role: session.role,
        gerente_id: session.gerente_id,
        avatar_url: session.avatar_url,
        workspace_id: session.workspace_id,
        workspaceId: session.workspace_id,
        imobiliaria_id: session.imobiliaria_id,
        imobiliaria: session.imobiliaria_nome,
        onboarding_status: session.onboarding_status,
      },
    });
  } catch (error) {
    console.error('Error in validate:', error);
    return NextResponse.json({ valid: false });
  }
}
