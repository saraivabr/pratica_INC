/**
 * @fileoverview Utilitários para cálculo de score automático de leads
 * @module utils/leadScore
 * @description Implementa a lógica de pontuação de leads baseada em múltiplos critérios
 */

import type { Lead, LeadInteracao } from "@/types/lead"
import type {
  LeadScore,
  LeadTemperature,
  ActionCategory,
  ScoreFactors,
  ScoreFactorDetail,
  TemperatureConfig,
  ScoreCalculationParams,
  CalculateLeadScoreInput,
} from "@/types/leadScore"

// =============================================================================
// CONSTANTES E CONFIGURAÇÕES
// =============================================================================

/**
 * Pesos padrão para cada fator de pontuação
 * Total deve somar 1.0 (100%)
 */
const DEFAULT_WEIGHTS = {
  tempoSemResposta: 0.25, // 25% - Urgência baseada em tempo
  interacaoRecente: 0.25, // 25% - Engajamento recente
  tipoImovel: 0.2, // 20% - Valor/tipo do imóvel
  acoesCliente: 0.2, // 20% - Atividade do cliente
  historicoCorretor: 0.1, // 10% - Performance do corretor
}

/**
 * Configurações de temperatura por faixa de score
 */
export const TEMPERATURE_CONFIGS: TemperatureConfig[] = [
  {
    temperature: "Risco",
    minScore: 0,
    maxScore: 30,
    label: "Em Risco",
    description: "Lead em risco de perda - ação urgente necessária",
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-500",
    bgColorLight: "bg-red-50 dark:bg-red-950/40",
    borderColor: "border-red-200 dark:border-red-800",
    gradient: "from-red-500 via-rose-500 to-pink-500",
    hexColor: "#ef4444",
    icon: "AlertTriangle",
    priorityOrder: 1,
  },
  {
    temperature: "Frio",
    minScore: 31,
    maxScore: 50,
    label: "Frio",
    description: "Baixa prioridade - manter no radar",
    textColor: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-500",
    bgColorLight: "bg-slate-50 dark:bg-slate-950/40",
    borderColor: "border-slate-200 dark:border-slate-800",
    gradient: "from-slate-500 via-gray-500 to-zinc-500",
    hexColor: "#64748b",
    icon: "Snowflake",
    priorityOrder: 4,
  },
  {
    temperature: "Morno",
    minScore: 51,
    maxScore: 75,
    label: "Morno",
    description: "Média prioridade - acompanhar de perto",
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-500",
    bgColorLight: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-800",
    gradient: "from-amber-500 via-orange-500 to-yellow-500",
    hexColor: "#f59e0b",
    icon: "Thermometer",
    priorityOrder: 3,
  },
  {
    temperature: "Quente",
    minScore: 76,
    maxScore: 100,
    label: "Quente",
    description: "Alta prioridade - atacar imediatamente",
    textColor: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500",
    bgColorLight: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    gradient: "from-emerald-500 via-green-500 to-teal-500",
    hexColor: "#10b981",
    icon: "Flame",
    priorityOrder: 2,
  },
]

// =============================================================================
// FUNÇÕES DE CÁLCULO DE FATORES
// =============================================================================

/**
 * Calcula pontos baseado no tempo sem resposta
 * - Quanto mais tempo sem resposta, menor a pontuação
 * - Leads muito antigos (>14 dias) são considerados em risco
 * - Leads recentes (<3 dias) ganham pontos extras
 *
 * @param lead - Lead a ser avaliado
 * @param params - Parâmetros de configuração
 * @returns Pontos (0-25)
 */
