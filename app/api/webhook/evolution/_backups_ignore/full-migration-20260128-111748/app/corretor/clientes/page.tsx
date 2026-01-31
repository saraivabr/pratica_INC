"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock4,
  Mail,
  MessageSquare,
  Phone,
  RefreshCcw,
  Search,
  Sparkles,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { AnimatedBackground } from "@/components/animated-background"
import { LeadDetailModal } from "@/components/lead/LeadDetailModal"
import {
  cleanPhone,
  formatPhone,
  formatPhoneForWhatsApp,
} from "@/utils/leadUtils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Lead {
  id: string
  nome: string
  telefone: string
  email?: string
  origem?: string
  situacao?: string
  empreendimento?: { id?: number; nome?: string } | null
  interacoes?: Array<{ descricao?: string; data_cad?: string }>
}

type LeadStatus = "ativo" | "irregular" | "fechado" | "perdido"
type ActionFilter = "nenhum" | "followup" | "sem-interacao" | "quentes"
type SortOption = "prioridade" | "recentes" | "parados" | "nome"

const LEAD_PRIORITY_RANK: Record<LeadStatus, number> = {
  irregular: 0,
  ativo: 1,
  fechado: 2,
  perdido: 3,
}

// Glow Card component
function GlowCard({
  children,
  className,
  glowColor = "emerald",
}: {
  children: React.ReactNode
  className?: string
  glowColor?: "emerald" | "amber" | "red" | "blue" | "purple"
}) {
  const glowColors = {
    emerald: "from-emerald-400 via-green-400 to-teal-400",
    amber: "from-amber-400 via-orange-400 to-yellow-400",
    red: "from-red-400 via-rose-400 to-pink-400",
    blue: "from-blue-400 via-cyan-400 to-sky-400",
    purple: "from-purple-400 via-violet-400 to-indigo-400",
  }

  return (
    <div className="relative group">
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500",
          glowColors[glowColor]
        )}
      />
      <div
        className={cn(
          "relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

// Lead Card component
function LeadCard({
  lead,
  status,
  statusMeta,
  onOpenDetails,
  delay = 0,
}: {
  lead: Lead & { status: LeadStatus; lastInteraction?: { descricao?: string }; daysSince?: number | null }
  status: LeadStatus
  statusMeta: { title: string; gradient: string; textColor: string; bgColor: string }
  onOpenDetails: (lead: Lead) => void
  delay?: number
}) {
  const telefone = lead.telefone
  const telefoneLimpo = cleanPhone(telefone)
  const whatsappPhone =
    telefoneLimpo.startsWith("55") && telefoneLimpo.length > 11
      ? telefoneLimpo
      : formatPhoneForWhatsApp(telefone)
  const hasPhone = Boolean(telefoneLimpo)
  const hasEmail = Boolean(lead.email)

  return (
    <div className="animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
      <GlowCard glowColor={status === "ativo" ? "emerald" : status === "irregular" ? "amber" : status === "fechado" ? "blue" : "red"}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md text-white",
                statusMeta.gradient
              )}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                  {lead.nome}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatPhone(lead.telefone)}</p>
              </div>
            </div>
            <span className={cn(
              "text-[11px] px-3 py-1 rounded-full font-medium",
              statusMeta.bgColor,
              statusMeta.textColor
            )}>
              {lead.situacao || statusMeta.title}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
            {lead.empreendimento?.nome && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                <span className="truncate">{lead.empreendimento.nome}</span>
              </div>
            )}
            {lead.lastInteraction?.descricao && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span className="line-clamp-2 text-xs">{lead.lastInteraction.descricao}</span>
              </div>
            )}
            {lead.daysSince !== null && lead.daysSince !== undefined && (
              <div className="flex items-center gap-2">
                <Clock4 className={cn("h-4 w-4", lead.daysSince > 7 ? "text-amber-500" : "text-gray-400")} />
                <span className={cn("text-xs", lead.daysSince > 7 && "text-amber-600 dark:text-amber-400 font-medium")}>
                  {lead.daysSince === 0 ? "Interação hoje" : `Há ${lead.daysSince} dia${lead.daysSince > 1 ? "s" : ""}`}
                </span>
              </div>
            )}
          </div>

          {(lead.email || lead.origem) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {lead.email && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200/70 dark:border-zinc-700/70 px-2.5 py-1 text-[11px] text-gray-600 dark:text-gray-300">
                  <Mail className="h-3 w-3 text-blue-500" />
                  <span className="max-w-[180px] truncate">{lead.email}</span>
                </span>
              )}
              {lead.origem && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200/70 dark:border-zinc-700/70 px-2.5 py-1 text-[11px] text-gray-600 dark:text-gray-300">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  {lead.origem}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
            {hasPhone ? (
              <Button asChild variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                <a href={`tel:+55${telefoneLimpo}`} aria-label={`Ligar para ${formatPhone(telefone)}`}>
                  <Phone className="h-3.5 w-3.5" />
                  Ligar
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" disabled>
                <Phone className="h-3.5 w-3.5" />
                Ligar
              </Button>
            )}
            {hasPhone ? (
              <Button asChild size="sm" className="h-9 text-xs gap-1.5 bg-green-500 hover:bg-green-600">
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir WhatsApp para ${lead.nome}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </Button>
            ) : (
              <Button size="sm" className="h-9 text-xs gap-1.5 bg-green-500/70" disabled>
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5" onClick={() => onOpenDetails(lead)}>
              Detalhes
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {hasEmail && (
            <div className="mt-2">
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                <a href={`mailto:${lead.email}`} aria-label={`Enviar email para ${lead.email}`}>
                  <Mail className="h-3.5 w-3.5" />
                  Enviar email
                </a>
              </Button>
            </div>
          )}
        </div>
      </GlowCard>
    </div>
  )
}

// Stat Card component
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
    <div className="animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br", gradient)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Action focus card
