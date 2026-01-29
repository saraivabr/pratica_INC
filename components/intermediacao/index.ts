/**
 * Componentes de Calculo e Distribuicao de Comissao
 * Sistema de Intermediacao Imobiliaria
 */

// Componentes de Navegacao e Layout
export { IntermediacaoNav } from './IntermediacaoNav'
export { IntermediacaoSidebar } from './IntermediacaoSidebar'
export { PageHeader } from './PageHeader'

// Componentes de Estado
export { EmptyState } from './EmptyState'
export { LoadingState, StatsLoadingSkeleton, ListLoadingSkeleton } from './LoadingState'
export { ErrorState, InlineErrorState } from './ErrorState'
export { ConfirmDialog, useConfirmDialog } from './ConfirmDialog'

// Tabela de Dados Reutilizavel
export { DataTable } from './DataTable'
export type { ColumnDef as DataTableColumnDef } from './DataTable'

// Status Badge Generico
export { StatusBadge, getStatusConfig, getStatusOptions } from './StatusBadge'

// Inputs especializados
export { ValorInput, type ValorInputProps } from './ValorInput'
export { PercentualInput, type PercentualInputProps } from './PercentualInput'

// Calculadora de comissao
export { ComissaoCalculator, type ComissaoCalculatorProps } from './ComissaoCalculator'

// Distribuicao de comissao
export { DistribuicaoComissaoForm, type DistribuicaoComissaoFormProps } from './DistribuicaoComissaoForm'
export { DistribuicaoItem, type DistribuicaoItemProps } from './DistribuicaoItem'
export { DistribuicaoProgressBar, type DistribuicaoProgressBarProps } from './DistribuicaoProgressBar'
export { DistribuicaoValidacao, type DistribuicaoValidacaoProps } from './DistribuicaoValidacao'
export { DistribuicaoResumo, type DistribuicaoResumoProps } from './DistribuicaoResumo'

// Visualizacao de comissao por venda
export { ComissaoPorVenda, type ComissaoPorVendaProps } from './ComissaoPorVenda'

// Wizard de Venda (formulario multi-step)
export { VendaWizard } from './VendaWizard'
export { VendaStepIndicator } from './VendaStepIndicator'
export { VendaStep1DadosVenda } from './VendaStep1DadosVenda'
export { VendaStep2Distribuicao } from './VendaStep2Distribuicao'
export { VendaStep3Parcelamento } from './VendaStep3Parcelamento'
export { VendaStep4Revisao } from './VendaStep4Revisao'

// Tipos do Wizard de Venda
export type { VendaFormData, Beneficiario, Parcela } from './VendaWizard'

// Componentes de Parcelas
export { ParcelaCard } from './ParcelaCard'
export { ParcelaTimeline } from './ParcelaTimeline'
export { ParcelaTable } from './ParcelaTable'
export { ParcelaConfirmarPagamento } from './ParcelaConfirmarPagamento'
export { ParcelaEditarForm } from './ParcelaEditarForm'
export { ParcelaStatusBadge, calcularDiasParaVencimento, getStatusVisual } from './ParcelaStatusBadge'
export { ParcelasResumo, calcularStats } from './ParcelasResumo'
export { ParcelasCalendario } from './ParcelasCalendario'
export { ParcelasAgrupadasPorBeneficiario } from './ParcelasAgrupadasPorBeneficiario'

// Tipos de Parcelas
export type {
  StatusParcela,
  MetodoPagamento,
  ParcelaExtended,
  DistribuicaoComParcelas,
  DadosPagamento,
  ParcelaEditData,
  ResumoParcelasStats,
} from './types'

// Componentes de Auditoria
export { AuditoriaTimeline } from './AuditoriaTimeline'
export { AuditoriaDetailModal } from './AuditoriaDetailModal'
export { AuditoriaDiff, AuditoriaDiffCompact } from './AuditoriaDiff'
export { AuditoriaFilters } from './AuditoriaFilters'
export { AuditoriaTable } from './AuditoriaTable'
export { AuditoriaStats } from './AuditoriaStats'
export { AuditoriaAlerts } from './AuditoriaAlerts'
export { RegistroHistorico } from './RegistroHistorico'

// Tipos de Auditoria
export type {
  LogAuditoria,
  OperacaoAuditoria,
  EntidadeAuditoria,
  AuditoriaFilters as AuditoriaFiltersType,
  AuditoriaStats as AuditoriaStatsType,
  AuditoriaAlerta,
} from './types'

// === Componentes de Relatórios e Exportação ===

// Componentes PDF
export { RelatorioVendaPDF } from './RelatorioVendaPDF'
export { RelatorioComissoesPDF } from './RelatorioComissoesPDF'

// Componentes de Exportação
export {
  exportToExcel,
  exportToExcelMultiSheet,
  exportToCSV,
  COLUNAS_VENDAS,
  COLUNAS_COMISSOES,
  COLUNAS_PARCELAS,
  COLUNAS_BENEFICIARIOS,
} from './ExportExcel'
export { ExportButton, QuickExportButton } from './ExportButton'

// Componentes de Filtros e Preview
export { RelatorioFiltros } from './RelatorioFiltros'
export { RelatorioPreview, RelatorioPreviewModal } from './RelatorioPreview'

// Componentes de Gráficos
export {
  GraficoEvolucaoMensal,
  GraficoDistribuicao,
  GraficoStatusParcelas,
  GraficoComparativos,
} from './GraficosRelatorio'

// Componentes de Dashboard
export {
  DashboardCards,
  DashboardCardDetalhado,
  MiniStatCard,
  MiniStatsGrid,
} from './DashboardCards'

// Componentes de Impressão
export {
  PrintButton,
  PrintArea,
  NoPrint,
  PageBreak,
  usePrintRef,
} from './PrintButton'

// Tipos de Relatórios e Exportação
export type {
  DadosEmpresa,
  Imovel,
  Cliente,
  Beneficiario as BeneficiarioRelatorio,
  DistribuicaoComissao,
  Parcela as ParcelaRelatorio,
  Comissao,
  ComissaoDetalhada,
  VendaCompleta,
  FiltrosRelatorio,
  PresetPeriodo,
  Totais,
  DadosEvolucaoMensal,
  DadosDistribuicao,
  DadosStatusParcelas,
  DadosComparativos,
  DadosConsolidados,
  ColumnDef,
  ExportOptions,
  OpcoesFiltro,
} from './types'
