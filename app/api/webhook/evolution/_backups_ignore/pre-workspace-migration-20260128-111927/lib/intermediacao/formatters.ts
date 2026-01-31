/**
 * @fileoverview Formatadores para o Sistema de Intermediacao Imobiliaria
 * @module lib/intermediacao/formatters
 * @description Funcoes de formatacao para CPF, CNPJ, moeda, data, percentual
 * e geracao de codigos.
 */

// =============================================================================
// FORMATACAO DE DOCUMENTOS
// =============================================================================

/**
 * Remove caracteres nao numericos de um documento
 */
function limparDocumento(documento: string | null | undefined): string {
  if (!documento) return '';
  return documento.replace(/\D/g, '');
}

/**
 * Formata CPF no padrao XXX.XXX.XXX-XX
 * @param cpf - CPF com ou sem formatacao
 * @returns CPF formatado ou string vazia se invalido
 *
 * @example
 * formatarCPF('12345678909') // '123.456.789-09'
 * formatarCPF('123.456.789-09') // '123.456.789-09'
 */
export function formatarCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';

  const limpo = limparDocumento(cpf);

  if (limpo.length !== 11) return '';

  return limpo.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  );
}

/**
 * Formata CNPJ no padrao XX.XXX.XXX/XXXX-XX
 * @param cnpj - CNPJ com ou sem formatacao
 * @returns CNPJ formatado ou string vazia se invalido
 *
 * @example
 * formatarCNPJ('11222333000181') // '11.222.333/0001-81'
 */
export function formatarCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';

  const limpo = limparDocumento(cnpj);

  if (limpo.length !== 14) return '';

  return limpo.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata documento (CPF ou CNPJ) automaticamente baseado no tamanho
 * @param documento - Documento com ou sem formatacao
 * @returns Documento formatado
 */
export function formatarDocumento(documento: string | null | undefined): string {
  if (!documento) return '';

  const limpo = limparDocumento(documento);

  if (limpo.length === 11) {
    return formatarCPF(limpo);
  }

  if (limpo.length === 14) {
    return formatarCNPJ(limpo);
  }

  return limpo;
}

/**
 * Mascara CPF para exibicao segura: XXX.***.***-XX
 */
export function mascararCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';

  const limpo = limparDocumento(cpf);

  if (limpo.length !== 11) return '';

  return `${limpo.substring(0, 3)}.***.***-${limpo.substring(9, 11)}`;
}

/**
 * Mascara CNPJ para exibicao segura
 */
export function mascararCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';

  const limpo = limparDocumento(cnpj);

  if (limpo.length !== 14) return '';

  // Formato: XX.***.***/<filial>-XX
  const inicio = limpo.substring(0, 2);
  const filial = limpo.substring(8, 12);
  const digitos = limpo.substring(12, 14);

  return `${inicio}.***.***/${filial}-${digitos}`;
}

// =============================================================================
// FORMATACAO DE VALORES MONETARIOS
// =============================================================================

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 * @example
 * formatarMoeda(1234.56) // 'R$ 1.234,56'
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';

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
export function formatarMoedaInteira(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return 'R$ 0';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Formata valor como moeda compacta (R$ 1,2M)
 */
export function formatarMoedaCompacta(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return 'R$ 0';

  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(2).replace('.', ',')}M`;
  }

  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(1).replace('.', ',')}K`;
  }

  return formatarMoeda(valor);
}

/**
 * Remove formatação de moeda e retorna o valor numérico
 */
export function parseMoeda(valorFormatado: string | null | undefined): number {
  if (!valorFormatado) return 0;

  // Remove R$, pontos de milhar e troca vírgula por ponto
  const valorLimpo = valorFormatado
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? 0 : numero;
}

// =============================================================================
// FORMATACAO DE DATAS
// =============================================================================

/**
 * Formata data no padrao brasileiro DD/MM/AAAA
 * @example
 * formatarData('2026-01-25') // '25/01/2026'
 */
export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return '';

  const dataObj = typeof data === 'string' ? new Date(data) : data;

  if (isNaN(dataObj.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dataObj);
}

