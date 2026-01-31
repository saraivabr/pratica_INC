"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
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
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UrgentLeadsQueue } from "@/components/dashboard/urgent-leads-queue"

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
          "relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden",
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
              <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </span>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
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
        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
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
  icon: Icon,
  glowColor,
  count,
  emptyMessage,
  emptyIcon: EmptyIcon,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  glowColor: string
  count: number
  emptyMessage: string
  emptyIcon: React.ElementType
  children?: React.ReactNode
}) {
  return (
    <div className="relative group mb-4 sm:mb-6">
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-xl sm:rounded-2xl blur opacity-10 group-hover:opacity-20 transition-all duration-500",
          glowColor
        )}
      />
      <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-xl sm:rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn("h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0", glowColor)}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{title}</h3>
                {count > 0 && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {count}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
            </div>
          </div>
        </div>
        {count === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <EmptyIcon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-1.5 sm:mb-2" />
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
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
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md line-clamp-2 sm:line-clamp-none">
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
                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          Score
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Performance
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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

          {/* WhatsApp Connection Banner - Disconnected */}
          {whatsappData.status === "disconnected" && (
            <section className="animate-fadeInUp" style={{ animationDelay: "50ms" }}>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-all duration-500" />
                <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 backdrop-blur-xl rounded-2xl border border-green-200 dark:border-green-800 p-5 overflow-hidden">
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

          {/* WhatsApp Connection Card - Connected */}
          {whatsappData.status === "connected" && (
            <section className="animate-fadeInUp" style={{ animationDelay: "50ms" }}>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500" />
                <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-green-200 dark:border-green-800/50 p-4 sm:p-5 overflow-hidden">
                  <div className="flex items-center gap-4">
                    {/* Profile Picture */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-30" />
                      {whatsappData.profilePicUrl ? (
                        <img
                          src={whatsappData.profilePicUrl}
                          alt="WhatsApp"
                          className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-green-500 shadow-lg"
                        />
                      ) : (
                        <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg border-2 border-green-400">
                          <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                        </div>
                      )}
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                        <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                      </div>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {whatsappData.profileName || "WhatsApp Conectado"}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium flex-shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          Online
                        </span>
                      </div>
                      {whatsappData.pairedPhone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {whatsappData.pairedPhone}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Pronto para enviar mensagens aos seus leads
                      </p>
                    </div>

                    {/* Action Button */}
                    <Link
                      href="/onboarding/whatsapp"
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Gerenciar conexão"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </Link>
                  </div>
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

          {/* Main Priority Sections */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <>
                {/* AI Summary Banner */}
                {urgencyStats && (urgencyStats.criticalActions > 0 || urgencyStats.atRisk > 0 || urgencyStats.hotOpportunities > 0) && (
                  <section className="animate-fadeInUp">
                    <GlowCard glowColor="purple" className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="relative flex-shrink-0 hidden sm:block">
                          <div className="absolute inset-0 bg-purple-500 rounded-xl blur-lg opacity-40 animate-pulse" />
                          <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 sm:hidden text-purple-500" />
                            Resumo de Urgência
                          </h3>
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                            <p className="font-medium">
                              <strong className="text-red-600 dark:text-red-400">Contatar: </strong>
                              {urgencyStats.criticalActions > 0
                                ? `${urgencyStats.criticalActions} lead(s) URGENTE`
                                : "Nenhuma ação crítica"}
                            </p>
                            <p className="font-medium">
                              <strong className="text-amber-600 dark:text-amber-400">Em risco: </strong>
                              {urgencyStats.atRisk > 0
                                ? `${urgencyStats.atRisk} lead(s) esfriando`
                                : "Nenhum em risco"}
                            </p>
                            <p className="font-medium">
                              <strong className="text-emerald-600 dark:text-emerald-400">Quentes: </strong>
                              {urgencyStats.hotOpportunities > 0
                                ? `${urgencyStats.hotOpportunities} oportunidade(s)`
                                : "Continue aquecendo"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  </section>
                )}

                {/* 1. CONTATE AGORA - Critical Actions */}
                <DashboardSection
                  title="🔥 CONTATE AGORA"
                  subtitle="Estes leads precisam de atenção imediata para não esfriar"
                  icon={Flame}
                  glowColor="from-red-400 via-rose-400 to-pink-400"
                  count={categorizedLeads?.contactNow.length || 0}
                  emptyMessage="🎉 Ótimo! Nenhuma ação crítica pendente no momento."
                  emptyIcon={CheckCircle2}
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

                {/* 2. RISCOS DE PERDA - Loss Risks */}
                <DashboardSection
                  title="⚠️ RISCOS DE PERDA"
                  subtitle="Leads valiosos que estão esfriando - recupere-os hoje!"
                  icon={ShieldAlert}
                  glowColor="from-amber-400 via-orange-400 to-yellow-400"
                  count={categorizedLeads?.lossRisks.length || 0}
                  emptyMessage="✅ Sem leads em risco. Continue mantendo o ritmo!"
                  emptyIcon={CheckCircle2}
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

                {/* 3. OPORTUNIDADES HOJE - Hot Opportunities */}
                <DashboardSection
                  title="💰 OPORTUNIDADES HOJE"
                  subtitle="Leads quentes prontos para conversão - feche essas vendas!"
                  icon={TrendingUp}
                  glowColor="from-emerald-400 via-green-400 to-teal-400"
                  count={categorizedLeads?.opportunities.length || 0}
                  emptyMessage="Continue prospectando para encontrar mais oportunidades."
                  emptyIcon={Target}
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

                {/* 4. AÇÕES ATRASADAS - Overdue Actions */}
                <DashboardSection
                  title="⏰ AÇÕES ATRASADAS"
                  subtitle="Follow-ups que deveriam ter sido feitos - retome agora!"
                  icon={CalendarX}
                  glowColor="from-purple-400 via-violet-400 to-indigo-400"
                  count={categorizedLeads?.overdue.length || 0}
                  emptyMessage="🎯 Perfeito! Todas as ações estão em dia."
                  emptyIcon={CheckCircle2}
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
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
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
