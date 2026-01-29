/**
 * @fileoverview Sistema de Próxima Melhor Ação (Next Best Action)
 * @description Define automaticamente a próxima ação que o corretor deve tomar
 * para cada lead, baseado em regras de vendas e machine learning simples.
 */

import type { Lead, LeadInteracao } from "@/types/lead"
import type { LeadScoreResult } from "./lead-scoring"
import { calculateLeadScore } from "./lead-scoring"

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Tipo de ação recomendada
 */
export type ActionType =
  | "ligar_agora"
  | "enviar_whatsapp"
  | "agendar_visita"
  | "enviar_proposta"
  | "follow_up"
  | "qualificar"
  | "recuperar"
  | "arquivar"

/**
 * Prioridade da ação
 */
export type ActionPriority = "critica" | "alta" | "media" | "baixa"

/**
 * Próxima melhor ação para um lead
 */
export interface NextBestAction {
  /** Tipo da ação */
  tipo: ActionType
  /** Título da ação (curto e direto) */
  titulo: string
  /** Descrição da ação (o que fazer) */
  descricao: string
  /** Prioridade da ação */
  prioridade: ActionPriority
  /** Prazo em horas (urgência) */
  prazoHoras: number
  /** Razão para esta ação */
  razao: string
  /** Roteiro sugerido (o que dizer) */
  roteiro?: string
  /** Ícone para exibição */
  icone: string
  /** Cor para UI */
  cor: string
}

// =============================================================================
// FUNÇÃO PRINCIPAL
// =============================================================================

/**
 * Determina a próxima melhor ação para um lead
 * @param lead - Lead a ser analisado
 * @returns Próxima ação recomendada
 */
export function getNextBestAction(lead: Lead): NextBestAction {
  const scoreResult = calculateLeadScore(lead)
  const interacoes = lead.interacoes || lead.interacao || []
  const situacao = lead.situacao?.toLowerCase() || ""

  // 1. LEAD CONVERTIDO/VENDIDO → Arquivar ou pós-venda
  if (situacao.includes("convertido") || situacao.includes("vend")) {
    return createAction(
      "arquivar",
      "Lead já vendido",
      "Lead convertido. Manter relacionamento para indicações.",
      "baixa",
      0,
      "Lead já foi convertido em venda",
      "Parabéns pela venda! Peça indicações ao cliente.",
      "✅",
      "text-green-600"
    )
  }

  // 2. LEAD PERDIDO PERMANENTEMENTE → Arquivar
  if (situacao.includes("descartado") || situacao.includes("cancelado")) {
    return createAction(
      "arquivar",
      "Lead descartado",
      "Lead não tem potencial. Arquivar.",
      "baixa",
      0,
      "Lead foi descartado",
      undefined,
      "🗑️",
      "text-slate-600"
    )
  }

  // 3. LEAD EM PROPOSTA/NEGOCIAÇÃO → LIGAR AGORA (crítico)
  if (situacao.includes("proposta") || situacao.includes("negociacao")) {
    return getActionForNegociation(lead, interacoes, scoreResult)
  }

  // 4. LEAD SEM CONTATO RECENTE → RECUPERAR
  const diasSemContato = getDaysSinceLastContact(interacoes)
  if (diasSemContato > 14) {
    return getActionForRecovery(lead, diasSemContato, scoreResult)
  }

  // 5. LEAD QUENTE (score >= 70) → AÇÃO AGRESSIVA
  if (scoreResult.score >= 70) {
    return getActionForHotLead(lead, interacoes, scoreResult)
  }

  // 6. LEAD NOVO → QUALIFICAR
  if (interacoes.length <= 1 || situacao.includes("novo")) {
    return getActionForNewLead(lead, scoreResult)
  }

  // 7. LEAD MORNO (40-69) → FOLLOW-UP
  if (scoreResult.score >= 40) {
    return getActionForWarmLead(lead, interacoes, scoreResult)
  }

  // 8. LEAD FRIO (< 40) → TENTATIVA DE RECUPERAÇÃO
  return getActionForColdLead(lead, diasSemContato, scoreResult)
}

// =============================================================================
// AÇÕES ESPECÍFICAS POR SITUAÇÃO
// =============================================================================

/**
 * Ação para lead em negociação (máxima prioridade)
 */
