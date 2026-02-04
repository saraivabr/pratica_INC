/**
 * Sistema de Calculo de Comissoes - Calculos da Matriz
 * Funcoes para calcular a matriz corretor x parcela
 */

import type {
  ComissaoVenda,
  ComissaoCorretor,
  ComissaoParcela,
  MatrizPlanilha,
  MatrizPlanilhaRow,
  CorretorEqualizadorItem,
  ParcelaFormItem,
} from './types';

// =============================================================================
// ARREDONDAMENTO
// =============================================================================

/**
 * Arredonda valor para 2 casas decimais (arredondamento bancario)
 */
export function arredondarValor(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Trunca valor para 2 casas decimais (sem arredondamento)
 */
export function truncarValor(valor: number): number {
  return Math.floor(valor * 100) / 100;
}

// =============================================================================
// CALCULOS DE COMISSAO
// =============================================================================

/**
 * Calcula o valor total da comissao
 * @param valorVenda - Valor da venda
 * @param percentualComissao - Percentual como decimal (0.05 = 5%)
 */
export function calcularComissaoTotal(
  valorVenda: number,
  percentualComissao: number
): number {
  return arredondarValor(valorVenda * percentualComissao);
}

/**
 * Calcula o valor que um corretor recebe da comissao total
 * @param comissaoTotal - Valor total da comissao
 * @param percentualParticipacao - Percentual como decimal (0.40 = 40%)
 */
export function calcularValorCorretor(
  comissaoTotal: number,
  percentualParticipacao: number
): number {
  return arredondarValor(comissaoTotal * percentualParticipacao);
}

/**
 * Calcula o valor que um corretor recebe em uma parcela especifica
 * @param valorComissaoCorretor - Valor total da comissao do corretor
 * @param percentualParcela - Percentual da parcela como decimal (0.20 = 20%)
 */
export function calcularValorCorretorParcela(
  valorComissaoCorretor: number,
  percentualParcela: number
): number {
  return arredondarValor(valorComissaoCorretor * percentualParcela);
}

// =============================================================================
// EQUALIZADOR DE CORRETORES
// =============================================================================

/**
 * Recalcula os valores dos corretores baseado nos percentuais
 * @param corretores - Lista de corretores com percentuais
 * @param comissaoTotal - Valor total da comissao a distribuir
 */
export function recalcularValoresCorretores(
  corretores: CorretorEqualizadorItem[],
  comissaoTotal: number
): CorretorEqualizadorItem[] {
  return corretores.map(c => ({
    ...c,
    valor: arredondarValor(comissaoTotal * (c.percentual / 100)),
  }));
}

/**
 * Recalcula os percentuais para somar 100% quando um corretor eh adicionado
 * @param corretores - Lista de corretores atual
 * @param novoPercentual - Percentual do novo corretor (ou null para dividir igual)
 */
export function redistribuirPercentuais(
  corretores: CorretorEqualizadorItem[],
  novoPercentual?: number
): CorretorEqualizadorItem[] {
  const totalCorretores = corretores.length;
  if (totalCorretores === 0) return [];

  if (novoPercentual !== undefined) {
    // Redistribui o restante proporcionalmente
    const percentualRestante = 100 - novoPercentual;
    const somaAtual = corretores.slice(0, -1).reduce((acc, c) => acc + c.percentual, 0);

    if (somaAtual === 0) {
      // Divide igualmente entre os anteriores
      const percentualCada = percentualRestante / (totalCorretores - 1);
      return corretores.map((c, i) => ({
        ...c,
        percentual: i === totalCorretores - 1 ? novoPercentual : percentualCada,
      }));
    }

    // Redistribui proporcionalmente
    return corretores.map((c, i) => {
      if (i === totalCorretores - 1) {
        return { ...c, percentual: novoPercentual };
      }
      const proporcao = c.percentual / somaAtual;
      return { ...c, percentual: arredondarValor(percentualRestante * proporcao) };
    });
  }

  // Divide igualmente
  const percentualCada = arredondarValor(100 / totalCorretores);
  const resto = 100 - (percentualCada * totalCorretores);

  return corretores.map((c, i) => ({
    ...c,
    percentual: i === 0 ? percentualCada + resto : percentualCada,
  }));
}

/**
 * Valida se a soma dos percentuais eh valida (100%)
 * @param corretores - Lista de corretores
 */
export function validarSomaPercentuais(
  corretores: CorretorEqualizadorItem[]
): { valido: boolean; soma: number; diferenca: number } {
  const soma = corretores.reduce((acc, c) => acc + c.percentual, 0);
  const diferenca = arredondarValor(100 - soma);

  return {
    valido: Math.abs(diferenca) < 0.01, // Tolerancia de 1 centavo
    soma: arredondarValor(soma),
    diferenca,
  };
}

// =============================================================================
// CALCULOS DE PARCELAS
// =============================================================================

/**
 * Recalcula os valores das parcelas baseado nos percentuais
 * @param parcelas - Lista de parcelas com percentuais
 * @param comissaoTotal - Valor total da comissao
 */
export function recalcularValoresParcelas(
  parcelas: ParcelaFormItem[],
  comissaoTotal: number
): ParcelaFormItem[] {
  return parcelas.map(p => ({
    ...p,
    valor: arredondarValor(comissaoTotal * (p.percentual / 100)),
  }));
}

/**
 * Gera parcelas padrao baseadas em um template
 * @param comissaoTotal - Valor total da comissao
 * @param dataInicio - Data da primeira parcela
 * @param template - Template de parcelas com percentuais
 */
export function gerarParcelasPadrao(
  comissaoTotal: number,
  dataInicio: Date,
  template: Array<{ descricao: string; percentual: number }> = [
    { descricao: 'Ato', percentual: 20 },
    { descricao: 'Entrada', percentual: 30 },
    { descricao: 'Mensal 1', percentual: 25 },
    { descricao: 'Mensal 2', percentual: 25 },
  ]
): ParcelaFormItem[] {
  return template.map((t, i) => {
    const data = new Date(dataInicio);
    data.setMonth(data.getMonth() + i);

    return {
      numero: i + 1,
      descricao: t.descricao,
      percentual: t.percentual,
      valor: arredondarValor(comissaoTotal * (t.percentual / 100)),
      data_prevista: data.toISOString().split('T')[0],
    };
  });
}

// =============================================================================
// CALCULO DA MATRIZ COMPLETA
// =============================================================================

/**
 * Calcula a matriz completa corretor x parcela
 * @param venda - Dados da venda
 * @param corretores - Lista de corretores
 * @param parcelas - Lista de parcelas
 */
export function calcularMatriz(
  venda: ComissaoVenda,
  corretores: ComissaoCorretor[],
  parcelas: ComissaoParcela[]
): MatrizPlanilha {
  const comissaoTotal = venda.valor_comissao_total;

  // Calcula a matriz linha por linha (cada corretor)
  const matriz: MatrizPlanilhaRow[] = corretores.map(corretor => {
    const valoresPorParcela = parcelas.map(parcela => {
      // valor = comissao_corretor × percentual_parcela
      const valor = calcularValorCorretorParcela(
        corretor.valor_comissao,
        parcela.percentual_comissao
      );
      return valor;
    });

    const total = valoresPorParcela.reduce((acc, v) => acc + v, 0);

    return {
      corretor_id: corretor.id,
      corretor_nome: corretor.nome,
      percentual_participacao: corretor.percentual_participacao,
      corretor_comissao_total: corretor.valor_comissao,
      valores_por_parcela: valoresPorParcela,
      total: arredondarValor(total),
    };
  });

  // Calcula totais por parcela (soma vertical)
  const totais_parcela = parcelas.map((_, parcelaIndex) => {
    const total = matriz.reduce((acc, row) => acc + row.valores_por_parcela[parcelaIndex], 0);
    return arredondarValor(total);
  });

  // Total geral
  const total_geral = arredondarValor(matriz.reduce((acc, row) => acc + row.total, 0));

  return {
    venda,
    corretores,
    parcelas,
    matriz,
    totais_parcela,
    total_geral,
  };
}

/**
 * Gera os dados da matriz para inserir no banco
 * @param vendaId - ID da venda
 * @param corretores - Lista de corretores (com IDs)
 * @param parcelas - Lista de parcelas (com IDs)
 */
export function gerarDadosMatrizParaBanco(
  vendaId: number,
  corretores: ComissaoCorretor[],
  parcelas: ComissaoParcela[]
): Array<{
  venda_id: number;
  parcela_id: number;
  corretor_id: number;
  valor_calculado: number;
  percentual_usado: number;
  formula_aplicada: string;
}> {
  const dados: Array<{
    venda_id: number;
    parcela_id: number;
    corretor_id: number;
    valor_calculado: number;
    percentual_usado: number;
    formula_aplicada: string;
  }> = [];

  for (const corretor of corretores) {
    for (const parcela of parcelas) {
      const valorCalculado = calcularValorCorretorParcela(
        corretor.valor_comissao,
        parcela.percentual_comissao
      );

      dados.push({
        venda_id: vendaId,
        parcela_id: parcela.id,
        corretor_id: corretor.id,
        valor_calculado: valorCalculado,
        percentual_usado: corretor.percentual_participacao,
        formula_aplicada: `R$ ${corretor.valor_comissao.toFixed(2)} × ${(parcela.percentual_comissao * 100).toFixed(1)}% = R$ ${valorCalculado.toFixed(2)}`,
      });
    }
  }

  return dados;
}

// =============================================================================
// UTILITARIOS DE FORMATACAO
// =============================================================================

/**
 * Formata valor monetario para exibicao
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata percentual para exibicao
 * @param valor - Valor como decimal (0.05) ou percentual (5)
 * @param isDecimal - Se true, valor eh decimal (0.05 = 5%)
 */
export function formatarPercentual(valor: number, isDecimal: boolean = true): string {
  const percentual = isDecimal ? valor * 100 : valor;
  return `${percentual.toFixed(1)}%`;
}

/**
 * Converte percentual de 0-100 para decimal 0-1
 */
export function percentualParaDecimal(percentual: number): number {
  return percentual / 100;
}

/**
 * Converte decimal 0-1 para percentual 0-100
 */
export function decimalParaPercentual(decimal: number): number {
  return decimal * 100;
}
