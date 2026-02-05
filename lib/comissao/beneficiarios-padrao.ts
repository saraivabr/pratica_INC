/**
 * Beneficiarios Padrao PRT
 * Configuracao dos cargos e beneficiarios padrao do grupo Pratica
 */

import { GrupoComissao, TipoDocumento } from './types';

// ============================================================================
// TIPOS
// ============================================================================

export interface CargoPRT {
  label: string;
  descricao: string;
}

export interface BeneficiarioPadraoTemplate {
  cargo: string;
  nome: string;
  percentual_vgv: number;
  grupo: GrupoComissao;
}

export interface BeneficiarioCalculado extends BeneficiarioPadraoTemplate {
  valor: number;
}

export interface DocumentoValidacao {
  valido: boolean;
  tipo?: TipoDocumento;
  erro?: string;
}

// ============================================================================
// CONSTANTES - CARGOS PRT
// ============================================================================

export const CARGOS_PRT: Record<string, CargoPRT> = {
  gerente_produto: { label: 'Gerente de Produto', descricao: 'Responsavel pelo produto' },
  gerente_pratica: { label: 'Gerente Pratica', descricao: 'Gerente geral Pratica' },
  coordenador_1: { label: 'Coordenador 1', descricao: 'Coordenador de vendas' },
  coordenador_2: { label: 'Coordenador 2', descricao: 'Coordenador auxiliar' },
  secretaria: { label: 'Secretaria', descricao: 'Apoio administrativo' },
  tributos: { label: 'Tributos', descricao: 'Recolhimento de impostos' },
};

// ============================================================================
// CONSTANTES - BENEFICIARIOS PADRAO PRT
// ============================================================================

export const BENEFICIARIOS_PADRAO_PRT: BeneficiarioPadraoTemplate[] = [
  { cargo: 'gerente_produto', nome: '', percentual_vgv: 0.0030, grupo: 'prt' },
  { cargo: 'gerente_pratica', nome: '', percentual_vgv: 0.0040, grupo: 'prt' },
  { cargo: 'coordenador_1', nome: '', percentual_vgv: 0.0015, grupo: 'prt' },
  { cargo: 'coordenador_2', nome: '', percentual_vgv: 0.0015, grupo: 'prt' },
  { cargo: 'secretaria', nome: '', percentual_vgv: 0.0005, grupo: 'prt' },
  { cargo: 'tributos', nome: '', percentual_vgv: 0.0010, grupo: 'prt' },
];

// ============================================================================
// FUNCOES - GERACAO DE BENEFICIARIOS
// ============================================================================

/**
 * Gera lista de beneficiarios padrao com valores calculados
 * @param valorVenda Valor total da venda (VGV)
 * @returns Array de beneficiarios com valores calculados
 */
export function gerarBeneficiariosPadrao(valorVenda: number): BeneficiarioCalculado[] {
  if (valorVenda <= 0) {
    return BENEFICIARIOS_PADRAO_PRT.map((b) => ({
      ...b,
      valor: 0,
    }));
  }

  return BENEFICIARIOS_PADRAO_PRT.map((beneficiario) => ({
    ...beneficiario,
    valor: valorVenda * beneficiario.percentual_vgv,
  }));
}

/**
 * Calcula o total de comissao PRT
 * @param valorVenda Valor total da venda (VGV)
 * @returns Valor total da comissao PRT
 */
export function calcularTotalComissaoPRT(valorVenda: number): number {
  const beneficiarios = gerarBeneficiariosPadrao(valorVenda);
  return beneficiarios.reduce((acc, b) => acc + b.valor, 0);
}

/**
 * Calcula o percentual total de comissao PRT
 * @returns Soma dos percentuais VGV do grupo PRT
 */
export function getPercentualTotalPRT(): number {
  return BENEFICIARIOS_PADRAO_PRT.reduce((acc, b) => acc + b.percentual_vgv, 0);
}

// ============================================================================
// FUNCOES - VALIDACAO DE DOCUMENTOS
// ============================================================================

/**
 * Remove caracteres nao numericos do documento
 */
function limparDocumento(documento: string): string {
  return documento.replace(/\D/g, '');
}

