"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  TrendingUp,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  UserCheck,
  ChevronRight,
  BarChart3,
  Target,
  Loader2,
  ShieldAlert,
  Sparkles,
  Zap,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  CheckCircle2,
  Trophy,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Calendar,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useDashboardStats, useLeads } from "@/lib/hooks"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { VoiceAgentPanel } from "@/components/voice-agent/VoiceAgentPanel"
import { UrgentLeadsQueue } from "@/components/dashboard/urgent-leads-queue"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface CRMStats {
  totalLeads: number
  leadsVariation: number
  temperatures: { temperature: string; count: string }[]
  avgScore: number
  conversion: { won: number; total: number; rate: number; variation: number }
  revenue: { current: number; lastMonth: number; variation: number }
  originStats: { origem: string; total: number; converted: number; conversionRate: number; avgTicket: number }[]
  stages: { name: string; count: string }[]
  leadsPerDay: { date: string; count: string }[]
  insights: {
    bestDay: { day: string; conversions: number } | null
    peakHour: number | null
    hotLeadsNoContact: number
    bestOrigin: { origem: string; conversionRate: number } | null
  }
}

interface GoalsData {
  goals: { leads: number; conversions: number; revenue: number }
  current: { leads: number; conversions: number; revenue: number }
  progress: { leads: number; conversions: number; revenue: number }
  overallProgress: number
  period: { month: string; daysRemaining: number }
}

interface TeamMetrics {
  corretores: {
    rank: number
    id: number
    nome: string
    totalLeads: number
    conversions: number
    conversionRate: number
    totalRevenue: number
  }[]
  teamStats: {
    totalCorretores: number
    totalLeads: number
    totalConversions: number
    totalRevenue: number
    avgConversionRate: number
  }
  recentActivities: {
    id: string
    corretorNome: string
    tipo: string
    empreendimento: string
    leadNome: string
    createdAt: string
  }[]
}

interface AIInsights {
  insights: { type: string; icon: string; title: string; description: string }[]
  summary: string
  metrics: {
    totalLeads: number
    conversionRate: number
    revenue: number
    hotLeadsNoContact: number
    bestOrigin: string | null
    bestOriginRate: number
  }
  generatedBy: string
}

interface ReactivationAnalytics {
  resumo: {
    totalLeads: number
    vgvTotal: number
    comissaoTotal: number
    suaParte: number
    valorMedioLead: number
    comissaoMediaLead: number
  }
  temperaturas: { quente: number; morno: number; frio: number }
  cenarios: { nome: string; taxa: number; vendas: number; comissao: number }[]
  empreendimentos: { nome: string; nomeCompleto: string; leads: number; vgv: number; comissao: number }[]
  topLeads: {
    id: string
    nome: string
    telefone: string
    situacao: string
    empreendimento: string
    diasCadastro: number
    comissaoPotencial: number
    temperatura: string
    linkCvcrm: string
  }[]
  leadsComVisita: any[]
  leadsSemCorretor: any[]
  ultimaAtualizacao: string
}

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"]

