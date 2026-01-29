/**
 * @fileoverview Componente IA Coach - Gerente de Vendas Chato
 * @description Widget que age como um coach de vendas insistente,
 * cobrando ações e mostrando urgências ao corretor.
 */

"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Phone, MessageSquare, Calendar, TrendingUp, Zap, X } from "lucide-react"
import type { Lead } from "@/types/lead"
import { getNextBestAction, formatPrazo } from "@/lib/next-best-action"
import { calculateLeadScore } from "@/lib/lead-scoring"

interface AICoachProps {
  leads: Lead[]
  onActionClick?: (leadId: string | number, action: string) => void
}

/**
 * Componente IA Coach - Cobra ações do corretor
 */
export function AICoach({ leads, onActionClick }: AICoachProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [urgentActions, setUrgentActions] = useState<Array<{
    lead: Lead
    action: ReturnType<typeof getNextBestAction>
    score: ReturnType<typeof calculateLeadScore>
  }>>([])

  useEffect(() => {
    // Analisa todos os leads e pega as 3 ações mais urgentes
    const analyzed = leads
      .map((lead) => ({
        lead,
        action: getNextBestAction(lead),
        score: calculateLeadScore(lead),
      }))
      .filter((item) => 
        item.action.prioridade === "critica" || item.action.prioridade === "alta"
      )
      .sort((a, b) => {
        // Ordena por prioridade e depois por score
        const prioOrder = { critica: 0, alta: 1, media: 2, baixa: 3 }
        const prioA = prioOrder[a.action.prioridade]
        const prioB = prioOrder[b.action.prioridade]
        
        if (prioA !== prioB) return prioA - prioB
        return b.score.score - a.score.score
      })
      .slice(0, 3)

    setUrgentActions(analyzed)
  }, [leads])

  if (urgentActions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-green-900 dark:text-green-100">Tudo em dia! 🎉</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Nenhuma ação crítica pendente. Continue assim!
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-2xl animate-pulse"
      >
        <Zap className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {urgentActions.length}
        </span>
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-300 dark:border-red-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-red-900 dark:text-red-100">
              🚨 IA COACH - AÇÕES URGENTES
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {urgentActions.length} lead{urgentActions.length > 1 ? "s" : ""} precisa{urgentActions.length > 1 ? "m" : ""} de AÇÃO AGORA
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-red-600 hover:text-red-800 dark:text-red-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {urgentActions.map((item, index) => (
          <UrgentActionCard
            key={item.lead.id}
            lead={item.lead}
            action={item.action}
            score={item.score}
            rank={index + 1}
            onActionClick={onActionClick}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
          💡 LEMBRE-SE: Cada hora sem ação é uma venda perdida. AÇÃO GERA RESULTADO!
        </p>
      </div>
    </div>
  )
}

/**
 * Card de ação urgente individual
 */
function UrgentActionCard({
  lead,
  action,
  score,
  rank,
  onActionClick,
}: {
  lead: Lead
  action: ReturnType<typeof getNextBestAction>
  score: ReturnType<typeof calculateLeadScore>
  rank: number
  onActionClick?: (leadId: string | number, actionType: string) => void
}) {
  const getActionIcon = () => {
    switch (action.tipo) {
      case "ligar_agora":
        return <Phone className="w-4 h-4" />
      case "enviar_whatsapp":
        return <MessageSquare className="w-4 h-4" />
      case "agendar_visita":
        return <Calendar className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getPriorityStyles = () => {
    if (action.prioridade === "critica") {
      return {
        bg: "bg-red-100 dark:bg-red-950/50",
        border: "border-red-400 dark:border-red-700",
        text: "text-red-900 dark:text-red-100",
        badge: "bg-red-600 text-white",
      }
    }
    return {
      bg: "bg-orange-100 dark:bg-orange-950/50",
      border: "border-orange-400 dark:border-orange-700",
      text: "text-orange-900 dark:text-orange-100",
      badge: "bg-orange-600 text-white",
    }
  }

  const styles = getPriorityStyles()

  return (
    <div
      className={`${styles.bg} ${styles.border} border-2 rounded-lg p-4 transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`${styles.badge} text-xs font-bold px-2 py-1 rounded-full`}>
            #{rank}
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Score: {score.score}/100 {action.icone}
          </span>
        </div>
        <span className="text-xs font-bold text-red-600 dark:text-red-400">
          ⏰ {formatPrazo(action.prazoHoras)}
        </span>
      </div>

      <h4 className={`font-bold ${styles.text} mb-1`}>
        {lead.nome}
      </h4>
      
      <p className={`text-sm font-semibold ${styles.text} mb-2`}>
        {action.titulo}
      </p>

      <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">
        {action.descricao}
      </p>

      {action.roteiro && (
        <div className="bg-white/50 dark:bg-black/20 rounded p-2 mb-3 border border-slate-300 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            💬 O que dizer:
          </p>
          <p className="text-xs italic text-slate-700 dark:text-slate-300">
            "{action.roteiro}"
          </p>
        </div>
      )}

      <button
        onClick={() => onActionClick?.(lead.id, action.tipo)}
        className={`w-full ${styles.badge} font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
      >
        {getActionIcon()}
        {action.tipo === "ligar_agora" && "LIGAR AGORA"}
        {action.tipo === "enviar_whatsapp" && "ENVIAR WHATSAPP"}
        {action.tipo === "agendar_visita" && "AGENDAR VISITA"}
        {action.tipo === "follow_up" && "FAZER FOLLOW-UP"}
        {action.tipo === "enviar_proposta" && "ENVIAR PROPOSTA"}
        {action.tipo === "qualificar" && "QUALIFICAR LEAD"}
      </button>
    </div>
  )
}
