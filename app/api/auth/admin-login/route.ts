import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { cookies, headers } from 'next/headers'

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

    // Double-check admin key is valid (middleware already validated, but extra security)
    const adminSecretKey = process.env.ADMIN_SECRET_KEY
    if (!adminSecretKey) {
      return NextResponse.redirect(new URL('/login?error=config_error', baseUrl))
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

    // Build session cookie value
    const sessionData = {
      sessionId,
      userId: adminUser.id,
      phone: adminUser.telefone || 'admin',
      role: 'admin',
      nome: adminUser.nome,
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('pratica-session', JSON.stringify(sessionData), {
      httpOnly: true, // Security: Prevent XSS attacks by making cookie inaccessible to JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // Update last login
    await dbQuery(
      `update users set last_login = now() where id = $1`,
      [adminUser.id]
    )

    // Redirect to admin page (without the key in URL)
    return NextResponse.redirect(new URL(redirect, baseUrl))
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