function getActionForNegociation(
  lead: Lead,
  interacoes: LeadInteracao[],
  scoreResult: LeadScoreResult
): NextBestAction {
  const diasSemContato = getDaysSinceLastContact(interacoes)
  
  if (diasSemContato === 0) {
    return createAction(
      "follow_up",
      "Acompanhar proposta hoje",
      "Lead em negociação. Acompanhar resposta da proposta.",
      "alta",
      4,
      "Lead em negociação com contato hoje",
      `Olá ${lead.nome}, tudo bem? Conseguiu analisar a proposta que enviei?`,
      "📄",
      "text-amber-600"
    )
  }

  if (diasSemContato >= 1) {
    return createAction(
      "ligar_agora",
      "LIGAR AGORA - Proposta pendente",
      `Lead há ${diasSemContato} dia(s) sem responder proposta. LIGAR URGENTE.`,
      "critica",
      1,
      `Proposta sem resposta há ${diasSemContato} dias`,
      `${lead.nome}, bom dia! Estou ligando para saber se você teve chance de avaliar a proposta. Tem alguma dúvida que eu possa esclarecer?`,
      "🚨",
      "text-red-600"
    )
  }

  return createAction(
    "enviar_proposta",
    "Enviar proposta formal",
    "Lead qualificado e em negociação. Enviar proposta por e-mail.",
    "alta",
    6,
    "Lead em estágio de proposta",
    undefined,
    "📧",
    "text-blue-600"
  )
}

/**
 * Ação para lead frio/inativo (recuperação)
 */
function getActionForRecovery(
  lead: Lead,
  diasSemContato: number,
  scoreResult: LeadScoreResult
): NextBestAction {
  // Lead inativo há muito tempo mas tinha bom score
  if (scoreResult.score >= 50) {
    return createAction(
      "ligar_agora",
      "Recuperar lead urgente",
      `Lead sem contato há ${diasSemContato} dias. Tinha alto potencial. LIGAR.`,
      "alta",
      6,
      `Lead com score ${scoreResult.score} sem contato há ${diasSemContato} dias`,
      `${lead.nome}, tudo bem? Faz um tempo que não conversamos. Você ainda está procurando imóvel? Temos novidades que podem te interessar.`,
      "🔄",
      "text-orange-600"
    )
  }

  // Lead frio há muito tempo
  return createAction(
    "enviar_whatsapp",
    "Tentar recuperação via WhatsApp",
    `Lead irregular há ${diasSemContato} dias. Enviar mensagem de reengajamento.`,
    "media",
    24,
    `Sem contato há ${diasSemContato} dias`,
    `Olá ${lead.nome}! Tudo bem? Vi que você estava interessado em imóveis. Ainda está procurando? Tenho algumas opções novas que podem te interessar!`,
    "💬",
    "text-yellow-600"
  )
}

/**
 * Ação para lead quente (score alto)
 */
function getActionForHotLead(
  lead: Lead,
  interacoes: LeadInteracao[],
  scoreResult: LeadScoreResult
): NextBestAction {
  const diasSemContato = getDaysSinceLastContact(interacoes)
  const temVisita = interacoes.some((i) => 
    i.tipo?.includes("visita") || i.descricao?.toLowerCase().includes("visita")
  )

  // Lead quente sem contato hoje → LIGAR AGORA
  if (diasSemContato >= 1) {
    return createAction(
      "ligar_agora",
      "LIGAR AGORA - Lead quente",
      `Lead quente (${scoreResult.score}/100) sem contato há ${diasSemContato} dia(s). AÇÃO URGENTE.`,
      "critica",
      2,
      `Lead com alto score sem contato há ${diasSemContato} dias`,
      `${lead.nome}, bom dia! Como você está? Vamos marcar uma visita no imóvel? Tenho horários disponíveis hoje mesmo.`,
      "🔥",
      "text-red-600"
    )
  }

  // Lead quente sem visita agendada
  if (!temVisita) {
    return createAction(
      "agendar_visita",
      "Agendar visita urgente",
      "Lead quente e qualificado. Agendar visita no imóvel HOJE.",
      "critica",
      3,
      `Lead quente (${scoreResult.score}/100) sem visita agendada`,
      `${lead.nome}, que tal agendarmos uma visita no imóvel? Posso ir hoje ou amanhã. Qual horário fica melhor para você?`,
      "📅",
      "text-purple-600"
    )
  }

  // Lead quente com visita → enviar proposta
  return createAction(
    "enviar_proposta",
    "Enviar proposta comercial",
    "Lead quente e engajado. Hora de enviar proposta.",
    "alta",
    6,
    "Lead qualificado pronto para proposta",
    undefined,
    "📄",
    "text-blue-600"
  )
}

/**
 * Ação para lead novo
 */
