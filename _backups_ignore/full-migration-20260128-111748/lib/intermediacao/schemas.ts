/**
 * @fileoverview Schemas Zod para validacao de API do Sistema de Intermediacao Imobiliaria
 * @module lib/intermediacao/schemas
 * @description Schemas de validacao para vendas, beneficiarios, distribuicoes,
 * parcelas e pagamentos.
 */

import { z } from 'zod';

// =============================================================================
// SCHEMAS DE VALIDACAO CUSTOMIZADOS
// =============================================================================

/**
 * Schema para validacao de CPF
 * Aceita CPF com ou sem formatacao e valida os digitos verificadores
 */
export const cpfSchema = z.string().refine(
  (cpf) => {
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(limpo)) return false;

    // Validacao do primeiro digito
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(limpo.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(9))) return false;

    // Validacao do segundo digito
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(limpo.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(10))) return false;

    return true;
  },
  { message: 'CPF invalido' }
);

/**
 * Schema para validacao de CNPJ
 * Aceita CNPJ com ou sem formatacao e valida os digitos verificadores
 */
export const cnpjSchema = z.string().refine(
  (cnpj) => {
    const limpo = cnpj.replace(/\D/g, '');
    if (limpo.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(limpo)) return false;

    // Validacao do primeiro digito
    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < 12; i++) {
      soma += parseInt(limpo.charAt(i)) * pesos1[i];
    }
    let resto = soma % 11;
    const digito1 = resto < 2 ? 0 : 11 - resto;
    if (digito1 !== parseInt(limpo.charAt(12))) return false;

    // Validacao do segundo digito
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    soma = 0;
    for (let i = 0; i < 13; i++) {
      soma += parseInt(limpo.charAt(i)) * pesos2[i];
    }
    resto = soma % 11;
    const digito2 = resto < 2 ? 0 : 11 - resto;
    if (digito2 !== parseInt(limpo.charAt(13))) return false;

    return true;
  },
  { message: 'CNPJ invalido' }
);

/**
 * Schema para documento (CPF ou CNPJ) - validacao automatica baseada no tamanho
 */
export const documentoSchema = z.string().refine(
  (doc) => {
    const limpo = doc.replace(/\D/g, '');
    if (limpo.length === 11) {
      return cpfSchema.safeParse(doc).success;
    }
    if (limpo.length === 14) {
      return cnpjSchema.safeParse(doc).success;
    }
    return false;
  },
  { message: 'Documento invalido (deve ser CPF ou CNPJ valido)' }
);

/**
 * Schema para telefone brasileiro
 */
export const telefoneSchema = z.string().refine(
  (tel) => {
    const limpo = tel.replace(/\D/g, '');
    return limpo.length === 10 || limpo.length === 11;
  },
  { message: 'Telefone invalido (deve ter 10 ou 11 digitos)' }
);

/**
 * Schema para valor monetario positivo
 */
export const valorMonetarioSchema = z.number()
  .positive({ message: 'Valor deve ser positivo' })
  .finite({ message: 'Valor deve ser um numero valido' });

/**
 * Schema para percentual (0-100)
 */
export const percentualSchema = z.number()
  .min(0, { message: 'Percentual deve ser maior ou igual a 0' })
  .max(100, { message: 'Percentual deve ser menor ou igual a 100' });

/**
 * Schema para data ISO
 */
export const dataISOSchema = z.string().refine(
  (data) => {
    const parsed = new Date(data);
    return !isNaN(parsed.getTime());
  },
  { message: 'Data invalida' }
);

// =============================================================================
// ENUMS
// =============================================================================

export const vendaStatusSchema = z.enum(['rascunho', 'em_processamento', 'concluida', 'paga']);
export const parcelaStatusSchema = z.enum(['pendente', 'paga', 'cancelada', 'atrasada', 'vencida']);
export const pagamentoStatusSchema = z.enum(['pendente', 'confirmado', 'estornado']);
export const tipoDocumentoSchema = z.enum(['cpf', 'cnpj']);
export const tipoBeneficiarioSchema = z.enum(['corretor', 'imobiliaria', 'gerente', 'parceiro', 'outro']);
export const formaPagamentoSchema = z.enum(['pix', 'transferencia', 'boleto', 'cheque', 'dinheiro']);
export const tipoContaSchema = z.enum(['corrente', 'poupanca', 'pagamento']);
export const metodoPagamentoSchema = z.enum(['transferencia', 'deposito', 'pix', 'outro']);

// =============================================================================
// SCHEMAS DE VENDA
// =============================================================================

/**
 * Schema para criacao de venda
 */
export const vendaCreateSchema = z.object({
  valor_total: valorMonetarioSchema,
  unidade: z.string().min(1, { message: 'Unidade e obrigatoria' }),
  empreendimento: z.string().min(1, { message: 'Empreendimento e obrigatorio' }),
  cliente_nome: z.string().min(2, { message: 'Nome do cliente deve ter no minimo 2 caracteres' }),
  cliente_cpf: cpfSchema.optional(),
  cliente_email: z.string().email({ message: 'Email invalido' }).optional(),
  cliente_telefone: telefoneSchema.optional(),
  data_venda: dataISOSchema,
  percentual_intermediacao: percentualSchema,
  descricao: z.string().max(1000).optional(),
});

