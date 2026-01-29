import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validateRequest, RegisterSchema } from '@/lib/validation-schemas';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    // Validate request body with Zod
    const validation = await validateRequest(request, RegisterSchema);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { nome, email, password, telefone, role } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: max 5 registration attempts per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `register:${ip}`;
    const rateLimit = await rateLimiter.check(rateLimitKey, RateLimitConfigs.LOGIN);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '900',
          },
        }
      );
    }

    // Check if email already exists
    const { rows: existingUsersByEmail } = await dbQuery(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );

    if (existingUsersByEmail.length > 0) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 409 }
      );
    }

    // Check if phone already exists (if provided)
    if (telefone) {
      const normalizedPhone = telefone.replace(/\D/g, '');
      const { rows: existingUsersByPhone } = await dbQuery(
        `SELECT id FROM users WHERE telefone = $1 LIMIT 1`,
        [normalizedPhone]
      );

      if (existingUsersByPhone.length > 0) {
        return NextResponse.json(
          { error: 'Este telefone já está cadastrado no sistema' },
          { status: 409 }
        );
      }
    }

    // Hash password with bcrypt (salt rounds: 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Get default tenant (all users start with tenant 1)
    const { rows: tenantRows } = await dbQuery(
      `SELECT id FROM tenants ORDER BY id LIMIT 1`
    );
    const tenantId = tenantRows[0]?.id || 1;

    // Get default workspace for tenant
    const { rows: workspaceRows } = await dbQuery(
      `SELECT id FROM workspaces WHERE tenant_id = $1 ORDER BY id LIMIT 1`,
      [tenantId]
    );
    const workspaceId = workspaceRows[0]?.id;

    // Create user with password_hash
    const { rows: userRows } = await dbQuery(
      `INSERT INTO users (
        nome, 
        email, 
        telefone, 
        password_hash, 
        role, 
        tenant_id,
        workspace_id,
        onboarding_status, 
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', true)
      RETURNING id, nome, email, telefone, role, workspace_id`,
      [
        nome,
        normalizedEmail,
        telefone || null,
        passwordHash,
        role,
        tenantId,
        workspaceId,
      ]
    );

    const user = userRows[0];

    if (!user) {
      console.error('[Register] Failed to create user');
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Create session
    const { rows: sessionRows } = await dbQuery(
      `INSERT INTO sessions (user_id, is_verified, expires_at)
       VALUES ($1, true, now() + interval '7 days')
       RETURNING id`,
      [user.id]
    );
    
    const session = sessionRows[0];

    if (!session) {
      console.error('[Register] Failed to create session for user:', user.id);
      return NextResponse.json(
        { error: 'Erro ao criar sessão' },
        { status: 500 }
      );
    }

    // Return session data
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        role: user.role,
        workspace_id: user.workspace_id,
      },
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
