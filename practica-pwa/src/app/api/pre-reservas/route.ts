import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PreReserva } from "@/types/pagamento"
import fs from "fs"
import path from "path"

const PRE_RESERVAS_FILE = path.join(process.cwd(), "src/data/pre-reservas.json")

function readPreReservas(): PreReserva[] {
  try {
    const data = fs.readFileSync(PRE_RESERVAS_FILE, "utf-8")
    return JSON.parse(data).preReservas || []
  } catch {
    return []
  }
}

function writePreReservas(preReservas: PreReserva[]) {
  fs.writeFileSync(PRE_RESERVAS_FILE, JSON.stringify({ preReservas }, null, 2))
}

function generateId(): string {
  return `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const preReservas = readPreReservas()
    const userPreReservas = preReservas.filter(r => r.corretorId === session.user.id)

    return NextResponse.json({ preReservas: userPreReservas })
  } catch (error) {
    console.error("Erro ao buscar pré-reservas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const {
      corretorId,
      corretorNome,
      empreendimentoId,
      empreendimentoNome,
      unidade,
      tipologia,
      cliente,
      plano
    } = body

    if (!empreendimentoId || !unidade || !cliente || !plano) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    const preReservas = readPreReservas()

    const novaPreReserva: PreReserva = {
      id: generateId(),
      corretorId: corretorId || session.user.id,
      corretorNome: corretorNome || session.user.name || "",
      empreendimentoId,
      empreendimentoNome,
      unidade,
      tipologia,
      cliente,
      plano,
      status: "pendente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    preReservas.push(novaPreReserva)
    writePreReservas(preReservas)

    return NextResponse.json({ preReserva: novaPreReserva }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar pré-reserva:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
