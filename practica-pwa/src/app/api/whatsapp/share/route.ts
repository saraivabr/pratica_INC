import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendText } from "@/lib/evolution"
import { Empreendimento } from "@/types/empreendimento"

function formatarPreco(valor: number | undefined): string {
  if (!valor) return "Consulte"
  return valor.toLocaleString("pt-BR")
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "em_construcao":
      return "Em Construcao"
    case "lancamento":
      return "Lancamento"
    case "entregue":
      return "Pronto para Morar"
    default:
      return status
  }
}

function formatarMensagemResumida(emp: Empreendimento): string {
  const preco = emp.tipologias?.[0]?.preco_base
  const areas = emp.tipologias
    ?.slice(0, 3)
    .map((t) => `${t.area_m2}m²`)
    .join(" | ")

  return `*${emp.nome}* - ${getStatusLabel(emp.status)}

📍 ${emp.localizacao.bairro} - ${emp.localizacao.zona}
${emp.localizacao.proximidade_metro ? `🚇 ${emp.localizacao.proximidade_metro}` : ""}

💰 A partir de R$ ${formatarPreco(preco)}
📐 ${areas}

*Pratica Construtora* - 25 anos
📞 (11) 2042-3206
🌐 pratica-inc.com.br`
}

function formatarMensagemCompleta(
  emp: Empreendimento,
  mensagemPersonalizada?: string
): string {
  const preco = emp.tipologias?.[0]?.preco_base
  const areas = emp.tipologias
    ?.slice(0, 3)
    .map((t) => `${t.area_m2}m²`)
    .join(" | ")

  let mensagem = `*${emp.nome}* - ${getStatusLabel(emp.status)}

📍 ${emp.localizacao.bairro} - ${emp.localizacao.zona}
${emp.localizacao.proximidade_metro ? `🚇 ${emp.localizacao.proximidade_metro}` : ""}

💰 A partir de R$ ${formatarPreco(preco)}
📐 ${areas}

🏢 ${emp.configuracao?.torres || 1} torre(s)${emp.configuracao?.pavimentos ? ` | ${emp.configuracao.pavimentos} andares` : ""}`

  if (emp.diferenciais && emp.diferenciais.length > 0) {
    mensagem += `

✨ *Diferenciais:*
${emp.diferenciais.slice(0, 5).map((d) => `• ${d}`).join("\n")}`
  }

  if (emp.lazer && emp.lazer.length > 0) {
    mensagem += `

🏊 *Lazer:*
${emp.lazer.slice(0, 8).map((l) => `• ${l}`).join("\n")}`
  }

  if (mensagemPersonalizada) {
    mensagem += `

💬 ${mensagemPersonalizada}`
  }

  mensagem += `

*Pratica Construtora* - 25 anos de experiencia
📞 (11) 2042-3206
🌐 pratica-inc.com.br`

  return mensagem
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.whatsapp) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { empreendimento, tipo, mensagemPersonalizada } = body as {
      empreendimento: Empreendimento
      tipo: "resumido" | "completo"
      mensagemPersonalizada?: string
    }

    if (!empreendimento) {
      return NextResponse.json(
        { error: "Empreendimento obrigatorio" },
        { status: 400 }
      )
    }

    const mensagem =
      tipo === "completo"
        ? formatarMensagemCompleta(empreendimento, mensagemPersonalizada)
        : formatarMensagemResumida(empreendimento)

    const targetNumber = session.user.whatsapp

    const result = await sendText(targetNumber, mensagem)

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    } else {
      console.error("Falha ao enviar WhatsApp:", result.error)
      return NextResponse.json(
        { error: result.error || "Falha ao enviar" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Erro no endpoint de compartilhamento:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