/**
 * Schema para atualizacao de venda
 */
export const vendaUpdateSchema = z.object({
  valor_total: valorMonetarioSchema.optional(),
  unidade: z.string().min(1).optional(),
  empreendimento: z.string().min(1).optional(),
  cliente_nome: z.string().min(2).optional(),
  cliente_cpf: cpfSchema.optional(),
  cliente_email: z.string().email().optional(),
  cliente_telefone: telefoneSchema.optional(),
  data_venda: dataISOSchema.optional(),
  percentual_intermediacao: percentualSchema.optional(),
  status: vendaStatusSchema.optional(),
  descricao: z.string().max(1000).optional(),
});

/**
 * Schema para transicao de status de venda
 */
export const vendaTransicaoStatusSchema = z.object({
  status: vendaStatusSchema,
  justificativa: z.string().min(10, { message: 'Justificativa deve ter no minimo 10 caracteres' }).optional(),
});

// =============================================================================
// SCHEMAS DE BENEFICIARIO
// =============================================================================

/**
 * Schema para criacao de beneficiario
 */
export const beneficiarioCreateSchema = z.object({
  nome: z.string().min(2, { message: 'Nome deve ter no minimo 2 caracteres' }),
  tipo_documento: tipoDocumentoSchema,
  documento: documentoSchema,
  cargo: z.string().min(1, { message: 'Cargo e obrigatorio' }),
  email: z.string().email({ message: 'Email invalido' }),
  telefone: telefoneSchema.optional(),
  banco: z.string().max(50).optional(),
  agencia: z.string().max(10).optional(),
  conta: z.string().max(20).optional(),
  tipo_conta: tipoContaSchema.optional(),
  pix: z.string().max(100).optional(),
  observacoes: z.string().max(500).optional(),
});

/**
 * Schema para atualizacao de beneficiario
 */
export const beneficiarioUpdateSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: telefoneSchema.optional(),
  banco: z.string().max(50).optional(),
  agencia: z.string().max(10).optional(),
  conta: z.string().max(20).optional(),
  tipo_conta: tipoContaSchema.optional(),
  pix: z.string().max(100).optional(),
  observacoes: z.string().max(500).optional(),
  ativo: z.boolean().optional(),
});

// =============================================================================
// SCHEMAS DE DISTRIBUICAO
// =============================================================================

/**
 * Schema para criacao de distribuicao
 */
export const distribuicaoCreateSchema = z.object({
  venda_id: z.string().uuid({ message: 'ID da venda invalido' }),
  beneficiario_id: z.string().uuid({ message: 'ID do beneficiario invalido' }),
  percentual: percentualSchema,
  observacao: z.string().max(500).optional(),
});

/**
 * Schema para criacao de multiplas distribuicoes de uma vez
 */
export const distribuicoesCreateSchema = z.object({
  venda_id: z.string().uuid(),
  distribuicoes: z.array(
    z.object({
      beneficiario_id: z.string().uuid(),
      percentual: percentualSchema,
      num_parcelas: z.number().int().min(1).max(24).default(1),
      dias_entre_parcelas: z.number().int().min(1).max(90).default(30),
    })
  ).min(1, { message: 'Pelo menos uma distribuicao e necessaria' }),
}).refine(
  (data) => {
    const somaPercentuais = data.distribuicoes.reduce((acc, d) => acc + d.percentual, 0);
    return somaPercentuais <= 100.01; // Tolerancia de 0.01
  },
  { message: 'Soma dos percentuais nao pode ultrapassar 100%' }
);

// =============================================================================
// SCHEMAS DE PARCELA
// =============================================================================

/**
 * Schema para criacao de parcela
 */
export const parcelaCreateSchema = z.object({
  distribuicao_id: z.string().uuid({ message: 'ID da distribuicao invalido' }),
  numero: z.number().int().positive(),
  valor: valorMonetarioSchema,
  data_vencimento: dataISOSchema,
  observacao: z.string().max(500).optional(),
});

/**
 * Schema para atualizacao de parcela
 */
export const parcelaUpdateSchema = z.object({
  valor: valorMonetarioSchema.optional(),
  data_vencimento: dataISOSchema.optional(),
  status: parcelaStatusSchema.optional(),
  data_pagamento: dataISOSchema.optional(),
  observacao: z.string().max(500).optional(),
});

/**
 * Schema para geracao automatica de parcelas
 */
export const parcelasGerarSchema = z.object({
  distribuicao_id: z.string().uuid(),
  valor_total: valorMonetarioSchema,
  num_parcelas: z.number().int().min(1).max(24),
  data_primeira_parcela: dataISOSchema,
  dias_entre_parcelas: z.number().int().min(1).max(90).default(30),
});

// =============================================================================
// SCHEMAS DE PAGAMENTO
// =============================================================================

/**
 * Schema para criacao de pagamento
 */
