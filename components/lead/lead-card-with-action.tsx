/**
 * @fileoverview Lead Card com Score e Ação Sugerida
 * @description Card de lead que mostra prioridade, score e próxima ação
 * de forma visual e urgente.
 */

"use client"

import { Phone, MessageSquare, Calendar, TrendingUp, Clock, AlertTriangle } from "lucide-react"
import type { Lead } from "@/types/lead"
import { calculateLeadScore, formatScoreDisplay } from "@/lib/lead-scoring"
import { getNextBestAction, formatPrazo } from "@/lib/next-best-action"
import { formatDate, getInitials } from "@/utils/leadUtils"

interface LeadCardWithActionProps {
  lead: Lead
  onClick?: () => void
  onActionClick?: (actionType: string) => void
}

/**
 * Card de lead com score e próxima ação
 */
export function LeadCardWithAction({ lead, onClick, onActionClick }: LeadCardWithActionProps) {
  const scoreResult = calculateLeadScore(lead)
  const nextAction = getNextBestAction(lead)
  const scoreDisplay = formatScoreDisplay(scoreResult)
  const interacoes = lead.interacoes || lead.interacao || []
  const ultimaInteracao = interacoes.length > 0 ? interacoes[0] : null

  // Cor do card baseada na urgência
  const getCardStyles = () => {
    if (nextAction.prioridade === "critica") {
      return {
        border: "border-red-400 dark:border-red-700",
        bg: "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20",
        glow: "shadow-lg shadow-red-500/20",
      }
    }
    if (nextAction.prioridade === "alta") {
      return {
        border: "border-orange-400 dark:border-orange-700",
        bg: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20",
        glow: "shadow-md shadow-orange-500/10",
      }
    }
    if (scoreResult.temperatura === "quente") {
      return {
        border: "border-pink-400 dark:border-pink-700",
        bg: "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20",
        glow: "shadow-md shadow-pink-500/10",
      }
    }
    return {
      border: "border-slate-300 dark:border-slate-700",
      bg: "bg-white dark:bg-slate-900",
      glow: "",
    }
  }

  const styles = getCardStyles()

  const getActionIcon = () => {
    switch (nextAction.tipo) {
      case "ligar_agora":
        return <Phone className="w-4 h-4" />
      case "enviar_whatsapp":
        return <MessageSquare className="w-4 h-4" />
      case "agendar_visita":
        return <Calendar className="w-4 h-4" />
      default:
        return <TrendingUp className="w-4 h-4" />
    }
  }

  return (
    <div
      className={`${styles.bg} ${styles.border} ${styles.glow} border-2 rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-all`}
      onClick={onClick}
    >
      {/* Header com avatar e score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
            {getInitials(lead.nome)}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              {lead.nome}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {lead.celular || lead.telefone || "Sem telefone"}
            </p>
          </div>
        </div>

        {/* Score badge */}
        <div className="text-right">
          <div className={`text-2xl font-black ${scoreDisplay.color}`}>
            {scoreResult.score}
          </div>
          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
            {scoreDisplay.label} {scoreDisplay.icon}
          </div>
        </div>
      </div>

      {/* Badges de urgência e temperatura */}
      <div className="flex gap-2 mb-3">
        {nextAction.prioridade === "critica" && (
          <span className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            CRÍTICO
          </span>
        )}
        {nextAction.prioridade === "alta" && (
          <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            URGENTE
          </span>
        )}
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getTemperatureBadge(scoreResult.temperatura)}`}>
          {scoreResult.temperatura.toUpperCase()}
        </span>
      </div>

      {/* Próxima ação */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
            Próxima Ação
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
            <Clock className="w-3 h-3" />
            {formatPrazo(nextAction.prazoHoras)}
          </div>
        </div>
        <p className={`text-sm font-bold ${nextAction.cor} mb-2`}>
          {nextAction.icone} {nextAction.titulo}
        </p>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          {nextAction.descricao}
        </p>
      </div>

      {/* Última interação */}
      {ultimaInteracao && (
        <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
          <span className="font-semibold">Último contato:</span>{" "}
          {formatDate(ultimaInteracao.data || ultimaInteracao.data_cad, { relative: true })}
        </div>
      )}

      {/* Botão de ação */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onActionClick?.(nextAction.tipo)
        }}
        className={`w-full font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${getActionButtonStyles(nextAction.prioridade)}`}
      >
        {getActionIcon()}
        {getActionButtonText(nextAction.tipo)}
      </button>
    </div>
  )
}

/**
 * Estilos do badge de temperatura
 */
function getTemperatureBadge(temperatura: string) {
  const badges = {
    quente: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    morno: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    frio: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    congelado: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  }
  return badges[temperatura as keyof typeof badges] || badges.congelado
}

/**
 * Estilos do botão de ação
 */
function getActionButtonStyles(prioridade: string) {
  if (prioridade === "critica") {
    return "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
  }
  if (prioridade === "alta") {
    return "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/30"
  }
  return "bg-blue-600 hover:bg-blue-700 text-white"
}

/**
 * Texto do botão de ação
 */
function getActionButtonText(tipo: string) {
  const texts = {
    ligar_agora: "LIGAR AGORA",
    enviar_whatsapp: "ENVIAR WHATSAPP",
    agendar_visita: "AGENDAR VISITA",
    enviar_proposta: "ENVIAR PROPOSTA",
    follow_up: "FAZER FOLLOW-UP",
    qualificar: "QUALIFICAR",
    recuperar: "RECUPERAR LEAD",
    arquivar: "ARQUIVAR",
  }
  return texts[tipo as keyof typeof texts] || "VER LEAD"
}
