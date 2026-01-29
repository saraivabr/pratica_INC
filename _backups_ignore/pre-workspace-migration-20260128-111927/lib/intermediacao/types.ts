/**
 * Sistema de Intermediacao Imobiliaria - Tipos TypeScript
 * Correspondente a migration: 20260126_sistema_intermediacao.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type VendaStatus = 'rascunho' | 'em_processamento' | 'concluida' | 'paga';

export type TipoDocumento = 'cpf' | 'cnpj';

export type CargoBeneficiario = 'Corretor' | 'Gerente' | 'Proprietário' | 'Imobiliária';

export type ParcelaStatus = 'pendente' | 'vencida' | 'paga' | 'cancelada';

export type MetodoPagamento = 'transferencia' | 'deposito' | 'pix' | 'outro';

export type OperacaoAuditoria = 'create' | 'update' | 'delete';

export type TipoConta = 'corrente' | 'poupanca' | 'pagamento';

// ============================================================================
// INTERFACES BASE
// ============================================================================

export interface BaseEntity {
  id: string;
  created_at: string;
}

export interface BaseEntityWithUpdate extends BaseEntity {
  updated_at: string;
}

export interface TenantEntity {
  tenant_id: string;
}

// ============================================================================
// 1. VENDAS INTERMEDIACAO
// ============================================================================

export interface VendaIntermediacao extends BaseEntityWithUpdate, TenantEntity {
  codigo: string; // VND-YYYYMM-XXXX
  valor_total: number;
  unidade: string;
  empreendimento: string;
  cliente_nome: string;
  cliente_cpf?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  data_venda: string; // DATE
  percentual_intermediacao: number; // 0-100
  valor_comissao: number; // GENERATED
  status: VendaStatus;
  descricao?: string;
  criado_por: string;
}

export interface VendaIntermediacoInput {
  valor_total: number;
  unidade: string;
  empreendimento: string;
  cliente_nome: string;
  cliente_cpf?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  data_venda: string;
  percentual_intermediacao: number;
  descricao?: string;
  status?: VendaStatus;
}

export interface VendaIntermediacoUpdate extends Partial<VendaIntermediacoInput> {
  status?: VendaStatus;
}

// ============================================================================
// 2. BENEFICIARIOS INTERMEDIACAO
// ============================================================================

export interface DadosBancarios {
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: TipoConta;
  pix?: string;
}

export interface BeneficiarioIntermediacao extends BaseEntityWithUpdate, TenantEntity {
  codigo: string; // BEN-XXXX
  nome: string;
  tipo_documento: TipoDocumento;
  documento: string;
  cargo: string;
  email: string;
  telefone?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: string;
  pix?: string;
  observacoes?: string;
  ativo: boolean;
}

export interface BeneficiarioIntermediacoInput {
  nome: string;
  tipo_documento: TipoDocumento;
  documento: string;
  cargo: string;
  email: string;
  telefone?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: string;
  pix?: string;
  observacoes?: string;
}

export interface BeneficiarioIntermediacoUpdate extends Partial<BeneficiarioIntermediacoInput> {
  ativo?: boolean;
}

// ============================================================================
// 3. DISTRIBUICAO DE COMISSAO
// ============================================================================

export interface DistribuicaoComissao extends BaseEntity {
  venda_id: string;
  beneficiario_id: string;
  percentual: number;
  valor: number;
}

export interface DistribuicaoComissaoInput {
  venda_id: string;
  beneficiario_id: string;
  percentual: number;
  valor: number;
}

export interface DistribuicaoComissaoComBeneficiario extends DistribuicaoComissao {
  beneficiario: BeneficiarioIntermediacao;
  parcelas?: ParcelaIntermediacao[];
}

// ============================================================================
// 4. PARCELAS INTERMEDIACAO
// ============================================================================

export interface ParcelaIntermediacao extends BaseEntityWithUpdate {
  distribuicao_id: string;
  numero: number;
  valor: number;
  data_vencimento: string; // DATE
  status: ParcelaStatus;
}

export interface ParcelaIntermediacoInput {
  distribuicao_id: string;
  numero: number;
  valor: number;
  data_vencimento: string;
}

export interface ParcelaIntermediacoUpdate {
  status?: ParcelaStatus;
  data_vencimento?: string;
  valor?: number;
}

export interface ParcelaDetalhada extends ParcelaIntermediacao {
  beneficiario_id: string;
  beneficiario_codigo: string;
  beneficiario_nome: string;
  beneficiario_documento: string;
  venda_id: string;
  venda_codigo: string;
  empreendimento: string;
  unidade: string;
  tenant_id: string;
  data_pagamento?: string;
  metodo_pagamento?: MetodoPagamento;
}

// ============================================================================
// 5. PAGAMENTOS INTERMEDIACAO
// ============================================================================

export interface PagamentoIntermediacao extends BaseEntity {
  parcela_id: string;
  data_pagamento: string; // DATE
  metodo: MetodoPagamento;
  comprovante?: string;
  referencia?: string;
  registrado_por: string;
}

export interface PagamentoIntermediacoInput {
  parcela_id: string;
  data_pagamento: string;
  metodo: MetodoPagamento;
  comprovante?: string;
  referencia?: string;
}

// ============================================================================
// 6. LOG DE AUDITORIA
// ============================================================================

export interface LogAuditoriaIntermediacao extends BaseEntity {
  tabela: string;
  registro_id: string;
  operacao: OperacaoAuditoria;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  campos_alterados?: string[];
  usuario_id: string;
  usuario_nome?: string;
  justificativa?: string;
  ip?: string;
}

export interface LogAuditoriaInput {
  tabela: string;
  registro_id: string;
  operacao: OperacaoAuditoria;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  usuario_id: string;
  usuario_nome?: string;
  justificativa?: string;
  ip?: string;
}

// ============================================================================
// 7. REGRAS DE PARCELAMENTO
// ============================================================================

export interface RegraParcelamento extends BaseEntity, TenantEntity {
  nome: string;
  descricao?: string;
  num_parcelas: number;
  dias_entre_parcelas: number;
  ativo: boolean;
}

export interface RegraParcelamentoInput {
  nome: string;
  descricao?: string;
  num_parcelas: number;
  dias_entre_parcelas?: number;
}

export interface RegraParcelamentoUpdate extends Partial<RegraParcelamentoInput> {
  ativo?: boolean;
}

// ============================================================================
// VIEWS E AGREGACOES
// ============================================================================

export interface VendaResumo {
  id: string;
  codigo: string;
  valor_total: number;
  valor_comissao: number;
  unidade: string;
  empreendimento: string;
  cliente_nome: string;
  data_venda: string;
  status: VendaStatus;
  tenant_id: string;
  total_beneficiarios: number;
  valor_pago: number;
  valor_pendente: number;
}

export interface DashboardComissoes {
  tenant_id: string;
  mes: string;
  total_vendas: number;
  valor_vendas: number;
  valor_comissoes: number;
  comissoes_pagas: number;
  comissoes_pendentes: number;
  comissoes_vencidas: number;
}

export interface ResumoBeneficiario {
  total_vendas: number;
  valor_total_comissoes: number;
  valor_pago: number;
  valor_pendente: number;
}

// ============================================================================
// TIPOS PARA FORMULARIOS E UI
// ============================================================================

export interface VendaComDistribuicao extends VendaIntermediacao {
  distribuicoes: DistribuicaoComissaoComBeneficiario[];
}

export interface DistribuicaoFormItem {
  beneficiario_id: string;
  percentual: number;
  num_parcelas: number;
  dias_entre_parcelas: number;
}

export interface CriarVendaComDistribuicaoInput {
  venda: VendaIntermediacoInput;
  distribuicoes: DistribuicaoFormItem[];
}

export interface FiltroVendas {
  status?: VendaStatus[];
  empreendimento?: string;
  data_inicio?: string;
  data_fim?: string;
  cliente_nome?: string;
}

export interface FiltroParcelas {
  status?: ParcelaStatus[];
  beneficiario_id?: string;
  venda_id?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
}

export interface FiltroBeneficiarios {
  cargo?: string;
  ativo?: boolean;
  busca?: string; // nome ou documento
}

// ============================================================================
// TIPOS PARA RELATORIOS
// ============================================================================

export interface RelatorioComissoesPeriodo {
  periodo_inicio: string;
  periodo_fim: string;
  total_vendas: number;
  valor_total_vendas: number;
  valor_total_comissoes: number;
  valor_pago: number;
  valor_pendente: number;
  valor_vencido: number;
  por_empreendimento: {
    empreendimento: string;
    total_vendas: number;
    valor_comissoes: number;
  }[];
  por_beneficiario: {
    beneficiario_id: string;
    beneficiario_nome: string;
    cargo: string;
    valor_total: number;
    valor_pago: number;
    valor_pendente: number;
  }[];
}

export interface RelatorioParcelasVencer {
  proximos_7_dias: ParcelaDetalhada[];
  proximos_15_dias: ParcelaDetalhada[];
  proximos_30_dias: ParcelaDetalhada[];
  total_valor: number;
}

export interface RelatorioParcelasVencidas {
  parcelas: ParcelaDetalhada[];
  total_valor: number;
  por_beneficiario: {
    beneficiario_id: string;
    beneficiario_nome: string;
    quantidade: number;
    valor_total: number;
  }[];
}

// ============================================================================
// TIPOS PARA API RESPONSES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const VENDA_STATUS_LABELS: Record<VendaStatus, string> = {
  rascunho: 'Rascunho',
  em_processamento: 'Em Processamento',
  concluida: 'Concluida',
  paga: 'Paga',
};

export const VENDA_STATUS_COLORS: Record<VendaStatus, string> = {
  rascunho: 'gray',
  em_processamento: 'yellow',
  concluida: 'green',
  paga: 'blue',
};

export const PARCELA_STATUS_LABELS: Record<ParcelaStatus, string> = {
  pendente: 'Pendente',
  vencida: 'Vencida',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

export const PARCELA_STATUS_COLORS: Record<ParcelaStatus, string> = {
  pendente: 'yellow',
  vencida: 'red',
  paga: 'green',
  cancelada: 'gray',
};

export const METODO_PAGAMENTO_LABELS: Record<MetodoPagamento, string> = {
  transferencia: 'Transferencia Bancaria',
  deposito: 'Deposito',
  pix: 'PIX',
  outro: 'Outro',
};

export const CARGO_BENEFICIARIO_OPTIONS: CargoBeneficiario[] = [
  'Corretor',
  'Gerente',
  'Proprietário',
  'Imobiliária',
];

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
};

export const TIPO_CONTA_OPTIONS: TipoConta[] = ['corrente', 'poupanca', 'pagamento'];

export const TIPO_CONTA_LABELS: Record<TipoConta, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupanca',
  pagamento: 'Conta Pagamento',
};

// ============================================================================
// TIPOS LEGADOS (compatibilidade com codigo existente)
// ============================================================================

/** @deprecated Use BeneficiarioIntermediacao */
export interface Beneficiario {
  id: string;
  nome: string;
  cargo: string;
  avatar?: string;
  email?: string;
}

