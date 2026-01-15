import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const emp = await prisma.empreendimento.findUnique({
      where: { id },
      include: {
        unidades: true
      }
    })

    if (!emp) {
      return NextResponse.json(
        { error: "Empreendimento not found" },
        { status: 404 }
      )
    }

    const dados = emp.dadosJson as Record<string, unknown> || {}

    const formatted = {
      id: emp.id,
      nome: emp.nome,
      status: emp.status,
      entrega_prevista: emp.entregaPrevista?.toISOString().split('T')[0],
      imagemCapa: emp.imagemCapa,
      localizacao: {
        bairro: emp.bairro || '',
        zona: emp.zona,
        ...(dados.localizacao as object || {})
      },
      tipologias: dados.tipologias || [],
      lazer: dados.lazer || [],
      diferenciais: dados.diferenciais || [],
      galeria: dados.galeria || [],
      configuracao: dados.configuracao || {},
      preco_m2: dados.preco_m2,
      financiamento: dados.financiamento || [],
      unidades: emp.unidades.map(u => ({
        id: u.id,
        numero: u.numero,
        area_m2: Number(u.areaM2),
        dormitorios: u.dormitorios,
        tipologia: u.tipologia,
        valorTotal: Number(u.valorTotal),
        status: u.status,
        plano: u.planoJson
      }))
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching empreendimento:", error)
    return NextResponse.json(
      { error: "Failed to fetch empreendimento" },
      { status: 500 }
    )
  }
}
