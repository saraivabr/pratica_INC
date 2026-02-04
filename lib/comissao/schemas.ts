/**
 * Sistema de Calculo de Comissoes - Schemas Zod
 * Validacao de API para vendas, corretores, parcelas e matriz
 */

import { z } from 'zod';

// =============================================================================
// SCHEMAS BASE
// =============================================================================

export const cpfSchema = z.string().optional().refine(
  (cpf) => {
    if (!cpf) return true;
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(limpo)) return false;
    // Validacao simplificada
    return true;
  },
  { message: 'CPF invalido' }
);

export const valorMonetarioSchema = z.number()
  .positive({ message: 'Valor deve ser positivo' })
  .finite({ message: 'Valor deve ser um numero valido' });

export const percentualDecimalSchema = z.number()
  .min(0, { message: 'Percentual deve ser maior ou igual a 0' })
  .max(1, { message: 'Percentual deve ser menor ou igual a 1 (100%)' });

export const percentual100Schema = z.number()
  .min(0, { message: 'Percentual deve ser maior ou igual a 0' })
  .max(100, { message: 'Percentual deve ser menor ou igual a 100' });

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

export const comissaoVendaStatusSchema = z.enum(['ativa', 'calculada', 'enviada', 'cancelada']);
export const comissaoParcelaStatusSchema = z.enum(['prevista', 'recebida', 'cancelada']);
export const tipoContaSchema = z.enum(['corrente', 'poupanca', 'pagamento']);

// =============================================================================
// DADOS BANCARIOS
// =============================================================================

export const dadosBancariosSchema = z.object({
  banco: z.string().max(50).optional(),
  agencia: z.string().max(10).optional(),
  conta: z.string().max(20).optional(),
  tipo_conta: tipoContaSchema.optional(),
  pix: z.string().max(100).optional(),
}).optional();

// =============================================================================
// SCHEMAS DE VENDA
// =============================================================================

export const comissaoVendaCreateSchema = z.object({
  valor_venda: valorMonetarioSchema,
  percentual_comissao: percentualDecimalSchema,
  empreendimento: z.string().max(255).optional(),
  unidade: z.string().max(100).optional(),
  cliente_nome: z.string().max(255).optional(),
  cliente_cpf: cpfSchema,
  data_venda: dataISOSchema,
  observacoes: z.string().max(1000).optional(),
  referencia: z.string().max(100).optional(),
});

export const comissaoVendaUpdateSchema = z.object({
  valor_venda: valorMonetarioSchema.optional(),
  percentual_comissao: percentualDecimalSchema.optional(),
  empreendimento: z.string().max(255).optional(),
  unidade: z.string().max(100).optional(),
  cliente_nome: z.string().max(255).optional(),
  cliente_cpf: cpfSchema,
  data_venda: dataISOSchema.optional(),
  observacoes: z.string().max(1000).optional(),
  referencia: z.string().max(100).optional(),
  status: comissaoVendaStatusSchema.optional(),
});

// =============================================================================
// SCHEMAS DE CORRETOR
// =============================================================================

export const comissaoCorretorCreateSchema = z.object({
  beneficiario_id: z.number().int().positive().optional(),
  nome: z.string().min(2, { message: 'Nome deve ter no minimo 2 caracteres' }).max(255),
  cpf: cpfSchema,
  percentual_participacao: percentualDecimalSchema,
  valor_comissao: valorMonetarioSchema,
  prioridade: z.number().int().min(0).default(0),
  observacoes: z.string().max(500).optional(),
  imobiliaria_nome: z.string().max(255).optional(),
  creci: z.string().max(50).optional(),
  dados_bancarios: dadosBancariosSchema,
});

export const comissaoCorretorUpdateSchema = z.object({
  nome: z.string().min(2).max(255).optional(),
  cpf: cpfSchema,
  percentual_participacao: percentualDecimalSchema.optional(),
  valor_comissao: valorMonetarioSchema.optional(),
  prioridade: z.number().int().min(0).optional(),
  observacoes: z.string().max(500).optional(),
  imobiliaria_nome: z.string().max(255).optional(),
  creci: z.string().max(50).optional(),
  dados_bancarios: dadosBancariosSchema,
});

