/**
 * Biblioteca de Cálculos Financeiros para Financiamento Imobiliário
 *
 * Implementa os principais sistemas de amortização usados no Brasil:
 * - PRICE (Tabela Price): Parcelas fixas
 * - SAC (Sistema de Amortização Constante): Parcelas decrescentes
 * - VP (Valor Presente): Análise do custo real do dinheiro no tempo
 */

export interface ParcelaAmortizacao {
  numero: number;
  parcela: number;
  amortizacao: number;
  juros: number;
  saldoDevedor: number;
}

export interface ResultadoFinanciamento {
  // Dados de entrada
  valorImovel: number;
  valorEntrada: number;
  percentualEntrada: number;
  valorFinanciado: number;
  prazoMeses: number;
  taxaAnual: number;
  taxaMensal: number;

  // Sistema PRICE
  price: {
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
    primeiraParcela: ParcelaAmortizacao;
    ultimaParcela: ParcelaAmortizacao;
  };

  // Sistema SAC
  sac: {
    primeiraParcela: number;
    ultimaParcela: number;
    parcelaMedia: number;
    totalPago: number;
    totalJuros: number;
    amortizacaoMensal: number;
    primeiraParcelaDetalhes: ParcelaAmortizacao;
    ultimaParcelaDetalhes: ParcelaAmortizacao;
  };

  // Análise Financeira
  analise: {
    economiaSSacVsPrice: number;
    rendaNecessariaPrice: number;
    rendaNecessariaSac: number;
    comprometimentoIdeal: number; // 30%
    valorPresenteParcelas: number;
    custoRealFinanciamento: number;
    taxaEfetivaAnual: number;
  };
}

export interface TabelaAmortizacao {
  sistema: 'price' | 'sac';
  parcelas: ParcelaAmortizacao[];
  resumo: {
    totalParcelas: number;
    totalAmortizado: number;
    totalJuros: number;
    totalPago: number;
  };
}

/**
 * Converte taxa anual nominal para taxa mensal efetiva
 */
export function taxaAnualParaMensal(taxaAnual: number): number {
  // Taxa nominal: simplesmente divide por 12
  // Para financiamento imobiliário no Brasil, geralmente se usa taxa nominal
  return taxaAnual / 12;
}

/**
 * Converte taxa mensal para taxa anual efetiva (com capitalização composta)
 */
export function taxaMensalParaAnualEfetiva(taxaMensal: number): number {
  return (Math.pow(1 + taxaMensal / 100, 12) - 1) * 100;
}

/**
 * Calcula parcela no sistema PRICE (PMT)
 * Parcela fixa durante todo o financiamento
 */
export function calcularParcelaPrice(
  valorFinanciado: number,
  taxaMensal: number,
  prazoMeses: number
): number {
  const i = taxaMensal / 100;

  if (i === 0) {
    return valorFinanciado / prazoMeses;
  }

  // Fórmula PMT: PV * [i * (1 + i)^n] / [(1 + i)^n - 1]
  const parcela = valorFinanciado *
    (i * Math.pow(1 + i, prazoMeses)) /
    (Math.pow(1 + i, prazoMeses) - 1);

  return parcela;
}

/**
 * Calcula o Valor Presente de uma série de pagamentos futuros
 * VP = Σ [PMT / (1 + i)^n]
 */
export function calcularValorPresente(
  parcelas: number[],
  taxaMensal: number
): number {
  const i = taxaMensal / 100;

  return parcelas.reduce((vp, parcela, index) => {
    return vp + parcela / Math.pow(1 + i, index + 1);
  }, 0);
}

/**
 * Calcula VP de parcelas fixas (anuidade)
 */
export function calcularVPAnuidade(
  parcelaMensal: number,
  taxaMensal: number,
  prazoMeses: number
): number {
  const i = taxaMensal / 100;

  if (i === 0) {
    return parcelaMensal * prazoMeses;
  }

  // VP = PMT * [(1 - (1 + i)^-n) / i]
  return parcelaMensal * (1 - Math.pow(1 + i, -prazoMeses)) / i;
}

/**
 * Gera tabela de amortização completa - Sistema PRICE
 */
