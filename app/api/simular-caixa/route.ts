import { NextRequest, NextResponse } from 'next/server';
import {
  simularFinanciamentoCaixa,
  CONFIGURACAO_CAIXA_SBPE,
  CONFIGURACAO_CAIXA_MCMV,
  type SimulacaoCaixa,
} from '@/lib/financial-calculations-caixa';
import { validateRequest, SimularCaixaSchema } from '@/lib/validation-schemas';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, SimularCaixaSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { valorImovel, valorEntrada, prazoMeses, usarMCMV, valorFGTS, cidade } = validation.data;

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
