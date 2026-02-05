/**
 * Sistema de Calculo de Comissoes (Planilha do Calculista)
 * Tipos TypeScript - correspondente a migration 038_comissao_calculo.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ComissaoVendaStatus = 'ativa' | 'calculada' | 'enviada' | 'cancelada';
export type ComissaoParcelaStatus = 'prevista' | 'recebida' | 'cancelada';
export type TipoDocumento = 'cpf' | 'cnpj';
export type GrupoComissao = 'prt' | 'imobiliaria' | 'corretor';

export const CARGO_LABELS: Record<string, string> = {
  gerente_produto: 'GERENTE DE PRODUTO',
  gerente_pratica: 'GERENTE PRATICA',
  coordenador_1: 'COORDENADOR 1',
  coordenador_2: 'COORDENADOR 2',
  secretaria: 'SECRETARIA',
  tributos: 'TRIBUTOS',
  imobiliaria: 'IMOBILIARIA',
  corretor: 'CORRETOR',
};

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
  id: string; // UUID
  cvcrm_id: number;
  codigo?: string;
  bloco?: string;
  andar?: string;
  area?: number;
  tipologia?: string;
  valor_tabela?: number;
  empreendimento_id: number; // cvcrm_id do empreendimento
  empreendimento_nome: string;
  status?: string;
}

export interface CorretorBusca {
  id: string; // UUID
  cvcrm_id?: number;
  nome: string;
  cpf?: string;
  creci?: string;
  imobiliaria_nome?: string;
  imobiliaria_id?: string; // UUID
  email?: string;
  telefone?: string;
  fonte: 'cvcrm' | 'beneficiario' | 'user';
}

export interface EmpreendimentoBusca {
  id: string; // UUID
  cvcrm_id: number; // ID do CV CRM (usado para referenciar unidades)
  nome: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  status?: string;
}

export interface ImobiliariaBusca {
  id: string; // UUID
  cvcrm_id: number;
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

// ============================================================================
// TIPOS PARA IMPORTACAO CV CRM
// ============================================================================

export interface ReservaBusca {
  reserva_id: number;
  codigo: string;
  empreendimento_id: number;
  empreendimento_nome: string;
  unidade_id: number;
  unidade_codigo: string;
  cliente_id: number;
  cliente_nome: string;
  cliente_cpf: string;
  valor_total: number;
  data_reserva: string;
  corretor_id: number;
  corretor_nome: string;
  situacao: string;
}

export interface ClienteBusca {
  encontrado: boolean;
  pessoa_id?: number;
  nome?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
}

// ============================================================================
// TEMPLATES DE PARCELAS
// ============================================================================

export type TipoParcelaProposta = 'ato' | 'mensal' | 'anual' | 'financiamento' | 'entrada';

export interface TemplateParcelaItem {
  tipo: TipoParcelaProposta;
  percentual?: number; // Se for único (ex: ato 10%)
  quantidade?: number; // Se for múltiplo (ex: 12 mensais)
  percentualTotal?: number; // % total do grupo (ex: 90% dividido em 12)
}

export interface TemplateParcelas {
  id: string;
  nome: string;
  descricao: string;
  parcelas: TemplateParcelaItem[];
}

// Templates pré-definidos
export const TEMPLATES_PARCELAS: TemplateParcelas[] = [
  {
    id: 'ato_financiamento',
    nome: 'Ato + Financiamento',
    descricao: '20% de ato, 80% financiamento',
    parcelas: [
      { tipo: 'ato', percentual: 20 },
      { tipo: 'financiamento', percentual: 80 },
    ],
  },
  {
    id: 'ato_12_mensais',
    nome: 'Ato + 12 Mensais',
    descricao: '10% de ato, 90% em 12 mensais',
    parcelas: [
      { tipo: 'ato', percentual: 10 },
      { tipo: 'mensal', quantidade: 12, percentualTotal: 90 },
    ],
  },
  {
    id: 'ato_entrada_24x',
    nome: 'Ato + 24 Mensais',
    descricao: '10% de ato, 90% em 24 mensais',
    parcelas: [
      { tipo: 'ato', percentual: 10 },
      { tipo: 'mensal', quantidade: 24, percentualTotal: 90 },
    ],
  },
  {
    id: 'ato_2_anuais_financ',
    nome: 'Ato + 2 Anuais + Financiamento',
    descricao: '10% ato, 20% em 2 anuais, 70% financiamento',
    parcelas: [
      { tipo: 'ato', percentual: 10 },
      { tipo: 'anual', quantidade: 2, percentualTotal: 20 },
      { tipo: 'financiamento', percentual: 70 },
    ],
  },
  {
    id: 'ato_entrada_financ',
    nome: 'Ato + Entrada + Financiamento',
    descricao: '5% ato, 15% entrada, 80% financiamento',
    parcelas: [
      { tipo: 'ato', percentual: 5 },
      { tipo: 'entrada', percentual: 15 },
      { tipo: 'financiamento', percentual: 80 },
    ],
  },
];

// ============================================================================
// VALIDACOES INTELIGENTES
// ============================================================================

export interface ValidacaoInteligente {
  tipo: 'info' | 'warning' | 'error' | 'success';
  mensagem: string;
  campo?: string;
}

export const LIMITES_VALIDACAO = {
  comissao_minima: 3, // % mínimo de comissão (aviso abaixo)
  comissao_maxima: 8, // % máximo de comissão (aviso acima)
  valor_minimo_corretor: 500, // R$ mínimo para cada corretor (aviso abaixo)
  percentual_ato_minimo: 5, // % mínimo do ato em relação ao total (aviso abaixo)
};
