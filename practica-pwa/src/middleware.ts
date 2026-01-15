import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Rotas que requerem autenticação
const protectedRoutes = ["/catalogo", "/favoritos", "/perfil"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verifica se a rota atual é protegida
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isProtectedRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Se não estiver autenticado, redireciona para login
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Se estiver autenticado e tentar acessar login, redireciona para catálogo
  if (pathname === "/login") {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (token) {
      return NextResponse.redirect(new URL("/catalogo", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/catalogo/:path*",
    "/favoritos/:path*",
    "/perfil/:path*",
    "/login",
  ],
}
