import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { SimulacaoTemplate } from '@/components/pdf-templates';
import { getUserById } from '@/lib/supabase';
import { createElement } from 'react';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface SimulacaoData {
  valorImovel: number;
  entrada: number;
  percentualEntrada: number;
  valorFinanciado: number;
  prazoMeses: number;
  taxaAnual: number;
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
}

interface RequestBody {
  userId: string;
  empreendimentoNome: string;
  unidade?: {
    numero: string;
    tipo: string;
  };
  simulacao: SimulacaoData;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { userId, empreendimentoNome, unidade, simulacao } = body;

    if (!userId || !simulacao) {
      return NextResponse.json(
        { success: false, error: 'userId e simulacao são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar dados da simulação
    if (!simulacao.valorImovel || simulacao.valorImovel <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor do imóvel inválido' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Calcular valores se não fornecidos
    const simulacaoCompleta: SimulacaoData = {
      valorImovel: simulacao.valorImovel,
      entrada: simulacao.entrada || simulacao.valorImovel * 0.2,
      percentualEntrada: simulacao.percentualEntrada || 20,
      valorFinanciado: simulacao.valorFinanciado || (simulacao.valorImovel - (simulacao.entrada || simulacao.valorImovel * 0.2)),
      prazoMeses: simulacao.prazoMeses || 360,
      taxaAnual: simulacao.taxaAnual || 10,
      parcelaMensal: simulacao.parcelaMensal || 0,
      totalPago: simulacao.totalPago || 0,
      totalJuros: simulacao.totalJuros || 0,
    };

    // Calcular parcela se não fornecida (Sistema PRICE)
    if (!simulacaoCompleta.parcelaMensal) {
      const taxaMensal = simulacaoCompleta.taxaAnual / 12 / 100;
      const n = simulacaoCompleta.prazoMeses;
      const pv = simulacaoCompleta.valorFinanciado;

      if (taxaMensal > 0) {
        simulacaoCompleta.parcelaMensal =
          (pv * taxaMensal * Math.pow(1 + taxaMensal, n)) /
          (Math.pow(1 + taxaMensal, n) - 1);
      } else {
        simulacaoCompleta.parcelaMensal = pv / n;
      }
    }

    // Calcular total pago e juros
    if (!simulacaoCompleta.totalPago) {
      simulacaoCompleta.totalPago =
        simulacaoCompleta.entrada +
        simulacaoCompleta.parcelaMensal * simulacaoCompleta.prazoMeses;
    }

    if (!simulacaoCompleta.totalJuros) {
      simulacaoCompleta.totalJuros =
        simulacaoCompleta.totalPago - simulacaoCompleta.valorImovel;
    }

    // Gerar PDF
    const pdfBuffer = await renderToBuffer(
      createElement(SimulacaoTemplate, {
        empreendimento: {
          nome: empreendimentoNome || 'Simulação de Financiamento',
        },
        unidade,
        simulacao: simulacaoCompleta,
        corretor: {
          nome: user.nome,
          telefone: user.telefone,
        },
      }) as any
    );

    // Retornar PDF diretamente
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="simulacao-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF de simulação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}
