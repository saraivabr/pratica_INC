/**
 * @fileoverview Validacoes para o Sistema de Intermediacao Imobiliaria
 * @module lib/intermediacao/validations
 * @description Funcoes de validacao para CPF, CNPJ, percentuais, parcelas e transicoes de status.
 */

import type { VendaStatus, ParcelaStatus, TipoDocumento } from './types';

// =============================================================================
// VALIDACAO DE CPF
// =============================================================================

/**
 * Remove caracteres nao numericos de um documento
 * @param documento - Documento com ou sem formatacao
 * @returns Apenas os digitos numericos
 */
export function limparDocumento(documento: string | null | undefined): string {
  if (!documento) return '';
  return documento.replace(/\D/g, '');
}

/**
 * Valida CPF usando o algoritmo oficial da Receita Federal
 * @param cpf - CPF com ou sem formatacao
 * @returns true se valido, false caso contrario
 *
 * @example
 * validarCPF('123.456.789-09') // true
 * validarCPF('12345678909') // true
 * validarCPF('111.111.111-11') // false (todos digitos iguais)
 * validarCPF('123.456.789-00') // false (digitos verificadores incorretos)
 */
export function validarCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;

  const limpo = limparDocumento(cpf);

  // Deve ter exatamente 11 digitos
  if (limpo.length !== 11) return false;

  // Rejeita CPFs com todos os digitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // Calculo do primeiro digito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(9))) return false;

  // Calculo do segundo digito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(10))) return false;

  return true;
}

// =============================================================================
// VALIDACAO DE CNPJ
// =============================================================================

/**
 * Valida CNPJ usando o algoritmo oficial da Receita Federal
 * @param cnpj - CNPJ com ou sem formatacao
 * @returns true se valido, false caso contrario
 *
 * @example
 * validarCNPJ('11.222.333/0001-81') // true
 * validarCNPJ('11222333000181') // true
 * validarCNPJ('11.111.111/1111-11') // false (todos digitos iguais)
 * validarCNPJ('11.222.333/0001-00') // false (digitos verificadores incorretos)
 */
export function validarCNPJ(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false;

  const limpo = limparDocumento(cnpj);

  // Deve ter exatamente 14 digitos
  if (limpo.length !== 14) return false;

  // Rejeita CNPJs com todos os digitos iguais
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  // Calculo do primeiro digito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(limpo.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(limpo.charAt(12))) return false;

  // Calculo do segundo digito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(limpo.charAt(i)) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(limpo.charAt(13))) return false;

  return true;
}

// =============================================================================
// VALIDACAO DE DOCUMENTO GENERICO
// =============================================================================

/**
 * Valida documento de acordo com o tipo (CPF ou CNPJ)
 * @param tipo - Tipo do documento ('cpf' ou 'cnpj')
 * @param documento - Numero do documento com ou sem formatacao
 * @returns true se valido, false caso contrario
 *
 * @example
 * validarDocumento('cpf', '123.456.789-09') // true
 * validarDocumento('cnpj', '11.222.333/0001-81') // true
 */
export function validarDocumento(tipo: TipoDocumento, documento: string | null | undefined): boolean {
  if (tipo === 'cpf') {
    return validarCPF(documento);
  }
  if (tipo === 'cnpj') {
    return validarCNPJ(documento);
  }
  return false;
}

/**
 * Detecta automaticamente o tipo de documento baseado no tamanho
 * @param documento - Numero do documento (apenas digitos)
 * @returns 'cpf', 'cnpj' ou null se invalido
 */
export function detectarTipoDocumento(documento: string | null | undefined): TipoDocumento | null {
  if (!documento) return null;
  const limpo = limparDocumento(documento);
  if (limpo.length === 11) return 'cpf';
  if (limpo.length === 14) return 'cnpj';
  return null;
}

// =============================================================================
// VALIDACAO DE PERCENTUAIS
// =============================================================================

