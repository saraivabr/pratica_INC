/**
 * @fileoverview Tipos e interfaces para sistema de pontuação automática de leads
 * @module types/leadScore
 * @description Define tipos para score de leads, fatores de pontuação e classificações
 */

import type { Lead, LeadInteracao } from "./lead"

// =============================================================================
// CATEGORIAS E TEMPERATURAS
// =============================================================================

/**
 * Temperatura do lead baseada no score
 * Quente: Alta prioridade - atacar imediatamente
 * Morno: Média prioridade - acompanhar de perto
 * Frio: Baixa prioridade - manter no radar
 * Risco: Lead em risco de perda - ação urgente
 */
export type LeadTemperature = "Quente" | "Morno" | "Frio" | "Risco"

/**
 * Categoria de ação recomendada
 */
export type ActionCategory =
  | "atacar_agora"
  | "acompanhar"
  | "recuperar"
  | "manter_contato"
  | "revisar"

// =============================================================================
// FATORES DE PONTUAÇÃO
// =============================================================================

/**
 * Fatores individuais que contribuem para o score total
 */
export interface ScoreFactors {
  /** Pontos baseados no tempo sem resposta (0-25 pontos) */
  tempoSemResposta: number

  /** Pontos baseados em interações recentes (0-25 pontos) */
  interacaoRecente: number

  /** Pontos baseados no tipo/valor do imóvel (0-20 pontos) */
  tipoImovel: number

  /** Pontos baseados em ações do cliente (0-20 pontos) */
  acoesCliente: number

  /** Pontos baseados no histórico do corretor (0-10 pontos) */
  historicoCorretor: number
}

/**
 * Detalhes de um fator de pontuação
 */
export interface ScoreFactorDetail {
  /** Nome do fator */
  name: string

  /** Pontuação obtida */
  points: number

  /** Pontuação máxima possível */
  maxPoints: number

  /** Porcentagem (0-100) */
  percentage: number

  /** Descrição do critério */
  description: string

  /** Ícone sugerido para UI */
  icon?: string
}

// =============================================================================
// RESULTADO DO SCORE
// =============================================================================

/**
 * Resultado completo do cálculo de score
 */
export interface LeadScore {
  /** ID do lead */
  leadId: string | number

  /** Score total (0-100) */
  score: number

  /** Temperatura/classificação do lead */
  temperature: LeadTemperature

  /** Categoria de ação recomendada */
  actionCategory: ActionCategory

  /** Fatores que compõem o score */
  factors: ScoreFactors

  /** Detalhes de cada fator para exibição */
  factorDetails: ScoreFactorDetail[]

  /** Mensagem de ação recomendada */
  actionMessage: string

  /** Prioridade numérica (1-10, onde 10 é mais urgente) */
  priority: number

  /** Data do cálculo */
  calculatedAt: Date

  /** Razão principal para o score */
  mainReason: string
}

// =============================================================================
// CONFIGURAÇÃO DE TEMPERATURA
// =============================================================================

/**
 * Configuração visual para cada temperatura
 */
export interface TemperatureConfig {
  /** Temperatura */
  temperature: LeadTemperature

  /** Faixa mínima de score */
  minScore: number

  /** Faixa máxima de score */
  maxScore: number

  /** Label descritivo */
  label: string

  /** Descrição */
  description: string

  /** Cor do texto (classe Tailwind) */
  textColor: string

  /** Cor de fundo (classe Tailwind) */
  bgColor: string

  /** Cor de fundo clara (classe Tailwind) */
  bgColorLight: string

  /** Cor da borda (classe Tailwind) */
  borderColor: string

  /** Cor de gradiente (classe Tailwind) */
  gradient: string

  /** Cor hex para efeitos */
  hexColor: string

  /** Ícone sugerido */
  icon: string

  /** Ordem de prioridade (menor = mais urgente) */
  priorityOrder: number
}

// =============================================================================
// ESTATÍSTICAS E RELATÓRIOS
// =============================================================================

/**
 * Estatísticas agregadas de scores
 */
export interface ScoreStatistics {
  /** Total de leads */
  totalLeads: number

  /** Score médio */
  averageScore: number

  /** Distribuição por temperatura */
  distribution: {
    Quente: number
    Morno: number
    Frio: number
    Risco: number
  }

  /** Leads por categoria de ação */
  actionCategories: {
    atacar_agora: number
    acompanhar: number
    recuperar: number
    manter_contato: number
    revisar: number
  }

  /** Top 10 leads prioritários */
  topPriorityLeads: Array<{
    leadId: string | number
    nome: string
    score: number
    temperature: LeadTemperature
  }>
}

// =============================================================================
// HISTÓRICO DE SCORES
// =============================================================================

/**
 * Registro histórico de score de um lead
 */
export interface ScoreHistory {
  /** ID do lead */
  leadId: string | number

  /** Score no momento */
  score: number

  /** Temperatura no momento */
  temperature: LeadTemperature

  /** Data do registro */
  timestamp: Date

  /** Fatores que contribuíram */
  factors?: ScoreFactors

  /** Mudança em relação ao score anterior */
  change?: number
}

// =============================================================================
// PARÂMETROS DE CÁLCULO
// =============================================================================

/**
 * Parâmetros configuráveis para cálculo de score
 */
export interface ScoreCalculationParams {
  /** Peso do fator tempo sem resposta (0-1, padrão: 0.25) */
  pesoTempoSemResposta?: number

  /** Peso do fator interação recente (0-1, padrão: 0.25) */
  pesoInteracaoRecente?: number

  /** Peso do fator tipo de imóvel (0-1, padrão: 0.20) */
  pesoTipoImovel?: number

  /** Peso do fator ações do cliente (0-1, padrão: 0.20) */
  pesoAcoesCliente?: number

  /** Peso do fator histórico do corretor (0-1, padrão: 0.10) */
  pesoHistoricoCorretor?: number

  /** Dias sem resposta considerados críticos (padrão: 7) */
  diasCriticosSemResposta?: number

  /** Dias sem resposta considerados de risco (padrão: 14) */
  diasRiscoSemResposta?: number

  /** Dias recentes para interações (padrão: 7) */
  diasInteracaoRecente?: number
}

// =============================================================================
// UTILITÁRIOS DE TIPO
// =============================================================================

/**
 * Input para calcular score de um lead
 */
export interface CalculateLeadScoreInput {
  /** Dados do lead */
  lead: Lead

  /** Parâmetros customizados (opcional) */
  params?: ScoreCalculationParams
}

/**
 * Type guard para verificar se é uma temperatura válida
 */
export function isValidTemperature(value: string): value is LeadTemperature {
  return ["Quente", "Morno", "Frio", "Risco"].includes(value)
}

/**
 * Type guard para verificar se é uma categoria de ação válida
 */
export function isValidActionCategory(value: string): value is ActionCategory {
  return ["atacar_agora", "acompanhar", "recuperar", "manter_contato", "revisar"].includes(value)
}
