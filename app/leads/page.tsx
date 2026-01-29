"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Clock4,
  Filter,
  Loader2,
  PhoneCall,
  RefreshCcw,
  Sparkles,
  Workflow,
  User,
  Building2,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  XCircle,
  Flame,
  Thermometer,
  Snowflake,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AnimatedBackground } from "@/components/animated-background"
import { LeadScoreBadge } from "@/components/lead"
import { calculateLeadScore } from "@/utils/leadScore"
import type { Lead as LeadType } from "@/types/lead"
import type { LeadScore, LeadTemperature } from "@/types/leadScore"

interface Lead {
  id: string
  nome: string
  telefone: string
  origem?: string
  situacao?: string
  empreendimento?: { id?: number; nome?: string } | null
  interacoes?: Array<{ descricao?: string; data_cad?: string; tipo?: string }>
  data_cad?: string
  corretor?: string | { nome?: string } | null
}

type LeadStatus = "ativo" | "irregular" | "perdido"

// Extended lead with score
interface LeadWithScore extends Lead {
  status: LeadStatus
  lastInteraction?: { descricao?: string }
  daysSince?: number | null
  leadScore?: LeadScore
}

// Glow button component with animated gradient
function GlowButton({
  children,
  onClick,
  disabled,
  className,
  variant = "primary",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "primary" | "secondary" | "amber" | "red"
}) {
  const gradients = {
    primary: "from-emerald-500 via-green-500 to-teal-500",
    secondary: "from-gray-400 via-gray-500 to-gray-600",
    amber: "from-amber-500 via-orange-500 to-yellow-500",
    red: "from-red-500 via-rose-500 to-pink-500",
  }

  const bgGradients = {
    primary: "from-emerald-500 via-green-500 to-emerald-600",
    secondary: "from-gray-500 via-gray-600 to-gray-700",
    amber: "from-amber-500 via-orange-500 to-amber-600",
    red: "from-red-500 via-rose-500 to-red-600",
  }

  const shadowColors = {
    primary: "hover:shadow-emerald-500/25",
    secondary: "hover:shadow-gray-500/25",
    amber: "hover:shadow-amber-500/25",
    red: "hover:shadow-red-500/25",
  }

  return (
    <div className="relative group">
      {/* Outer glow */}
      <div
        className={cn(
          "absolute -inset-1 bg-gradient-to-r rounded-xl blur-lg opacity-40 transition-all duration-500",
          gradients[variant],
          disabled ? "opacity-10" : "group-hover:opacity-70 group-hover:blur-xl"
        )}
      />

      {/* Inner glow ring */}
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-lg opacity-0 transition-opacity duration-300",
          gradients[variant],
          !disabled && "group-hover:opacity-60"
        )}
      />

      {/* Button */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative w-full h-10 px-4 rounded-lg font-medium text-sm",
          "bg-gradient-to-r",
          bgGradients[variant],
          "text-white shadow-lg",
          "transform transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          !disabled && `hover:scale-[1.02] hover:shadow-xl ${shadowColors[variant]} active:scale-[0.98]`,
          className
        )}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>

        {/* Shine effect */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent",
              !disabled && "group-hover:animate-shine"
            )}
          />
        </div>
      </button>
    </div>
  )
}

// Glassmorphism stat card
function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  delay = 0,
}: {
  label: string
  value: number
  icon: React.ElementType
  gradient: string
  delay?: number
}) {
  return (
    <div
      className="relative group animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glow effect on hover */}
      <div
        className={cn(
          "absolute -inset-1 bg-gradient-to-r rounded-2xl blur-xl opacity-0 transition-all duration-500 group-hover:opacity-40",
          gradient
        )}
      />

      <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "relative h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
              "bg-gradient-to-br",
              gradient
            )}
          >
            {/* Icon glow */}
            <div
              className={cn(
                "absolute inset-0 rounded-xl blur-md opacity-50",
                "bg-gradient-to-br",
                gradient
              )}
            />
            <Icon className="relative h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {value}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lead card with glassmorphism
