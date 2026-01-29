import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validateRequest, SetPasswordSchema } from '@/lib/validation-schemas';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Validate request body with Zod
    const validation = await validateRequest(request, SetPasswordSchema);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Hash password with bcrypt (salt rounds: 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await dbQuery(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [passwordHash, user.id]
    );

    return NextResponse.json({
      success: true,
      message: user.password_hash 
        ? 'Senha alterada com sucesso' 
        : 'Senha cadastrada com sucesso',
    });
  } catch (error) {
    console.error('[SetPassword] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
