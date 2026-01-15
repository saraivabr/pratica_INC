import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendOTP } from "@/services/whatsapp"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { whatsapp } = await req.json()

    if (!whatsapp) {
      return NextResponse.json({ error: "WhatsApp é obrigatório" }, { status: 400 })
    }

    const cleanPhone = whatsapp.replace(/\D/g, "")
    
    let phoneWith55 = cleanPhone
    let phoneWithout55 = cleanPhone

    if (cleanPhone.startsWith("55") && cleanPhone.length > 11) {
      phoneWithout55 = cleanPhone.substring(2)
    } else {
      phoneWith55 = "55" + cleanPhone
    }

    const corretor = await prisma.corretor.findFirst({
      where: {
        whatsapp: {
          in: [phoneWith55, phoneWithout55, cleanPhone]
        }
      }
    })

    if (!corretor) {
      return NextResponse.json({ error: "Corretor não encontrado ou não autorizado" }, { status: 404 })
    }

    // Gera código aleatório de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Gera token único para o link de login
    const token = crypto.randomBytes(32).toString("hex")

    // Expira em 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    // Salva no banco com o token do link
    await prisma.authCode.create({
      data: {
        whatsapp: corretor.whatsapp,
        code,
        token,
        expiresAt
      }
    })

    // Envia via WhatsApp usando o novo método de botões
    const result = await sendOTP(phoneWith55, code, token)

    if (!result.success) {
      return NextResponse.json({ error: "Erro ao enviar mensagem via WhatsApp" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Código enviado com sucesso" })
  } catch (error) {
    console.error("Erro na rota send-code:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