/**
 * Valida digitos verificadores do CPF
 */
function validarCPF(cpf: string): boolean {
  const cpfLimpo = limparDocumento(cpf);

  if (cpfLimpo.length !== 11) {
    return false;
  }

  // Verifica se todos os digitos sao iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) {
    return false;
  }

  // Calcula primeiro digito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo[9])) {
    return false;
  }

  // Calcula segundo digito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo[10])) {
    return false;
  }

  return true;
}

/**
 * Valida digitos verificadores do CNPJ
 */
function validarCNPJ(cnpj: string): boolean {
  const cnpjLimpo = limparDocumento(cnpj);

  if (cnpjLimpo.length !== 14) {
    return false;
  }

  // Verifica se todos os digitos sao iguais
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) {
    return false;
  }

  // Pesos para calculo
  const peso1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const peso2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Calcula primeiro digito verificador
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo[i]) * peso1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(cnpjLimpo[12])) {
    return false;
  }

  // Calcula segundo digito verificador
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpjLimpo[i]) * peso2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(cnpjLimpo[13])) {
    return false;
  }

  return true;
}

/**
 * Valida CPF ou CNPJ
 * @param documento Documento a ser validado (pode conter formatacao)
 * @returns Objeto com resultado da validacao
 */
export function validarDocumento(documento: string): DocumentoValidacao {
  if (!documento || documento.trim() === '') {
    return { valido: false, erro: 'Documento nao informado' };
  }

  const docLimpo = limparDocumento(documento);

  if (docLimpo.length === 11) {
    if (validarCPF(docLimpo)) {
      return { valido: true, tipo: 'cpf' };
    }
    return { valido: false, tipo: 'cpf', erro: 'CPF invalido' };
  }

  if (docLimpo.length === 14) {
    if (validarCNPJ(docLimpo)) {
      return { valido: true, tipo: 'cnpj' };
    }
    return { valido: false, tipo: 'cnpj', erro: 'CNPJ invalido' };
  }

  return {
    valido: false,
    erro: 'Documento deve ter 11 digitos (CPF) ou 14 digitos (CNPJ)',
  };
}

// ============================================================================
// FUNCOES - FORMATACAO DE DOCUMENTOS
// ============================================================================

/**
 * Formata CPF no padrao XXX.XXX.XXX-XX
 */
function formatarCPF(cpf: string): string {
  const cpfLimpo = limparDocumento(cpf);
  if (cpfLimpo.length !== 11) return cpf;

  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ no padrao XX.XXX.XXX/XXXX-XX
 */
function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = limparDocumento(cnpj);
  if (cnpjLimpo.length !== 14) return cnpj;

  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF ou CNPJ automaticamente
 * @param documento Documento a ser formatado
 * @returns Documento formatado ou original se nao reconhecido
 */
export function formatarDocumento(documento: string): string {
  if (!documento) return '';

  const docLimpo = limparDocumento(documento);

  if (docLimpo.length === 11) {
    return formatarCPF(docLimpo);
  }

  if (docLimpo.length === 14) {
    return formatarCNPJ(docLimpo);
  }

  return documento;
}

/**
 * Detecta o tipo de documento pelo tamanho
 * @param documento Documento (pode conter formatacao)
 * @returns Tipo do documento ou undefined se nao reconhecido
 */
export function detectarTipoDocumento(documento: string): TipoDocumento | undefined {
  if (!documento) return undefined;

  const docLimpo = limparDocumento(documento);

  if (docLimpo.length === 11) return 'cpf';
  if (docLimpo.length === 14) return 'cnpj';

  return undefined;
}

/**
 * Retorna label legivel do cargo
 * @param cargo Chave do cargo
 * @returns Label do cargo ou a propria chave se nao encontrado
 */
export function getCargoLabel(cargo: string): string {
  return CARGOS_PRT[cargo]?.label || cargo;
}

/**
 * Retorna descricao do cargo
 * @param cargo Chave do cargo
 * @returns Descricao do cargo ou string vazia se nao encontrado
 */
export function getCargoDescricao(cargo: string): string {
  return CARGOS_PRT[cargo]?.descricao || '';
}
