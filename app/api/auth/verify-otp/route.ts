import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';
import { validateRequest, VerifyOTPSchema } from '@/lib/validation-schemas';
import { normalizePhone } from '@/lib/supabase';
import { createSessionCookie } from '@/lib/session-utils';

export async function POST(request: Request) {
  try {
    // Validate request body with Zod
    const validation = await validateRequest(request, VerifyOTPSchema);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { sessionId, code: otpCode, telefone } = validation.data;

    // Rate limiting: 5 verification attempts per 15 minutes per phone
    if (telefone) {
      const normalizedPhone = normalizePhone(telefone);
      const rateLimitKey = `otp:verify:${normalizedPhone}`;
      const rateLimit = await rateLimiter.check(rateLimitKey, RateLimitConfigs.OTP_VERIFY);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Muitas tentativas de verificação. Tente novamente mais tarde.',
            retryAfter: rateLimit.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimit.retryAfter?.toString() || '900',
              'X-RateLimit-Limit': RateLimitConfigs.OTP_VERIFY.maxRequests.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            },
          }
        );
      }
    }

    // Find session and verify OTP
    const { rows } = await dbQuery(
      `select s.*, 
              u.id as user_id, 
              u.telefone, 
              u.nome, 
              u.role, 
              u.gerente_id, 
              u.avatar_url, 
              u.is_active,
              u.workspace_id,
              u.imobiliaria_id,
              i.nome as imobiliaria_nome,
              u.onboarding_status
       from sessions s
       join users u on u.id = s.user_id
       left join imobiliarias i on i.id = u.imobiliaria_id
       where s.id = $1
       limit 1`,
      [sessionId]
    );

    const session = rows[0];
    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Check if OTP matches
    if (session.otp_code !== otpCode) {
      return NextResponse.json(
        { error: 'Código incorreto' },
        { status: 400 }
      );
    }

    // Check if OTP expired
    if (new Date(session.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Código expirado. Solicite um novo.' },
        { status: 400 }
      );
    }

    // Mark session as verified
    await dbQuery(
      `update sessions set is_verified = true, otp_code = null where id = $1`,
      [sessionId]
    );

    // Update user last login
    await dbQuery(
      `update users set last_login = now() where id = $1`,
      [session.user_id]
    );

    // Validar workspace_id
    if (!session.workspace_id) {
      console.error(`[verify-otp] User ${session.user_id} sem workspace_id! Isso não deveria acontecer após migração 022.`);
      // Não bloquear login - workspace será criado automaticamente pelo requireWorkspaceContext
    }

    const userData = {
      id: session.user_id,
      telefone: session.telefone,
      nome: session.nome,
      role: session.role,
      gerente_id: session.gerente_id,
      avatar_url: session.avatar_url,
      workspace_id: session.workspace_id,
      workspaceId: session.workspace_id,  // Alias
      imobiliaria_id: session.imobiliaria_id,
      imobiliaria: session.imobiliaria_nome,
      onboarding_status: session.onboarding_status,
    };

    // Criar cookie seguro (httpOnly, secure em prod, 30 dias)
    const sessionCookie = createSessionCookie({
      userId: session.user_id,
      phone: session.telefone,
      sessionId: session.id,
      role: session.role,
      workspaceId: session.workspace_id,
    });

    const response = NextResponse.json({
      success: true,
      sessionId: session.id,
      user: userData,
    });

    response.headers.set('Set-Cookie', sessionCookie);
    return response;
  } catch (error) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
