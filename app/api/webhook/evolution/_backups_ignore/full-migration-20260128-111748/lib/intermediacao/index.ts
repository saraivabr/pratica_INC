/**
 * @fileoverview Biblioteca de logica de negocio para o Sistema de Intermediacao Imobiliaria
 * @module lib/intermediacao
 * @description Exporta todos os modulos da biblioteca de intermediacao imobiliaria:
 * - types: Tipos TypeScript para entidades do sistema
 * - validations: Funcoes de validacao (CPF, CNPJ, percentuais, status)
 * - calculations: Calculos financeiros (comissao, parcelas, arredondamento)
 * - formatters: Formatadores (moeda, data, documento, codigos)
 * - audit: Funcoes de auditoria (logs, deteccao de alteracoes)
 * - queries: Queries SQL reutilizaveis
 * - schemas: Schemas Zod para validacao de API
 */

// =============================================================================
// TIPOS
// =============================================================================
export * from './types';

// =============================================================================
// VALIDACOES
// =============================================================================
export {
  // Documentos
  validarCPF,
  validarCNPJ,
  validarDocumento,
  limparDocumento,
  detectarTipoDocumento,
  // Percentuais e Parcelas
  validarSomaPercentuais,
  validarSomaPercentuaisExata,
  validarSomaParcelas,
  validarOrdemParcelas,
  // Status
  validarTransicaoStatus,
  validarTransicaoStatusParcela,
  obterTransicoesPermitidas,
  // Validacoes de negocio
  validarPercentualIntermediacao,
  validarValorMonetario,
  validarData,
  validarDataVencimentoFutura,
  validarEmail,
  validarTelefone,
} from './validations';

// =============================================================================
// CALCULOS
// =============================================================================
export {
  // Arredondamento
  arredondarValor,
  truncarValor,
  // Comissao
  calcularComissao,
  calcularValorBeneficiario,
  calcularPercentual,
  // Parcelas
  distribuirParcelas,
  calcularDatasVencimento,
  calcularDatasVencimentoMensal,
  ajustarUltimaParcela,
  distribuirDiferencaProporcional,
  // Agregados
  calcularResumoFinanceiro,
  calcularValorLiquido,
  projetarSaldoPorPeriodo,
} from './calculations';

// =============================================================================
// FORMATADORES
// =============================================================================
export {
  // Documentos
  formatarCPF,
  formatarCNPJ,
  formatarDocumento,
  mascararCPF,
  mascararCNPJ,
  // Moeda
  formatarMoeda,
  formatarMoedaInteira,
  formatarMoedaCompacta,
  parseMoeda,
  // Data
  formatarData,
  formatarDataHora,
  formatarDataRelativa,
  formatarMesAno,
  // Percentual
  formatarPercentual,
  formatarPercentualInteiro,
  formatarNumeroPercentual,
  parsePercentual,
  // Codigos
  gerarCodigoVenda,
  gerarCodigoBeneficiario,
  gerarCodigoParcela,
  gerarCodigoPagamento,
  formatarCodigoVenda,
  // Telefone
  formatarTelefone,
  // Status
  formatarStatusVenda,
  formatarStatusParcela,
  formatarTipoBeneficiario,
  formatarFormaPagamento,
  // Utilitarios
  formatarNumero,
  calcularDistribuicao,
  distribuirIgualmente,
  getIniciais,
} from './formatters';

// =============================================================================
// AUDITORIA
// =============================================================================
export {
  // Deteccao de alteracoes
  detectarCamposAlterados,
  filtrarCamposSensiveis,
  // Operacoes criticas
  isOperacaoCritica,
  descreverCriticidade,
  // Logs
  prepararLogAuditoria,
  criarLogAuditoria,
  gerarResumoAuditoria,
  // Consultas
  gerarQueryAuditoria,
  tabelaRequerAuditoria,
} from './audit';

