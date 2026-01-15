import { NextResponse } from "next/server"
import database from "@/data/pratica_database.json"
import { Empreendimento } from "@/types/empreendimento"

export async function GET() {
  try {
    const empreendimentos: Empreendimento[] = [
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

    return NextResponse.json(empreendimentos)
  } catch (error) {
    console.error("Error fetching empreendimentos:", error)
    return NextResponse.json(
      { error: "Failed to fetch empreendimentos" },
      { status: 500 }
    )
  }
}
