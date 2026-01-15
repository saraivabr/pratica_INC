import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

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

    const preReserva = await prisma.preReserva.findUnique({
      where: { id },
      include: {
        corretor: true,
        empreendimento: true,
        unidade: true,
        cliente: true
      }
    })

    if (!preReserva) {
      return NextResponse.json({ error: "Pré-reserva não encontrada" }, { status: 404 })
    }

    // Check if user has access
    const corretor = await prisma.corretor.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { whatsapp: session.user.id }
        ]
      }
    })

    if (!corretor || preReserva.corretorId !== corretor.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const formatted = {
      id: preReserva.id,
      corretorId: preReserva.corretorId,
      corretorNome: preReserva.corretor.nome,
      empreendimentoId: preReserva.empreendimentoId,
      empreendimentoNome: preReserva.empreendimento.nome,
      unidade: preReserva.unidade.numero,
      tipologia: {
        area_m2: Number(preReserva.unidade.areaM2),
        dormitorios: preReserva.unidade.dormitorios,
        descricao: preReserva.unidade.tipologia
      },
      cliente: {
        nome: preReserva.cliente.nome,
        cpf: preReserva.cliente.cpf,
        whatsapp: preReserva.cliente.whatsapp,
        email: preReserva.cliente.email || '',
        endereco: preReserva.cliente.endereco
      },
      plano: preReserva.planoJson,
      status: preReserva.status,
      createdAt: preReserva.createdAt.toISOString(),
      updatedAt: preReserva.updatedAt.toISOString()
    }

    return NextResponse.json({ preReserva: formatted })
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

    const preReserva = await prisma.preReserva.findUnique({
      where: { id }
    })

    if (!preReserva) {
      return NextResponse.json({ error: "Pré-reserva não encontrada" }, { status: 404 })
    }

    // Check if user has access
    const corretor = await prisma.corretor.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { whatsapp: session.user.id }
        ]
      }
    })

    if (!corretor || preReserva.corretorId !== corretor.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Update allowed fields
    const updateData: Record<string, unknown> = {}

    if (body.status) {
      updateData.status = body.status
    }

    if (body.plano) {
      updateData.planoJson = body.plano
    }

    const updated = await prisma.preReserva.update({
      where: { id },
      data: updateData as { status?: string; planoJson?: object },
      include: {
        corretor: true,
        empreendimento: true,
        unidade: true,
        cliente: true
      }
    })

    const formatted = {
      id: updated.id,
      corretorId: updated.corretorId,
      corretorNome: updated.corretor.nome,
      empreendimentoId: updated.empreendimentoId,
      empreendimentoNome: updated.empreendimento.nome,
      unidade: updated.unidade.numero,
      tipologia: {
        area_m2: Number(updated.unidade.areaM2),
        dormitorios: updated.unidade.dormitorios,
        descricao: updated.unidade.tipologia
      },
      cliente: {
        nome: updated.cliente.nome,
        cpf: updated.cliente.cpf,
        whatsapp: updated.cliente.whatsapp,
        email: updated.cliente.email || '',
        endereco: updated.cliente.endereco
      },
      plano: updated.planoJson,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    }

    return NextResponse.json({ preReserva: formatted })
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

    const preReserva = await prisma.preReserva.findUnique({
      where: { id },
      include: { unidade: true }
    })

    if (!preReserva) {
      return NextResponse.json({ error: "Pré-reserva não encontrada" }, { status: 404 })
    }

    // Check if user has access
    const corretor = await prisma.corretor.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { whatsapp: session.user.id }
        ]
      }
    })

    if (!corretor || preReserva.corretorId !== corretor.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Delete pre-reserva
    await prisma.preReserva.delete({
      where: { id }
    })

    // Update unidade status back to available
    await prisma.unidade.update({
      where: { id: preReserva.unidadeId },
      data: { status: 'disponivel' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar pré-reserva:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
