/**
 * Salva-Leads - Sistema completo de captura e qualificação de leads
 */

export * from './lead-scoring';
export * from './crm-sync';
export * from './follow-up-automation';

// Re-export types
export type { FiltrosParaScoreLead } from './lead-scoring';
export type { CVCRMLead } from './crm-sync';
export type { FollowUpConfig } from './follow-up-automation';
