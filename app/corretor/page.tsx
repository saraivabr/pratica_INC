"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Building2,
  MessageSquare,
  Sparkles,
  Loader2,
  CheckCircle2,
  Calendar,
  Zap,
  Target,
  Flame,
  ShieldAlert,
  CalendarX,
  ArrowUpRight,
  X,
  BarChart3,
  DollarSign,
  Trophy,
  Clock,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UrgentLeadsQueue } from "@/components/dashboard/urgent-leads-queue"
import { EmptyState } from "@/components/ui/empty-state"

interface Lead {
  id: string
  nome: string
  telefone: string
  origem?: string
  situacao?: string
  empreendimento?: { id?: number; nome?: string } | null
  interacoes?: Array<{ descricao?: string; data_cad?: string }>
}

interface CategorizedItem {
  lead: Lead
  reason: string
  priority: number
}

interface CategorizedLeads {
  contactNow: CategorizedItem[]
  lossRisks: CategorizedItem[]
  opportunities: CategorizedItem[]
  overdue: CategorizedItem[]
}

// Helper function to categorize leads by urgency
function categorizeLeads(leads: Lead[]): CategorizedLeads {
  const contactNow: CategorizedItem[] = []
  const lossRisks: CategorizedItem[] = []
  const opportunities: CategorizedItem[] = []
  const overdue: CategorizedItem[] = []

  const now = new Date()

  leads.forEach((lead) => {
    const lastInteraction = lead.interacoes?.[0]
    const lastDate = lastInteraction?.data_cad ? new Date(lastInteraction.data_cad) : null
    const daysSinceContact = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : 999

    // Critical: needs immediate contact
    if (daysSinceContact > 7 && lead.situacao === "quente") {
      contactNow.push({ lead, reason: `Sem contato há ${daysSinceContact} dias`, priority: 1 })
    }
    // At risk of loss
    else if (daysSinceContact > 14 || lead.situacao === "frio") {
      lossRisks.push({ lead, reason: `Lead esfriando - ${daysSinceContact} dias sem contato`, priority: 2 })
    }
    // Hot opportunities
    else if (lead.situacao === "quente" && daysSinceContact <= 3) {
      opportunities.push({ lead, reason: "Lead quente - pronto para avançar", priority: 3 })
    }
    // Overdue follow-ups
    else if (daysSinceContact > 5) {
      overdue.push({ lead, reason: `Follow-up atrasado - ${daysSinceContact} dias`, priority: 4 })
    }
  })

  return { contactNow, lossRisks, opportunities, overdue }
}

// Helper function to get urgency stats
function getUrgencyStats(leads: Lead[]) {
  const categorized = categorizeLeads(leads)
  return {
    totalLeads: leads.length,
    criticalActions: categorized.contactNow.length,
    atRisk: categorized.lossRisks.length,
    hotOpportunities: categorized.opportunities.length,
    overdueFollowups: categorized.overdue.length,
  }
}

// Glow Card component with animated gradient border
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
      {/* Outer glow */}
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500",
          glowColors[glowColor]
        )}
      />
      {/* Card */}
      <div
        className={cn(
          "relative bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm md:backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden will-change-[backdrop-filter]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

// Metric Card component
function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  glowColor = "emerald",
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; positive: boolean }
  glowColor?: "emerald" | "amber" | "red" | "blue" | "purple"
  delay?: number
}) {
  const iconColors = {
    emerald: "from-emerald-400 to-green-500",
    amber: "from-amber-400 to-orange-500",
    red: "from-red-400 to-rose-500",
    blue: "from-blue-400 to-cyan-500",
    purple: "from-purple-400 to-violet-500",
  }

  return (
    <div
      className="animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <GlowCard glowColor={glowColor} className="p-3 sm:p-5 h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 sm:space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={cn(
                  "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0",
                  iconColors[glowColor]
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                {title}
              </span>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0",
                trend.positive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              <ArrowUpRight
                className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", !trend.positive && "rotate-180")}
              />
              {trend.value}%
            </div>
          )}
        </div>
      </GlowCard>
    </div>
  )
}

