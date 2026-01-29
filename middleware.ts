import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}`
}

// Routes that require authentication
const protectedRoutes = [
  '/empreendimentos',
  '/calculadora',
  '/chat',
  '/perfil',
  '/corretor',
  '/dashboard',
  '/leads',
  '/onboarding/whatsapp',
]

// Route prefixes that require authentication
const protectedPrefixes = [
  '/empreendimentos/',
  '/admin/',
  '/gerente/',
  '/corretor/',
]

// Routes that are always public (no auth required)
const publicRoutes = [
  '/',               // Landing page is public
  '/login',
  '/auth/callback',
]

// Route prefixes that are always public
const publicPrefixes = [
  '/api/',
  '/_next/',
  '/share/',
]

// Static files that are always public
const publicFiles = [
  '/favicon.ico',
  '/manifest.json',
  '/apple-icon.png',
]

// File patterns that are always public
const publicFilePatterns = [
  /^\/icon.*$/,
  /^\/logo.*$/,
]

function isPublicRoute(pathname: string): boolean {
  // Check exact public routes
  if (publicRoutes.includes(pathname)) {
    return true
  }

  // Check public prefixes
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return true
  }

  // Check public files
  if (publicFiles.includes(pathname)) {
    return true
  }

  // Check public file patterns
  if (publicFilePatterns.some(pattern => pattern.test(pathname))) {
    return true
  }

  return false
}

function isProtectedRoute(pathname: string): boolean {
  // Homepage is NOT protected (public landing page)
  if (pathname === '/') {
    return false
  }

  // Check exact protected routes
  if (protectedRoutes.includes(pathname)) {
    return true
  }

  // Check protected prefixes
  if (protectedPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return true
  }

  return false
}

interface SessionData {
  userId?: string
  phone?: string
  role?: 'corretor' | 'gerente' | 'admin'
  workspaceId?: number  // NEW: User Workspace Architecture
}

function getSessionData(request: NextRequest): SessionData | null {
  // Check for session cookie
  const sessionCookie = request.cookies.get('pratica-session')

  if (sessionCookie?.value) {
    try {
      // Decode URL-encoded cookie value and parse JSON
      const decodedValue = decodeURIComponent(sessionCookie.value)
      const session = JSON.parse(decodedValue)
      if (session.userId && session.phone) {
        return {
          userId: session.userId,
          phone: session.phone,
          role: session.role || 'corretor',
          workspaceId: session.workspaceId  // NEW: User Workspace
        }
      }
    } catch {
      // Invalid JSON in cookie
    }
  }

  return null
}

function isAuthenticated(request: NextRequest): boolean {
  return getSessionData(request) !== null
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const session = getSessionData(request)
  const baseUrl = getBaseUrl(request)

  // DEBUG: Log homepage access
  if (pathname === '/') {
    console.log('[middleware] Homepage accessed:', {
      pathname,
      hasSession: !!session,
      isPublic: isPublicRoute(pathname),
      isProtected: isProtectedRoute(pathname),
    })
  }

  // Handle admin secret key authentication
  if (pathname.startsWith('/admin')) {
    const secretKey = searchParams.get('key')
    const adminSecretKey = process.env.ADMIN_SECRET_KEY

    // If secret key is provided, redirect to auth endpoint
    if (secretKey && adminSecretKey && secretKey === adminSecretKey) {
      const authUrl = new URL('/api/auth/admin-login', baseUrl)
      authUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(authUrl)
    }

    // If already authenticated as admin/gerente, allow access
    if (session) {
      const isAdminOrGerente = session.role === 'admin' || session.role === 'gerente'
      if (isAdminOrGerente) {
        return NextResponse.next()
      } else {
        // Corretores cannot access admin area
        return NextResponse.redirect(new URL('/dashboard', baseUrl))
      }
    }

    // Not authenticated and no valid key - show unauthorized
    return NextResponse.redirect(new URL('/login?error=admin_required', baseUrl))
  }

  // Always allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Role-based redirects for homepage (quando autenticado)
  if (pathname === '/' && session) {
    const isAdminOrGerente = session.role === 'admin' || session.role === 'gerente'
    if (isAdminOrGerente) {
      return NextResponse.redirect(new URL('/admin', baseUrl))
    } else {
      return NextResponse.redirect(new URL('/dashboard', baseUrl))
    }
  }

  // Check if it's a protected route
  if (isProtectedRoute(pathname)) {
    // Check authentication
    if (!session) {
      // Redirect to login page
      const loginUrl = new URL('/login', baseUrl)
      // Optionally add redirect parameter to return after login
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // NEW: Validate workspace_id (User Workspace Architecture)
    if (!session.workspaceId && pathname !== '/onboarding/workspace') {
      console.warn(`[middleware] User ${session.userId} sem workspace_id tentando acessar ${pathname}`)
      // Redirect to workspace setup (will be created automatically)
      // For now, just log and continue - workspace will be auto-created by API
      // return NextResponse.redirect(new URL('/onboarding/workspace', baseUrl))
    }
  }

  // Allow the request to proceed
  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - Images and static assets with common extensions
     */
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
