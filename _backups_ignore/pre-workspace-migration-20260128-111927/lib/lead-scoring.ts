/**
 * @fileoverview Sistema de Pontuação de Leads (Lead Scoring)
 * @description Algoritmo de pontuação para priorização automática de leads
 * baseado em múltiplos fatores: recência, frequência de interação, 
 * qualificação, potencial de fechamento e urgência.
 */

import type { Lead, LeadInteracao } from "@/types/lead"

// =============================================================================
// TIPOS E CONSTANTES
// =============================================================================

/**
 * Score de 0 a 100 indicando prioridade do lead
 */
export type LeadScore = number

/**
 * Temperatura do lead baseada no score
 */
export type LeadTemperature = "quente" | "morno" | "frio" | "congelado"

/**
 * Urgência do lead
 */
export type LeadUrgency = "critica" | "alta" | "media" | "baixa"

/**
 * Resultado completo da pontuação
 */
export interface LeadScoreResult {
  /** Score total (0-100) */
  score: LeadScore
  /** Temperatura do lead */
  temperatura: LeadTemperature
  /** Nível de urgência */
  urgencia: LeadUrgency
  /** Pontos por categoria */
  breakdown: {
    recencia: number
    frequencia: number
    qualificacao: number
    engajamento: number
    urgencia: number
  }
  /** Motivos do score (para explicar ao corretor) */
  razoes: string[]
}

// Pesos de cada fator (soma = 100%)
const WEIGHTS = {
  RECENCIA: 0.30,      // 30% - Quão recente foi o contato
  FREQUENCIA: 0.20,    // 20% - Frequência de interações
  QUALIFICACAO: 0.25,  // 25% - Dados de qualificação
  ENGAJAMENTO: 0.15,   // 15% - Engajamento do lead
  URGENCIA: 0.10,      // 10% - Fatores de urgência
}

// Limiares de temperatura
const TEMP_THRESHOLDS = {
  QUENTE: 70,    // >= 70 pontos
  MORNO: 40,     // 40-69 pontos
  FRIO: 20,      // 20-39 pontos
  CONGELADO: 0,  // < 20 pontos
}

// =============================================================================
// FUNÇÃO PRINCIPAL
// =============================================================================

/**
 * Calcula o score completo de um lead
 * @param lead - Lead a ser avaliado
 * @returns Resultado completo da pontuação
 */
export function calculateLeadScore(lead: Lead): LeadScoreResult {
  const interacoes = lead.interacoes || lead.interacao || []
  const razoes: string[] = []

  // 1. RECÊNCIA (30 pontos máx)
  const recenciaScore = calculateRecenciaScore(interacoes, razoes)

  // 2. FREQUÊNCIA (20 pontos máx)
  const frequenciaScore = calculateFrequenciaScore(interacoes, razoes)

  // 3. QUALIFICAÇÃO (25 pontos máx)
  const qualificacaoScore = calculateQualificacaoScore(lead, razoes)

  // 4. ENGAJAMENTO (15 pontos máx)
  const engajamentoScore = calculateEngajamentoScore(lead, interacoes, razoes)

  // 5. URGÊNCIA (10 pontos máx)
  const urgenciaScore = calculateUrgenciaScore(lead, interacoes, razoes)

  // Score total (0-100)
  const score = Math.round(
    recenciaScore * WEIGHTS.RECENCIA * 100 +
    frequenciaScore * WEIGHTS.FREQUENCIA * 100 +
    qualificacaoScore * WEIGHTS.QUALIFICACAO * 100 +
    engajamentoScore * WEIGHTS.ENGAJAMENTO * 100 +
    urgenciaScore * WEIGHTS.URGENCIA * 100
  )

  return {
    score: Math.min(100, Math.max(0, score)),
    temperatura: getTemperature(score),
    urgencia: getUrgency(score, interacoes),
    breakdown: {
      recencia: Math.round(recenciaScore * 30),
      frequencia: Math.round(frequenciaScore * 20),
      qualificacao: Math.round(qualificacaoScore * 25),
      engajamento: Math.round(engajamentoScore * 15),
      urgencia: Math.round(urgenciaScore * 10),
    },
    razoes,
  }
}

// =============================================================================
// CÁLCULOS POR FATOR
// =============================================================================

/**
 * Calcula pontuação de recência (0-1)
 * Quanto mais recente o contato, maior o score
 */