// Schema para adicionar multiplos corretores de uma vez (equalizador)
export const comissaoCorretoresArraySchema = z.array(
  z.object({
    beneficiario_id: z.number().int().positive().optional(),
    nome: z.string().min(2).max(255),
    cpf: cpfSchema,
    percentual_participacao: percentualDecimalSchema,
    valor_comissao: valorMonetarioSchema,
    prioridade: z.number().int().min(0).default(0),
    imobiliaria_nome: z.string().max(255).optional(),
    creci: z.string().max(50).optional(),
    dados_bancarios: dadosBancariosSchema,
  })
).min(1, { message: 'Pelo menos um corretor e necessario' })
  .refine(
    (corretores) => {
      const soma = corretores.reduce((acc, c) => acc + c.percentual_participacao, 0);
      return soma <= 1.001; // Tolerancia para erros de ponto flutuante
    },
    { message: 'Soma dos percentuais nao pode ultrapassar 100%' }
  );

// =============================================================================
// SCHEMAS DE PARCELA
// =============================================================================

export const comissaoParcelaCreateSchema = z.object({
  numero: z.number().int().positive(),
  descricao: z.string().max(100).optional(),
  valor_parcela: valorMonetarioSchema,
  percentual_comissao: percentualDecimalSchema,
  data_prevista: dataISOSchema,
});

export const comissaoParcelaUpdateSchema = z.object({
  descricao: z.string().max(100).optional(),
  valor_parcela: valorMonetarioSchema.optional(),
  percentual_comissao: percentualDecimalSchema.optional(),
  data_prevista: dataISOSchema.optional(),
  data_recebimento: dataISOSchema.optional(),
  status: comissaoParcelaStatusSchema.optional(),
});

// Schema para adicionar multiplas parcelas de uma vez
export const comissaoParcelasArraySchema = z.array(
  z.object({
    numero: z.number().int().positive(),
    descricao: z.string().max(100).optional(),
    valor_parcela: valorMonetarioSchema,
    percentual_comissao: percentualDecimalSchema,
    data_prevista: dataISOSchema,
  })
).min(1, { message: 'Pelo menos uma parcela e necessaria' })
  .refine(
    (parcelas) => {
      const soma = parcelas.reduce((acc, p) => acc + p.percentual_comissao, 0);
      return soma <= 1.001; // Tolerancia para erros de ponto flutuante
    },
    { message: 'Soma dos percentuais das parcelas nao pode ultrapassar 100%' }
  );

// =============================================================================
// SCHEMA COMPLETO PARA CRIACAO DE VENDA
// =============================================================================

export const comissaoVendaCompletaCreateSchema = z.object({
  venda: comissaoVendaCreateSchema,
  corretores: comissaoCorretoresArraySchema,
  parcelas: comissaoParcelasArraySchema,
});

// =============================================================================
// SCHEMAS DE FILTROS
// =============================================================================

export const comissaoVendaFiltrosSchema = z.object({
  status: z.union([
    comissaoVendaStatusSchema,
    z.array(comissaoVendaStatusSchema)
  ]).optional(),
  empreendimento: z.string().optional(),
  data_inicio: dataISOSchema.optional(),
  data_fim: dataISOSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// =============================================================================
// SCHEMAS PARA BUSCA
// =============================================================================

export const buscaUnidadesSchema = z.object({
  empreendimento_id: z.number().int().positive(),
  busca: z.string().optional(),
});

export const buscaCorretoresSchema = z.object({
  busca: z.string().min(2, { message: 'Busca deve ter no minimo 2 caracteres' }),
  limit: z.number().int().min(1).max(50).default(10),
});

export const buscaEmpreendimentosSchema = z.object({
  busca: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// =============================================================================
// TIPOS INFERIDOS
// =============================================================================

export type ComissaoVendaCreateInput = z.infer<typeof comissaoVendaCreateSchema>;
export type ComissaoVendaUpdateInput = z.infer<typeof comissaoVendaUpdateSchema>;
export type ComissaoCorretorCreateInput = z.infer<typeof comissaoCorretorCreateSchema>;
export type ComissaoCorretorUpdateInput = z.infer<typeof comissaoCorretorUpdateSchema>;
export type ComissaoParcelaCreateInput = z.infer<typeof comissaoParcelaCreateSchema>;
export type ComissaoParcelaUpdateInput = z.infer<typeof comissaoParcelaUpdateSchema>;
export type ComissaoVendaCompletaCreateInput = z.infer<typeof comissaoVendaCompletaCreateSchema>;
export type ComissaoVendaFiltrosInput = z.infer<typeof comissaoVendaFiltrosSchema>;
