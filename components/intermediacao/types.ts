/**
 * Tipos para o Sistema de Intermediacao - Relatorios e Exportacao
 */

// === Tipos de Empresa ===
export interface DadosEmpresa {
  id: string;
  nome: string;
  cnpj: string;
  logo?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

// === Tipos de Imovel ===
export interface Imovel {
  id: string;
  empreendimento: string;
  unidade: string;
  tipo: string;
  area?: number;
  quartos?: number;
  vagas?: number;
  valor: number;
}

// === Tipos de Cliente ===
export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  endereco?: string;
}

// === Tipos base para Beneficiario ===
export type TipoPessoa = 'PF' | 'PJ'
export type TipoConta = 'corrente' | 'poupanca'
export type StatusBeneficiario = 'ativo' | 'inativo'
export type CargoBeneficiario = 'corretor' | 'gerente' | 'diretor' | 'coordenador' | 'proprietario' | 'imobiliaria' | 'parceiro' | 'outro'

// === Tipos de Dados Bancarios ===
export interface DadosBancarios {
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: TipoConta;
  chavePix?: string;
}

// === Tipos de Beneficiario ===
export interface Beneficiario {
  id: string;
  tipoPessoa: TipoPessoa;
  nome: string; // nome completo ou razao social
  documento: string; // CPF ou CNPJ
  cargo: CargoBeneficiario;
  cpf?: string; // mantido para compatibilidade
  email?: string;
  telefone?: string;
  dadosBancarios?: DadosBancarios;
  banco?: string; // mantido para compatibilidade
  agencia?: string; // mantido para compatibilidade
  conta?: string; // mantido para compatibilidade
  pix?: string; // mantido para compatibilidade
  observacoes?: string;
  status: StatusBeneficiario;
  // Valores financeiros
  valorAReceber: number;
  valorPendente: number;
  valorPago?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// === Tipos de Formulario de Beneficiario ===
export interface BeneficiarioFormData {
  tipoPessoa: TipoPessoa;
  nome: string;
  documento: string;
  cargo: CargoBeneficiario;
  email?: string;
  telefone?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: TipoConta;
  chavePix?: string;
  observacoes?: string;
  status: StatusBeneficiario;
}

// === Tipos de Saldo do Beneficiario ===
export interface SaldoBeneficiario {
  aReceber: number;
  pendente: number;
  pago: number;
}

// === Tipos de Movimentacao ===
export type TipoMovimentacao = 'comissao_gerada' | 'parcela_paga' | 'parcela_vencida' | 'estorno' | 'ajuste'

export interface MovimentacaoBeneficiario {
  id: string;
  data: Date;
  tipo: TipoMovimentacao;
  descricao: string;
  referencia?: string; // codigo da venda
  valor: number;
  saldoAcumulado?: number;
}

// === Constantes de Beneficiario ===
export const BANCOS_BRASIL = [
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '033', nome: 'Santander' },
  { codigo: '104', nome: 'Caixa Economica Federal' },
  { codigo: '237', nome: 'Bradesco' },
  { codigo: '341', nome: 'Itau' },
  { codigo: '260', nome: 'Nubank' },
  { codigo: '077', nome: 'Inter' },
  { codigo: '212', nome: 'Banco Original' },
  { codigo: '422', nome: 'Safra' },
  { codigo: '745', nome: 'Citibank' },
  { codigo: '756', nome: 'Sicoob' },
  { codigo: '748', nome: 'Sicredi' },
  { codigo: '336', nome: 'C6 Bank' },
  { codigo: '380', nome: 'PicPay' },
  { codigo: '290', nome: 'PagBank' },
] as const

export const CARGOS_BENEFICIARIO: { value: CargoBeneficiario; label: string }[] = [
  { value: 'corretor', label: 'Corretor' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'proprietario', label: 'Proprietario' },
  { value: 'imobiliaria', label: 'Imobiliaria' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'outro', label: 'Outro' },
]

// === Tipos de Comissao ===
export interface DistribuicaoComissao {
  beneficiarioId: string;
  beneficiario: Beneficiario;
  percentual: number;
  valor: number;
}

export interface Parcela {
  id: string;
  numero: number;
  dataVencimento: Date;
  valor: number;
  status: 'pendente' | 'paga' | 'vencida' | 'cancelada';
  dataPagamento?: Date;
  beneficiarioId: string;
  beneficiario?: Beneficiario;
}

export interface Comissao {
  id: string;
  vendaId: string;
  percentual: number;
  valorTotal: number;
  distribuicoes: DistribuicaoComissao[];
  parcelas: Parcela[];
}

export interface ComissaoDetalhada {
  id: string;
  venda: {
    codigo: string;
    empreendimento: string;
    unidade: string;
    valorVenda: number;
    dataVenda: Date;
  };
  percentual: number;
  valor: number;
  parcelas: Parcela[];
  parcelasPagas: number;
  parcelasTotal: number;
  valorPago: number;
  valorPendente: number;
}

// === Tipos de Venda ===
export interface VendaCompleta {
  id: string;
  codigo: string;
  dataVenda: Date;
  imovel: Imovel;
  cliente: Cliente;
  comissao: Comissao;
  status: 'em_andamento' | 'concluida' | 'cancelada' | 'distratada';
  observacoes?: string;
  documentos?: string[];
}