function getActionForNewLead(lead: Lead, scoreResult: LeadScoreResult): NextBestAction {
  const temDados = !!(lead.cpf || lead.renda || lead.profissao)

  if (!temDados) {
    return createAction(
      "ligar_agora",
      "Qualificar lead novo",
      "Lead novo sem dados. Ligar para qualificar e entender necessidade.",
      "alta",
      4,
      "Lead novo precisa de qualificação",
      `Olá ${lead.nome}, tudo bem? Vi que você se interessou por imóveis. Me conta, o que você está procurando? É para morar ou investir?`,
      "📞",
      "text-blue-600"
    )
  }

  return createAction(
    "enviar_whatsapp",
    "Primeiro contato via WhatsApp",
    "Lead novo. Iniciar conversa via WhatsApp.",
    "alta",
    3,
    "Lead novo aguardando primeiro contato",
    `Olá ${lead.nome}! Sou ${lead.corretor_nome || "seu corretor"}. Vi seu interesse em imóveis. Vamos conversar sobre o que você procura?`,
    "💬",
    "text-green-600"
  )
}

/**
 * Ação para lead morno
 */
function getActionForWarmLead(
  lead: Lead,
  interacoes: LeadInteracao[],
  scoreResult: LeadScoreResult
): NextBestAction {
  const diasSemContato = getDaysSinceLastContact(interacoes)

  if (diasSemContato >= 7) {
    return createAction(
      "follow_up",
      "Follow-up semanal",
      `Lead morno sem contato há ${diasSemContato} dias. Fazer follow-up.`,
      "media",
      12,
      "Manter lead aquecido",
      `${lead.nome}, tudo bem? Passando aqui para saber se você ainda está procurando. Temos novidades!`,
      "📱",
      "text-amber-600"
    )
  }

  return createAction(
    "enviar_whatsapp",
    "Nutrir relacionamento",
    "Lead morno. Enviar conteúdo relevante para manter interesse.",
    "media",
    24,
    "Manter engajamento do lead",
    `Oi ${lead.nome}! Separei alguns imóveis que combinam com o que você procura. Quer que eu envie?`,
    "💬",
    "text-yellow-600"
  )
}

/**
 * Ação para lead frio
 */
function getActionForColdLead(
  lead: Lead,
  diasSemContato: number,
  scoreResult: LeadScoreResult
): NextBestAction {
  if (diasSemContato >= 30) {
    return createAction(
      "recuperar",
      "Última tentativa de recuperação",
      `Lead frio há ${diasSemContato} dias. Última tentativa antes de arquivar.`,
      "baixa",
      48,
      "Lead com baixo score há muito tempo inativo",
      `${lead.nome}, ainda está procurando imóvel? Se não estiver mais interessado, me avise para eu não te incomodar.`,
      "❄️",
      "text-slate-600"
    )
  }

  return createAction(
    "follow_up",
    "Follow-up de manutenção",
    "Lead frio. Manter contato esporádico.",
    "baixa",
    72,
    `Lead com score baixo (${scoreResult.score}/100)`,
    undefined,
    "📧",
    "text-slate-600"
  )
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Cria objeto de ação formatado
 */
function createAction(
  tipo: ActionType,
  titulo: string,
  descricao: string,
  prioridade: ActionPriority,
  prazoHoras: number,
  razao: string,
  roteiro: string | undefined,
  icone: string,
  cor: string
): NextBestAction {
  return {
    tipo,
    titulo,
    descricao,
    prioridade,
    prazoHoras,
    razao,
    roteiro,
    icone,
    cor,
  }
}

/**
 * Calcula dias desde último contato
 */
function getDaysSinceLastContact(interacoes: LeadInteracao[]): number {
  if (interacoes.length === 0) return 999 // Muito tempo

  const sortedInteracoes = [...interacoes].sort((a, b) => {
    const dateA = new Date(a.data || a.data_cad).getTime()
    const dateB = new Date(b.data || b.data_cad).getTime()
    return dateB - dateA
  })

  if (sortedInteracoes.length === 0) return 999

  const ultimaInteracao = sortedInteracoes[0]
  const agora = new Date()
  const dataInteracao = new Date(ultimaInteracao.data || ultimaInteracao.data_cad)
  
  return Math.floor((agora.getTime() - dataInteracao.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Formata prazo para exibição
 */
export function formatPrazo(horas: number): string {
  if (horas === 0) return "Sem prazo"
  if (horas === 1) return "1 hora"
  if (horas < 24) return `${horas}h`
  
  const dias = Math.floor(horas / 24)
  if (dias === 1) return "1 dia"
  return `${dias} dias`
}

/**
 * Obtém cor de prioridade para UI
 */
export function getPriorityColor(prioridade: ActionPriority): string {
  const colors = {
    critica: "bg-red-500 text-white",
    alta: "bg-orange-500 text-white",
    media: "bg-yellow-500 text-black",
    baixa: "bg-slate-400 text-white",
  }
  return colors[prioridade]
}