// Urgent Lead Card component
function UrgentLeadCard({
  lead,
  urgency,
  rank,
  onContact,
}: {
  lead: Lead
  urgency?: string
  rank: number
  onContact: (lead: Lead, method: "phone" | "whatsapp") => void
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">{lead.nome}</p>
        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
          {urgency || lead.empreendimento?.nome || "Sem empreendimento"}
        </p>
      </div>
      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onContact(lead, "whatsapp")}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  )
}

// Dashboard Section component for lead categories
function DashboardSection({
  title,
  subtitle,
  count,
  emptyMessage,
  emptyIcon: EmptyIcon,
  priority = 4,
  accentColor = "gray",
  dotColor = "bg-gray-400",
  children,
}: {
  title: string
  subtitle: string
  icon?: React.ElementType
  glowColor?: string
  count: number
  emptyMessage: string
  emptyIcon: React.ElementType
  priority?: 1 | 2 | 3 | 4
  accentColor?: string
  dotColor?: string
  children?: React.ReactNode
}) {
  const borderAccentColors: Record<string, string> = {
    red: "border-l-red-500",
    amber: "border-l-amber-500",
    emerald: "border-l-emerald-500",
    gray: "border-l-gray-400",
  }

  const titleSizeClass = priority === 1 ? "text-base sm:text-lg" : "text-sm sm:text-base"
  const opacityClass = priority === 4 ? "opacity-90" : ""

  return (
    <div className={cn("relative group mb-4 sm:mb-6", opacityClass)}>
      <div className={cn(
        "relative bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm md:backdrop-blur-2xl rounded-xl sm:rounded-2xl shadow-lg border border-white/60 dark:border-zinc-800/60 overflow-hidden border-l-4 will-change-[backdrop-filter]",
        borderAccentColors[accentColor] || borderAccentColors.gray
      )}>
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={cn("h-2 w-2 rounded-full flex-shrink-0", dotColor)} />
                <h3 className={cn("font-semibold text-gray-900 dark:text-white truncate", titleSizeClass)}>{title}</h3>
                {count > 0 && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {count}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate ml-3.5 sm:ml-4">{subtitle}</p>
            </div>
          </div>
        </div>
        {count === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <EmptyIcon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-1.5 sm:mb-2" />
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

export default function CorretorDashboard() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-dashboard")

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false)
  const [whatsappBannerDismissed, setWhatsappBannerDismissed] = useState(false)
  const [goals, setGoals] = useState<{
    goals: { leads: number; conversions: number; revenue: number }
    current: { leads: number; conversions: number; revenue: number }
    progress: { leads: number; conversions: number; revenue: number }
    overallProgress: number
    period: { month: string; daysRemaining: number }
  } | null>(null)
  const [activities, setActivities] = useState<Array<{
    id: string
    title: string
    scheduled_at: string
    lead_name?: string
    activity_type?: string
    status?: string
  }>>([])
  const [pipeline, setPipeline] = useState<{
    stages: Array<{ id: string; name: string; color: string; count: number; isWonStage?: boolean; isLostStage?: boolean }>
    stats: { totalLeads: number }
  } | null>(null)
  const [whatsappData, setWhatsappData] = useState<{
    status: "loading" | "connected" | "disconnected"
    pairedPhone?: string | null
    profileName?: string | null
    profilePicUrl?: string | null
    error?: string | null
  }>({ status: "loading" })

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Check WhatsApp status
  useEffect(() => {
    const checkWhatsApp = async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        const data = await res.json()
        setWhatsappData({
          status: data.status === "ready" ? "connected" : "disconnected",
          pairedPhone: data.pairedPhone,
          profileName: data.profileName,
          profilePicUrl: data.profilePicUrl,
          error: data.error,
        })
      } catch {
        setWhatsappData({ status: "disconnected" })
      }
    }
    if (isAuthenticated) {
      checkWhatsApp()
    }
  }, [isAuthenticated])

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/leads?limit=100")
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

  // Fetch goals, activities, pipeline
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchGoals = async () => {
      try {
        const res = await fetch("/api/crm/goals")
        if (res.ok) {
          const data = await res.json()
          setGoals(data)
        }
      } catch (e) {
        console.error("Erro ao buscar metas:", e)
      }
    }

    const fetchActivities = async () => {
      try {
        const params = user?.id ? `?userId=${user.id}` : ""
        const res = await fetch(`/api/crm/activities${params}`)
        if (res.ok) {
          const data = await res.json()
          // Filter future activities and take first 3
          const now = new Date()
          const upcoming = (data || [])
            .filter((a: any) => a.scheduled_at && new Date(a.scheduled_at) >= now && a.status !== "completed")
            .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .slice(0, 3)
          setActivities(upcoming)
        }
      } catch (e) {
        console.error("Erro ao buscar atividades:", e)
      }
    }

    const fetchPipeline = async () => {
      try {
        const res = await fetch("/api/crm/pipeline-cvcrm")
        if (res.ok) {
          const data = await res.json()
          setPipeline(data)
        }
      } catch (e) {
        console.error("Erro ao buscar pipeline:", e)
      }
    }

    fetchGoals()
    fetchActivities()
    fetchPipeline()
  }, [isAuthenticated, user?.id])

  // Process leads for urgency and categorization
  const categorizedLeads = useMemo(() => {
    if (!leads.length) return null
    return categorizeLeads(leads)
  }, [leads])

  const urgencyStats = useMemo(() => {
    if (!leads.length) return null
    return getUrgencyStats(leads)
  }, [leads])

  // Calculate metrics for header
  const metrics = useMemo(() => {
    if (!urgencyStats) return { score: 0, total: 0 }
    
    const { totalLeads, criticalActions, atRisk, hotOpportunities } = urgencyStats
    
    // Performance score based on urgency handling
    const scoreBase = Math.min(100, Math.max(0, 
      70 + 
      (hotOpportunities * 8) - // Reward hot opportunities
      (criticalActions * 3) - // Penalize critical actions pending
      (atRisk * 5) // Penalize leads at risk
    ))
    
    return {
      score: Math.round(scoreBase),
      total: totalLeads,
    }
  }, [urgencyStats])

  // Handle contact actions
  const handleContact = (lead: Lead, method: "phone" | "whatsapp") => {
    if (method === "whatsapp") {
      const phoneNumber = lead.telefone.replace(/\D/g, "")
      const firstName = lead.nome?.split(" ")[0] || "cliente"
      const propertyName = lead.empreendimento?.nome || "as oportunidades disponíveis"
      const message = encodeURIComponent(
        `Olá ${firstName}! Como vai? Gostaria de conversar sobre ${propertyName}.`
      )
      window.open(`https://wa.me/55${phoneNumber}?text=${message}`, "_blank")
    } else {
      const phoneNumber = lead.telefone.replace(/\D/g, "")
      window.location.href = `tel:+55${phoneNumber}`
    }
  }

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  // Loading state
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
    <AppShell title="Dashboard">
      <div className="min-h-screen relative">
        {/* Animated Background */}
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-page-in">
          {/* Welcome Section */}
          <section className="relative">
            <GlowCard className="p-6 md:p-8">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5 sm:space-y-2 animate-fadeInUp flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>{getGreeting()}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white truncate">
                    {user?.nome?.split(" ")[0] || "Corretor"}!
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md line-clamp-2 sm:line-clamp-none">
                    Aqui esta o resumo da sua performance. Acompanhe seus leads
                    e conquiste mais vendas.
                  </p>
                </div>

                <div
                  className="flex items-center gap-3 sm:gap-4 animate-fadeInUp"
                  style={{ animationDelay: "100ms" }}
                >
                  {/* Performance Ring */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-lg opacity-30 animate-pulse" />
                    <div className="relative h-16 w-16 sm:h-20 md:h-24 sm:w-20 md:w-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                      <div className="h-[52px] w-[52px] sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full bg-white dark:bg-zinc-900 flex flex-col items-center justify-center">
                        <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                          {metrics.score}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                          Score
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Performance
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {metrics.score >= 80
                        ? "Excelente!"
                        : metrics.score >= 60
                        ? "Muito bom"
                        : "Pode melhorar"}
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </section>

          {/* Meu Mês - Monthly Performance */}
          <section className="animate-fadeInUp" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Meu Mês</h2>
              {goals?.period?.month && (
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {goals.period.month}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <MetricCard
                icon={Users}
                title="Leads do Mês"
                value={goals ? goals.current.leads : "-"}
                subtitle={goals ? `Meta: ${goals.goals.leads}` : "Carregando..."}
                trend={goals && goals.goals.leads > 0 ? { value: goals.progress.leads, positive: goals.progress.leads >= 50 } : undefined}
                glowColor="blue"
                delay={0}
              />
              <MetricCard
                icon={Trophy}
                title="Conversões"
                value={goals ? goals.current.conversions : "-"}
                subtitle={goals ? `Meta: ${goals.goals.conversions}` : "Carregando..."}
                trend={goals && goals.goals.conversions > 0 ? { value: goals.progress.conversions, positive: goals.progress.conversions >= 50 } : undefined}
                glowColor="emerald"
                delay={100}
              />
              <MetricCard
                icon={DollarSign}
                title="Receita"
                value={goals ? `R$ ${(goals.current.revenue / 1000).toFixed(0)}k` : "-"}
                subtitle={goals ? `Meta: R$ ${(goals.goals.revenue / 1000).toFixed(0)}k` : "Carregando..."}
                trend={goals && goals.goals.revenue > 0 ? { value: goals.progress.revenue, positive: goals.progress.revenue >= 50 } : undefined}
                glowColor="purple"
                delay={200}
              />
              <div className="animate-fadeInUp" style={{ animationDelay: "300ms" }}>
                <GlowCard glowColor="amber" className="p-3 sm:p-5 h-full">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                        Meta Geral
                      </span>
                    </div>
                    <div>
                      <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {goals ? `${goals.overallProgress}%` : "-"}
                      </p>
                      {goals && (
                        <div className="mt-1.5 sm:mt-2">
                          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                goals.overallProgress >= 100 ? "bg-emerald-500" :
                                goals.overallProgress >= 70 ? "bg-amber-500" :
                                "bg-red-500"
                              )}
                              style={{ width: `${Math.min(goals.overallProgress, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {goals.period.daysRemaining} dias restantes
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlowCard>
              </div>
            </div>
          </section>

          {/* WhatsApp Connection Banner - Disconnected */}
          {whatsappData.status === "disconnected" && (
            <section className="animate-fadeInUp" style={{ animationDelay: "50ms" }}>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-all duration-500" />
                <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 backdrop-blur-sm md:backdrop-blur-xl rounded-2xl border border-green-200 dark:border-green-800 p-5 overflow-hidden">
                  {/* Decorative background */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-500 rounded-xl blur-lg opacity-40 animate-pulse" />
                        <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <MessageSquare className="h-7 w-7 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          Conecte seu WhatsApp
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                            <Sparkles className="h-3 w-3" />
                            Recomendado
                          </span>
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {whatsappData.error || "Envie mensagens direto para seus leads sem sair da plataforma"}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/onboarding/whatsapp"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <Zap className="h-4 w-4" />
                      Conectar agora
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* WhatsApp Connection Bar - Connected (compact) */}
          {whatsappData.status === "connected" && !whatsappBannerDismissed && (
            <section className="animate-fadeInUp" style={{ animationDelay: "50ms" }}>
              <div className="relative bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm rounded-xl border border-green-200 dark:border-green-800/50 px-3 sm:px-4 h-10 flex items-center gap-2 sm:gap-3">
                {/* Green dot */}
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />

                {/* Status text */}
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  WhatsApp conectado
                </span>

                {/* Profile name / phone */}
                {(whatsappData.profileName || whatsappData.pairedPhone) && (
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate hidden sm:inline">
                    {whatsappData.profileName}
                    {whatsappData.profileName && whatsappData.pairedPhone ? " - " : ""}
                    {whatsappData.pairedPhone}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  {/* Manage link */}
                  <Link
                    href="/onboarding/whatsapp"
                    className="text-xs text-green-600 dark:text-green-400 hover:underline hidden sm:inline"
                  >
                    Gerenciar
                  </Link>

                  {/* Dismiss button */}
                  <button
                    onClick={() => setWhatsappBannerDismissed(true)}
                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Ocultar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Urgent Leads Queue */}
          <section className="animate-fadeInUp" style={{ animationDelay: "150ms" }}>
            <UrgentLeadsQueue
              corretorId={user?.id?.toString()}
              maxDisplay={5}
              autoRefresh={true}
              refreshInterval={60}
            />
          </section>

          {/* Metrics Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <MetricCard
              icon={Flame}
              title="Contatar Agora"
              value={loading ? "-" : urgencyStats?.criticalActions || 0}
              subtitle="Ações críticas"
              glowColor="red"
              delay={0}
            />
            <MetricCard
              icon={ShieldAlert}
              title="Risco de Perda"
              value={loading ? "-" : urgencyStats?.atRisk || 0}
              subtitle="Leads esfriando"
              glowColor="amber"
              delay={100}
            />
            <MetricCard
              icon={TrendingUp}
              title="Oportunidades"
              value={loading ? "-" : urgencyStats?.hotOpportunities || 0}
              subtitle="Quentes hoje"
              trend={{ value: 15, positive: true }}
              glowColor="emerald"
              delay={200}
            />
            <MetricCard
              icon={CalendarX}
              title="Atrasados"
              value={loading ? "-" : urgencyStats?.overdueFollowups || 0}
              subtitle="Follow-ups pendentes"
              glowColor="purple"
              delay={300}
            />
          </section>

          {/* Próximos Compromissos */}
          <section className="animate-fadeInUp" style={{ animationDelay: "250ms" }}>
            <GlowCard glowColor="blue" className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Próximos Compromissos</h3>
                </div>
                <Link
                  href="/corretor/agenda"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  Ver agenda
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {activities.length === 0 ? (
                <div className="text-center py-4">
                  <Calendar className="h-6 w-6 mx-auto text-gray-300 dark:text-gray-600 mb-1.5" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum compromisso agendado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity) => {
                    const scheduledDate = new Date(activity.scheduled_at)
                    const now = new Date()
                    const diffMs = scheduledDate.getTime() - now.getTime()
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                    let relativeTime = ""
                    if (diffDays > 0) relativeTime = `em ${diffDays}d`
                    else if (diffHours > 0) relativeTime = `em ${diffHours}h`
                    else relativeTime = "agora"

                    return (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {activity.title || "Atividade"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                            {activity.lead_name ? `${activity.lead_name} · ` : ""}
                            {scheduledDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            {" "}
                            {scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                          diffHours < 2
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : diffDays < 1
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        )}>
                          {relativeTime}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </GlowCard>
          </section>

          {/* Meu Funil - Pipeline */}
          {pipeline && pipeline.stages.length > 0 && (
            <section className="animate-fadeInUp" style={{ animationDelay: "300ms" }}>
              <GlowCard glowColor="purple" className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Meu Funil</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {pipeline.stats.totalLeads} leads
                    </span>
                  </div>
                  <Link
                    href="/pipeline"
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    Ver pipeline
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {pipeline.stages
                    .filter((s) => !s.isLostStage && s.count > 0)
                    .map((stage) => {
                      const maxCount = Math.max(...pipeline.stages.filter(s => !s.isLostStage).map((s) => s.count), 1)
                      const widthPercent = Math.max((stage.count / maxCount) * 100, 8)
                      return (
                        <div key={stage.id} className="flex items-center gap-3">
                          <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 w-24 sm:w-32 truncate text-right flex-shrink-0">
                            {stage.name}
                          </span>
                          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                            <div
                              className="h-full rounded-md flex items-center justify-end px-2 transition-all duration-700"
                              style={{ width: `${widthPercent}%`, backgroundColor: stage.color }}
                            >
                              <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-sm">
                                {stage.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </GlowCard>
            </section>
          )}

          {/* Main Priority Sections */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : leads.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum lead encontrado"
                description="Seus leads aparecerão aqui quando forem atribuídos a você."
                action={{ label: "Ver empreendimentos", href: "/corretor/imoveis" }}
              />
            ) : (
              <>
                {/* AI Summary Banner - Collapsible */}
                {urgencyStats && (urgencyStats.criticalActions > 0 || urgencyStats.atRisk > 0 || urgencyStats.hotOpportunities > 0) && (
                  <section className="animate-fadeInUp">
                    <div className="relative bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm md:backdrop-blur-xl rounded-xl sm:rounded-2xl border border-purple-100 dark:border-purple-900/30 overflow-hidden will-change-[backdrop-filter]">
                      <button
                        onClick={() => setAiSummaryExpanded(!aiSummaryExpanded)}
                        className="w-full p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-left hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                          Resumo de Urgencia
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {urgencyStats.criticalActions > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              {urgencyStats.criticalActions}
                            </span>
                          )}
                          {urgencyStats.atRisk > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {urgencyStats.atRisk}
                            </span>
                          )}
                          {urgencyStats.hotOpportunities > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {urgencyStats.hotOpportunities}
                            </span>
                          )}
                          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", aiSummaryExpanded && "rotate-180")} />
                        </div>
                      </button>
                      {aiSummaryExpanded && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                          <div className="space-y-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                            <p>
                              <span className="text-red-600 dark:text-red-400 font-medium">Contatar: </span>
                              {urgencyStats.criticalActions > 0
                                ? `${urgencyStats.criticalActions} lead(s) urgente(s)`
                                : "Nenhuma acao critica"}
                            </p>
                            <p>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Em risco: </span>
                              {urgencyStats.atRisk > 0
                                ? `${urgencyStats.atRisk} lead(s) esfriando`
                                : "Nenhum em risco"}
                            </p>
                            <p>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Quentes: </span>
                              {urgencyStats.hotOpportunities > 0
                                ? `${urgencyStats.hotOpportunities} oportunidade(s)`
                                : "Continue aquecendo"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* 1. Contatar Agora - Critical Actions */}
                <DashboardSection
                  title="Contatar Agora"
                  subtitle="Leads que precisam de atenção imediata"
                  icon={Flame}
                  glowColor="from-red-400 via-rose-400 to-pink-400"
                  count={categorizedLeads?.contactNow.length || 0}
                  emptyMessage="Nenhuma ação critica pendente no momento."
                  emptyIcon={CheckCircle2}
                  priority={1}
                  accentColor="red"
                  dotColor="bg-red-500"
                >
                  {categorizedLeads && categorizedLeads.contactNow.length > 0 && (
                    <div className="p-4 space-y-3">
                      {categorizedLeads.contactNow.map((item, index) => (
                        <UrgentLeadCard
                          key={item.lead.id}
                          lead={item.lead}
                          urgency={item.reason}
                          rank={index + 1}
                          onContact={handleContact}
                        />
                      ))}
                    </div>
                  )}
                </DashboardSection>

                {/* 2. Riscos de Perda - Loss Risks */}
                <DashboardSection
                  title="Riscos de Perda"
                  subtitle="Leads esfriando que precisam de recuperação"
                  icon={ShieldAlert}
                  glowColor="from-amber-400 via-orange-400 to-yellow-400"
                  count={categorizedLeads?.lossRisks.length || 0}
                  emptyMessage="Sem leads em risco. Continue mantendo o ritmo!"
                  emptyIcon={CheckCircle2}
                  priority={2}
                  accentColor="amber"
                  dotColor="bg-amber-500"
                >
                  {categorizedLeads && categorizedLeads.lossRisks.length > 0 && (
                    <div className="p-4 space-y-3">
                      {categorizedLeads.lossRisks.map((item, index) => (
                        <UrgentLeadCard
                          key={item.lead.id}
                          lead={item.lead}
                          urgency={item.reason}
                          rank={index + 1}
                          onContact={handleContact}
                        />
                      ))}
                    </div>
                  )}
                </DashboardSection>

                {/* 3. Oportunidades - Hot Opportunities */}
                <DashboardSection
                  title="Oportunidades"
                  subtitle="Leads quentes prontos para conversão"
                  icon={TrendingUp}
                  glowColor="from-emerald-400 via-green-400 to-teal-400"
                  count={categorizedLeads?.opportunities.length || 0}
                  emptyMessage="Continue prospectando para encontrar mais oportunidades."
                  emptyIcon={Target}
                  priority={3}
                  accentColor="emerald"
                  dotColor="bg-emerald-500"
                >
                  {categorizedLeads && categorizedLeads.opportunities.length > 0 && (
                    <div className="p-4 space-y-3">
                      {categorizedLeads.opportunities.map((item, index) => (
                        <UrgentLeadCard
                          key={item.lead.id}
                          lead={item.lead}
                          urgency={item.reason}
                          rank={index + 1}
                          onContact={handleContact}
                        />
                      ))}
                    </div>
                  )}
                </DashboardSection>

                {/* 4. Follow-ups Atrasados - Overdue Actions */}
                <DashboardSection
                  title="Follow-ups Atrasados"
                  subtitle="Ações pendentes que precisam ser retomadas"
                  icon={CalendarX}
                  glowColor="from-gray-400 via-slate-400 to-zinc-400"
                  count={categorizedLeads?.overdue.length || 0}
                  emptyMessage="Todas as ações estão em dia."
                  emptyIcon={CheckCircle2}
                  priority={4}
                  accentColor="gray"
                  dotColor="bg-gray-400"
                >
                  {categorizedLeads && categorizedLeads.overdue.length > 0 && (
                    <div className="p-4 space-y-3">
                      {categorizedLeads.overdue.map((item, index) => (
                        <UrgentLeadCard
                          key={item.lead.id}
                          lead={item.lead}
                          urgency={item.reason}
                          rank={index + 1}
                          onContact={handleContact}
                        />
                      ))}
                    </div>
                  )}
                </DashboardSection>

                {/* Quick Actions Footer */}
                <section className="animate-fadeInUp" style={{ animationDelay: "400ms" }}>
                  <GlowCard glowColor="blue" className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                            Ações Rápidas
                          </h3>
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                            Ferramentas importantes
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" asChild className="h-8 text-xs flex-1 sm:flex-none">
                          <Link href="/leads">
                            <Users className="h-3.5 w-3.5 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Todos os </span>Leads
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-8 text-xs flex-1 sm:flex-none">
                          <Link href="/empreendimentos">
                            <Building2 className="h-3.5 w-3.5 mr-1 sm:mr-2" />
                            Imóveis
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-8 text-xs flex-1 sm:flex-none">
                          <Link href="/corretor/agenda">
                            <Calendar className="h-3.5 w-3.5 mr-1 sm:mr-2" />
                            Agenda
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </GlowCard>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