// =============================================================================
// QUERIES
// =============================================================================
export {
  // Vendas
  VENDA_QUERY_BASE,
  VENDA_GROUP_BY,
  VENDA_QUERY_BY_ID,
  VENDA_QUERY_LIST,
  VENDA_COUNT_QUERY,
  // Beneficiarios
  BENEFICIARIO_QUERY_BASE,
  BENEFICIARIO_GROUP_BY,
  BENEFICIARIO_QUERY_LIST,
  BENEFICIARIO_QUERY_BY_DOCUMENTO,
  // Parcelas
  PARCELA_QUERY_BASE,
  PARCELA_GROUP_BY,
  PARCELA_QUERY_LIST,
  PARCELA_QUERY_ATRASADAS,
  PARCELA_QUERY_A_VENCER,
  // Pagamentos
  PAGAMENTO_QUERY_BASE,
  PAGAMENTO_QUERY_LIST,
  // Relatorios
  RELATORIO_RESUMO_PERIODO,
  RELATORIO_RANKING_BENEFICIARIOS,
  RELATORIO_FLUXO_CAIXA,
  // Auditoria
  AUDITORIA_QUERY_LIST,
  AUDITORIA_HISTORICO_REGISTRO,
} from './queries';

// =============================================================================
// SCHEMAS ZOD
// =============================================================================
export {
  // Schemas customizados
  cpfSchema,
  cnpjSchema,
  documentoSchema,
  telefoneSchema,
  valorMonetarioSchema,
  percentualSchema,
  dataISOSchema,
  // Enums
  vendaStatusSchema,
  parcelaStatusSchema,
  pagamentoStatusSchema,
  tipoDocumentoSchema,
  tipoBeneficiarioSchema,
  formaPagamentoSchema,
  tipoContaSchema,
  metodoPagamentoSchema,
  // Venda
  vendaCreateSchema,
  vendaUpdateSchema,
  vendaTransicaoStatusSchema,
  // Beneficiario
  beneficiarioCreateSchema,
  beneficiarioUpdateSchema,
  // Distribuicao
  distribuicaoCreateSchema,
  distribuicoesCreateSchema,
  // Parcela
  parcelaCreateSchema,
  parcelaUpdateSchema,
  parcelasGerarSchema,
  // Pagamento
  pagamentoCreateSchema,
  pagamentoConfirmarSchema,
  pagamentoEstornarSchema,
  // Filtros
  vendaFiltrosSchema,
  parcelaFiltrosSchema,
  beneficiarioFiltrosSchema,
  // Relatorios
  relatorioPeriodoSchema,
  relatorioFluxoCaixaSchema,
  // Compostos
  vendaComDistribuicoesCreateSchema,
} from './schemas';

// Re-exportar tipos inferidos dos schemas
export type {
  VendaCreateInput,
  VendaUpdateInput,
  BeneficiarioCreateInput,
  BeneficiarioUpdateInput,
  DistribuicaoCreateInput,
  DistribuicoesCreateInput,
  ParcelaCreateInput,
  ParcelaUpdateInput,
  PagamentoCreateInput,
  VendaFiltrosInput,
  ParcelaFiltrosInput,
  BeneficiarioFiltrosInput,
  VendaComDistribuicoesCreateInput,
} from './schemas';

// =============================================================================
// API CLIENT
// =============================================================================
export {
  vendasApi,
  beneficiariosApi,
  parcelasApi,
  pagamentosApi,
  dashboardApi,
  relatoriosApi,
  auditoriaApi,
  intermediacaoApi,
} from './api';

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================
export {
  // Query Keys
  intermediacaoKeys,
  // Vendas
  useVendas,
  useVenda,
  useCreateVenda,
  useUpdateVenda,
  useDeleteVenda,
  // Beneficiarios
  useBeneficiarios,
  useBeneficiario,
  useCreateBeneficiario,
  useUpdateBeneficiario,
  useDeleteBeneficiario,
  // Parcelas
  useParcelas,
  useParcelasVencidas,
  useParcela,
  useMarcarParcelaPaga,
  // Pagamentos
  usePagamentos,
  usePagamento,
  useCreatePagamento,
  useEstornarPagamento,
  // Dashboard
  useDashboardStats,
  // Auditoria
  useAuditoria,
} from './hooks';

export type { PeriodoDashboard, FiltrosAuditoria } from './hooks';
