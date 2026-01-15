import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Find corretor by ID or whatsapp
    const corretor = await prisma.corretor.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { whatsapp: session.user.id }
        ]
      }
    })

    if (!corretor) {
      return NextResponse.json({ preReservas: [] })
    }

    const preReservas = await prisma.preReserva.findMany({
      where: { corretorId: corretor.id },
      include: {
        corretor: true,
        empreendimento: true,
        unidade: true,
        cliente: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform to match expected format
    const formatted = preReservas.map(pr => ({
      id: pr.id,
      corretorId: pr.corretorId,
      corretorNome: pr.corretor.nome,
      empreendimentoId: pr.empreendimentoId,
      empreendimentoNome: pr.empreendimento.nome,
      unidade: pr.unidade.numero,
      tipologia: {
        area_m2: Number(pr.unidade.areaM2),
        dormitorios: pr.unidade.dormitorios,
        descricao: pr.unidade.tipologia
      },
      cliente: {
        nome: pr.cliente.nome,
        cpf: pr.cliente.cpf,
        whatsapp: pr.cliente.whatsapp,
        email: pr.cliente.email || '',
        endereco: pr.cliente.endereco
      },
      plano: pr.planoJson,
      status: pr.status,
      createdAt: pr.createdAt.toISOString(),
      updatedAt: pr.updatedAt.toISOString()
    }))

    return NextResponse.json({ preReservas: formatted })
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

    // Find or get corretor
    let corretor = await prisma.corretor.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { whatsapp: session.user.id }
        ]
      }
    })

    if (!corretor) {
      return NextResponse.json({ error: "Corretor não encontrado" }, { status: 404 })
    }

    // Find or create cliente
    let clienteRecord = await prisma.cliente.findUnique({
      where: { cpf: cliente.cpf }
    })

    if (!clienteRecord) {
      clienteRecord = await prisma.cliente.create({
        data: {
          nome: cliente.nome,
          cpf: cliente.cpf,
          whatsapp: cliente.whatsapp,
          email: cliente.email || null,
          endereco: cliente.endereco || null
        }
      })
    }

    // Find or create unidade
    let unidadeRecord = await prisma.unidade.findFirst({
      where: {
        empreendimentoId: empreendimentoId,
        numero: unidade
      }
    })

    if (!unidadeRecord) {
      // Create unidade if it doesn't exist
      unidadeRecord = await prisma.unidade.create({
        data: {
          id: `${empreendimentoId}-${unidade}`,
          empreendimentoId: empreendimentoId,
          numero: unidade,
          areaM2: tipologia?.area_m2 || 0,
          dormitorios: tipologia?.dormitorios || 0,
          tipologia: tipologia?.descricao || null,
          valorTotal: plano?.valorTotal || 0,
          status: 'disponivel'
        }
      })
    }

    // Create pre-reserva
    const preReserva = await prisma.preReserva.create({
      data: {
        corretorId: corretor.id,
        empreendimentoId: empreendimentoId,
        unidadeId: unidadeRecord.id,
        clienteId: clienteRecord.id,
        status: 'pendente',
        planoJson: plano
      },
      include: {
        corretor: true,
        empreendimento: true,
        unidade: true,
        cliente: true
      }
    })

    // Update unidade status
    await prisma.unidade.update({
      where: { id: unidadeRecord.id },
      data: { status: 'reservado' }
    })

    // Format response
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

    return NextResponse.json({ preReserva: formatted }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar pré-reserva:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