export function gerarTabelaPrice(
  valorFinanciado: number,
  taxaMensal: number,
  prazoMeses: number
): TabelaAmortizacao {
  const parcela = calcularParcelaPrice(valorFinanciado, taxaMensal, prazoMeses);
  const i = taxaMensal / 100;

  const parcelas: ParcelaAmortizacao[] = [];
  let saldoDevedor = valorFinanciado;
  let totalJuros = 0;
  let totalAmortizado = 0;

  for (let n = 1; n <= prazoMeses; n++) {
    const juros = saldoDevedor * i;
    const amortizacao = parcela - juros;
    saldoDevedor = saldoDevedor - amortizacao;

    totalJuros += juros;
    totalAmortizado += amortizacao;

    parcelas.push({
      numero: n,
      parcela: parcela,
      amortizacao: amortizacao,
      juros: juros,
      saldoDevedor: Math.max(0, saldoDevedor),
    });
  }

  return {
    sistema: 'price',
    parcelas,
    resumo: {
      totalParcelas: prazoMeses,
      totalAmortizado,
      totalJuros,
      totalPago: totalAmortizado + totalJuros,
    },
  };
}

/**
 * Gera tabela de amortização completa - Sistema SAC
 */
export function gerarTabelaSac(
  valorFinanciado: number,
  taxaMensal: number,
  prazoMeses: number
): TabelaAmortizacao {
  const amortizacao = valorFinanciado / prazoMeses;
  const i = taxaMensal / 100;

  const parcelas: ParcelaAmortizacao[] = [];
  let saldoDevedor = valorFinanciado;
  let totalJuros = 0;
  let totalPago = 0;

  for (let n = 1; n <= prazoMeses; n++) {
    const juros = saldoDevedor * i;
    const parcela = amortizacao + juros;
    saldoDevedor = saldoDevedor - amortizacao;

    totalJuros += juros;
    totalPago += parcela;

    parcelas.push({
      numero: n,
      parcela: parcela,
      amortizacao: amortizacao,
      juros: juros,
      saldoDevedor: Math.max(0, saldoDevedor),
    });
  }

  return {
    sistema: 'sac',
    parcelas,
    resumo: {
      totalParcelas: prazoMeses,
      totalAmortizado: valorFinanciado,
      totalJuros,
      totalPago,
    },
  };
}

/**
 * Calcula o financiamento completo com todos os sistemas e análises
 */
