/**
 * Componentes de Auditoria para o Sistema de Intermediacao Imobiliaria
 *
 * Exporta todos os componentes relacionados a auditoria e rastreamento
 * de operacoes no sistema.
 */

export { AuditoriaTimeline } from "../AuditoriaTimeline"
export { AuditoriaDetailModal } from "../AuditoriaDetailModal"
export { AuditoriaDiff, AuditoriaDiffCompact } from "../AuditoriaDiff"
export { AuditoriaFilters } from "../AuditoriaFilters"
export { AuditoriaTable } from "../AuditoriaTable"
export { AuditoriaStats } from "../AuditoriaStats"
export { AuditoriaAlerts } from "../AuditoriaAlerts"
export { RegistroHistorico } from "../RegistroHistorico"

// Re-exportar tipos relacionados a auditoria
export type {
  LogAuditoria,
  OperacaoAuditoria,
  EntidadeAuditoria,
  AuditoriaFilters as AuditoriaFiltersType,
  AuditoriaStats as AuditoriaStatsType,
  AuditoriaAlerta,
} from "../types"