export default function AdminPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { stats, loading } = useDashboardStats()
  const { refetch } = useLeads()
  const [refreshing, setRefreshing] = useState(false)
  const [crmStats, setCrmStats] = useState<CRMStats | null>(null)
  const [goalsData, setGoalsData] = useState<GoalsData | null>(null)
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [reactivation, setReactivation] = useState<ReactivationAnalytics | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  usePageTracking("admin-dashboard")

  // Fetch all dashboard data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsRes, goalsRes, teamRes, insightsRes, reactivationRes] = await Promise.all([
          fetch("/api/crm/stats"),
          fetch("/api/crm/goals"),
          fetch("/api/crm/team-metrics"),
          fetch("/api/crm/ai-insights"),
          fetch("/api/crm/reactivation-analytics"),
        ])

        if (statsRes.ok) setCrmStats(await statsRes.json())
        if (goalsRes.ok) setGoalsData(await goalsRes.json())
        if (teamRes.ok) setTeamMetrics(await teamRes.json())
        if (insightsRes.ok) setAiInsights(await insightsRes.json())
        if (reactivationRes.ok) setReactivation(await reactivationRes.json())
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast.error("Erro ao carregar dados do dashboard. Tente atualizar a página.")
      }
    }
    fetchAllData()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-3 sm:px-4 py-12 animate-fadeInUp">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Esta área é exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/empreendimentos")}>Voltar</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const [statsRes, goalsRes, teamRes, insightsRes, reactivationRes] = await Promise.all([
        fetch("/api/crm/stats"),
        fetch("/api/crm/goals"),
        fetch("/api/crm/team-metrics"),
        fetch("/api/crm/ai-insights"),
        fetch("/api/crm/reactivation-analytics"),
        refetch(),
      ])

      if (statsRes.ok) setCrmStats(await statsRes.json())
      if (goalsRes.ok) setGoalsData(await goalsRes.json())
      if (teamRes.ok) setTeamMetrics(await teamRes.json())
      if (insightsRes.ok) setAiInsights(await insightsRes.json())
      if (reactivationRes.ok) setReactivation(await reactivationRes.json())
    } catch (error) {
      console.error("Error refreshing:", error)
      toast.error("Erro ao atualizar dados. Tente novamente.")
    }
    setTimeout(() => setRefreshing(false), 500)
  }

  const leadsQuentes = crmStats?.temperatures?.find((t) => t.temperature === "hot")?.count || 0
  const leadsPerDayData = crmStats?.leadsPerDay?.map((d) => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    leads: parseInt(d.count),
  })) || []

  const originPieData = crmStats?.originStats?.slice(0, 5).map((o) => ({
    name: o.origem,
    value: o.total,
    conversionRate: o.conversionRate,
  })) || []

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`
    return `R$ ${value.toLocaleString("pt-BR")}`
  }

  return (
    <AppShell title="Dashboard">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-green-500/15 dark:bg-green-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeInDown">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl blur opacity-40 animate-pulse" />
                <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {currentTime.toLocaleTimeString("pt-BR")} • {currentTime.toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0 shadow-lg shadow-emerald-500/30"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Leads */}
          <div className="group animate-fadeInUp" style={{ animationDelay: "100ms" }}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  {crmStats && crmStats.leadsVariation !== 0 && (
                    <div className={cn("flex items-center gap-1", crmStats.leadsVariation > 0 ? "text-emerald-600" : "text-red-500")}>
                      {crmStats.leadsVariation > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span className="text-xs font-medium">{crmStats.leadsVariation > 0 ? "+" : ""}{crmStats.leadsVariation}%</span>
                    </div>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">
                  {loading ? "..." : stats.totalLeads}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Leads este mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Taxa de Conversão */}
          <div className="group animate-fadeInUp" style={{ animationDelay: "200ms" }}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  {crmStats && crmStats.conversion.variation !== 0 && (
                    <div className={cn("flex items-center gap-1", crmStats.conversion.variation > 0 ? "text-emerald-600" : "text-red-500")}>
                      {crmStats.conversion.variation > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span className="text-xs font-medium">{crmStats.conversion.variation > 0 ? "+" : ""}{crmStats.conversion.variation}pp</span>
                    </div>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-1">
                  {crmStats?.conversion.rate || 0}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Taxa de conversão ({crmStats?.conversion.won || 0} vendas)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Receita */}
          <div className="group animate-fadeInUp" style={{ animationDelay: "300ms" }}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  {crmStats && crmStats.revenue.variation !== 0 && (
                    <div className={cn("flex items-center gap-1", crmStats.revenue.variation > 0 ? "text-emerald-600" : "text-red-500")}>
                      {crmStats.revenue.variation > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span className="text-xs font-medium">{crmStats.revenue.variation > 0 ? "+" : ""}{crmStats.revenue.variation}%</span>
                    </div>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                  {formatCurrency(crmStats?.revenue.current || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receita do mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Meta */}
          <div className="group animate-fadeInUp" style={{ animationDelay: "400ms" }}>
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="secondary" className={cn(
                    "border-0",
                    (goalsData?.overallProgress || 0) >= 100 ? "bg-emerald-100 text-emerald-700" :
                    (goalsData?.overallProgress || 0) >= 70 ? "bg-blue-100 text-blue-700" :
                    "bg-orange-100 text-orange-700"
                  )}>
                    {goalsData?.period.daysRemaining || 0} dias restantes
                  </Badge>
                </div>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-1">
                  {goalsData?.overallProgress || 0}%
                </p>
                <Progress value={goalsData?.overallProgress || 0} className="h-2 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Meta do mês (automática)</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Urgent Leads Queue */}
        <div className="animate-fadeInUp" style={{ animationDelay: "450ms" }}>
          <UrgentLeadsQueue
            maxDisplay={5}
            autoRefresh={true}
            refreshInterval={60}
          />
        </div>

        {/* AI Insights Card */}
        {aiInsights && (
          <Card className="animate-fadeInUp border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50 overflow-hidden" style={{ animationDelay: "500ms" }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    Sofia Insights
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{aiInsights.summary}</p>
                </div>
                <Badge className="bg-emerald-500 text-white border-0">
                  <Activity className="h-3 w-3 mr-1" />
                  {aiInsights.generatedBy === 'gemini' ? 'IA' : 'Auto'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 sm:p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-emerald-200 dark:border-emerald-900">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Leads Quentes</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{leadsQuentes}</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-green-200 dark:border-green-900">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Vendas (Mês)</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{crmStats?.conversion.won || 0}</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-blue-200 dark:border-blue-900">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-blue-500" />
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Melhor Origem</p>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-blue-600 truncate">
                    {aiInsights.metrics.bestOrigin || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">{aiInsights.metrics.bestOriginRate}% conv.</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-purple-200 dark:border-purple-900">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <UserCheck className="h-4 w-4 text-purple-500" />
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Corretores</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{teamMetrics?.teamStats.totalCorretores || 0}</p>
                </div>
              </div>

              {/* AI Insights */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiInsights.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 rounded-xl bg-white/90 dark:bg-gray-900/90 border",
                      insight.type === "alert" ? "border-amber-200 dark:border-amber-900" :
                      insight.type === "opportunity" ? "border-emerald-200 dark:border-emerald-900" :
                      "border-blue-200 dark:border-blue-900"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{insight.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reactivation Analytics - Oportunidade de Comissões */}
        {reactivation && reactivation.resumo.totalLeads > 0 && (
          <Card className="animate-fadeInUp border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/50 dark:via-orange-950/50 dark:to-yellow-950/50 overflow-hidden" style={{ animationDelay: "550ms" }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-40 animate-pulse" />
                  <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    Oportunidade de Reativação
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Leads parados nos últimos 180 dias com potencial de conversão
                  </p>
                </div>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {reactivation.resumo.totalLeads} leads
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* KPIs de Comissão */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-amber-200 dark:border-amber-900">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">VGV Potencial</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">
                    {formatCurrency(reactivation.resumo.vgvTotal)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-orange-200 dark:border-orange-900">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Comissão Total (5%)</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">
                    {formatCurrency(reactivation.resumo.comissaoTotal)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 border-2 border-emerald-300 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Sua Parte (40%)</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                    {formatCurrency(reactivation.resumo.suaParte)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/80 dark:bg-gray-900/80 border border-yellow-200 dark:border-yellow-900">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Por Lead</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {formatCurrency(reactivation.resumo.comissaoMediaLead)}
                  </p>
                </div>
              </div>

              {/* Temperaturas e Cenários */}
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Distribuição por Temperatura */}
                <div className="p-4 rounded-xl bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Leads por Temperatura
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Quentes</span>
                      </div>
                      <span className="font-bold text-red-600">{reactivation.temperaturas.quente}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Mornos</span>
                      </div>
                      <span className="font-bold text-amber-600">{reactivation.temperaturas.morno}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Frios</span>
                      </div>
                      <span className="font-bold text-blue-600">{reactivation.temperaturas.frio}</span>
                    </div>
                  </div>
                  {/* Barra de progresso visual */}
                  <div className="mt-4 h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex">
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(reactivation.temperaturas.quente / reactivation.resumo.totalLeads) * 100}%` }}
                    />
                    <div
                      className="bg-amber-500 transition-all"
                      style={{ width: `${(reactivation.temperaturas.morno / reactivation.resumo.totalLeads) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${(reactivation.temperaturas.frio / reactivation.resumo.totalLeads) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Cenários de Conversão */}
                <div className="p-4 rounded-xl bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Cenários de Conversão
                  </h4>
                  <div className="space-y-2">
                    {reactivation.cenarios.map((cenario, index) => (
                      <div
                        key={cenario.nome}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg",
                          index === 2 ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800" : ""
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            index === 0 ? "bg-gray-100 text-gray-600" :
                            index === 1 ? "bg-blue-100 text-blue-600" :
                            index === 2 ? "bg-emerald-100 text-emerald-600" :
                            "bg-purple-100 text-purple-600"
                          )}>
                            {cenario.nome}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(cenario.taxa * 100).toFixed(0)}% → {cenario.vendas} vendas
                          </span>
                        </div>
                        <span className={cn(
                          "font-bold text-sm",
                          index === 2 ? "text-emerald-600" : "text-gray-700 dark:text-gray-300"
                        )}>
                          {formatCurrency(cenario.comissao)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Empreendimentos */}
              {reactivation.empreendimentos.length > 0 && (
                <div className="p-4 rounded-xl bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    Top Empreendimentos (por VGV potencial)
                  </h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reactivation.empreendimentos.slice(0, 6).map((emp, index) => (
                      <div
                        key={emp.nome}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]" title={emp.nomeCompleto}>
                            {emp.nome}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {emp.leads} leads
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Comissão potencial</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(emp.comissao)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads Prioritários */}
              {reactivation.leadsComVisita.length > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 border border-red-200 dark:border-red-900">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Leads com Visita Agendada (Prioridade Máxima)
                  </h4>
                  <div className="space-y-2">
                    {reactivation.leadsComVisita.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-2 bg-white/80 dark:bg-gray-900/80 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{lead.nome}</p>
                          <p className="text-xs text-gray-500">{lead.telefone} • {lead.diasCadastro} dias</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600 text-sm">{formatCurrency(lead.comissaoPotencial)}</p>
                          <a href={lead.linkCvcrm} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            Ver no CRM
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <div className="text-center sm:text-left mb-3 sm:mb-0">
                  <p className="font-bold text-lg">Cada lead pode valer até {formatCurrency(reactivation.resumo.comissaoMediaLead)}</p>
                  <p className="text-sm opacity-90">Comece a reativação hoje e aumente suas comissões!</p>
                </div>
                <Button
                  variant="secondary"
                  className="bg-white text-orange-600 hover:bg-orange-50"
                  onClick={() => router.push("/admin/leads?filter=parados")}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Ver Lista Completa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Leads por Dia (Line Chart) */}
          <Card className="animate-fadeInUp border-0 bg-white/80 dark:bg-gray-900/80" style={{ animationDelay: "600ms" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                Leads por Dia (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadsPerDayData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={leadsPerDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leads por Origem (Pie Chart) */}
          <Card className="animate-fadeInUp border-0 bg-white/80 dark:bg-gray-900/80" style={{ animationDelay: "700ms" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Target className="h-4 w-4 text-white" />
                </div>
                Leads por Origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  {originPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={originPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {originPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value} leads (${props.payload.conversionRate}% conv.)`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {originPieData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{item.name}</span>
                      <span className="font-medium">{item.conversionRate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team & Recent Leads Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Ranking de Corretores */}
          <Card className="animate-fadeInUp border-0 bg-white/80 dark:bg-gray-900/80" style={{ animationDelay: "800ms" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                Top Corretores
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 text-xs" onClick={() => router.push("/admin/equipe")}>
                Ver todos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {teamMetrics?.corretores && teamMetrics.corretores.length > 0 ? (
                <div className="space-y-3">
                  {teamMetrics.corretores.slice(0, 5).map((corretor, index) => (
                    <div key={corretor.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        index === 0 ? "bg-amber-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-600" : "bg-gray-300"
                      )}>
                        {corretor.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{corretor.nome}</p>
                        <p className="text-xs text-gray-500">{corretor.totalLeads} leads • {corretor.conversions} vendas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{corretor.conversionRate}%</p>
                        <p className="text-xs text-gray-500">conversão</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimos Leads */}
          <Card className="animate-fadeInUp border-0 bg-white/80 dark:bg-gray-900/80" style={{ animationDelay: "900ms" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                Últimos Leads
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 text-xs" onClick={() => router.push("/admin/leads")}>
                Ver todos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : stats.leadsRecentes.length > 0 ? (
                <div className="space-y-2">
                  {stats.leadsRecentes.slice(0, 5).map((lead: any, index: number) => (
                    <div
                      key={`lead-${lead.id || index}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer group"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shrink-0 text-white font-semibold text-sm">
                        {(lead.nome || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{lead.nome || "Sem nome"}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          {lead.email && (
                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                              <Mail className="h-3 w-3 shrink-0" />
                              {lead.email}
                            </span>
                          )}
                          {lead.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              {lead.telefone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum lead encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="animate-fadeInUp border-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800" style={{ animationDelay: "1000ms" }}>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950"
                onClick={() => router.push("/admin/chat")}
              >
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-medium">Chat</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
                onClick={() => router.push("/admin/leads")}
              >
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium">Pipeline</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-900 dark:hover:bg-purple-950"
                onClick={() => router.push("/admin/leads")}
              >
                <Users className="h-5 w-5 text-purple-600" />
                <span className="text-xs font-medium">Leads</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-950"
                onClick={() => router.push("/admin/reports")}
              >
                <BarChart3 className="h-5 w-5 text-orange-600" />
                <span className="text-xs font-medium">Relatórios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <VoiceAgentPanel />

      <style jsx global>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInDown { animation: fadeInDown 0.6s ease-out forwards; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; opacity: 0; }
      `}</style>
    </AppShell>
  )
}