export const pagamentoCreateSchema = z.object({
  parcela_id: z.string().uuid({ message: 'ID da parcela invalido' }),
  valor: valorMonetarioSchema,
  data_pagamento: dataISOSchema,
  forma_pagamento: formaPagamentoSchema,
  comprovante: z.string().url().optional(),
  observacao: z.string().max(500).optional(),
});

/**
 * Schema para confirmacao de pagamento
 */
export const pagamentoConfirmarSchema = z.object({
  data_pagamento: dataISOSchema,
  forma_pagamento: formaPagamentoSchema,
  comprovante: z.string().url().optional(),
  observacao: z.string().max(500).optional(),
});

/**
 * Schema para estorno de pagamento
 */
export const pagamentoEstornarSchema = z.object({
  justificativa: z.string().min(10, { message: 'Justificativa deve ter no minimo 10 caracteres' }),
});

// =============================================================================
// SCHEMAS DE FILTROS
// =============================================================================

/**
 * Schema para filtros de listagem de vendas
 */
export const vendaFiltrosSchema = z.object({
  status: z.union([vendaStatusSchema, z.array(vendaStatusSchema)]).optional(),
  empreendimento: z.string().optional(),
  data_inicio: dataISOSchema.optional(),
  data_fim: dataISOSchema.optional(),
  cliente_nome: z.string().optional(),
  beneficiario_id: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

/**
 * Schema para filtros de listagem de parcelas
 */
export const parcelaFiltrosSchema = z.object({
  status: z.union([parcelaStatusSchema, z.array(parcelaStatusSchema)]).optional(),
  beneficiario_id: z.string().uuid().optional(),
  venda_id: z.string().uuid().optional(),
  data_vencimento_inicio: dataISOSchema.optional(),
  data_vencimento_fim: dataISOSchema.optional(),
  atrasadas: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

/**
 * Schema para filtros de listagem de beneficiarios
 */
export const beneficiarioFiltrosSchema = z.object({
  cargo: z.string().optional(),
  ativo: z.boolean().optional(),
  busca: z.string().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

// =============================================================================
// SCHEMAS DE RELATORIOS
// =============================================================================

/**
 * Schema para relatorio de periodo
 */
export const relatorioPeriodoSchema = z.object({
  data_inicio: dataISOSchema,
  data_fim: dataISOSchema,
  empreendimento: z.string().optional(),
  beneficiario_id: z.string().uuid().optional(),
}).refine(
  (data) => new Date(data.data_fim) >= new Date(data.data_inicio),
  { message: 'Data fim deve ser maior ou igual a data inicio' }
);

/**
 * Schema para relatorio de fluxo de caixa
 */
export const relatorioFluxoCaixaSchema = z.object({
  meses: z.number().int().min(1).max(24).default(12),
  beneficiario_id: z.string().uuid().optional(),
});

// =============================================================================
// SCHEMAS PARA CRIACAO COMPLETA (VENDA + DISTRIBUICOES)
// =============================================================================

/**
 * Schema para criacao de venda com distribuicoes em uma unica operacao
 */
export const vendaComDistribuicoesCreateSchema = z.object({
  venda: vendaCreateSchema,
  distribuicoes: z.array(
    z.object({
      beneficiario_id: z.string().uuid(),
      percentual: percentualSchema,
      num_parcelas: z.number().int().min(1).max(24).default(1),
      dias_entre_parcelas: z.number().int().min(1).max(90).default(30),
    })
  ).min(1),
}).refine(
  (data) => {
    const somaPercentuais = data.distribuicoes.reduce((acc, d) => acc + d.percentual, 0);
    return somaPercentuais <= 100.01;
  },
  { message: 'Soma dos percentuais das distribuicoes nao pode ultrapassar 100%' }
);

// =============================================================================
// TIPOS INFERIDOS DOS SCHEMAS
// =============================================================================

export type VendaCreateInput = z.infer<typeof vendaCreateSchema>;
export type VendaUpdateInput = z.infer<typeof vendaUpdateSchema>;
export type BeneficiarioCreateInput = z.infer<typeof beneficiarioCreateSchema>;
export type BeneficiarioUpdateInput = z.infer<typeof beneficiarioUpdateSchema>;
export type DistribuicaoCreateInput = z.infer<typeof distribuicaoCreateSchema>;
export type DistribuicoesCreateInput = z.infer<typeof distribuicoesCreateSchema>;
export type ParcelaCreateInput = z.infer<typeof parcelaCreateSchema>;
export type ParcelaUpdateInput = z.infer<typeof parcelaUpdateSchema>;
export type PagamentoCreateInput = z.infer<typeof pagamentoCreateSchema>;
export type VendaFiltrosInput = z.infer<typeof vendaFiltrosSchema>;
export type ParcelaFiltrosInput = z.infer<typeof parcelaFiltrosSchema>;
export type BeneficiarioFiltrosInput = z.infer<typeof beneficiarioFiltrosSchema>;
export type VendaComDistribuicoesCreateInput = z.infer<typeof vendaComDistribuicoesCreateSchema>;
