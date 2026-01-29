"use client"

import { Phone, MessageSquare, AlertTriangle, TrendingUp, Clock, Building2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Lead, UrgencyScore } from "@/lib/urgency-calculator"

// CSS constants
const RANK_BADGE_CLIP_PATH = "polygon(0 0, 100% 0, 0 100%)"

interface UrgentLeadCardProps {
  lead: Lead
  urgency: UrgencyScore
  rank: number
  onContact?: (lead: Lead, method: "phone" | "whatsapp") => void
}

export function UrgentLeadCard({ lead, urgency, rank, onContact }: UrgentLeadCardProps) {
  const priorityColors = {
    critical: {
      bg: "from-red-500 to-rose-600",
      border: "border-red-200 dark:border-red-900",
      text: "text-red-700 dark:text-red-300",
      glow: "from-red-400 via-rose-400 to-pink-400",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
    high: {
      bg: "from-orange-500 to-amber-600",
      border: "border-orange-200 dark:border-orange-900",
      text: "text-orange-700 dark:text-orange-300",
      glow: "from-orange-400 via-amber-400 to-yellow-400",
      badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    },
    medium: {
      bg: "from-blue-500 to-cyan-600",
      border: "border-blue-200 dark:border-blue-900",
      text: "text-blue-700 dark:text-blue-300",
      glow: "from-blue-400 via-cyan-400 to-sky-400",
      badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    },
    low: {
      bg: "from-gray-500 to-slate-600",
      border: "border-gray-200 dark:border-gray-900",
      text: "text-gray-700 dark:text-gray-300",
      glow: "from-gray-400 via-slate-400 to-zinc-400",
      badge: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400",
    },
  }

  const colors = priorityColors[urgency.priority]

  return (
    <div className="relative group">
      {/* Outer glow */}
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-xl blur opacity-30 group-hover:opacity-50 transition-all duration-300",
          colors.glow
        )}
      />
      
      {/* Card */}
      <div
        className={cn(
          "relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl border-2 overflow-hidden",
          colors.border
        )}
      >
        {/* Rank Badge */}
        <div className="absolute top-0 left-0 h-8 w-8">
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br flex items-center justify-center",
              colors.bg
            )}
            style={{
              clipPath: RANK_BADGE_CLIP_PATH,
            }}
          >
            <span className="absolute top-1 left-1 text-xs font-bold text-white">
              {rank}
            </span>
          </div>
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0 pl-6">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate text-lg">
                {lead.nome}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{lead.telefone}</span>
              </div>
            </div>
            
            {/* Priority Badge */}
            <div className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", colors.badge)}>
              {urgency.priority === "critical" ? "URGENTE" : 
               urgency.priority === "high" ? "ALTA" :
               urgency.priority === "medium" ? "MÉDIA" : "BAIXA"}
            </div>
          </div>

          {/* Empreendimento */}
          {lead.empreendimento?.nome && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3 pl-6">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{lead.empreendimento.nome}</span>
            </div>
          )}

          {/* Urgency Reasons */}
          <div className="space-y-1.5 mb-4 pl-6">
            {urgency.reasons.slice(0, 2).map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <AlertTriangle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.text)} />
                <span className={cn("font-medium", colors.text)}>{reason}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 pl-6 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{urgency.daysInactive}d inativo</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Score: {urgency.score}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className={cn(
                "flex-1 bg-gradient-to-r text-white font-medium hover:shadow-lg transition-all",
                colors.bg
              )}
              onClick={() => onContact?.(lead, "whatsapp")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onContact?.(lead, "phone")}
            >
              <Phone className="h-4 w-4 mr-2" />
              Ligar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
