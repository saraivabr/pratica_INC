/**
 * @fileoverview Métricas Acionáveis para Dashboard
 * @description Métricas transformadas em comandos de ação,
 * não apenas números informativos.
 */

"use client"

import { 
  Phone, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Target,
  Flame,
  Snowflake,
  CheckCircle2
} from "lucide-react"
import type { Lead } from "@/types/lead"
import { calculateLeadScore } from "@/lib/lead-scoring"
import { getNextBestAction } from "@/lib/next-best-action"

interface ActionableDashboardMetricsProps {
  leads: Lead[]
  onMetricClick?: (metricType: string, leads: Lead[]) => void
}

/**
 * Dashboard com métricas acionáveis
 */
export function ActionableDashboardMetrics({ 
  leads, 
  onMetricClick 
}: ActionableDashboardMetricsProps) {
  // Análise dos leads
  const analyzed = leads.map((lead) => ({
    lead,
    score: calculateLeadScore(lead),
    action: getNextBestAction(lead),
  }))

  // Métricas acionáveis
  const metrics = {
    leadsQuentes: analyzed.filter(a => a.score.temperatura === "quente"),
    acoesCriticas: analyzed.filter(a => a.action.prioridade === "critica"),
    semContatoHoje: analyzed.filter(a => {
      const interacoes = a.lead.interacoes || a.lead.interacao || []
      if (interacoes.length === 0) return true
      
      const sortedInteracoes = [...interacoes].sort((x, y) => {
        const dateX = new Date(x.data || x.data_cad).getTime()
        const dateY = new Date(y.data || y.data_cad).getTime()
        return dateY - dateX
      })

      if (sortedInteracoes.length === 0) return true

      const ultima = sortedInteracoes[0]
      
      const dias = Math.floor(
        (new Date().getTime() - new Date(ultima.data || ultima.data_cad).getTime()) 
        / (1000 * 60 * 60 * 24)
      )
      return dias >= 1
    }),
    emNegociacao: analyzed.filter(a => {
      const situacao = a.lead.situacao?.toLowerCase() || ""
      return situacao.includes("proposta") || situacao.includes("negociacao")
    }),
    leadsFrios: analyzed.filter(a => a.score.temperatura === "frio" || a.score.temperatura === "congelado"),
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Métrica 1: AÇÕES CRÍTICAS */}
      <MetricCard
        icon={<AlertTriangle className="w-6 h-6" />}
        title="AÇÕES CRÍTICAS"
        value={metrics.acoesCriticas.length}
        subtitle={metrics.acoesCriticas.length > 0 
          ? `${metrics.acoesCriticas.length} lead${metrics.acoesCriticas.length > 1 ? "s" : ""} precisa${metrics.acoesCriticas.length > 1 ? "m" : ""} de AÇÃO AGORA`
          : "Nenhuma ação crítica pendente"
        }
        actionText={metrics.acoesCriticas.length > 0 ? "AGIR AGORA" : "Tudo OK"}
        color="red"
        urgency="critical"
        onClick={() => onMetricClick?.("acoesCriticas", metrics.acoesCriticas.map(a => a.lead))}
      />

      {/* Métrica 2: LEADS QUENTES */}
      <MetricCard
        icon={<Flame className="w-6 h-6" />}
        title="LEADS QUENTES"
        value={metrics.leadsQuentes.length}
        subtitle={metrics.leadsQuentes.length > 0
          ? `${metrics.leadsQuentes.length} lead${metrics.leadsQuentes.length > 1 ? "s" : ""} com alto potencial`
          : "Nenhum lead quente no momento"
        }
        actionText="VER LEADS"
        color="orange"
        onClick={() => onMetricClick?.("leadsQuentes", metrics.leadsQuentes.map(a => a.lead))}
      />

      {/* Métrica 3: EM NEGOCIAÇÃO */}
      <MetricCard
        icon={<Target className="w-6 h-6" />}
        title="EM NEGOCIAÇÃO"
        value={metrics.emNegociacao.length}
        subtitle={metrics.emNegociacao.length > 0
          ? `${metrics.emNegociacao.length} venda${metrics.emNegociacao.length > 1 ? "s" : ""} para fechar`
          : "Nenhuma negociação ativa"
        }
        actionText="FECHAR VENDAS"
        color="purple"
        urgency="high"
        onClick={() => onMetricClick?.("emNegociacao", metrics.emNegociacao.map(a => a.lead))}
      />

      {/* Métrica 4: SEM CONTATO HOJE */}
      <MetricCard
        icon={<Clock className="w-6 h-6" />}
        title="SEM CONTATO HOJE"
        value={metrics.semContatoHoje.length}
        subtitle={metrics.semContatoHoje.length > 0
          ? `${metrics.semContatoHoje.length} lead${metrics.semContatoHoje.length > 1 ? "s" : ""} aguardando contato`
          : "Todos os leads contatados"
        }
        actionText="LIGAR AGORA"
        color="amber"
        urgency={metrics.semContatoHoje.length > 5 ? "high" : "medium"}
        onClick={() => onMetricClick?.("semContatoHoje", metrics.semContatoHoje.map(a => a.lead))}
      />

      {/* Métrica 5: LEADS FRIOS */}
      <MetricCard
        icon={<Snowflake className="w-6 h-6" />}
        title="LEADS FRIOS"
        value={metrics.leadsFrios.length}
        subtitle={metrics.leadsFrios.length > 0
          ? `${metrics.leadsFrios.length} lead${metrics.leadsFrios.length > 1 ? "s" : ""} para recuperar`
          : "Nenhum lead frio"
        }
        actionText="RECUPERAR"
        color="blue"
        onClick={() => onMetricClick?.("leadsFrios", metrics.leadsFrios.map(a => a.lead))}
      />

      {/* Métrica 6: SCORE MÉDIO */}
      <MetricCard
        icon={<TrendingUp className="w-6 h-6" />}
        title="SCORE MÉDIO"
        value={analyzed.length > 0 
          ? Math.round(analyzed.reduce((sum, a) => sum + a.score.score, 0) / analyzed.length) 
          : 0
        }
        subtitle={analyzed.length > 0 
          ? `de ${analyzed.length} lead${analyzed.length !== 1 ? "s" : ""} total`
          : "Nenhum lead para analisar"
        }
        actionText="VER RANKING"
        color="emerald"
        showPercentage
        onClick={() => onMetricClick?.("ranking", leads)}
      />
    </div>
  )
}

