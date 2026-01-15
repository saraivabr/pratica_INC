import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendOTP } from "@/services/whatsapp"

export async function POST(req: NextRequest) {
  try {
    const { whatsapp } = await req.json()

    if (!whatsapp) {
      return NextResponse.json({ error: "WhatsApp é obrigatório" }, { status: 400 })
    }

    // Remove tudo que não é número
    const cleanPhone = whatsapp.replace(/\D/g, "")
    
    // Gera variações para busca (com e sem 55)
    let phoneWith55 = cleanPhone
    let phoneWithout55 = cleanPhone

    if (cleanPhone.startsWith("55") && cleanPhone.length > 11) {
      phoneWithout55 = cleanPhone.substring(2)
    } else {
      phoneWith55 = "55" + cleanPhone
    }

    console.log(`Buscando corretor por: ${phoneWith55} ou ${phoneWithout55}`)

    // Verifica se o corretor existe (busca por qualquer uma das variações)
    const corretor = await prisma.corretor.findFirst({
      where: {
        whatsapp: {
          in: [phoneWith55, phoneWithout55, cleanPhone]
        }
      }
    })

    if (!corretor) {
      console.log("Corretor não encontrado")
      return NextResponse.json({ error: "Corretor não encontrado ou não autorizado" }, { status: 404 })
    }

    console.log(`Corretor encontrado: ${corretor.nome}`)

    // Gera código aleatório de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Expira em 10 minutos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // O WhatsApp salvo no authCode deve ser o que vamos usar para validar depois (vamos padronizar para o que está no banco do corretor para facilitar, ou salvar o que foi usado no envio)
    // Mas para o envio via Z-API, TEM que ser com 55.
    
    // Vamos salvar no AuthCode o número exato que está no cadastro do corretor, para garantir o match no login
    await prisma.authCode.create({
      data: {
        whatsapp: corretor.whatsapp, // Salva vinculado ao número do cadastro
        code,
        expiresAt
      }
    })

    // Envia via WhatsApp (garantindo o 55 para a API)
    const result = await sendOTP(phoneWith55, code)

    if (!result.success) {
      console.error("Erro Z-API:", result)
      return NextResponse.json({ error: "Erro ao enviar mensagem via WhatsApp" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Código enviado com sucesso" })
  } catch (error) {
    console.error("Erro na rota send-code:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
