import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=token_missing", req.url))
    }

    // Busca o código/token no banco
    const authCode = await prisma.authCode.findUnique({
      where: { 
        token: token 
      }
    })

    if (!authCode || authCode.used || authCode.expiresAt < new Date()) {
      return NextResponse.redirect(new URL("/login?error=token_invalid", req.url))
    }

    // Marca como usado
    await prisma.authCode.update({
      where: { id: authCode.id },
      data: { used: true }
    })

    // Busca o corretor
    const corretor = await prisma.corretor.findUnique({
      where: { whatsapp: authCode.whatsapp }
    })

    if (!corretor || !corretor.ativo) {
      return NextResponse.redirect(new URL("/login?error=corretor_not_found", req.url))
    }

    // O truque aqui é redirecionar para uma página que faz o auto-login no client-side
    // ou usar um cookie temporário se estivéssemos usando sessions puras.
    // Como usamos NextAuth com Credentials, precisamos fazer o signIn no client.
    
    // Redirecionamos para o login passando os parâmetros para auto-login automático
    const autoLoginUrl = new URL("/login", req.url)
    autoLoginUrl.searchParams.set("whatsapp", authCode.whatsapp)
    autoLoginUrl.searchParams.set("auto_code", authCode.code)
    
    return NextResponse.redirect(autoLoginUrl)
  } catch (error) {
    console.error("Erro ao verificar link:", error)
    return NextResponse.redirect(new URL("/login?error=server_error", req.url))
  }
}