/**
 * Card de métrica individual
 */
interface MetricCardProps {
  icon: React.ReactNode
  title: string
  value: number
  subtitle: string
  actionText: string
  color: "red" | "orange" | "amber" | "purple" | "blue" | "emerald"
  urgency?: "critical" | "high" | "medium" | "low"
  showPercentage?: boolean
  onClick?: () => void
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  actionText,
  color,
  urgency,
  showPercentage,
  onClick,
}: MetricCardProps) {
  const getColorStyles = () => {
    const styles = {
      red: {
        bg: "from-red-500 to-rose-600",
        glow: "shadow-red-500/30",
        iconBg: "bg-red-600/20",
        button: "bg-white/20 hover:bg-white/30",
      },
      orange: {
        bg: "from-orange-500 to-amber-600",
        glow: "shadow-orange-500/30",
        iconBg: "bg-orange-600/20",
        button: "bg-white/20 hover:bg-white/30",
      },
      amber: {
        bg: "from-amber-500 to-yellow-600",
        glow: "shadow-amber-500/30",
        iconBg: "bg-amber-600/20",
        button: "bg-white/20 hover:bg-white/30",
      },
      purple: {
        bg: "from-purple-500 to-violet-600",
        glow: "shadow-purple-500/30",
        iconBg: "bg-purple-600/20",
        button: "bg-white/20 hover:bg-white/30",
      },
      blue: {
        bg: "from-blue-500 to-cyan-600",
        glow: "shadow-blue-500/30",
        iconBg: "bg-blue-600/20",
        button: "bg-white/20 hover:bg-white/30",
      },
      emerald: {
        bg: "from-emerald-500 to-green-600",
        glow: "shadow-emerald-500/30",
        iconBg: "bg-emerald-600/20",
        button: "bg-white/20 hover:bg-white/30",
      },
    }
    return styles[color]
  }

  const styles = getColorStyles()
  const shouldAnimate = urgency === "critical" || (urgency === "high" && value > 0)

  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${styles.bg} rounded-2xl p-6 text-white shadow-lg ${styles.glow} hover:scale-[1.02] transition-all text-left ${shouldAnimate ? "animate-pulse" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`${styles.iconBg} backdrop-blur-sm rounded-full p-3`}>
          {icon}
        </div>
        {urgency === "critical" && (
          <span className="bg-red-900 text-white text-xs font-black px-2 py-1 rounded-full uppercase">
            CRÍTICO
          </span>
        )}
        {urgency === "high" && value > 0 && (
          <span className="bg-orange-900 text-white text-xs font-black px-2 py-1 rounded-full uppercase">
            URGENTE
          </span>
        )}
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-bold text-white/90 mb-2 uppercase tracking-wide">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black">
            {value}
          </span>
          {showPercentage && (
            <span className="text-2xl font-bold">/100</span>
          )}
        </div>
        <p className="text-sm text-white/80 mt-2">
          {subtitle}
        </p>
      </div>

      <div className={`${styles.button} backdrop-blur-sm font-bold py-2 px-4 rounded-lg transition-colors text-center`}>
        {actionText}
      </div>
    </button>
  )
}
