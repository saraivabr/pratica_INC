import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendOTP } from "@/services/whatsapp"

export async function POST(req: NextRequest) {
  try {
    const { whatsapp } = await req.json()

    if (!whatsapp) {
      return NextResponse.json({ error: "WhatsApp é obrigatório" }, { status: 400 })
    }

    const whatsappNormalizado = whatsapp.replace(/\D/g, "")

    // Verifica se o corretor existe
    const corretor = await prisma.corretor.findUnique({
      where: { whatsapp: whatsappNormalizado }
    })

    if (!corretor) {
      return NextResponse.json({ error: "Corretor não encontrado ou não autorizado" }, { status: 404 })
    }

    // Gera código aleatório de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Expira em 10 minutos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Salva no banco
    await prisma.authCode.create({
      data: {
        whatsapp: whatsappNormalizado,
        code,
        expiresAt
      }
    })

    // Envia via WhatsApp
    const result = await sendOTP(whatsappNormalizado, code)

    if (!result.success) {
      return NextResponse.json({ error: "Erro ao enviar mensagem via WhatsApp" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Código enviado com sucesso" })
  } catch (error) {
    console.error("Erro na rota send-code:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