function calculateRecenciaScore(interacoes: LeadInteracao[], razoes: string[]): number {
  if (interacoes.length === 0) {
    razoes.push("Sem interações registradas")
    return 0
  }

  // Pega a interação mais recente
  const sortedInteracoes = [...interacoes].sort((a, b) => {
    const dateA = new Date(a.data || a.data_cad).getTime()
    const dateB = new Date(b.data || b.data_cad).getTime()
    return dateB - dateA
  })

  if (sortedInteracoes.length === 0) {
    razoes.push("Sem interações válidas")
    return 0
  }

  const ultimaInteracao = sortedInteracoes[0]
  const dataInteracao = new Date(ultimaInteracao.data || ultimaInteracao.data_cad)
  const agora = new Date()
  const diasSemContato = Math.floor(
    (agora.getTime() - dataInteracao.getTime()) / (1000 * 60 * 60 * 24)
  )

  let score = 0

  if (diasSemContato === 0) {
    score = 1.0
    razoes.push("Contato hoje")
  } else if (diasSemContato === 1) {
    score = 0.95
    razoes.push("Contato ontem")
  } else if (diasSemContato <= 3) {
    score = 0.85
    razoes.push(`Último contato há ${diasSemContato} dias`)
  } else if (diasSemContato <= 7) {
    score = 0.65
    razoes.push(`Sem contato há ${diasSemContato} dias`)
  } else if (diasSemContato <= 14) {
    score = 0.40
    razoes.push(`⚠️ Irregular há ${diasSemContato} dias`)
  } else if (diasSemContato <= 30) {
    score = 0.20
    razoes.push(`🚨 Crítico: ${diasSemContato} dias sem contato`)
  } else {
    score = 0.05
    razoes.push(`❌ Lead frio há ${diasSemContato} dias`)
  }

  return score
}

/**
 * Calcula pontuação de frequência (0-1)
 * Quanto mais interações, maior o score
 */
function calculateFrequenciaScore(interacoes: LeadInteracao[], razoes: string[]): number {
  const totalInteracoes = interacoes.length

  if (totalInteracoes === 0) return 0

  let score = 0

  if (totalInteracoes >= 10) {
    score = 1.0
    razoes.push(`${totalInteracoes} interações registradas`)
  } else if (totalInteracoes >= 5) {
    score = 0.75
    razoes.push(`${totalInteracoes} interações`)
  } else if (totalInteracoes >= 3) {
    score = 0.50
    razoes.push(`${totalInteracoes} interações`)
  } else if (totalInteracoes >= 1) {
    score = 0.25
    razoes.push("Poucas interações")
  }

  return score
}

/**
 * Calcula pontuação de qualificação (0-1)
 * Baseado em dados preenchidos e situação do lead
 */
function calculateQualificacaoScore(lead: Lead, razoes: string[]): number {
  let score = 0
  const maxPoints = 10
  let points = 0

  // Dados básicos preenchidos (+1 cada)
  if (lead.email) points++
  if (lead.celular || lead.telefone) points++
  if (lead.cpf) points++
  
  // Dados financeiros (+2 cada - mais importantes)
  if (lead.renda) {
    points += 2
    razoes.push("Renda informada")
  }
  if (lead.profissao) points++

  // Score de crédito (+2)
  if (lead.score && lead.score > 0) {
    points += 2
    if (lead.score >= 700) {
      razoes.push("Score de crédito excelente")
    } else if (lead.score >= 500) {
      razoes.push("Score de crédito bom")
    }
  }

  // Situação do lead
  const situacao = lead.situacao?.toLowerCase() || ""
  if (situacao.includes("qualificado")) {
    points += 2
    razoes.push("Lead já qualificado")
  } else if (situacao.includes("convertido") || situacao.includes("vend")) {
    points += 3
    razoes.push("✅ Lead convertido")
  } else if (situacao.includes("negociacao") || situacao.includes("proposta")) {
    points += 2
    razoes.push("Em negociação")
  }

  score = Math.min(points / maxPoints, 1.0)
  
  if (points < 3) {
    razoes.push("⚠️ Poucos dados qualificados")
  }

  return score
}

/**
 * Calcula pontuação de engajamento (0-1)
 * Baseado em tipos de interação e respostas do lead
 */
