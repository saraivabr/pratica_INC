"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AnimatedBackground } from "@/components/animated-background"
import { toast } from "sonner"
import {
  BarChart3,
  Users,
  Target,
  Calendar,
  Award,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
} from "lucide-react"

interface Lead {
  id: string
  nome: string
  situacao?: string
  interacoes?: Array<{ data_cad?: string }>
}

// Stat Card with trend
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  gradient,
  delay = 0,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  gradient: string
  delay?: number
}) {
  return (
    <div className="animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative group">
        <div className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500",
          gradient
        )} />
        <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", gradient)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                {subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            {trend && trendValue && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                trend === "up" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                trend === "down" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                trend === "neutral" && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
              )}>
                {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple Bar Chart component
function SimpleBarChart({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(...data, 1)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <div className="flex items-end gap-1 h-32">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-gradient-to-t from-emerald-500 to-green-400 rounded-t-md transition-all duration-500 hover:from-emerald-400 hover:to-green-300"
            style={{ height: `${(value / max) * 100}%`, minHeight: value > 0 ? "8px" : "2px" }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
        <span>Dom</span>
      </div>
    </div>
  )
}

// Performance Ring
function PerformanceRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg className="w-28 h-28 transform -rotate-90">
          <circle
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="56"
            cy="56"
          />
          <circle
            className="text-emerald-500"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="56"
            cy="56"
            style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{label}</p>
    </div>
  )
}

export default function CorretorRelatoriosPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-relatorios")

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [period, setPeriod] = useState("mes")

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch leads for metrics
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/leads?limit=200")
        const data = await res.json()
        setLeads(data.data || [])
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
        setFetchError(true)
        toast.error("Erro ao carregar relatórios. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }
    if (isAuthenticated) {
      fetchLeads()
    }
  }, [isAuthenticated])

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date()
    let ativos = 0
    let convertidos = 0
    let perdidos = 0
    let interacoesTotal = 0

    // Get start of current week (Monday)
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    // Initialize weekly arrays (Mon-Sun)
    const weeklyLeads = [0, 0, 0, 0, 0, 0, 0]
    const weeklyInteractions = [0, 0, 0, 0, 0, 0, 0]

    leads.forEach((lead) => {
      const situacao = (lead.situacao || "").toLowerCase()
      if (situacao.includes("vend") || situacao.includes("convers") || situacao.includes("fechad")) {
        convertidos++
      } else if (situacao.includes("perd")) {
        perdidos++
      } else {
        ativos++
      }

      // Count interactions for this lead
      const leadInteractions = lead.interacoes?.length || 0
      interacoesTotal += leadInteractions

      // Calculate weekly data from interaction dates
      if (lead.interacoes && lead.interacoes.length > 0) {
        lead.interacoes.forEach((interacao) => {
          if (interacao.data_cad) {
            const interacaoDate = new Date(interacao.data_cad)
            if (interacaoDate >= startOfWeek && interacaoDate <= now) {
              const dayIndex = interacaoDate.getDay()
              // Convert Sunday (0) to index 6, Monday (1) to index 0, etc.
              const weekIndex = dayIndex === 0 ? 6 : dayIndex - 1
              weeklyInteractions[weekIndex]++
            }
          }
        })
      }

      // Count leads by creation date (using first interaction date as proxy)
      if (lead.interacoes && lead.interacoes.length > 0) {
        const firstInteraction = lead.interacoes[0]
        if (firstInteraction.data_cad) {
          const leadDate = new Date(firstInteraction.data_cad)
          if (leadDate >= startOfWeek && leadDate <= now) {
            const dayIndex = leadDate.getDay()
            const weekIndex = dayIndex === 0 ? 6 : dayIndex - 1
            weeklyLeads[weekIndex]++
          }
        }
      }
    })

    const taxaConversao = leads.length > 0 ? Math.round((convertidos / leads.length) * 100) : 0
    const score = Math.min(100, Math.max(0, 70 + (ativos * 2) - (perdidos * 3) + (convertidos * 5)))

    return {
      total: leads.length,
      ativos,
      convertidos,
      perdidos,
      taxaConversao,
      interacoesTotal,
      mediaInteracoes: leads.length > 0 ? Math.round(interacoesTotal / leads.length) : 0,
      score,
      weeklyLeads,
      weeklyInteractions,
    }
  }, [leads])

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
    <AppShell title="Relatórios">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Relatórios
              </h1>
              <p className="text-muted-foreground">
                Acompanhe seu desempenho e métricas
              </p>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 bg-white/80 dark:bg-zinc-800/80">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Esta Semana</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Carregando relatórios...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Erro ao carregar dados</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Não foi possível carregar seus relatórios.</p>
              <Button
                variant="outline"
                onClick={() => { setFetchError(false); setLoading(true); window.location.reload(); }}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Main Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total de Leads"
                  value={metrics.total}
                  subtitle="No período"
                  icon={Users}
                  gradient="from-blue-500 to-cyan-500"
                  delay={0}
                />
                <StatCard
                  title="Convertidos"
                  value={metrics.convertidos}
                  subtitle={`${metrics.taxaConversao}% de conversão`}
                  icon={CheckCircle2}
                  gradient="from-emerald-500 to-green-500"
                  delay={100}
                />
                <StatCard
                  title="Em Atendimento"
                  value={metrics.ativos}
                  subtitle="Leads ativos"
                  icon={Target}
                  gradient="from-amber-500 to-orange-500"
                  delay={200}
                />
                <StatCard
                  title="Interações"
                  value={metrics.interacoesTotal}
                  subtitle={`${metrics.mediaInteracoes} por lead`}
                  icon={MessageSquare}
                  gradient="from-purple-500 to-violet-500"
                  delay={300}
                />
              </div>

              {/* Charts Section */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Performance Score */}
                <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5 text-emerald-500" />
                      Performance
                    </CardTitle>
                    <CardDescription>Seu score de desempenho</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center py-6">
                    <PerformanceRing score={metrics.score} label="Score Geral" />
                    <div className="mt-6 w-full space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Taxa de Conversão</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{metrics.taxaConversao}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Leads Ativos</span>
                        <span className="font-semibold">{metrics.ativos}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Média Interações</span>
                        <span className="font-semibold">{metrics.mediaInteracoes}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Activity */}
                <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      Atividade Semanal
                    </CardTitle>
                    <CardDescription>Leads e interações por dia</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-8">
                    <SimpleBarChart data={metrics.weeklyLeads} label="Novos Leads" />
                    <SimpleBarChart data={metrics.weeklyInteractions} label="Interações" />
                  </CardContent>
                </Card>
              </div>

              {/* Activity Summary */}
              <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    Resumo de Atividades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                      <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.total}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Leads</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                      <MessageSquare className="h-6 w-6 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.interacoesTotal}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Interações</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                      <CheckCircle2 className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metrics.convertidos}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Convertidos</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                      <Target className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.ativos}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Em Atendimento</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
