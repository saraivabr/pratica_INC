import { NextResponse } from "next/server"
import database from "@/data/pratica_database.json"
import { Empreendimento } from "@/types/empreendimento"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const todosEmpreendimentos: Empreendimento[] = [
      ...database.empreendimentos.em_construcao.map((e) => ({
        ...e,
        status: "em_construcao" as const,
      })),
      ...database.empreendimentos.em_lancamento.map((e) => ({
        ...e,
        status: "lancamento" as const,
      })),
      ...database.empreendimentos.entregues.map((e) => ({
        ...e,
        status: "entregue" as const,
      })),
    ]

    const empreendimento = todosEmpreendimentos.find((e) => e.id === id)

    if (!empreendimento) {
      return NextResponse.json(
        { error: "Empreendimento not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(empreendimento)
  } catch (error) {
    console.error("Error fetching empreendimento:", error)
    return NextResponse.json(
      { error: "Failed to fetch empreendimento" },
      { status: 500 }
    )
  }
}