function LeadCard({
  lead,
  status,
  statusMeta,
  actionStatus,
  onSimulate,
  onSend,
  delay = 0,
}: {
  lead: LeadWithScore
  status: LeadStatus
  statusMeta: { title: string; desc: string; gradient: string; textColor: string; bgColor: string }
  actionStatus?: string
  onSimulate: () => void
  onSend: () => void
  delay?: number
}) {
  return (
    <div
      className="relative group animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Card glow on hover */}
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl blur-xl opacity-0 transition-all duration-500 group-hover:opacity-30",
          "bg-gradient-to-r",
          statusMeta.gradient
        )}
      />

      <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Animated top border */}
        <div
          className={cn(
            "absolute top-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-r opacity-60",
            statusMeta.gradient
          )}
        />

        <div className="space-y-3 pt-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br shadow-md",
                  statusMeta.gradient
                )}
              >
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                  {lead.nome}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lead.telefone}
                </p>
              </div>
            </div>
            {/* Show lead score badge if available */}
            {lead.leadScore ? (
              <LeadScoreBadge
                temperature={lead.leadScore.temperature}
                score={lead.leadScore.score}
                showScore={true}
                size="sm"
                variant="default"
                showTooltip={true}
              />
            ) : (
              <span
                className={cn(
                  "text-[11px] px-3 py-1 rounded-full font-medium",
                  statusMeta.bgColor,
                  statusMeta.textColor
                )}
              >
                {lead.situacao || statusMeta.title}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {lead.empreendimento?.nome && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                <span className="truncate">Interesse: {lead.empreendimento.nome}</span>
              </div>
            )}
            {lead.lastInteraction?.descricao && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{lead.lastInteraction.descricao}</span>
              </div>
            )}
            {lead.daysSince !== null && lead.daysSince !== undefined && (
              <div className="flex items-center gap-2">
                <Clock4
                  className={cn(
                    "h-4 w-4",
                    lead.daysSince > 7 ? "text-amber-500" : "text-gray-400"
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    lead.daysSince > 7 ? "text-amber-600 dark:text-amber-400 font-medium" : ""
                  )}
                >
                  Sem interacao ha {lead.daysSince} dia(s)
                </span>
              </div>
            )}
            {/* Show action message if score available */}
            {lead.leadScore && (
              <div className="flex items-start gap-2 pt-1">
                <TrendingUp className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                <span className="text-xs text-purple-600 dark:text-purple-400 line-clamp-2">
                  {lead.leadScore.actionMessage}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <GlowButton variant="secondary" onClick={onSimulate}>
              {actionStatus?.includes("Simulando") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Simular
                </>
              )}
            </GlowButton>
            <GlowButton variant="primary" onClick={onSend}>
              {actionStatus?.includes("Enviando") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Enviar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </GlowButton>
          </div>

          {/* Action status feedback */}
          {actionStatus && !actionStatus.includes("...") && (
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-xs",
                actionStatus.includes("Enviado")
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                  : actionStatus.includes("Erro") || actionStatus.includes("Falha")
                  ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
              )}
            >
              {actionStatus.includes("Enviado") ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : actionStatus.includes("Erro") || actionStatus.includes("Falha") ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {actionStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Status column header
function StatusColumnHeader({
  title,
  description,
  count,
  gradient,
  icon: Icon,
}: {
  title: string
  description: string
  count: number
  gradient: string
  icon: React.ElementType
}) {
  return (
    <div className="relative mb-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br shadow-md",
            gradient
          )}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md",
            "bg-gradient-to-br",
            gradient
          )}
        >
          {count}
        </div>
      </div>
      <div
        className={cn(
          "h-1 rounded-full bg-gradient-to-r opacity-60",
          gradient
        )}
      />
    </div>
  )
}