// === Tipos de Filtros ===
export interface FiltrosRelatorio {
  periodoInicio?: Date;
  periodoFim?: Date;
  beneficiarioId?: string;
  empreendimentoId?: string;
  status?: string[];
  tipoRelatorio?: 'vendas' | 'comissoes' | 'parcelas';
}

export interface PresetPeriodo {
  label: string;
  value: string;
  getRange: () => { inicio: Date; fim: Date };
}

// === Tipos de Totais ===
export interface Totais {
  totalVendas: number;
  totalComissoes: number;
  totalPago: number;
  totalPendente: number;
  quantidadeVendas: number;
  quantidadeParcelas: number;
  parcelasPagas: number;
  parcelasVencidas: number;
  parcelasPendentes: number;
}

// === Tipos de Graficos ===
export interface DadosEvolucaoMensal {
  mes: string;
  vendas: number;
  comissoes: number;
  pagamentos: number;
}

export interface DadosDistribuicao {
  nome: string;
  valor: number;
  percentual: number;
  cor?: string;
}

export interface DadosStatusParcelas {
  status: string;
  quantidade: number;
  valor: number;
  cor: string;
}

export interface DadosComparativos {
  nome: string;
  valor: number;
  percentual?: number;
}

// === Tipos de Dashboard ===
export interface DadosConsolidados {
  totalVendas: number;
  quantidadeVendas: number;
  variacaoVendas: number;
  totalComissoes: number;
  variacaoComissoes: number;
  totalPago: number;
  percentualPago: number;
  totalPendente: number;
  percentualPendente: number;
}

// === Tipos de Exportacao ===
export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  format?: 'text' | 'currency' | 'date' | 'percent' | 'number';
  align?: 'left' | 'center' | 'right';
}

export interface ExportOptions {
  includeHeader?: boolean;
  includeFooter?: boolean;
  totalizadores?: boolean;
  colunasSelecionadas?: string[];
}

// === Tipos de Opcoes de Filtro ===
export interface OpcoesFiltro {
  beneficiarios: { id: string; nome: string }[];
  empreendimentos: { id: string; nome: string }[];
  statusOptions: { value: string; label: string }[];
}

// === Tipos para Componentes de Parcelas ===
export type StatusParcela = 'pendente' | 'vencida' | 'paga' | 'cancelada'

export type MetodoPagamento = 'transferencia' | 'pix' | 'deposito' | 'outro'

export interface ParcelaExtended extends Parcela {
  distribuicaoId: string
  vendaId: string
  vendaCodigo: string
  numeroParcela: number
  totalParcelas: number
  metodoPagamento?: MetodoPagamento | null
  comprovante?: string | null
  observacoes?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface DistribuicaoComParcelas {
  id: string
  vendaId: string
  vendaCodigo: string
  beneficiarioId: string
  beneficiario: Beneficiario
  percentual: number
  valorTotal: number
  quantidadeParcelas: number
  parcelas: Parcela[]
}

export interface DadosPagamento {
  dataPagamento: Date
  metodoPagamento: MetodoPagamento
  comprovante?: string
}

export interface ParcelaEditData {
  valor: number
  dataVencimento: Date
}

export interface ResumoParcelasStats {
  pendentes: { quantidade: number; valor: number }
  vencidas: { quantidade: number; valor: number }
  proximas: { quantidade: number; valor: number }
  pagas: { quantidade: number; valor: number }
}

// === Tipos de Auditoria ===
export type OperacaoAuditoria = 'create' | 'update' | 'delete'

export type EntidadeAuditoria =
  | 'vendas'
  | 'beneficiarios'
  | 'parcelas'
  | 'pagamentos'
  | 'comissoes'
  | 'distribuicoes'

export interface LogAuditoria {
  id: string
  operacao: OperacaoAuditoria
  entidade: EntidadeAuditoria
  registroId: string
  registroCodigo?: string
  usuarioId: string
  usuarioNome: string
  usuarioEmail?: string
  timestamp: Date | string
  ip?: string
  userAgent?: string
  dadosAnteriores?: Record<string, unknown>
  dadosNovos?: Record<string, unknown>
  camposAlterados?: string[]
  justificativa?: string
  metadata?: Record<string, unknown>
  isCritico?: boolean
}

export interface AuditoriaFilters {
  periodoInicio?: Date
  periodoFim?: Date
  operacoes?: OperacaoAuditoria[]
  entidades?: EntidadeAuditoria[]
  usuarioId?: string
  registroId?: string
  apenasCriticos?: boolean
}

export interface AuditoriaStats {
  totalOperacoes: number
  porTipo: {
    create: number
    update: number
    delete: number
  }
  usuariosAtivos: number
  horariosPico: {
    hora: number
    quantidade: number
  }[]
}

export interface AuditoriaAlerta {
  id: string
  log: LogAuditoria
  tipo: 'delete' | 'desfazer_pagamento' | 'alteracao_valor' | 'outro'
  descricao: string
  severidade: 'baixa' | 'media' | 'alta' | 'critica'
  timestamp: Date | string
}