/**
 * Formata data e hora no padrao brasileiro DD/MM/AAAA HH:MM
 */
export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return '';

  const dataObj = typeof data === 'string' ? new Date(data) : data;

  if (isNaN(dataObj.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dataObj);
}

/**
 * Formata data de forma relativa (ontem, hoje, ha 3 dias)
 */
export function formatarDataRelativa(data: string | Date | null | undefined): string {
  if (!data) return '';

  const dataObj = typeof data === 'string' ? new Date(data) : data;

  if (isNaN(dataObj.getTime())) return '';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataComparacao = new Date(dataObj);
  dataComparacao.setHours(0, 0, 0, 0);

  const diffDias = Math.round((dataComparacao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'hoje';
  if (diffDias === 1) return 'amanha';
  if (diffDias === -1) return 'ontem';
  if (diffDias > 1 && diffDias <= 7) return `em ${diffDias} dias`;
  if (diffDias < -1 && diffDias >= -7) return `ha ${Math.abs(diffDias)} dias`;

  return formatarData(dataObj);
}

/**
 * Formata mes e ano (Janeiro/2026)
 */
export function formatarMesAno(data: string | Date | null | undefined): string {
  if (!data) return '';

  const dataObj = typeof data === 'string' ? new Date(data) : data;

  if (isNaN(dataObj.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(dataObj);
}

// =============================================================================
// FORMATACAO DE PERCENTUAIS
// =============================================================================

/**
 * Formata um valor numérico como percentual com 2 casas decimais
 * @example
 * formatarPercentual(5) // '5,00%'
 * formatarPercentual(5.5) // '5,50%'
 */
export function formatarPercentual(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return '0,00%';

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor) + '%';
}

/**
 * Formata percentual sem casas decimais
 */
export function formatarPercentualInteiro(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return '0%';

  return Math.round(valor) + '%';
}

/**
 * Formata apenas o número do percentual sem o símbolo %
 */
export function formatarNumeroPercentual(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Remove formatação de percentual e retorna o valor numérico
 */
export function parsePercentual(valorFormatado: string): number {
  // Remove % e troca vírgula por ponto
  const valorLimpo = valorFormatado
    .replace(/[%\s]/g, '')
    .replace(',', '.');

  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? 0 : numero;
}

// =============================================================================
// GERACAO DE CODIGOS
// =============================================================================

/**
 * Gera codigo de venda no formato VND-AAAAMM-NNNN
 * @param sequencial - Numero sequencial da venda
 * @param data - Data da venda (padrao: hoje)
 * @returns Codigo da venda
 *
 * @example
 * gerarCodigoVenda(1) // 'VND-202601-0001'
 * gerarCodigoVenda(123) // 'VND-202601-0123'
 */
export function gerarCodigoVenda(sequencial: number, data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const seq = String(sequencial).padStart(4, '0');

  return `VND-${ano}${mes}-${seq}`;
}

/**
 * Gera codigo de beneficiario no formato BEN-NNNN
 * @param sequencial - Numero sequencial do beneficiario
 * @returns Codigo do beneficiario
 *
 * @example
 * gerarCodigoBeneficiario(1) // 'BEN-0001'
 * gerarCodigoBeneficiario(123) // 'BEN-0123'
 */
export function gerarCodigoBeneficiario(sequencial: number): string {
  const seq = String(sequencial).padStart(4, '0');
  return `BEN-${seq}`;
}

/**
 * Gera codigo de parcela no formato PAR-VENDACODE-NN
 */
export function gerarCodigoParcela(codigoVenda: string, numeroParcela: number): string {
  const num = String(numeroParcela).padStart(2, '0');
  return `PAR-${codigoVenda}-${num}`;
}

/**
 * Gera codigo de pagamento no formato PAG-AAAAMMDDHHMM-NNNN
 */
export function gerarCodigoPagamento(sequencial: number): string {
  const agora = new Date();
  const timestamp = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, '0'),
    String(agora.getDate()).padStart(2, '0'),
    String(agora.getHours()).padStart(2, '0'),
    String(agora.getMinutes()).padStart(2, '0'),
  ].join('');

  const seq = String(sequencial).padStart(4, '0');

  return `PAG-${timestamp}-${seq}`;
}

/**
 * Formata código de venda (legado - compatibilidade)
 */
export function formatarCodigoVenda(id: string | number): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  return `VND-${ano}${mes}-${String(id).padStart(2, '0')}`;
}

// =============================================================================
// FORMATACAO DE TELEFONE
// =============================================================================

/**
 * Formata telefone no padrao brasileiro
 * @example
 * formatarTelefone('11999998888') // '(11) 99999-8888'
 * formatarTelefone('1133334444') // '(11) 3333-4444'
 */
export function formatarTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '';

  const limpo = telefone.replace(/\D/g, '');

  if (limpo.length === 11) {
    return limpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (limpo.length === 10) {
    return limpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return telefone;
}

// =============================================================================
// FORMATACAO DE STATUS
// =============================================================================

/**
 * Retorna label amigavel para status de venda
 */
export function formatarStatusVenda(status: string): string {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    em_processamento: 'Em Processamento',
    concluida: 'Concluida',
    paga: 'Paga',
  };

  return labels[status] || status;
}

/**
 * Retorna label amigavel para status de parcela
 */
export function formatarStatusParcela(status: string): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    paga: 'Paga',
    cancelada: 'Cancelada',
    atrasada: 'Atrasada',
    vencida: 'Vencida',
  };

  return labels[status] || status;
}