function calculateEngajamentoScore(
  lead: Lead,
  interacoes: LeadInteracao[],
  razoes: string[]
): number {
  let score = 0
  let engajamentoPoints = 0

  // Analisa tipos de interação (interações importantes valem mais)
  const tiposImportantes = ["reuniao", "visita", "proposta", "negociacao", "ligacao"]
  const tiposEngajamento = ["whatsapp", "email", "resposta"]

  for (const interacao of interacoes) {
    const tipo = interacao.tipo?.toLowerCase() || ""
    const descricao = interacao.descricao?.toLowerCase() || ""

    // Interações de alto valor (+2)
    if (tiposImportantes.some((t) => tipo.includes(t) || descricao.includes(t))) {
      engajamentoPoints += 2
    }
    // Interações de engajamento (+1)
    else if (tiposEngajamento.some((t) => tipo.includes(t) || descricao.includes(t))) {
      engajamentoPoints += 1
    }

    // Lead respondeu/iniciou contato (+3)
    if (
      descricao.includes("respondeu") ||
      descricao.includes("retornou") ||
      descricao.includes("solicitou")
    ) {
      engajamentoPoints += 3
    }
  }

  // Empreendimento definido (+2)
  if (lead.empreendimento || lead.empreendimento_nome) {
    engajamentoPoints += 2
    razoes.push("Imóvel de interesse definido")
  }

  // Normaliza para 0-1
  score = Math.min(engajamentoPoints / 15, 1.0)

  if (engajamentoPoints >= 10) {
    razoes.push("Alto engajamento")
  } else if (engajamentoPoints >= 5) {
    razoes.push("Engajamento moderado")
  } else if (engajamentoPoints > 0) {
    razoes.push("Baixo engajamento")
  }

  return score
}

/**
 * Calcula pontuação de urgência (0-1)
 * Baseado em sinais de urgência nas interações
 */
function calculateUrgenciaScore(
  lead: Lead,
  interacoes: LeadInteracao[],
  razoes: string[]
): number {
  let score = 0
  let urgenciaPoints = 0

  // Palavras-chave de urgência
  const palavrasUrgentes = [
    "urgente",
    "rápido",
    "logo",
    "imediato",
    "hoje",
    "agora",
    "prazo",
    "decisão",
  ]

  // Verifica interações recentes por urgência
  const interacoesRecentes = interacoes.slice(0, 3) // últimas 3
  for (const interacao of interacoesRecentes) {
    const texto = `${interacao.descricao} ${interacao.observacao || ""}`.toLowerCase()
    
    for (const palavra of palavrasUrgentes) {
      if (texto.includes(palavra)) {
        urgenciaPoints += 2
        break
      }
    }
  }

  // Lead em estágio avançado
  const situacao = lead.situacao?.toLowerCase() || ""
  if (situacao.includes("proposta") || situacao.includes("negociacao")) {
    urgenciaPoints += 3
    razoes.push("🔥 Lead em negociação avançada")
  }

  // Normaliza para 0-1
  score = Math.min(urgenciaPoints / 10, 1.0)

  return score
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Determina temperatura baseada no score
 */
function getTemperature(score: LeadScore): LeadTemperature {
  if (score >= TEMP_THRESHOLDS.QUENTE) return "quente"
  if (score >= TEMP_THRESHOLDS.MORNO) return "morno"
  if (score >= TEMP_THRESHOLDS.FRIO) return "frio"
  return "congelado"
}

/**
 * Determina urgência baseada no score e recência
 */
function getUrgency(score: LeadScore, interacoes: LeadInteracao[]): LeadUrgency {
  if (interacoes.length === 0) return "baixa"

  const ultimaInteracao = interacoes
    .sort((a, b) => {
      const dateA = new Date(a.data || a.data_cad).getTime()
      const dateB = new Date(b.data || b.data_cad).getTime()
      return dateB - dateA
    })[0]

  const diasSemContato = Math.floor(
    (new Date().getTime() - new Date(ultimaInteracao.data || ultimaInteracao.data_cad).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  // Lógica de urgência
  if (score >= 70 && diasSemContato <= 1) return "critica"
  if (score >= 70 && diasSemContato <= 3) return "alta"
  if (score >= 50 || diasSemContato <= 7) return "media"
  return "baixa"
}

/**
 * Formata o score para exibição (com cores e ícones)
 */
export function formatScoreDisplay(result: LeadScoreResult): {
  score: string
  color: string
  icon: string
  label: string
} {
  const { score, temperatura } = result

  const configs = {
    quente: {
      color: "text-red-600 dark:text-red-400",
      icon: "🔥",
      label: "Quente",
    },
    morno: {
      color: "text-amber-600 dark:text-amber-400",
      icon: "🌡️",
      label: "Morno",
    },
    frio: {
      color: "text-blue-600 dark:text-blue-400",
      icon: "❄️",
      label: "Frio",
    },
    congelado: {
      color: "text-slate-600 dark:text-slate-400",
      icon: "🧊",
      label: "Congelado",
    },
  }

  const config = configs[temperatura]

  return {
    score: `${score}/100`,
    color: config.color,
    icon: config.icon,
    label: config.label,
  }
}

/**
 * Ordena leads por score (maior primeiro)
 */
export function sortLeadsByScore(leads: Lead[]): Array<Lead & { scoreResult: LeadScoreResult }> {
  return leads
    .map((lead) => ({
      ...lead,
      scoreResult: calculateLeadScore(lead),
    }))
    .sort((a, b) => b.scoreResult.score - a.scoreResult.score)
}
