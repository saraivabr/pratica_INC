import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const empreendimentos = await prisma.empreendimento.findMany({
      include: {
        unidades: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to match the expected format
    const formatted = empreendimentos.map((emp) => {
      const dados = emp.dadosJson as Record<string, unknown> || {}

      return {
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
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching empreendimentos:", error)
    return NextResponse.json(
      { error: "Failed to fetch empreendimentos" },
      { status: 500 }
    )
  }
}
