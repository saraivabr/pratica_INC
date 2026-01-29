import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validateRequest, LoginSchema } from '@/lib/validation-schemas';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    // Validate request body with Zod
    const validation = await validateRequest(request, LoginSchema);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: 5 login attempts per 15 minutes per email
    const rateLimitKey = `login:${normalizedEmail}`;
    const rateLimit = await rateLimiter.check(rateLimitKey, RateLimitConfigs.LOGIN);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas de login. Tente novamente mais tarde.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': RateLimitConfigs.LOGIN.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    // Find user by email (case-insensitive)
    const { rows: userRows } = await dbQuery(
      `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );

    const user = userRows[0];

    // Email não existe OU senha não configurada
    // Retornar mesmo erro para ambos os casos (segurança contra enumeração)
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se usuário está ativo
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Usuário inativo. Entre em contato com seu gerente.' },
        { status: 403 }
      );
    }

    // Verificar senha com bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Criar sessão válida
    const { rows: sessionRows } = await dbQuery(
      `INSERT INTO sessions (user_id, is_verified, expires_at)
       VALUES ($1, true, now() + interval '7 days')
       RETURNING id`,
      [user.id]
    );
    
    const session = sessionRows[0];

    if (!session) {
      console.error('[Login] Failed to create session for user:', user.id);
      return NextResponse.json(
        { error: 'Erro ao criar sessão' },
        { status: 500 }
      );
    }

    // Atualizar last_login
    await dbQuery(
      `UPDATE users SET last_login = now() WHERE id = $1`,
      [user.id]
    );

    // Retornar dados da sessão
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        role: user.role,
        imobiliaria_id: user.imobiliaria_id,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
