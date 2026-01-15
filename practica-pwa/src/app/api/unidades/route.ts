import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const empreendimentoId = searchParams.get('empreendimentoId')

    const where = empreendimentoId ? { empreendimentoId } : {}

    const unidades = await prisma.unidade.findMany({
      where,
      include: {
        empreendimento: true
      },
      orderBy: [
        { numero: 'asc' }
      ]
    })

    const formatted = unidades.map(u => ({
      id: u.id,
      empreendimentoId: u.empreendimentoId,
      empreendimentoNome: u.empreendimento.nome,
      numero: u.numero,
      unidade: u.numero,
      area: Number(u.areaM2),
      area_m2: Number(u.areaM2),
      dormitorios: u.dormitorios,
      tipologia: u.tipologia || `${u.dormitorios} Dormitórios`,
      valorTotal: Number(u.valorTotal),
      status: u.status,
      plano: u.planoJson
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching unidades:", error)
    return NextResponse.json(
      { error: "Failed to fetch unidades" },
      { status: 500 }
    )
  }
}
