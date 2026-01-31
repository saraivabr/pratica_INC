"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare,
  TrendingUp,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Bot,
  Users,
  Zap,
  HelpCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

interface SofiaMetrics {
  conversations: {
    today: number
    week: number
    month: number
    total: number
  }
  topIntents: Array<{ intent: string; category: string; count: number }>
  resolution: {
    total: number
    autonomous: number
    escalated: number
    autonomousRate: number
  }
  avgResponseTime: {
    seconds: number
    formatted: string
  }
  unknownIntents: Array<{ message: string; occurrences: number }>
  satisfaction: {
    totalFeedback: number
    positive: number
    negative: number
    rate: number
  }
  categoryDistribution: Array<{ category: string; count: number }>
  topFlows: Array<{ flow: string; count: number }>
  frustration: {
    average: number
    highFrustrationCount: number
  }
  conversationsPerDay: Array<{ date: string; count: number }>
  peakHours: Array<{ hour: number; count: number }>
}

const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1", "#EC4899", "#14B8A6"]

const CATEGORY_LABELS: Record<string, string> = {
  consulta: "Consultas",
  busca: "Buscas",
  suporte: "Suporte",
  feedback: "Feedback",
  saudacao: "Saudacoes",
  informacao: "Informacoes",
  acao: "Acoes",
  unknown: "Desconhecido",
}

export default function SofiaDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [metrics, setMetrics] = useState<SofiaMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  usePageTracking("admin-sofia")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/sofia/metrics")
      if (!res.ok) throw new Error("Falha ao buscar metricas")
      const result = await res.json()
      if (result.success) {
        setMetrics(result.metrics)
        setLastUpdate(result.generatedAt)
      } else {
        throw new Error(result.error || "Erro desconhecido")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasAccess) {
      fetchMetrics()
    }
  }, [hasAccess])

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  if (!hasAccess) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores e gerentes podem acessar esta pagina.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Bot className="w-8 h-8 text-purple-600" />
              Dashboard Sofia
            </h1>
            <p className="text-muted-foreground mt-1">
              Metricas e desempenho da assistente virtual
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-sm text-muted-foreground">
                Atualizado: {new Date(lastUpdate).toLocaleTimeString("pt-BR")}
              </span>
            )}
            <Button onClick={fetchMetrics} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading && !metrics ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Conversas Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.conversations.today}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.conversations.week} esta semana
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Resolucao Autonoma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.resolution.autonomousRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.resolution.autonomous} de {metrics.resolution.total}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Tempo de Resposta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgResponseTime.formatted}</div>
                  <p className="text-xs text-muted-foreground">tempo medio</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Satisfacao
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.satisfaction.rate > 0 ? `${metrics.satisfaction.rate}%` : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.satisfaction.positive} positivos, {metrics.satisfaction.negative} negativos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Conversations per Day */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conversas por Dia</CardTitle>
                  <CardDescription>Ultimos 7 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.conversationsPerDay}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString("pt-BR", { weekday: "short" })
                          }
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                          labelFormatter={(value) =>
                            new Date(value).toLocaleDateString("pt-BR")
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#8B5CF6"
                          strokeWidth={2}
                          dot={{ fill: "#8B5CF6" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuicao por Categoria</CardTitle>
                  <CardDescription>Tipos de solicitacoes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.categoryDistribution}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ category, percent }) =>
                            `${CATEGORY_LABELS[category] || category} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {metrics.categoryDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Intents and Unknown Intents */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Intents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top 10 Intents
                  </CardTitle>
                  <CardDescription>Intencoes mais detectadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={metrics.topIntents.slice(0, 10)}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis
                          dataKey="intent"
                          type="category"
                          width={120}
                          className="text-xs"
                          tickFormatter={(value) =>
                            value.length > 15 ? value.substring(0, 15) + "..." : value
                          }
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Unknown Intents - Training Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-yellow-500" />
                    Intents Nao Reconhecidos
                  </CardTitle>
                  <CardDescription>Oportunidades de treinamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {metrics.unknownIntents.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        Nenhum intent desconhecido no periodo
                      </p>
                    ) : (
                      metrics.unknownIntents.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg"
                        >
                          <p className="text-sm flex-1 line-clamp-2">{item.message}</p>
                          <Badge variant="secondary">{item.occurrences}x</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total do Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.conversations.month}</div>
                  <p className="text-xs text-muted-foreground">conversas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Escalacoes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {metrics.resolution.escalated}
                  </div>
                  <p className="text-xs text-muted-foreground">transferidas para humano</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Nivel de Frustracao
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.frustration.average}/10
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.frustration.highFrustrationCount} casos criticos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Horario de Pico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.peakHours[0]?.hour ?? "--"}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.peakHours[0]?.count ?? 0} conversas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Flows */}
            {metrics.topFlows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fluxos Mais Utilizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {metrics.topFlows.map((flow, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-sm py-1.5 px-3"
                      >
                        {flow.flow}: {flow.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  )
}