/** @deprecated Use DistribuicaoComissao */
export interface Distribuicao {
  beneficiarioId: string;
  beneficiario: Beneficiario;
  percentual: number;
  valor: number;
}

/** @deprecated Use ParcelaIntermediacao */
export interface Parcela {
  id: string;
  numero: number;
  valor: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  status: 'pendente' | 'paga' | 'atrasada' | 'cancelada';
}

/** @deprecated Use VendaIntermediacao */
export interface Comissao {
  id: string;
  valorVenda: number;
  percentual: number;
  valorTotal: number;
  distribuicoes: Distribuicao[];
  parcelas: Parcela[];
  status: 'pendente' | 'parcialmente_paga' | 'paga' | 'cancelada';
}

/** @deprecated Use VendaComDistribuicao */
export interface VendaComDistribuicaoLegado {
  id: string;
  codigo: string;
  valorVenda: number;
  percentualComissao: number;
  comissaoTotal: number;
  distribuicoes: DistribuicaoVenda[];
  totalParcelas: number;
  parcelasPagas: number;
  status: 'distribuido' | 'parcialmente_distribuido' | 'nao_distribuido';
}

export interface DistribuicaoVenda {
  beneficiario: Beneficiario;
  percentual: number;
  valor: number;
  parcelas: number;
}