export function calcularFinanciamento(
  valorImovel: number,
  percentualEntrada: number,
  prazoMeses: number,
  taxaAnual: number
): ResultadoFinanciamento {
  // Valores básicos
  const valorEntrada = valorImovel * (percentualEntrada / 100);
  const valorFinanciado = valorImovel - valorEntrada;
  const taxaMensal = taxaAnualParaMensal(taxaAnual);

  // Tabelas de amortização
  const tabelaPrice = gerarTabelaPrice(valorFinanciado, taxaMensal, prazoMeses);
  const tabelaSac = gerarTabelaSac(valorFinanciado, taxaMensal, prazoMeses);

  // Dados PRICE
  const priceParcelaMensal = tabelaPrice.parcelas[0]?.parcela || 0;
  const priceTotalPago = valorEntrada + tabelaPrice.resumo.totalPago;
  const priceTotalJuros = tabelaPrice.resumo.totalJuros;

  // Dados SAC
  const sacPrimeiraParcela = tabelaSac.parcelas[0]?.parcela || 0;
  const sacUltimaParcela = tabelaSac.parcelas[tabelaSac.parcelas.length - 1]?.parcela || 0;
  const sacParcelaMedia = tabelaSac.resumo.totalPago / prazoMeses;
  const sacTotalPago = valorEntrada + tabelaSac.resumo.totalPago;
  const sacTotalJuros = tabelaSac.resumo.totalJuros;
  const sacAmortizacao = valorFinanciado / prazoMeses;

  // Análise financeira
  const economiaSSacVsPrice = priceTotalJuros - sacTotalJuros;

  // Renda necessária (regra dos 30% - parcela não pode exceder 30% da renda)
  const comprometimentoIdeal = 30;
  const rendaNecessariaPrice = (priceParcelaMensal / comprometimentoIdeal) * 100;
  const rendaNecessariaSac = (sacPrimeiraParcela / comprometimentoIdeal) * 100;

  // Valor Presente das parcelas (custo real considerando valor do dinheiro no tempo)
  // Usando uma taxa de desconto conservadora (CDI/Selic ~ 10% a.a.)
  const taxaDesconto = 10 / 12; // ~0.83% a.m.
  const vpParcelasPrice = calcularVPAnuidade(priceParcelaMensal, taxaDesconto, prazoMeses);

  // Custo real do financiamento = VP das parcelas + entrada - valor do imóvel
  const custoRealFinanciamento = vpParcelasPrice + valorEntrada - valorImovel;

  // Taxa efetiva anual (capitalização composta)
  const taxaEfetivaAnual = taxaMensalParaAnualEfetiva(taxaMensal);

  return {
    valorImovel,
    valorEntrada,
    percentualEntrada,
    valorFinanciado,
    prazoMeses,
    taxaAnual,
    taxaMensal,

    price: {
      parcelaMensal: priceParcelaMensal,
      totalPago: priceTotalPago,
      totalJuros: priceTotalJuros,
      primeiraParcela: tabelaPrice.parcelas[0],
      ultimaParcela: tabelaPrice.parcelas[tabelaPrice.parcelas.length - 1],
    },

    sac: {
      primeiraParcela: sacPrimeiraParcela,
      ultimaParcela: sacUltimaParcela,
      parcelaMedia: sacParcelaMedia,
      totalPago: sacTotalPago,
      totalJuros: sacTotalJuros,
      amortizacaoMensal: sacAmortizacao,
      primeiraParcelaDetalhes: tabelaSac.parcelas[0],
      ultimaParcelaDetalhes: tabelaSac.parcelas[tabelaSac.parcelas.length - 1],
    },

    analise: {
      economiaSSacVsPrice,
      rendaNecessariaPrice,
      rendaNecessariaSac,
      comprometimentoIdeal,
      valorPresenteParcelas: vpParcelasPrice,
      custoRealFinanciamento,
      taxaEfetivaAnual,
    },
  };
}

/**
 * Calcula quanto o cliente pode financiar baseado na renda
 */
export function calcularCapacidadeFinanciamento(
  rendaMensal: number,
  taxaAnual: number,
  prazoMeses: number,
  comprometimentoMax: number = 30
): {
  parcelaMaxima: number;
  valorMaximoFinanciado: number;
  valorMaximoImovel20: number; // com 20% entrada
  valorMaximoImovel30: number; // com 30% entrada
} {
  const parcelaMaxima = rendaMensal * (comprometimentoMax / 100);
  const taxaMensal = taxaAnualParaMensal(taxaAnual) / 100;

  // Cálculo inverso do PMT para encontrar PV
  // PV = PMT * [(1 - (1 + i)^-n) / i]
  let valorMaximoFinanciado: number;

  if (taxaMensal === 0) {
    valorMaximoFinanciado = parcelaMaxima * prazoMeses;
  } else {
    valorMaximoFinanciado = parcelaMaxima *
      (1 - Math.pow(1 + taxaMensal, -prazoMeses)) / taxaMensal;
  }

  return {
    parcelaMaxima,
    valorMaximoFinanciado,
    valorMaximoImovel20: valorMaximoFinanciado / 0.8, // 80% financiado
    valorMaximoImovel30: valorMaximoFinanciado / 0.7, // 70% financiado
  };
}

/**
 * Formata valor como moeda brasileira
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formata valor como moeda sem centavos
 */
export function formatarMoedaSimples(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Remove formatação de moeda e retorna número
 */
export function parseMoeda(valor: string): number {
  // Remove tudo exceto números, vírgula e ponto
  const limpo = valor.replace(/[^\d,.-]/g, '');
  // Troca vírgula por ponto (formato brasileiro para número)
  const numero = limpo.replace(/\./g, '').replace(',', '.');
  return parseFloat(numero) || 0;
}
