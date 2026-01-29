import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get('pratica-session')?.value;

    const user = await getAuthenticatedUser(request);

    return NextResponse.json({
      cookie_exists: !!cookie,
      cookie_value: cookie,
      user_found: !!user,
      user: user ? {
        id: user.id,
        nome: user.nome,
        telefone: user.telefone
      } : null
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
