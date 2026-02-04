/**
 * Sistema de Calculo de Comissoes (Planilha do Calculista)
 * Tipos TypeScript - correspondente a migration 038_comissao_calculo.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ComissaoVendaStatus = 'ativa' | 'calculada' | 'enviada' | 'cancelada';
export type ComissaoParcelaStatus = 'prevista' | 'recebida' | 'cancelada';

// ============================================================================
// INTERFACES BASE
// ============================================================================

export interface BaseEntity {
  id: number;
  created_at: string;
}

export interface BaseEntityWithUpdate extends BaseEntity {
  updated_at: string;
}

// ============================================================================
// 1. VENDAS COM COMISSAO
// ============================================================================

export interface ComissaoVenda extends BaseEntityWithUpdate {
  workspace_id: number;
  codigo: string;
  referencia?: string;
  valor_venda: number;
  percentual_comissao: number; // decimal (0.05 = 5%)
  valor_comissao_total: number; // GENERATED: valor_venda * percentual_comissao
  empreendimento?: string;
  unidade?: string;
  cliente_nome?: string;
  cliente_cpf?: string;
  data_venda: string; // DATE
  status: ComissaoVendaStatus;
  observacoes?: string;
  created_by?: number;
}

export interface ComissaoVendaInput {
  valor_venda: number;
  percentual_comissao: number; // ex: 0.05 para 5%
  empreendimento?: string;
  unidade?: string;
  cliente_nome?: string;
  cliente_cpf?: string;
  data_venda: string;
  observacoes?: string;
  referencia?: string;
}

export interface ComissaoVendaUpdate extends Partial<ComissaoVendaInput> {
  status?: ComissaoVendaStatus;
}

// ============================================================================
// 2. CORRETORES NA VENDA
// ============================================================================

export interface ComissaoCorretor extends BaseEntity {
  venda_id: number;
  beneficiario_id?: number;
  nome: string;
  cpf?: string;
  percentual_participacao: number; // decimal (0.40 = 40%)
  valor_comissao: number;
  prioridade: number;
  observacoes?: string;
  // Dados extras para UI
  imobiliaria_nome?: string;
  creci?: string;
  dados_bancarios?: DadosBancarios;
}

export interface ComissaoCorretorInput {
  beneficiario_id?: number;
  nome: string;
  cpf?: string;
  percentual_participacao: number;
  valor_comissao: number;
  prioridade?: number;
  observacoes?: string;
  imobiliaria_nome?: string;
  creci?: string;
  dados_bancarios?: DadosBancarios;
}

export interface DadosBancarios {
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: 'corrente' | 'poupanca' | 'pagamento';
  pix?: string;
}

// ============================================================================
// 3. PARCELAS (CRONOGRAMA DE RECEBIMENTO)
// ============================================================================

export interface ComissaoParcela extends BaseEntity {
  venda_id: number;
  numero: number;
  descricao?: string;
  valor_parcela: number;
  percentual_comissao: number; // % da comissao que esta parcela representa
  data_prevista: string; // DATE
  data_recebimento?: string; // DATE
  status: ComissaoParcelaStatus;
}

export interface ComissaoParcelaInput {
  numero: number;
  descricao?: string;
  valor_parcela: number;
  percentual_comissao: number;
  data_prevista: string;
}

export interface ComissaoParcelaUpdate {
  descricao?: string;
  valor_parcela?: number;
  percentual_comissao?: number;
  data_prevista?: string;
  data_recebimento?: string;
  status?: ComissaoParcelaStatus;
}

// ============================================================================
// 4. MATRIZ DE CALCULO (RESULTADO)
// ============================================================================

export interface ComissaoMatriz extends BaseEntity {
  venda_id: number;
  parcela_id: number;
  corretor_id: number;
  valor_calculado: number;
  percentual_usado: number;
  formula_aplicada?: string;
  enviado_pagadoria: boolean;
  data_envio_pagadoria?: string;
}

// ============================================================================
// TIPOS PARA VISUALIZACAO (PLANILHA)
// ============================================================================

export interface MatrizPlanilhaRow {
  corretor_id: number;
  corretor_nome: string;
  percentual_participacao: number;
  corretor_comissao_total: number;
  valores_por_parcela: number[]; // valores calculados para cada parcela
  total: number;
}

export interface MatrizPlanilha {
  venda: ComissaoVenda;
  corretores: ComissaoCorretor[];
  parcelas: ComissaoParcela[];
  matriz: MatrizPlanilhaRow[];
  totais_parcela: number[];
  total_geral: number;
}

export interface CalculoMatrizResult {
  success: boolean;
  venda_id: number;
  matriz: Array<{
    corretor_nome: string;
    parcela_descricao: string;
    valor_calculado: number;
  }>;
  totais: {
    por_corretor: Record<string, number>;
    por_parcela: Record<string, number>;
  };
}

// ============================================================================
// TIPOS PARA FORMULARIOS
// ============================================================================

export interface NovaVendaFormData {
  // Dados da venda
  empreendimento: string;
  empreendimento_id?: number;
  unidade: string;
  unidade_id?: number;
  valor_tabela?: number;
  valor_venda: number;
  percentual_comissao: number;
  cliente_nome?: string;
  cliente_cpf?: string;
  data_venda: string;
  observacoes?: string;
  // Corretores (equalizador)
  corretores: CorretorEqualizadorItem[];
  // Parcelas
  parcelas: ParcelaFormItem[];
}

export interface CorretorEqualizadorItem {
  id?: number; // ID se ja existe
  beneficiario_id?: number;
  nome: string;
  cpf?: string;
  percentual: number; // 0-100
  valor: number; // calculado
  imobiliaria_nome?: string;
  creci?: string;
  dados_bancarios?: DadosBancarios;
}

export interface ParcelaFormItem {
  numero: number;
  descricao: string;
  percentual: number; // 0-100
  valor: number; // calculado
  data_prevista: string;
}

// ============================================================================
// TIPOS PARA BUSCA
// ============================================================================

export interface UnidadeBusca {
  id: number;
  codigo?: string;
  bloco?: string;
  andar?: string;
  area?: number;
  tipologia?: string;
  valor_tabela?: number;
  empreendimento_id: number;
  empreendimento_nome: string;
  status?: string;
}

export interface CorretorBusca {
  id: number;
  nome: string;
  cpf?: string;
  creci?: string;
  imobiliaria_nome?: string;
  imobiliaria_id?: number;
  email?: string;
  telefone?: string;
  fonte: 'cvcrm' | 'beneficiario' | 'user';
}

export interface EmpreendimentoBusca {
  id: number;
  nome: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  status?: string;
}

export interface ImobiliariaBusca {
  id: number;
  nome: string;
  cnpj?: string;
}

// ============================================================================
// TIPOS PARA API RESPONSES
// ============================================================================

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// FILTROS
// ============================================================================

export interface FiltroComissaoVendas {
  status?: ComissaoVendaStatus[];
  empreendimento?: string;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const COMISSAO_VENDA_STATUS_LABELS: Record<ComissaoVendaStatus, string> = {
  ativa: 'Ativa',
  calculada: 'Calculada',
  enviada: 'Enviada',
  cancelada: 'Cancelada',
};

export const COMISSAO_VENDA_STATUS_COLORS: Record<ComissaoVendaStatus, string> = {
  ativa: 'blue',
  calculada: 'green',
  enviada: 'purple',
  cancelada: 'gray',
};

export const COMISSAO_PARCELA_STATUS_LABELS: Record<ComissaoParcelaStatus, string> = {
  prevista: 'Prevista',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
};

export const COMISSAO_PARCELA_STATUS_COLORS: Record<ComissaoParcelaStatus, string> = {
  prevista: 'yellow',
  recebida: 'green',
  cancelada: 'gray',
};

// Parcelas padrao comuns
export const PARCELAS_PADRAO = [
  { descricao: 'Ato', percentual: 20 },
  { descricao: 'Entrada', percentual: 30 },
  { descricao: 'Mensal 1', percentual: 25 },
  { descricao: 'Mensal 2', percentual: 25 },
];
