/**
 * @fileoverview Calculos financeiros para o Sistema de Intermediacao Imobiliaria
 * @module lib/intermediacao/calculations
 * @description Funcoes de calculo de comissao, distribuicao de parcelas,
 * arredondamento bancario e ajuste de valores.
 */

// =============================================================================
// ARREDONDAMENTO
// =============================================================================

/**
 * Arredonda valor para 2 casas decimais usando "round half up" (arredondamento bancario)
 * @param valor - Valor a arredondar
 * @returns Valor arredondado com 2 casas decimais
 *
 * @example
 * arredondarValor(10.125) // 10.13 (round half up)
 * arredondarValor(10.124) // 10.12
 * arredondarValor(10.1) // 10.10
 */
export function arredondarValor(valor: number): number {
  // Multiplica por 100, arredonda e divide por 100
  // Adiciona Number.EPSILON para evitar problemas de precisao de ponto flutuante
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Trunca valor para 2 casas decimais (sem arredondamento)
 * @param valor - Valor a truncar
 * @returns Valor truncado com 2 casas decimais
 *
 * @example
 * truncarValor(10.129) // 10.12
 * truncarValor(10.125) // 10.12
 */
export function truncarValor(valor: number): number {
  return Math.floor(valor * 100) / 100;
}

// =============================================================================
// CALCULOS DE COMISSAO
// =============================================================================

/**
 * Calcula o valor da comissao baseado no valor da venda e percentual
 * @param valorVenda - Valor total da venda
 * @param percentual - Percentual de intermediacao (ex: 5 para 5%)
 * @returns Valor da comissao arredondado
 *
 * @example
 * calcularComissao(500000, 5) // 25000.00
 * calcularComissao(350000, 4.5) // 15750.00
 */
export function calcularComissao(valorVenda: number, percentual: number): number {
  if (valorVenda < 0 || percentual < 0) {
    throw new Error('Valores nao podem ser negativos');
  }

  const comissao = valorVenda * (percentual / 100);
  return arredondarValor(comissao);
}

/**
 * Calcula o valor que um beneficiario recebe da comissao total
 * @param comissaoTotal - Valor total da comissao
 * @param percentualBeneficiario - Percentual do beneficiario (ex: 30 para 30%)
 * @returns Valor do beneficiario arredondado
 *
 * @example
 * calcularValorBeneficiario(25000, 30) // 7500.00
 * calcularValorBeneficiario(15750, 50) // 7875.00
 */
export function calcularValorBeneficiario(
  comissaoTotal: number,
  percentualBeneficiario: number
): number {
  if (comissaoTotal < 0 || percentualBeneficiario < 0) {
    throw new Error('Valores nao podem ser negativos');
  }

  if (percentualBeneficiario > 100) {
    throw new Error('Percentual nao pode ser maior que 100%');
  }

  const valor = comissaoTotal * (percentualBeneficiario / 100);
  return arredondarValor(valor);
}

/**
 * Calcula o percentual que um valor representa de um total
 * @param valor - Valor parcial
 * @param total - Valor total
 * @returns Percentual com 2 casas decimais
 *
 * @example
 * calcularPercentual(7500, 25000) // 30.00
 */
export function calcularPercentual(valor: number, total: number): number {
  if (total === 0) return 0;
  const percentual = (valor / total) * 100;
  return arredondarValor(percentual);
}

// =============================================================================
// DISTRIBUICAO DE PARCELAS
// =============================================================================

/**
 * Distribui um valor em parcelas iguais, tratando centavos excedentes
 * @param valor - Valor total a distribuir
 * @param numParcelas - Numero de parcelas
 * @returns Array com os valores de cada parcela
 *
 * @description
 * Usa truncamento para calcular o valor base de cada parcela,
 * depois distribui os centavos restantes nas primeiras parcelas.
 * Isso garante que a soma das parcelas seja exatamente igual ao valor total.
 *
 * @example
 * distribuirParcelas(100, 3) // [33.34, 33.33, 33.33]
 * distribuirParcelas(1000, 4) // [250.00, 250.00, 250.00, 250.00]
 * distribuirParcelas(99.99, 3) // [33.33, 33.33, 33.33]
 */
export function distribuirParcelas(valor: number, numParcelas: number): number[] {
  if (numParcelas <= 0) {
    throw new Error('Numero de parcelas deve ser maior que zero');
  }

  if (valor < 0) {
    throw new Error('Valor nao pode ser negativo');
  }

  if (numParcelas === 1) {
    return [arredondarValor(valor)];
  }

  // Converte para centavos para evitar problemas de ponto flutuante
  const valorEmCentavos = Math.round(valor * 100);

  // Valor base de cada parcela em centavos
  const valorBaseEmCentavos = Math.floor(valorEmCentavos / numParcelas);

  // Centavos restantes para distribuir
  const restoEmCentavos = valorEmCentavos - (valorBaseEmCentavos * numParcelas);

  // Cria array de parcelas
  const parcelas: number[] = [];

  for (let i = 0; i < numParcelas; i++) {
    // Adiciona 1 centavo extra nas primeiras parcelas ate esgotar o resto
    const valorParcelaEmCentavos = valorBaseEmCentavos + (i < restoEmCentavos ? 1 : 0);
    parcelas.push(valorParcelaEmCentavos / 100);
  }

  return parcelas;
}

/**
 * Calcula as datas de vencimento para um conjunto de parcelas
 * @param dataInicio - Data de inicio (primeira parcela)
 * @param numParcelas - Numero de parcelas
 * @param diasEntreParcelas - Dias entre cada parcela (padrao: 30)
 * @returns Array de datas de vencimento
 *
 * @example
 * calcularDatasVencimento(new Date('2026-02-01'), 3, 30)
 * // [2026-02-01, 2026-03-03, 2026-04-02]
 */
export function calcularDatasVencimento(
  dataInicio: Date,
  numParcelas: number,
  diasEntreParcelas: number = 30
): Date[] {
  if (numParcelas <= 0) {
    throw new Error('Numero de parcelas deve ser maior que zero');
  }

  if (diasEntreParcelas <= 0) {
    throw new Error('Dias entre parcelas deve ser maior que zero');
  }

  const datas: Date[] = [];

  for (let i = 0; i < numParcelas; i++) {
    const data = new Date(dataInicio);
    data.setDate(data.getDate() + (i * diasEntreParcelas));
    datas.push(data);
  }

  return datas;
}

/**
 * Calcula as datas de vencimento mensais (mesmo dia do mes)
 * @param dataInicio - Data de inicio (primeira parcela)
 * @param numParcelas - Numero de parcelas
 * @returns Array de datas de vencimento
 *
 * @example
 * calcularDatasVencimentoMensal(new Date('2026-01-15'), 3)
 * // [2026-01-15, 2026-02-15, 2026-03-15]
 */
export function calcularDatasVencimentoMensal(
  dataInicio: Date,
  numParcelas: number
): Date[] {
  if (numParcelas <= 0) {
    throw new Error('Numero de parcelas deve ser maior que zero');
  }

  const datas: Date[] = [];
  const diaOriginal = dataInicio.getDate();

  for (let i = 0; i < numParcelas; i++) {
    const data = new Date(dataInicio);
    data.setMonth(data.getMonth() + i);

    // Ajusta para o ultimo dia do mes se necessario
    // (ex: dia 31 em fevereiro vira dia 28/29)
    const ultimoDiaMes = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
    if (diaOriginal > ultimoDiaMes) {
      data.setDate(ultimoDiaMes);
    } else {
      data.setDate(diaOriginal);
    }

    datas.push(data);
  }

  return datas;
}

// =============================================================================
// AJUSTE DE PARCELAS
// =============================================================================

/**
 * Ajusta a ultima parcela para que a soma das parcelas seja exatamente o valor total
 * @param parcelas - Array de valores das parcelas
 * @param valorTotal - Valor total esperado
 * @returns Novo array com a ultima parcela ajustada
 *
 * @description
 * Util quando as parcelas foram calculadas individualmente e podem
 * ter diferenca de centavos devido a arredondamentos.
 *
 * @example
 * ajustarUltimaParcela([33.33, 33.33, 33.33], 100) // [33.33, 33.33, 33.34]
 */
export function ajustarUltimaParcela(parcelas: number[], valorTotal: number): number[] {
  if (parcelas.length === 0) {
    return [];
  }

  if (parcelas.length === 1) {
    return [arredondarValor(valorTotal)];
  }

  // Calcula a soma das parcelas exceto a ultima
  const somaParciaisEmCentavos = parcelas
    .slice(0, -1)
    .reduce((acc, val) => acc + Math.round(val * 100), 0);

  const valorTotalEmCentavos = Math.round(valorTotal * 100);

  // Calcula o valor correto da ultima parcela
  const ultimaParcelaEmCentavos = valorTotalEmCentavos - somaParciaisEmCentavos;

  // Cria novo array com a ultima parcela ajustada
  const resultado = [...parcelas.slice(0, -1), ultimaParcelaEmCentavos / 100];

  return resultado;
}

/**
 * Distribui uma diferenca proporcional entre as parcelas
 * @param parcelas - Array de valores das parcelas
 * @param diferenca - Diferenca a distribuir (pode ser positiva ou negativa)
 * @returns Novo array com valores ajustados
 */
export function distribuirDiferencaProporcional(
  parcelas: number[],
  diferenca: number
): number[] {
  if (parcelas.length === 0 || diferenca === 0) {
    return parcelas;
  }

  const soma = parcelas.reduce((acc, val) => acc + val, 0);
  if (soma === 0) return parcelas;

  const resultado = parcelas.map(parcela => {
    const proporcao = parcela / soma;
    const ajuste = diferenca * proporcao;
    return arredondarValor(parcela + ajuste);
  });

  // Ajusta a ultima parcela para garantir que a soma seja exata
  return ajustarUltimaParcela(resultado, soma + diferenca);
}

// =============================================================================
// CALCULOS AGREGADOS
// =============================================================================

/**
 * Calcula o resumo financeiro de uma venda
 * @param valorComissao - Valor total da comissao
 * @param distribuicoes - Array de distribuicoes com suas parcelas
 * @returns Objeto com resumo financeiro
 */
export function calcularResumoFinanceiro(
  valorComissao: number,
  distribuicoes: Array<{
    valor: number;
    parcelas?: Array<{
      valor: number;
      status: 'pendente' | 'paga' | 'cancelada' | 'atrasada';
    }>;
  }>
): {
  valorComissao: number;
  totalDistribuido: number;
  totalPendenteDistribuicao: number;
  totalPago: number;
  totalAPagar: number;
  quantidadeBeneficiarios: number;
  quantidadeParcelas: number;
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasAtrasadas: number;
} {
  const totalDistribuido = distribuicoes.reduce((acc, d) => acc + d.valor, 0);

  let totalPago = 0;
  let totalAPagar = 0;
  let quantidadeParcelas = 0;
  let parcelasPagas = 0;
  let parcelasPendentes = 0;
  let parcelasAtrasadas = 0;

  for (const dist of distribuicoes) {
    if (dist.parcelas) {
      for (const parcela of dist.parcelas) {
        quantidadeParcelas++;

        if (parcela.status === 'paga') {
          totalPago += parcela.valor;
          parcelasPagas++;
        } else if (parcela.status === 'pendente') {
          totalAPagar += parcela.valor;
          parcelasPendentes++;
        } else if (parcela.status === 'atrasada') {
          totalAPagar += parcela.valor;
          parcelasAtrasadas++;
        }
        // Parcelas canceladas nao entram nos totais
      }
    }
  }

  return {
    valorComissao: arredondarValor(valorComissao),
    totalDistribuido: arredondarValor(totalDistribuido),
    totalPendenteDistribuicao: arredondarValor(valorComissao - totalDistribuido),
    totalPago: arredondarValor(totalPago),
    totalAPagar: arredondarValor(totalAPagar),
    quantidadeBeneficiarios: distribuicoes.length,
    quantidadeParcelas,
    parcelasPagas,
    parcelasPendentes,
    parcelasAtrasadas,
  };
}

/**
 * Calcula o valor liquido apos impostos
 * @param valorBruto - Valor bruto
 * @param aliquotaIR - Aliquota de IR em percentual (padrao: 0)
 * @param aliquotaISS - Aliquota de ISS em percentual (padrao: 0)
 * @returns Objeto com valores detalhados
 */
export function calcularValorLiquido(
  valorBruto: number,
  aliquotaIR: number = 0,
  aliquotaISS: number = 0
): {
  valorBruto: number;
  valorIR: number;
  valorISS: number;
  totalDescontos: number;
  valorLiquido: number;
} {
  const valorIR = arredondarValor(valorBruto * (aliquotaIR / 100));
  const valorISS = arredondarValor(valorBruto * (aliquotaISS / 100));
  const totalDescontos = arredondarValor(valorIR + valorISS);
  const valorLiquido = arredondarValor(valorBruto - totalDescontos);

  return {
    valorBruto: arredondarValor(valorBruto),
    valorIR,
    valorISS,
    totalDescontos,
    valorLiquido,
  };
}

/**
 * Projeta o saldo a receber de um beneficiario por periodo
 * @param parcelas - Array de parcelas com valor e data de vencimento
 * @param meses - Numero de meses para projecao
 * @returns Array com saldo acumulado por mes
 */
export function projetarSaldoPorPeriodo(
  parcelas: Array<{ valor: number; data_vencimento: string; status: string }>,
  meses: number = 12
): Array<{ periodo: string; valor: number; acumulado: number }> {
  const hoje = new Date();
  const resultado: Array<{ periodo: string; valor: number; acumulado: number }> = [];

  let acumulado = 0;

  for (let i = 0; i < meses; i++) {
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 0);

    const valorMes = parcelas
      .filter(p => {
        if (p.status === 'paga' || p.status === 'cancelada') return false;
        const dataVenc = new Date(p.data_vencimento);
        return dataVenc >= inicioMes && dataVenc <= fimMes;
      })
      .reduce((acc, p) => acc + p.valor, 0);

    acumulado += valorMes;

    const periodo = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, '0')}`;

    resultado.push({
      periodo,
      valor: arredondarValor(valorMes),
      acumulado: arredondarValor(acumulado),
    });
  }

  return resultado;
}