/**
 * Valida se a soma dos percentuais nao ultrapassa um total (com tolerancia)
 * @param percentuais - Array de percentuais a somar
 * @param total - Total maximo permitido (padrao: 100)
 * @param tolerancia - Tolerancia para diferenca (padrao: 0.01)
 * @returns true se a soma esta dentro do limite, false caso contrario
 *
 * @example
 * validarSomaPercentuais([30, 40, 30], 100) // true
 * validarSomaPercentuais([30, 40, 35], 100) // false (soma = 105)
 * validarSomaPercentuais([33.33, 33.33, 33.34], 100) // true
 */
export function validarSomaPercentuais(
  percentuais: number[],
  total: number = 100,
  tolerancia: number = 0.01
): boolean {
  if (!percentuais || percentuais.length === 0) return true;

  // Valida se todos os percentuais sao positivos
  if (percentuais.some(p => p < 0)) return false;

  const soma = percentuais.reduce((acc, p) => acc + p, 0);

  // Verifica se a soma esta dentro do total permitido (com tolerancia)
  return soma <= total + tolerancia;
}

/**
 * Valida se a soma dos percentuais e exatamente igual ao total (com tolerancia)
 * @param percentuais - Array de percentuais a somar
 * @param total - Total esperado (padrao: 100)
 * @param tolerancia - Tolerancia para diferenca (padrao: 0.01)
 * @returns true se a soma e exatamente igual ao total, false caso contrario
 */
export function validarSomaPercentuaisExata(
  percentuais: number[],
  total: number = 100,
  tolerancia: number = 0.01
): boolean {
  if (!percentuais || percentuais.length === 0) return false;

  // Valida se todos os percentuais sao positivos
  if (percentuais.some(p => p < 0)) return false;

  const soma = percentuais.reduce((acc, p) => acc + p, 0);

  // Verifica se a diferenca esta dentro da tolerancia
  return Math.abs(soma - total) <= tolerancia;
}

// =============================================================================
// VALIDACAO DE PARCELAS
// =============================================================================

/**
 * Valida se a soma das parcelas corresponde ao valor total (com tolerancia)
 * @param parcelas - Array de objetos com valor
 * @param total - Valor total esperado
 * @param tolerancia - Tolerancia para diferenca (padrao: 0.01)
 * @returns true se a soma corresponde ao total, false caso contrario
 *
 * @example
 * validarSomaParcelas([{ valor: 100 }, { valor: 100 }], 200) // true
 * validarSomaParcelas([{ valor: 33.33 }, { valor: 33.33 }, { valor: 33.34 }], 100) // true
 */
export function validarSomaParcelas(
  parcelas: { valor: number }[],
  total: number,
  tolerancia: number = 0.01
): boolean {
  if (!parcelas || parcelas.length === 0) return total === 0;

  // Valida se todos os valores sao positivos
  if (parcelas.some(p => p.valor < 0)) return false;

  const soma = parcelas.reduce((acc, p) => acc + p.valor, 0);

  // Verifica se a diferenca esta dentro da tolerancia
  return Math.abs(soma - total) <= tolerancia;
}

/**
 * Valida se as datas de vencimento estao em ordem cronologica
 * @param parcelas - Array de objetos com data_vencimento
 * @returns true se as datas estao em ordem, false caso contrario
 */
