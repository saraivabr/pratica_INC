/**
 * @fileoverview Widget "Faça Agora" - Top 3 Ações Urgentes
 * @description Widget compacto que mostra as 3 ações mais importantes
 * que o corretor deve fazer AGORA para fechar vendas.
 */

"use client"

import { useState } from "react"
import { Zap, Clock, ChevronRight, CheckCircle2 } from "lucide-react"
import type { Lead } from "@/types/lead"
import { getNextBestAction } from "@/lib/next-best-action"
import { calculateLeadScore } from "@/lib/lead-scoring"

interface FacaAgoraWidgetProps {
  leads: Lead[]
  onActionComplete?: (leadId: string | number) => void
}

/**
 * Widget de ações urgentes para dashboard
 */
export function FacaAgoraWidget({ leads, onActionComplete }: FacaAgoraWidgetProps) {
  const [completedActions, setCompletedActions] = useState<Set<string | number>>(new Set())

  // Analisa leads e pega top 3 ações urgentes
  const topActions = leads
    .filter((lead) => !completedActions.has(lead.id))
    .map((lead) => ({
      lead,
      action: getNextBestAction(lead),
      score: calculateLeadScore(lead),
    }))
    .filter((item) => 
      item.action.prioridade === "critica" || 
      item.action.prioridade === "alta"
    )
    .sort((a, b) => {
      const prioOrder = { critica: 0, alta: 1, media: 2, baixa: 3 }
      const prioA = prioOrder[a.action.prioridade]
      const prioB = prioOrder[b.action.prioridade]
      
      if (prioA !== prioB) return prioA - prioB
      return b.score.score - a.score.score
    })
    .slice(0, 3)

  const handleComplete = (leadId: string | number) => {
    setCompletedActions(prev => new Set(prev).add(leadId))
    onActionComplete?.(leadId)
  }

  if (topActions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Parabéns! 🎉</h3>
        </div>
        <p className="text-emerald-50">
          Todas as ações críticas foram concluídas. Continue focado em resultados!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-red-600 via-orange-600 to-amber-500 rounded-2xl p-6 text-white shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight">FAÇA AGORA</h3>
            <p className="text-sm text-white/90 font-medium">
              {topActions.length} ação{topActions.length > 1 ? "ões" : ""} urgente{topActions.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black">{topActions.length}</div>
          <div className="text-xs text-white/80">pendentes</div>
        </div>
      </div>

      <div className="space-y-3">
        {topActions.map((item, index) => (
          <ActionItem
            key={item.lead.id}
            lead={item.lead}
            action={item.action}
            rank={index + 1}
            onComplete={() => handleComplete(item.lead.id)}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-xs text-white/90 font-bold text-center">
          ⚡ VELOCIDADE VENDE. DEMORA PERDE. ⚡
        </p>
      </div>
    </div>
  )
}

/**
 * Item individual de ação urgente
 */
function ActionItem({
  lead,
  action,
  rank,
  onComplete,
}: {
  lead: Lead
  action: ReturnType<typeof getNextBestAction>
  rank: number
  onComplete: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getPriorityBadge = () => {
    if (action.prioridade === "critica") {
      return (
        <span className="bg-red-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
          CRÍTICO
        </span>
      )
    }
    return (
      <span className="bg-orange-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
        URGENTE
      </span>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="bg-white text-red-600 text-sm font-black w-6 h-6 rounded-full flex items-center justify-center">
            {rank}
          </span>
          {getPriorityBadge()}
        </div>
        <div className="flex items-center gap-1 text-xs font-bold">
          <Clock className="w-3 h-3" />
          {action.prazoHoras}h
        </div>
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <h4 className="font-bold text-white mb-1 line-clamp-1">
          {action.icone} {lead.nome}
        </h4>
        <p className="text-sm font-semibold text-white/90 mb-2 line-clamp-1">
          {action.titulo}
        </p>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/80">
            {action.descricao}
          </p>
          
          {action.roteiro && (
            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
              <p className="text-xs font-bold text-white/90 mb-1">💬 Roteiro:</p>
              <p className="text-xs text-white/80 italic">"{action.roteiro}"</p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={onComplete}
              className="flex-1 bg-white text-red-600 font-bold py-2 px-4 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Feito
            </button>
            <button className="flex-1 bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
              <ChevronRight className="w-4 h-4" />
              Ir ao Lead
            </button>
          </div>
        </div>
      )}

      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-white/70 hover:text-white flex items-center gap-1 mt-2"
        >
          Ver detalhes <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