export type StatusDistribuicao = 'incompleto' | 'completo' | 'excedido';

// ============================================================================
// TIPOS PARA LOG DE AUDITORIA (EXTENSAO)
// ============================================================================

export interface LogAuditoriaCreateInput {
  tabela: string;
  registro_id: string;
  operacao: OperacaoAuditoria;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  campos_alterados?: string[];
  usuario_id: string;
  usuario_nome: string;
  justificativa?: string;
  ip?: string;
}

// ============================================================================
// TIPOS PARA PAGAMENTOS (EXTENSAO)
// ============================================================================

export type FormaPagamento = 'pix' | 'transferencia' | 'boleto' | 'cheque' | 'dinheiro';
export type PagamentoStatus = 'pendente' | 'confirmado' | 'estornado';

export interface Pagamento extends BaseEntity {
  parcela_id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: FormaPagamento;
  comprovante?: string;
  status: PagamentoStatus;
  observacao?: string;
  registrado_por: string;
  updated_at: string;
}

export interface PagamentoCreateInput {
  parcela_id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: FormaPagamento;
  comprovante?: string;
  observacao?: string;
}

// ============================================================================
// TIPOS PARA RESUMO FINANCEIRO
// ============================================================================

export interface ResumoFinanceiroVenda {
  valor_comissao: number;
  total_distribuido: number;
  total_pendente_distribuicao: number;
  total_pago: number;
  total_a_pagar: number;
  quantidade_beneficiarios: number;
  quantidade_parcelas: number;
  parcelas_pagas: number;
  parcelas_pendentes: number;
}

// ============================================================================
// CONSTANTES DE FORMA DE PAGAMENTO
// ============================================================================

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  pix: 'PIX',
  transferencia: 'Transferencia Bancaria',
  boleto: 'Boleto',
  cheque: 'Cheque',
  dinheiro: 'Dinheiro',
};

export const PAGAMENTO_STATUS_LABELS: Record<PagamentoStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  estornado: 'Estornado',
};