/**
 * Retorna label amigavel para tipo de beneficiario
 */
export function formatarTipoBeneficiario(tipo: string): string {
  const labels: Record<string, string> = {
    corretor: 'Corretor',
    imobiliaria: 'Imobiliaria',
    gerente: 'Gerente',
    parceiro: 'Parceiro',
    outro: 'Outro',
    Corretor: 'Corretor',
    Gerente: 'Gerente',
    'Proprietário': 'Proprietario',
    'Imobiliária': 'Imobiliaria',
  };

  return labels[tipo] || tipo;
}

/**
 * Retorna label amigavel para forma de pagamento
 */
export function formatarFormaPagamento(forma: string): string {
  const labels: Record<string, string> = {
    pix: 'PIX',
    transferencia: 'Transferencia',
    boleto: 'Boleto',
    cheque: 'Cheque',
    dinheiro: 'Dinheiro',
    deposito: 'Deposito',
    outro: 'Outro',
  };

  return labels[forma] || forma;
}

// =============================================================================
// UTILITARIOS
// =============================================================================

/**
 * Formata número para exibição (com separador de milhares)
 */
export function formatarNumero(valor: number, casasDecimais: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(valor);
}

/**
 * Calcula a comissão com base no valor e percentual
 */
export function calcularComissao(valorVenda: number, percentual: number): number {
  return (valorVenda * percentual) / 100;
}

/**
 * Calcula o valor de uma distribuição com base no percentual
 */
export function calcularDistribuicao(comissaoTotal: number, percentual: number): number {
  return (comissaoTotal * percentual) / 100;
}

/**
 * Valida se a soma dos percentuais está dentro da tolerância
 */
export function validarSomaPercentuais(
  percentuais: number[],
  meta: number = 100,
  tolerancia: number = 0.01
): { valido: boolean; diferenca: number } {
  const soma = percentuais.reduce((acc, p) => acc + p, 0);
  const diferenca = soma - meta;
  const valido = Math.abs(diferenca) <= tolerancia;

  return { valido, diferenca };
}

/**
 * Distribui um valor igualmente entre N beneficiários
 */
export function distribuirIgualmente(quantidade: number): number[] {
  if (quantidade <= 0) return [];

  const percentualBase = 100 / quantidade;
  const percentuais = Array(quantidade).fill(percentualBase);

  // Ajusta a diferença no último para garantir soma = 100
  const soma = percentuais.reduce((acc: number, p: number) => acc + p, 0);
  const diferenca = 100 - soma;
  percentuais[percentuais.length - 1] += diferenca;

  return percentuais;
}

/**
 * Obtém as iniciais de um nome
 */
export function getIniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}
