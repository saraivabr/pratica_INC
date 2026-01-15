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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const preReservas = readPreReservas()
    const preReserva = preReservas.find(r => r.id === id)

    if (!preReserva) {
      return NextResponse.json({ error: "Pré-reserva não encontrada" }, { status: 404 })
    }

    if (preReserva.corretorId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    return NextResponse.json({ preReserva })
  } catch (error) {
    console.error("Erro ao buscar pré-reserva:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const preReservas = readPreReservas()
    const index = preReservas.findIndex(r => r.id === id)

    if (index === -1) {
      return NextResponse.json({ error: "Pré-reserva não encontrada" }, { status: 404 })
    }

    if (preReservas[index].corretorId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Atualizar campos permitidos
    if (body.status) {
      preReservas[index].status = body.status
    }

    if (body.plano) {
      preReservas[index].plano = body.plano
    }

    preReservas[index].updatedAt = new Date().toISOString()
    writePreReservas(preReservas)

    return NextResponse.json({ preReserva: preReservas[index] })
  } catch (error) {
    console.error("Erro ao atualizar pré-reserva:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const preReservas = readPreReservas()
    const index = preReservas.findIndex(r => r.id === id)

    if (index === -1) {
      return NextResponse.json({ error: "Pré-reserva não encontrada" }, { status: 404 })
    }

    if (preReservas[index].corretorId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    preReservas.splice(index, 1)
    writePreReservas(preReservas)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar pré-reserva:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
