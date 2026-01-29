import { NextRequest, NextResponse } from 'next/server';
import {
  simularFinanciamentoCaixa,
  CONFIGURACAO_CAIXA_SBPE,
  CONFIGURACAO_CAIXA_MCMV,
  type SimulacaoCaixa,
} from '@/lib/financial-calculations-caixa';

interface SimulacaoRequest {
  valorImovel: number;
  valorEntrada: number;
  prazoMeses: number;
  usarMCMV?: boolean;
  valorFGTS?: number;
  cidade?: 'sp' | 'rj' | 'outros';
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulacaoRequest = await request.json();

    const {
      valorImovel,
      valorEntrada,
      prazoMeses,
      usarMCMV = false,
      valorFGTS = 0,
      cidade = 'outros',
    } = body;

    // Validações
    if (!valorImovel || valorImovel <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor do imóvel inválido' },
        { status: 400 }
      );
    }

    if (!valorEntrada || valorEntrada < 0) {
      return NextResponse.json(
        { success: false, error: 'Valor da entrada inválido' },
        { status: 400 }
      );
    }

    if (!prazoMeses || prazoMeses <= 0 || prazoMeses > 420) {
      return NextResponse.json(
        { success: false, error: 'Prazo deve estar entre 1 e 420 meses' },
        { status: 400 }
      );
    }

    // Selecionar configuração
    const configuracao = usarMCMV ? CONFIGURACAO_CAIXA_MCMV : CONFIGURACAO_CAIXA_SBPE;

    // Calcular simulação
    let simulacao: SimulacaoCaixa;
    try {
      simulacao = simularFinanciamentoCaixa(
        valorImovel,
        valorEntrada,
        prazoMeses,
        configuracao,
        valorFGTS,
        cidade
      );
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Erro ao simular financiamento' },
        { status: 400 }
      );
    }

    // Preparar resposta simplificada
    const response = {
      success: true,
      data: {
        // Dados básicos
        valorImovel: simulacao.valorImovel,
        valorEntrada: simulacao.valorEntrada,
        valorFGTS: simulacao.valorFGTS,
        valorFinanciado: simulacao.valorFinanciado,
        percentualFinanciado: simulacao.percentualFinanciado,
        prazoMeses: simulacao.prazoMeses,

        // Taxas
        taxaNominalAnual: simulacao.taxaNominalAnual,
        taxaMensalNominal: simulacao.taxaMensalNominal,
        taxaMensalEfetiva: simulacao.taxaMensalEfetiva,

        // Custos Iniciais
        custosIniciais: {
          tarifaCadastro: simulacao.custosIniciais.tarifaCadastro,
          avaliacaoImovel: simulacao.custosIniciais.avaliacaoImovel,
          registroContrato: simulacao.custosIniciais.registroContrato,
          itbi: simulacao.custosIniciais.itbi,
          total: simulacao.custosIniciais.total,
        },

        // Sistema Price
        price: {
          // Primeira parcela completa
          primeiraParcela: {
            parcelaTotal: simulacao.price.primeiraParcela.parcelaTotal,
            parcelaBase: simulacao.price.primeiraParcela.parcelaBase,
            amortizacao: simulacao.price.primeiraParcela.amortizacao,
            juros: simulacao.price.primeiraParcela.juros,
            mipMensal: simulacao.price.primeiraParcela.mipMensal,
            dfiMensal: simulacao.price.primeiraParcela.dfiMensal,
            tarifaAdministracao: simulacao.price.primeiraParcela.tarifaAdministracao,
            saldoDevedor: simulacao.price.primeiraParcela.saldoDevedor,
          },

          // Última parcela
          ultimaParcela: {
            parcelaTotal: simulacao.price.ultimaParcela.parcelaTotal,
            amortizacao: simulacao.price.ultimaParcela.amortizacao,
            juros: simulacao.price.ultimaParcela.juros,
          },

          // Parcela média dos primeiros anos
          parcelaMediaPrimeirosAnos: simulacao.price.parcelaMediaPrimeirosAnos,

          // Totais
          totalAmortizado: simulacao.price.totalAmortizado,
          totalJuros: simulacao.price.totalJuros,
          totalMIP: simulacao.price.totalMIP,
          totalDFI: simulacao.price.totalDFI,
          totalTarifas: simulacao.price.totalTarifas,
          totalPago: simulacao.price.totalPago,

          // CET
          cetMensal: simulacao.price.cetMensal,
          cetAnual: simulacao.price.cetAnual,
        },

        // Viabilidade
        viabilidade: {
          rendaMinimaPrice: simulacao.viabilidade.rendaMinimaPrice,
          rendaMinimaSac: simulacao.viabilidade.rendaMinimaSac,
          aprovaAutomatica: simulacao.viabilidade.aprovaAutomatica,
          observacoes: simulacao.viabilidade.observacoes,
        },

        // Tipo de financiamento
        tipoFinanciamento: usarMCMV ? 'MCMV' : 'SBPE',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro na simulação Caixa:', error);

    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar simulação' },
      { status: 500 }
    );
  }
}
