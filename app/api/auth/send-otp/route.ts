import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { sendMagicLink } from '@/lib/zapi';
import { randomBytes } from 'crypto';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';
import { validateRequest, SendOTPSchema } from '@/lib/validation-schemas';
import { normalizePhone } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Validate request body with Zod
    const validation = await validateRequest(request, SendOTPSchema);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { telefone } = validation.data;
    const normalizedPhone = normalizePhone(telefone);

    // Rate limiting: 3 OTP requests per hour per phone
    const rateLimitKey = `otp:send:${normalizedPhone}`;
    const rateLimit = await rateLimiter.check(rateLimitKey, RateLimitConfigs.OTP_SEND);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas. Tente novamente mais tarde.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': RateLimitConfigs.OTP_SEND.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    // Check if user exists (resilient: match normalized or digits-only)
    const { rows: userRows } = await dbQuery(
      `select * from users where telefone = $1
       or regexp_replace(telefone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
       limit 1`,
      [normalizedPhone]
    );
    const user = userRows[0];

    if (!user) {
      // User not found - needs to be invited by a manager
      return NextResponse.json({
        exists: false,
        message: 'Você ainda não foi cadastrado. Peça ao seu gerente para te adicionar.',
      });
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Usuário inativo. Entre em contato com seu gerente.' },
        { status: 403 }
      );
    }

    if (user.onboarding_status === 'pending') {
      return NextResponse.json({
        exists: true,
        needsOnboarding: true,
        message: 'Complete seu cadastro para continuar.',
        userId: user.id,
        nome: user.nome,
      });
    }

    // Bypass list controlled ONLY by environment variable
    const bypassList = (process.env.ADMIN_BYPASS_PHONES || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => normalizePhone(item));

    // Check if this is a bypass user (dev/test environment only)
    const isBypassUser = bypassList.includes(normalizedPhone) && process.env.NODE_ENV !== 'production';

    if (isBypassUser) {
      // Generate a predictable but not hardcoded code for bypass users
      const otpCode = process.env.BYPASS_OTP_CODE || Math.floor(100000 + Math.random() * 900000).toString();

      const { rows: sessionRows } = await dbQuery(
        `insert into sessions (user_id, otp_code, otp_expires_at, is_verified, expires_at)
         values ($1, $2, now() + interval '5 minutes', false, now() + interval '7 days')
         returning id`,
        [user.id, otpCode]
      );
      const session = sessionRows[0];

      if (!session) {
        return NextResponse.json(
          { error: 'Erro ao criar sessão' },
          { status: 500 }
        );
      }

      // Log OTP code only in server logs for development
      console.log(`[DEV ONLY] OTP para ${normalizedPhone}: ${otpCode}`);
      
      // Return without sending WhatsApp, but requiring OTP entry
      // Security: Never expose OTP in response, even in development
      return NextResponse.json({
        exists: true,
        sessionId: session.id,
        message: 'Ambiente de desenvolvimento. Código gerado (veja logs do servidor).',
        user: {
          id: user.id,
          nome: user.nome,
          role: user.role,
          telefone: user.telefone,
          gerente_id: user.gerente_id,
          avatar_url: user.avatar_url,
        },
      });
    }

    // Generate cryptographically secure 6-digit OTP code
    const buffer = randomBytes(3); // 3 bytes = 24 bits
    const number = buffer.readUIntBE(0, 3); // Read as big-endian unsigned int
    const otpCode = (number % 900000 + 100000).toString(); // Range: 100000-999999

    // Create session with OTP code
    // Use SQL now() + interval to avoid timezone mismatch between Node.js and PostgreSQL
    const { rows: sessionRows } = await dbQuery(
      `insert into sessions (user_id, otp_code, otp_expires_at, is_verified, expires_at)
       values ($1, $2, now() + interval '5 minutes', false, now() + interval '7 days')
       returning id`,
      [user.id, otpCode]
    );
    const session = sessionRows[0];

    if (!session) {
      return NextResponse.json(
        { error: 'Erro ao criar sessão' },
        { status: 500 }
      );
    }

    // Send magic link AND code via WhatsApp
    // We pass otpCode as the magicToken so the link works with the same code
    const sendResult = await sendMagicLink(normalizedPhone, otpCode, user.nome);

    if (sendResult.error) {
      console.error('Error sending magic link:', sendResult.error);
      return NextResponse.json(
        { error: 'Erro ao enviar link. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: true,
      sessionId: session.id, // Return session ID for manual OTP verification
      message: 'Link de acesso enviado no WhatsApp! Clique no botão para entrar.',
      user: {
        id: user.id,
        nome: user.nome,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