function calcularTempoSemResposta(lead: Lead, params: ScoreCalculationParams = {}): number {
  const diasCriticos = params.diasCriticosSemResposta ?? 7
  const diasRisco = params.diasRiscoSemResposta ?? 14

  // Pega a última interação
  const interacoes = lead.interacoes ?? lead.interacao ?? []
  if (interacoes.length === 0) {
    // Sem interações, mas lead recente pode ter pontos
    const VERY_OLD_LEAD_DAYS = 999 // Fallback para leads muito antigos sem data
    const diasDesdeCadastro = lead.data_cad
      ? Math.floor((Date.now() - new Date(lead.data_cad).getTime()) / (1000 * 60 * 60 * 24))
      : VERY_OLD_LEAD_DAYS

    if (diasDesdeCadastro <= 1) return 25 // Lead novo hoje/ontem
    if (diasDesdeCadastro <= 3) return 20 // Lead muito recente
    if (diasDesdeCadastro <= diasCriticos) return 15 // Ainda recente
    if (diasDesdeCadastro <= diasRisco) return 8 // Ficando antigo
    return 3 // Muito antigo sem nenhuma interação
  }

  const ultimaInteracao = interacoes[interacoes.length - 1]
  const dataInteracao = ultimaInteracao.data_cad || ultimaInteracao.data
  if (!dataInteracao) return 10 // Pontuação média se não tiver data

  const diasDesdeInteracao = Math.floor(
    (Date.now() - new Date(dataInteracao).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Pontuação decrescente com o tempo
  if (diasDesdeInteracao === 0) return 25 // Interação hoje
  if (diasDesdeInteracao === 1) return 23 // Ontem
  if (diasDesdeInteracao <= 2) return 21 // 2 dias
  if (diasDesdeInteracao <= 3) return 19 // 3 dias
  if (diasDesdeInteracao <= 5) return 16 // Até 5 dias
  if (diasDesdeInteracao <= diasCriticos) return 12 // Até 7 dias
  if (diasDesdeInteracao <= 10) return 8 // 10 dias
  if (diasDesdeInteracao <= diasRisco) return 5 // 14 dias - risco
  if (diasDesdeInteracao <= 21) return 2 // 3 semanas - alto risco
  return 0 // Mais de 3 semanas - crítico
}

/**
 * Calcula pontos baseado em interações recentes
 * - Mais interações recentes = maior pontuação
 * - Interações de qualidade (reunião, proposta) valem mais
 *
 * @param lead - Lead a ser avaliado
 * @param params - Parâmetros de configuração
 * @returns Pontos (0-25)
 */
function calcularInteracaoRecente(lead: Lead, params: ScoreCalculationParams = {}): number {
  const diasRecentes = params.diasInteracaoRecente ?? 7 // Padrão: últimos 7 dias

  const interacoes = lead.interacoes ?? lead.interacao ?? []
  if (interacoes.length === 0) return 0

  const dataLimite = new Date()
  dataLimite.setDate(dataLimite.getDate() - diasRecentes)

  // Filtra interações recentes
  const interacoesRecentes = interacoes.filter((int) => {
    const data = int.data_cad || int.data
    if (!data) return false
    return new Date(data) >= dataLimite
  })

  if (interacoesRecentes.length === 0) return 5 // Tem histórico mas não recente

  // Pontuação base por quantidade
  let pontos = Math.min(interacoesRecentes.length * 3, 15)

  // Bônus por tipo de interação de qualidade
  const tiposQualidade = ["reuniao", "proposta", "venda", "visita"]
  const temInteracaoQualidade = interacoesRecentes.some((int) =>
    tiposQualidade.includes((int.tipo || "").toLowerCase())
  )

  if (temInteracaoQualidade) pontos += 7

  // Bônus por frequência (múltiplas interações em poucos dias)
  if (interacoesRecentes.length >= 3) pontos += 3

  return Math.min(pontos, 25)
}

/**
 * Calcula pontos baseado no tipo/valor do imóvel
 * - Imóveis de maior valor = maior pontuação
 * - Tipos específicos podem ter pesos diferentes
 *
 * @param lead - Lead a ser avaliado
 * @returns Pontos (0-20)
 */
function calcularTipoImovel(lead: Lead): number {
  // Se não tem empreendimento, pontuação padrão baixa
  const empreendimento =
    typeof lead.empreendimento === "object" ? lead.empreendimento : null

  if (!empreendimento) return 5

  let pontos = 10 // Base para ter empreendimento definido

  // Bônus por tipo de imóvel (se disponível)
  const tipo = empreendimento.tipo?.toLowerCase() || ""
  if (tipo.includes("apartamento")) pontos += 3
  if (tipo.includes("casa")) pontos += 2
  if (tipo.includes("cobertura")) pontos += 5
  if (tipo.includes("terreno")) pontos += 1

  // Bônus por valor (se disponível)
  if (empreendimento.valor) {
    const valor =
      typeof empreendimento.valor === "string"
        ? parseFloat(empreendimento.valor.replace(/[^\d]/g, ""))
        : empreendimento.valor

    if (valor > 500000) pontos += 5
    else if (valor > 300000) pontos += 3
    else if (valor > 150000) pontos += 2
  }

  return Math.min(pontos, 20)
}

/**
 * Calcula pontos baseado nas ações do cliente
 * - Diversidade de ações (ligou, enviou mensagem, visitou)
 * - Iniciativa do cliente (quem iniciou o contato)
 *
 * @param lead - Lead a ser avaliado
 * @returns Pontos (0-20)
 */
function calcularAcoesCliente(lead: Lead): number {
  const interacoes = lead.interacoes ?? lead.interacao ?? []

  if (interacoes.length === 0) return 0

  let pontos = 0

  // Pontos por quantidade de interações (engajamento)
  pontos += Math.min(interacoes.length * 2, 10)

  // Bônus por tipos diversos de ações
  const tiposUnicos = new Set(interacoes.map((int) => int.tipo?.toLowerCase()).filter(Boolean))

  if (tiposUnicos.has("ligacao")) pontos += 2
  if (tiposUnicos.has("whatsapp")) pontos += 2
  if (tiposUnicos.has("email")) pontos += 1
  if (tiposUnicos.has("reuniao")) pontos += 3
  if (tiposUnicos.has("visita")) pontos += 4

  // Bônus se tem proposta no histórico
  if (tiposUnicos.has("proposta")) pontos += 3

  return Math.min(pontos, 20)
}

/**
 * Calcula pontos baseado no histórico do corretor com este lead
 * - Taxa de conversão do corretor
 * - Tempo médio de fechamento
 * - Qualidade das interações
 *
 * @param lead - Lead a ser avaliado
 * @returns Pontos (0-10)
 */
function calcularHistoricoCorretor(lead: Lead): number {
  // Por enquanto, pontuação base
  // Em uma implementação completa, isso consultaria estatísticas do corretor

  let pontos = 5 // Base média

  // Se tem corretor atribuído
  if (lead.corretor) {
    pontos += 2
  }

  // Se o lead tem muitas interações, sugere que o corretor está engajado
  const numInteracoes = (lead.interacoes ?? lead.interacao ?? []).length
  if (numInteracoes >= 5) pontos += 2
  if (numInteracoes >= 10) pontos += 1

  return Math.min(pontos, 10)
}

// =============================================================================
// FUNÇÃO PRINCIPAL DE CÁLCULO
// =============================================================================

/**
 * Calcula o score completo de um lead
 *
 * Nota sobre pesos: Os pesos em DEFAULT_WEIGHTS (25%, 25%, 20%, 20%, 10%)
 * são refletidos nos pontos máximos de cada fator (25, 25, 20, 20, 10).
 * O score final é a soma direta dos pontos de cada fator (0-100).
 *
 * @param input - Dados do lead e parâmetros opcionais
 * @returns Score completo com todos os detalhes
 */
export function calculateLeadScore(input: CalculateLeadScoreInput): LeadScore {
  const { lead, params = {} } = input

  // Calcula cada fator
  const factors: ScoreFactors = {
    tempoSemResposta: calcularTempoSemResposta(lead, params),
    interacaoRecente: calcularInteracaoRecente(lead, params),
    tipoImovel: calcularTipoImovel(lead),
    acoesCliente: calcularAcoesCliente(lead),
    historicoCorretor: calcularHistoricoCorretor(lead),
  }

  // Normaliza para score de 0-100
  const scoreTotal =
    factors.tempoSemResposta +
    factors.interacaoRecente +
    factors.tipoImovel +
    factors.acoesCliente +
    factors.historicoCorretor

  const score = Math.round(scoreTotal)

  // Determina temperatura
  const temperature = getTemperatureByScore(score)
  const tempConfig = getTemperatureConfig(temperature)

  // Determina categoria de ação e mensagem
  const { actionCategory, actionMessage, mainReason } = determineAction(lead, factors, temperature)

  // Calcula prioridade (1-10)
  const priority = calculatePriority(score, temperature, factors)

  // Cria detalhes dos fatores
  const factorDetails: ScoreFactorDetail[] = [
    {
      name: "Tempo sem Resposta",
      points: factors.tempoSemResposta,
      maxPoints: 25,
      percentage: (factors.tempoSemResposta / 25) * 100,
      description: "Urgência baseada no tempo desde a última interação",
      icon: "Clock",
    },
    {
      name: "Interação Recente",
      points: factors.interacaoRecente,
      maxPoints: 25,
      percentage: (factors.interacaoRecente / 25) * 100,
      description: "Engajamento e atividade recente do lead",
      icon: "MessageSquare",
    },
    {
      name: "Tipo de Imóvel",
      points: factors.tipoImovel,
      maxPoints: 20,
      percentage: (factors.tipoImovel / 20) * 100,
      description: "Valor e tipo do imóvel de interesse",
      icon: "Building2",
    },
    {
      name: "Ações do Cliente",
      points: factors.acoesCliente,
      maxPoints: 20,
      percentage: (factors.acoesCliente / 20) * 100,
      description: "Diversidade e qualidade das interações",
      icon: "Activity",
    },
    {
      name: "Histórico do Corretor",
      points: factors.historicoCorretor,
      maxPoints: 10,
      percentage: (factors.historicoCorretor / 10) * 100,
      description: "Performance e engajamento do corretor",
      icon: "TrendingUp",
    },
  ]

  return {
    leadId: lead.id,
    score,
    temperature,
    actionCategory,
    factors,
    factorDetails,
    actionMessage,
    priority,
    calculatedAt: new Date(),
    mainReason,
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Obtém a temperatura baseada no score
 */
export function getTemperatureByScore(score: number): LeadTemperature {
  for (const config of TEMPERATURE_CONFIGS) {
    if (score >= config.minScore && score <= config.maxScore) {
      return config.temperature
    }
  }
  return "Frio" // Fallback
}

/**
 * Obtém a configuração de uma temperatura
 */
export function getTemperatureConfig(temperature: LeadTemperature): TemperatureConfig {
  return (
    TEMPERATURE_CONFIGS.find((c) => c.temperature === temperature) || TEMPERATURE_CONFIGS[1]
  )
}

/**
 * Determina a ação recomendada baseada no score e fatores
 */
function determineAction(
  lead: Lead,
  factors: ScoreFactors,
  temperature: LeadTemperature
): {
  actionCategory: ActionCategory
  actionMessage: string
  mainReason: string
} {
  const interacoes = lead.interacoes ?? lead.interacao ?? []
  const tempoSemResposta = factors.tempoSemResposta
  const interacaoRecente = factors.interacaoRecente

  // Risco - Lead parado há muito tempo
  if (temperature === "Risco") {
    return {
      actionCategory: "recuperar",
      actionMessage:
        "Lead em risco de perda. Contato urgente necessário para reativar o interesse.",
      mainReason: "Sem interação há mais de 14 dias",
    }
  }

  // Quente - Alta prioridade
  if (temperature === "Quente") {
    if (interacaoRecente >= 20) {
      return {
        actionCategory: "atacar_agora",
        actionMessage:
          "Lead muito ativo! Momento ideal para fechar negócio ou agendar visita.",
        mainReason: "Múltiplas interações recentes e alto engajamento",
      }
    }
    if (tempoSemResposta >= 20) {
      return {
        actionCategory: "atacar_agora",
        actionMessage: "Lead recente e promissor. Contatar imediatamente para qualificar.",
        mainReason: "Lead novo com potencial alto",
      }
    }
    return {
      actionCategory: "atacar_agora",
      actionMessage: "Lead prioritário. Ação imediata recomendada.",
      mainReason: "Score alto indicando boa oportunidade",
    }
  }

  // Morno - Média prioridade
  if (temperature === "Morno") {
    if (interacoes.length >= 3) {
      return {
        actionCategory: "acompanhar",
        actionMessage: "Lead em andamento. Manter acompanhamento regular e nutrir relacionamento.",
        mainReason: "Engajamento moderado em progresso",
      }
    }
    if (tempoSemResposta <= 15) {
      return {
        actionCategory: "manter_contato",
        actionMessage: "Lead começando a esfriar. Reforçar contato para manter interesse.",
        mainReason: "Redução de engajamento recente",
      }
    }
    return {
      actionCategory: "acompanhar",
      actionMessage: "Lead com potencial médio. Acompanhar regularmente.",
      mainReason: "Oportunidade em desenvolvimento",
    }
  }

  // Frio - Baixa prioridade
  return {
    actionCategory: "revisar",
    actionMessage:
      "Lead frio. Avaliar se vale a pena investir tempo ou realocar recursos.",
    mainReason: "Baixo engajamento e pouca atividade",
  }
}

/**
 * Calcula prioridade numérica (1-10)
 */
function calculatePriority(
  score: number,
  temperature: LeadTemperature,
  factors: ScoreFactors
): number {
  // Base de prioridade pelo score
  let priority = Math.ceil((score / 100) * 10)

  // Ajustes por temperatura
  if (temperature === "Risco") {
    priority = 10 // Máxima urgência para recuperar
  } else if (temperature === "Quente") {
    priority = Math.max(priority, 8) // Mínimo 8 para quente
  } else if (temperature === "Morno") {
    priority = Math.min(Math.max(priority, 5), 7) // Entre 5-7 para morno
  } else {
    priority = Math.min(priority, 4) // Máximo 4 para frio
  }

  // Ajuste por tempo sem resposta (urgência)
  if (factors.tempoSemResposta <= 5) {
    priority = Math.min(priority + 1, 10)
  }

  return priority
}

/**
 * Calcula estatísticas de múltiplos leads
 */
export function calculateScoreStatistics(scores: LeadScore[]) {
  const totalLeads = scores.length

  if (totalLeads === 0) {
    return {
      totalLeads: 0,
      averageScore: 0,
      distribution: { Quente: 0, Morno: 0, Frio: 0, Risco: 0 },
      actionCategories: {
        atacar_agora: 0,
        acompanhar: 0,
        recuperar: 0,
        manter_contato: 0,
        revisar: 0,
      },
      topPriorityLeads: [],
    }
  }

  const averageScore = scores.reduce((sum, s) => sum + s.score, 0) / totalLeads

  const distribution = {
    Quente: scores.filter((s) => s.temperature === "Quente").length,
    Morno: scores.filter((s) => s.temperature === "Morno").length,
    Frio: scores.filter((s) => s.temperature === "Frio").length,
    Risco: scores.filter((s) => s.temperature === "Risco").length,
  }

  const actionCategories = {
    atacar_agora: scores.filter((s) => s.actionCategory === "atacar_agora").length,
    acompanhar: scores.filter((s) => s.actionCategory === "acompanhar").length,
    recuperar: scores.filter((s) => s.actionCategory === "recuperar").length,
    manter_contato: scores.filter((s) => s.actionCategory === "manter_contato").length,
    revisar: scores.filter((s) => s.actionCategory === "revisar").length,
  }

  // Top 10 leads por prioridade
  const topPriorityLeads = [...scores]
    .sort((a, b) => b.priority - a.priority || b.score - a.score)
    .slice(0, 10)
    .map((s) => ({
      leadId: s.leadId,
      nome: "", // Será preenchido pelo chamador se necessário
      score: s.score,
      temperature: s.temperature,
    }))

  return {
    totalLeads,
    averageScore: Math.round(averageScore),
    distribution,
    actionCategories,
    topPriorityLeads,
  }
}