export function validarOrdemParcelas(
  parcelas: { numero: number; data_vencimento: string }[]
): boolean {
  if (!parcelas || parcelas.length <= 1) return true;

  // Ordena por numero da parcela
  const ordenadas = [...parcelas].sort((a, b) => a.numero - b.numero);

  for (let i = 1; i < ordenadas.length; i++) {
    const dataAnterior = new Date(ordenadas[i - 1].data_vencimento);
    const dataAtual = new Date(ordenadas[i].data_vencimento);

    if (dataAtual < dataAnterior) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// VALIDACAO DE TRANSICAO DE STATUS
// =============================================================================

/**
 * Mapa de transicoes de status permitidas para vendas
 */
const transicoesVendaPermitidas: Record<VendaStatus, VendaStatus[]> = {
  rascunho: ['em_processamento'],
  em_processamento: ['concluida', 'rascunho'],
  concluida: ['paga', 'em_processamento'],
  paga: [], // Status final, nao permite transicao
};

/**
 * Valida se uma transicao de status de venda e permitida
 * @param atual - Status atual da venda
 * @param novo - Novo status desejado
 * @returns true se a transicao e permitida, false caso contrario
 *
 * @example
 * validarTransicaoStatus('rascunho', 'em_processamento') // true
 * validarTransicaoStatus('paga', 'rascunho') // false
 */
export function validarTransicaoStatus(atual: VendaStatus, novo: VendaStatus): boolean {
  if (atual === novo) return true; // Manter o mesmo status sempre e permitido

  const transicoesPermitidas = transicoesVendaPermitidas[atual];
  if (!transicoesPermitidas) return false;

  return transicoesPermitidas.includes(novo);
}

/**
 * Retorna as transicoes de status permitidas a partir do status atual
 * @param atual - Status atual da venda
 * @returns Array de status possiveis
 */
export function obterTransicoesPermitidas(atual: VendaStatus): VendaStatus[] {
  return transicoesVendaPermitidas[atual] || [];
}

/**
 * Mapa de transicoes de status permitidas para parcelas
 */
const transicoesParcela: Record<ParcelaStatus, ParcelaStatus[]> = {
  pendente: ['paga', 'cancelada', 'vencida'],
  vencida: ['paga', 'cancelada'],
  paga: [], // Status final
  cancelada: [], // Status final
};

/**
 * Valida se uma transicao de status de parcela e permitida
 * @param atual - Status atual da parcela
 * @param novo - Novo status desejado
 * @returns true se a transicao e permitida, false caso contrario
 */
export function validarTransicaoStatusParcela(atual: ParcelaStatus, novo: ParcelaStatus): boolean {
  if (atual === novo) return true;

  const transicoesPermitidas = transicoesParcela[atual];
  if (!transicoesPermitidas) return false;

  return transicoesPermitidas.includes(novo);
}

// =============================================================================
// VALIDACOES DE NEGOCIO
// =============================================================================

/**
 * Valida se o percentual de intermediacao esta dentro dos limites aceitaveis
 * @param percentual - Percentual de intermediacao
 * @param minimo - Percentual minimo (padrao: 0)
 * @param maximo - Percentual maximo (padrao: 10)
 * @returns true se valido, false caso contrario
 */
export function validarPercentualIntermediacao(
  percentual: number,
  minimo: number = 0,
  maximo: number = 10
): boolean {
  return percentual >= minimo && percentual <= maximo;
}

/**
 * Valida se um valor monetario e valido
 * @param valor - Valor a validar
 * @returns true se valido (positivo e finito), false caso contrario
 */
export function validarValorMonetario(valor: number): boolean {
  return typeof valor === 'number' && isFinite(valor) && valor >= 0;
}

/**
 * Valida se uma data e valida e esta no formato ISO
 * @param data - Data em formato string
 * @returns true se valida, false caso contrario
 */
export function validarData(data: string): boolean {
  if (!data) return false;
  const parsed = new Date(data);
  return !isNaN(parsed.getTime());
}

/**
 * Valida se uma data de vencimento nao e no passado
 * @param dataVencimento - Data de vencimento
 * @param dataReferencia - Data de referencia (padrao: hoje)
 * @returns true se a data de vencimento nao e no passado
 */
export function validarDataVencimentoFutura(
  dataVencimento: string,
  dataReferencia: Date = new Date()
): boolean {
  if (!validarData(dataVencimento)) return false;

  const vencimento = new Date(dataVencimento);
  vencimento.setHours(23, 59, 59, 999);

  const referencia = new Date(dataReferencia);
  referencia.setHours(0, 0, 0, 0);

  return vencimento >= referencia;
}

/**
 * Valida email
 * @param email - Email a validar
 * @returns true se valido, false caso contrario
 */
export function validarEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida telefone brasileiro
 * @param telefone - Telefone a validar
 * @returns true se valido, false caso contrario
 */
export function validarTelefone(telefone: string | null | undefined): boolean {
  if (!telefone) return false;
  const limpo = telefone.replace(/\D/g, '');
  // Aceita telefones com 10 ou 11 digitos (com ou sem 9)
  return limpo.length === 10 || limpo.length === 11;
}