export default function LeadsPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("leads")

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: "",
    situacao: "all",
    origem: "all",
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: "200",
          ...(filters.search && { search: filters.search }),
          ...(filters.situacao !== "all" && { situacao: filters.situacao }),
        })
        const res = await fetch(`/api/leads?${params}`)
        const data = await res.json()
        let fetchedLeads = data.data || []

        // Filtro de origem no frontend (se API não suportar)
        if (filters.origem !== "all") {
          fetchedLeads = fetchedLeads.filter((lead: Lead) => 
            (lead.origem || "").toLowerCase().includes(filters.origem.toLowerCase())
          )
        }

        setLeads(fetchedLeads)
      } catch (error) {
        console.error("Erro ao buscar leads:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [filters])

  const leadsWithStatus = useMemo(() => {
    const now = Date.now()
    return leads.map((lead) => {
      const lastInteraction = lead.interacoes?.[lead.interacoes.length - 1]
      const lastDate = lastInteraction?.data_cad ? Date.parse(lastInteraction.data_cad) : 0
      const daysSince = lastDate ? Math.round((now - lastDate) / (1000 * 60 * 60 * 24)) : null

      let status: LeadStatus = "ativo"
      const situacaoLower = (lead.situacao || "").toLowerCase()
      if (situacaoLower.includes("perd")) {
        status = "perdido"
      } else if (daysSince !== null && daysSince > 7) {
        status = "irregular"
      }

      // Calculate lead score
      const leadScore = calculateLeadScore({
        lead: lead as LeadType,
      })

      return { ...lead, status, lastInteraction, daysSince, leadScore }
    })
  }, [leads])

  const grouped = useMemo(() => {
    const buckets: Record<LeadStatus, typeof leadsWithStatus> = {
      ativo: [],
      irregular: [],
      perdido: [],
    }
    leadsWithStatus.forEach((lead) => {
      buckets[lead.status].push(lead)
    })
    
    // Sort each bucket by lead score priority (higher priority first)
    Object.keys(buckets).forEach((key) => {
      const statusKey = key as LeadStatus
      buckets[statusKey].sort((a, b) => {
        const priorityA = a.leadScore?.priority ?? 0
        const priorityB = b.leadScore?.priority ?? 0
        const scoreA = a.leadScore?.score ?? 0
        const scoreB = b.leadScore?.score ?? 0
        
        // Sort by priority first, then by score
        if (priorityB !== priorityA) {
          return priorityB - priorityA
        }
        return scoreB - scoreA
      })
    })
    
    return buckets
  }, [leadsWithStatus])

  const handleAction = async (lead: any, dryRun: boolean) => {
    if (!user?.id) {
      setActionStatus((prev) => ({ ...prev, [lead.id]: "Faca login" }))
      return
    }
    setActionStatus((prev) => ({ ...prev, [lead.id]: dryRun ? "Simulando..." : "Enviando..." }))
    try {
      const url = `/api/lead-recovery?userId=${user.id}&limit=1&leadId=${lead.id}${
        dryRun ? "&dryRun=true" : ""
      }`
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()
      const result = data.runs?.[0]?.results?.[0]
      if (!res.ok || !result) {
        throw new Error(data.error || "Falha na acao")
      }
      setActionStatus((prev) => ({
        ...prev,
        [lead.id]: dryRun
          ? "Simulacao pronta (sem envio)"
          : result.status === "sent"
          ? "Enviado"
          : result.reason || "Processado",
      }))
    } catch (error) {
      setActionStatus((prev) => ({
        ...prev,
        [lead.id]: error instanceof Error ? error.message : "Erro",
      }))
    }
  }

  const statusMeta: Record<
    LeadStatus,
    {
      title: string
      desc: string
      gradient: string
      textColor: string
      bgColor: string
      icon: React.ElementType
    }
  > = {
    ativo: {
      title: "Em andamento",
      desc: "Leads ativos ou recentes",
      gradient: "from-emerald-500 via-green-500 to-teal-500",
      textColor: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      icon: TrendingUp,
    },
    irregular: {
      title: "Irregulares",
      desc: "Sem interacao ha +7 dias",
      gradient: "from-amber-500 via-orange-500 to-yellow-500",
      textColor: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      icon: Clock4,
    },
    perdido: {
      title: "Perdidos",
      desc: "Marcados como perdidos",
      gradient: "from-red-500 via-rose-500 to-pink-500",
      textColor: "text-red-700 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      icon: XCircle,
    },
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: "200",
        ...(filters.search && { search: filters.search }),
        ...(filters.situacao !== "all" && { situacao: filters.situacao }),
      })
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      let fetchedLeads = data.data || []

      // Filtro de origem no frontend
      if (filters.origem !== "all") {
        fetchedLeads = fetchedLeads.filter((lead: Lead) => 
          (lead.origem || "").toLowerCase().includes(filters.origem.toLowerCase())
        )
      }

      setLeads(fetchedLeads)
    } catch (error) {
      console.error("Erro ao buscar leads:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Gestao de Leads">
      <div className="relative min-h-full">
        {/* Animated Background */}
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            {/* Card glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 rounded-[2rem] blur-xl opacity-20" />

            <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-white/60 dark:border-zinc-700/60 overflow-hidden">
              {/* Animated top border */}
              <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 animate-gradient" />

              <div className="p-6 space-y-6">
                {/* Header with badge */}
                <div className="flex items-center gap-3 animate-fadeInDown">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl blur-lg opacity-50" />
                    <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Workflow className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Painel de Leads
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-medium shadow-md">
                        <Sparkles className="h-3 w-3" />
                        Recuperacao IA
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Acoes rapidas e simulacao de recuperacao de leads
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total"
                    value={leadsWithStatus.length}
                    icon={Workflow}
                    gradient="from-blue-500 to-indigo-500"
                    delay={100}
                  />
                  <StatCard
                    label="Ativos"
                    value={grouped.ativo.length}
                    icon={CheckCircle2}
                    gradient="from-emerald-500 to-green-500"
                    delay={200}
                  />
                  <StatCard
                    label="Irregulares"
                    value={grouped.irregular.length}
                    icon={Clock4}
                    gradient="from-amber-500 to-orange-500"
                    delay={300}
                  />
                  <StatCard
                    label="Perdidos"
                    value={grouped.perdido.length}
                    icon={PhoneCall}
                    gradient="from-red-500 to-rose-500"
                    delay={400}
                  />
                </div>

                {/* Action buttons */}
                <div className="space-y-3 animate-fadeInUp" style={{ animationDelay: "500ms" }}>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4" />
                      {showFilters ? "Ocultar Filtros" : "Filtrar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                      Atualizar dados
                    </Button>
                  </div>

                  {/* Filters Panel */}
                  {showFilters && (
                    <div className="grid md:grid-cols-3 gap-3 p-4 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-zinc-700">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Buscar
                        </label>
                        <input
                          type="text"
                          placeholder="Nome, email ou telefone"
                          value={filters.search}
                          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Situação
                        </label>
                        <select
                          value={filters.situacao}
                          onChange={(e) => setFilters({ ...filters, situacao: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                        >
                          <option value="all">Todas</option>
                          <option value="1">Novo Lead</option>
                          <option value="2">Contato Realizado</option>
                          <option value="3">Em Negociação</option>
                          <option value="4">Proposta Enviada</option>
                          <option value="5">Ganho</option>
                          <option value="6">Perdido</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Origem
                        </label>
                        <select
                          value={filters.origem}
                          onChange={(e) => setFilters({ ...filters, origem: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                        >
                          <option value="all">Todas</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                          <option value="site">Site</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Leads Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fadeInUp">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Carregando leads...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {(Object.keys(grouped) as LeadStatus[]).map((status, columnIndex) => (
                <div
                  key={status}
                  className="space-y-4 animate-fadeInUp"
                  style={{ animationDelay: `${columnIndex * 100 + 600}ms` }}
                >
                  {/* Column Header */}
                  <StatusColumnHeader
                    title={statusMeta[status].title}
                    description={statusMeta[status].desc}
                    count={grouped[status].length}
                    gradient={statusMeta[status].gradient}
                    icon={statusMeta[status].icon}
                  />

                  {/* Column Content */}
                  <div className="relative">
                    {/* Subtle vertical glow */}
                    <div
                      className={cn(
                        "absolute -inset-x-2 inset-y-0 rounded-3xl opacity-10 blur-2xl pointer-events-none",
                        "bg-gradient-to-b",
                        statusMeta[status].gradient
                      )}
                    />

                    <div className="relative space-y-4">
                      {grouped[status].length === 0 ? (
                        <div className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-8 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                            <div
                              className={cn(
                                "h-12 w-12 rounded-full flex items-center justify-center opacity-50",
                                "bg-gradient-to-br",
                                statusMeta[status].gradient
                              )}
                            >
                              {status === "ativo" && <CheckCircle2 className="h-6 w-6 text-white" />}
                              {status === "irregular" && <Clock4 className="h-6 w-6 text-white" />}
                              {status === "perdido" && <XCircle className="h-6 w-6 text-white" />}
                            </div>
                            <p className="text-sm font-medium">Nenhum lead aqui</p>
                          </div>
                        </div>
                      ) : (
                        grouped[status].map((lead, index) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            status={status}
                            statusMeta={statusMeta[status]}
                            actionStatus={actionStatus[lead.id]}
                            onSimulate={() => handleAction(lead, true)}
                            onSend={() => handleAction(lead, false)}
                            delay={index * 50}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