function ActionCard({
  title,
  description,
  count,
  icon: Icon,
  gradient,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  count: number
  icon: React.ElementType
  gradient: string
  actionLabel: string
  onAction: () => void
}) {
  const isDisabled = count === 0

  return (
    <div className={cn("relative group animate-fadeInUp", isDisabled && "opacity-70")}>
      <div className={cn("absolute -inset-1 rounded-2xl blur-xl opacity-30 transition-all duration-500 group-hover:opacity-50", gradient)} />
      <div className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
          </div>
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-md", gradient)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{count}</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onAction}
            disabled={isDisabled}
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SpotlightCard({
  lead,
  statusMeta,
  onOpenDetails,
}: {
  lead: Lead & { status: LeadStatus; lastInteraction?: { descricao?: string }; daysSince?: number | null }
  statusMeta: { title: string; gradient: string; textColor: string; bgColor: string }
  onOpenDetails: (lead: Lead) => void
}) {
  const telefone = lead.telefone
  const telefoneLimpo = cleanPhone(telefone)
  const whatsappPhone =
    telefoneLimpo.startsWith("55") && telefoneLimpo.length > 11
      ? telefoneLimpo
      : formatPhoneForWhatsApp(telefone)
  const hasPhone = Boolean(telefoneLimpo)
  const hasEmail = Boolean(lead.email)
  const hasInteractions = Boolean(lead.interacoes && lead.interacoes.length > 0)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-zinc-700/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl">
      <div className="absolute -right-24 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-emerald-400/30 via-teal-400/10 to-transparent blur-2xl" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 opacity-70" />
      <div className="relative p-6 md:flex md:items-start md:justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Proximo contato
          </div>
          <div className="flex items-start gap-4">
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br", statusMeta.gradient)}>
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {lead.nome}
              </p>
              <p className="text-xs text-muted-foreground">{formatPhone(lead.telefone)}</p>
              {lead.empreendimento?.nome && (
                <p className="text-xs text-muted-foreground mt-1">
                  Interesse: <span className="font-medium text-gray-700 dark:text-gray-200">{lead.empreendimento.nome}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={cn("text-[11px] px-3 py-1 rounded-full font-medium", statusMeta.bgColor, statusMeta.textColor)}>
              {lead.situacao || statusMeta.title}
            </span>
            {!hasInteractions && (
              <Badge variant="outline" className="text-[11px]">
                Sem interacao
              </Badge>
            )}
            {lead.daysSince !== null && lead.daysSince !== undefined && (
              <Badge variant="outline" className="text-[11px]">
                {lead.daysSince === 0 ? "Interagiu hoje" : `Ha ${lead.daysSince} dia${lead.daysSince > 1 ? "s" : ""}`}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
            {lead.lastInteraction?.descricao
              ? `Ultima mensagem: ${lead.lastInteraction.descricao}`
              : "Sem interacao registrada. Essa e uma boa hora para iniciar o contato."}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
          {hasPhone ? (
            <Button asChild size="sm" className="h-10 gap-2 bg-green-500 hover:bg-green-600">
              <a
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Abrir WhatsApp para ${lead.nome}`}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button size="sm" className="h-10 gap-2 bg-green-500/70" disabled>
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
          )}
          {hasPhone ? (
            <Button asChild variant="outline" size="sm" className="h-10 gap-2">
              <a href={`tel:+55${telefoneLimpo}`} aria-label={`Ligar para ${formatPhone(telefone)}`}>
                <Phone className="h-4 w-4" />
                Ligar agora
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-10 gap-2" disabled>
              <Phone className="h-4 w-4" />
              Ligar agora
            </Button>
          )}
          {hasEmail && (
            <Button asChild variant="ghost" size="sm" className="h-10 gap-2">
              <a href={`mailto:${lead.email}`} aria-label={`Enviar email para ${lead.email}`}>
                <Mail className="h-4 w-4" />
                Enviar email
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-10 gap-2" onClick={() => onOpenDetails(lead)}>
            Ver detalhes
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CorretorClientesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-clientes")

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("todos")
  const [actionFilter, setActionFilter] = useState<ActionFilter>("nenhum")
  const [sortBy, setSortBy] = useState<SortOption>("prioridade")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/leads?limit=200")
        const data = await res.json()
        setLeads(data.data || [])
      } catch (error) {
        console.error("Erro ao buscar leads:", error)
      } finally {
        setLoading(false)
      }
    }
    if (isAuthenticated) {
      fetchLeads()
    }
  }, [isAuthenticated])

  // Process leads with status
  const leadsWithStatus = useMemo(() => {
    const now = Date.now()
    return leads.map((lead) => {
      const lastInteraction = lead.interacoes?.[lead.interacoes.length - 1]
      const lastDate = lastInteraction?.data_cad ? Date.parse(lastInteraction.data_cad) : 0
      const daysSince = lastDate ? Math.round((now - lastDate) / (1000 * 60 * 60 * 24)) : null

      let status: LeadStatus = "ativo"
      const situacaoLower = (lead.situacao || "").toLowerCase()
      if (situacaoLower.includes("vend") || situacaoLower.includes("convers") || situacaoLower.includes("fechad")) {
        status = "fechado"
      } else if (situacaoLower.includes("perd")) {
        status = "perdido"
      } else if (daysSince !== null && daysSince > 7) {
        status = "irregular"
      }

      return { ...lead, status, lastInteraction, daysSince }
    })
  }, [leads])

  // Filter by search and tab
  const filteredLeads = useMemo(() => {
    let result = leadsWithStatus

    // Action focus filter
    if (actionFilter === "followup") {
      result = result.filter((lead) => lead.status === "irregular")
    } else if (actionFilter === "sem-interacao") {
      result = result.filter((lead) => !lead.interacoes || lead.interacoes.length === 0)
    } else if (actionFilter === "quentes") {
      result = result.filter((lead) => lead.daysSince !== null && lead.daysSince <= 1)
    }

    // Search filter
    if (search) {
      const query = search.toLowerCase()
      result = result.filter((lead) =>
        lead.nome.toLowerCase().includes(query) ||
        lead.telefone.includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.empreendimento?.nome?.toLowerCase().includes(query)
      )
    }

    // Tab filter
    if (activeTab !== "todos") {
      result = result.filter((lead) => lead.status === activeTab)
    }

    return result
  }, [leadsWithStatus, search, activeTab, actionFilter])

  const sortedLeads = useMemo(() => {
    const result = [...filteredLeads]
    const daysValue = (lead: Lead & { daysSince?: number | null }) =>
      lead.daysSince === null || lead.daysSince === undefined ? 999 : lead.daysSince

    if (sortBy === "nome") {
      result.sort((a, b) => a.nome.localeCompare(b.nome))
    } else if (sortBy === "recentes") {
      result.sort((a, b) => daysValue(a) - daysValue(b))
    } else if (sortBy === "parados") {
      result.sort((a, b) => daysValue(b) - daysValue(a))
    } else {
      result.sort((a, b) => {
        const rankDiff = (LEAD_PRIORITY_RANK[a.status] ?? 9) - (LEAD_PRIORITY_RANK[b.status] ?? 9)
        if (rankDiff !== 0) return rankDiff
        return daysValue(b) - daysValue(a)
      })
    }

    return result
  }, [filteredLeads, sortBy])

  const spotlightLead = useMemo(() => {
    if (leadsWithStatus.length === 0) return null

    const ordered = [...leadsWithStatus].sort((a, b) => {
      const aNoInteraction = !a.interacoes || a.interacoes.length === 0
      const bNoInteraction = !b.interacoes || b.interacoes.length === 0
      if (aNoInteraction !== bNoInteraction) return aNoInteraction ? -1 : 1

      const rankDiff = (LEAD_PRIORITY_RANK[a.status] ?? 9) - (LEAD_PRIORITY_RANK[b.status] ?? 9)
      if (rankDiff !== 0) return rankDiff

      const aDays = a.daysSince ?? -1
      const bDays = b.daysSince ?? -1
      return bDays - aDays
    })

    return ordered[0]
  }, [leadsWithStatus])

  // Stats
  const stats = useMemo(() => ({
    total: leadsWithStatus.length,
    ativos: leadsWithStatus.filter((l) => l.status === "ativo").length,
    irregulares: leadsWithStatus.filter((l) => l.status === "irregular").length,
    fechados: leadsWithStatus.filter((l) => l.status === "fechado").length,
    perdidos: leadsWithStatus.filter((l) => l.status === "perdido").length,
  }), [leadsWithStatus])

  const actionStats = useMemo(() => ({
    followup: leadsWithStatus.filter((l) => l.status === "irregular").length,
    semInteracao: leadsWithStatus.filter((l) => !l.interacoes || l.interacoes.length === 0).length,
    quentes: leadsWithStatus.filter((l) => l.daysSince !== null && l.daysSince <= 1).length,
  }), [leadsWithStatus])

  const statusMeta: Record<LeadStatus, { title: string; gradient: string; textColor: string; bgColor: string; icon: React.ElementType }> = {
    ativo: {
      title: "Em atendimento",
      gradient: "from-emerald-500 via-green-500 to-teal-500",
      textColor: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      icon: TrendingUp,
    },
    irregular: {
      title: "Follow-up",
      gradient: "from-amber-500 via-orange-500 to-yellow-500",
      textColor: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      icon: Clock4,
    },
    fechado: {
      title: "Fechado",
      gradient: "from-blue-500 via-cyan-500 to-sky-500",
      textColor: "text-blue-700 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      icon: CheckCircle2,
    },
    perdido: {
      title: "Perdido",
      gradient: "from-red-500 via-rose-500 to-pink-500",
      textColor: "text-red-700 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      icon: XCircle,
    },
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/leads?limit=200")
      const data = await res.json()
      setLeads(data.data || [])
    } catch (error) {
      console.error("Erro ao buscar leads:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setSelectedLead(null)
    }
  }

  const activeFilterLabel = useMemo(() => {
    if (actionFilter === "followup") return "Follow-up urgente"
    if (actionFilter === "sem-interacao") return "Sem interacao"
    if (actionFilter === "quentes") return "Quentes hoje"
    return ""
  }, [actionFilter])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AppShell title="Meus Clientes">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Meus Clientes
              </h1>
              <p className="text-muted-foreground">
                Gerencie seus leads e acompanhe o funil de vendas
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total" value={stats.total} icon={User} gradient="from-gray-500 to-gray-600" delay={0} />
            <StatCard label="Em Atendimento" value={stats.ativos} icon={TrendingUp} gradient="from-emerald-500 to-green-500" delay={100} />
            <StatCard label="Follow-up" value={stats.irregulares} icon={Clock4} gradient="from-amber-500 to-orange-500" delay={200} />
            <StatCard label="Fechados" value={stats.fechados} icon={CheckCircle2} gradient="from-blue-500 to-cyan-500" delay={300} />
            <StatCard label="Perdidos" value={stats.perdidos} icon={XCircle} gradient="from-red-500 to-rose-500" delay={400} />
          </div>

          {/* Action Focus */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Acoes do dia</h2>
                <p className="text-xs text-muted-foreground">
                  Priorize follow-ups e leads que precisam de contato rapido
                </p>
              </div>
              {actionFilter !== "nenhum" && (
                <Button variant="ghost" size="sm" onClick={() => setActionFilter("nenhum")} className="text-xs">
                  Limpar foco
                </Button>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <ActionCard
                title="Follow-up urgente"
                description="Leads sem contato ha +7 dias"
                count={actionStats.followup}
                icon={AlertCircle}
                gradient="from-amber-500 via-orange-500 to-yellow-500"
                actionLabel="Ver follow-ups"
                onAction={() => {
                  setActionFilter("followup")
                  setActiveTab("irregular")
                }}
              />
              <ActionCard
                title="Primeiro contato"
                description="Leads novos sem interacao"
                count={actionStats.semInteracao}
                icon={MessageSquare}
                gradient="from-emerald-500 via-green-500 to-teal-500"
                actionLabel="Atender agora"
                onAction={() => {
                  setActionFilter("sem-interacao")
                  setActiveTab("todos")
                }}
              />
              <ActionCard
                title="Quentes hoje"
                description="Leads com interacao recente"
                count={actionStats.quentes}
                icon={Sparkles}
                gradient="from-blue-500 via-cyan-500 to-sky-500"
                actionLabel="Ver quentes"
                onAction={() => {
                  setActionFilter("quentes")
                  setActiveTab("ativo")
                }}
              />
            </div>
          </div>

          {spotlightLead && (
            <div className="animate-fadeInUp">
              <SpotlightCard
                lead={spotlightLead}
                statusMeta={statusMeta[spotlightLead.status]}
                onOpenDetails={handleOpenDetails}
              />
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 via-green-400/30 to-teal-400/30 rounded-2xl blur-xl opacity-60" />
              <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome, telefone, email ou empreendimento..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-12 h-12 text-base bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                      <SelectTrigger className="h-11 min-w-[180px] bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prioridade">Prioridade</SelectItem>
                        <SelectItem value="recentes">Mais recentes</SelectItem>
                        <SelectItem value="parados">Sem contato</SelectItem>
                        <SelectItem value="nome">Nome (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                    {activeFilterLabel && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {activeFilterLabel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-1 rounded-xl h-auto">
                <TabsTrigger value="todos" className="gap-1.5 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-gray-600 data-[state=active]:text-white rounded-lg text-xs">
                  Todos
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.total}</Badge>
                </TabsTrigger>
                <TabsTrigger value="ativo" className="gap-1.5 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white rounded-lg text-xs">
                  Ativos
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.ativos}</Badge>
                </TabsTrigger>
                <TabsTrigger value="irregular" className="gap-1.5 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg text-xs">
                  Follow-up
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.irregulares}</Badge>
                </TabsTrigger>
                <TabsTrigger value="fechado" className="gap-1.5 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-xs">
                  Fechados
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.fechados}</Badge>
                </TabsTrigger>
                <TabsTrigger value="perdido" className="gap-1.5 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-500 data-[state=active]:text-white rounded-lg text-xs">
                  Perdidos
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.perdidos}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Leads Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Carregando clientes...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-16">
              <User className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                {search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {search || actionFilter !== "nenhum"
                  ? "Tente ajustar os filtros ou a busca"
                  : "Os leads que você atender aparecerão aqui"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  Mostrando <strong className="text-gray-800 dark:text-gray-200">{sortedLeads.length}</strong> de{" "}
                  <strong className="text-gray-800 dark:text-gray-200">{stats.total}</strong> clientes
                </span>
                {search && (
                  <Badge variant="outline" className="gap-1.5">
                    <Search className="h-3 w-3" />
                    {search}
                  </Badge>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedLeads.map((lead, index) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    status={lead.status}
                    statusMeta={statusMeta[lead.status]}
                    onOpenDetails={handleOpenDetails}
                    delay={index * 50}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <LeadDetailModal
        lead={selectedLead}
        open={isModalOpen}
        onOpenChange={handleModalChange}
        onUpdate={handleRefresh}
      />
    </AppShell>
  )
}
