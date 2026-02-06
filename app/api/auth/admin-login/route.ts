import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { cookies, headers } from 'next/headers'
import { setAuthCookie } from '@/lib/api-auth'

async function getBaseUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const redirect = searchParams.get('redirect') || '/admin'
    const baseUrl = await getBaseUrl()

    // SECURITY: Validate admin key from httpOnly cookie (not URL)
    const adminSecretKey = process.env.ADMIN_SECRET_KEY
    if (!adminSecretKey) {
      return NextResponse.redirect(new URL('/login?error=config_error', baseUrl))
    }

    const cookieStore = await cookies()
    const adminToken = cookieStore.get('admin-auth-token')?.value
    if (!adminToken || adminToken !== adminSecretKey) {
      console.error('[admin-login] Invalid or missing admin-auth-token cookie');
      return NextResponse.redirect(new URL('/login?error=admin_required', baseUrl))
    }

    // Find or create admin user
    let adminUser = await findAdminUser()

    if (!adminUser) {
      const createdUser = await createAdminUser()
      if (!createdUser) {
        return NextResponse.redirect(new URL('/login?error=admin_error', baseUrl))
      }
      adminUser = createdUser
    }

    // Create session in database
    const { rows: sessionRows } = await dbQuery(
      `insert into sessions (user_id, is_verified, expires_at)
       values ($1, true, now() + interval '30 days')
       returning id`,
      [adminUser.id]
    )

    const sessionId = sessionRows[0]?.id

    // Build redirect response with signed auth cookies
    const response = NextResponse.redirect(new URL(redirect, baseUrl))

    // Set signed httpOnly auth cookie + non-httpOnly session cookie
    setAuthCookie(response, sessionId, adminUser.id, {
      role: 'admin',
      nome: adminUser.nome,
    })

    // SECURITY: Clean up the one-time admin auth token
    response.cookies.delete('admin-auth-token')

    // Update last login
    await dbQuery(
      `update users set last_login = now() where id = $1`,
      [adminUser.id]
    )

    // Redirect to admin page (without the key in URL)
    return response
  } catch (error) {
    console.error('Error in admin-login:', error)
    const baseUrl = await getBaseUrl()
    return NextResponse.redirect(new URL('/login?error=server_error', baseUrl))
  }
}

async function findAdminUser() {
  const { rows } = await dbQuery(
    `select id, nome, telefone, role
     from users
     where role = 'admin' and is_active = true
     order by created_at asc
     limit 1`
  )
  return rows[0] || null
}

async function createAdminUser() {
  try {
    const { rows } = await dbQuery(
      `insert into users (telefone, nome, role, is_active)
       values ('admin', 'Administrador', 'admin', true)
       on conflict (telefone) do update set role = 'admin', is_active = true
       returning id, nome, telefone, role`
    )
    return rows[0] || null
  } catch (error) {
    console.error('Error creating admin user:', error)
    return null
  }
}
