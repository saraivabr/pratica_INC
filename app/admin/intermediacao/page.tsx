"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  Download,
  ChevronRight,
  RefreshCw,
  Building2,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Loader2,
  ShieldAlert,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

// Types
interface ConsolidadoData {
  totalVendas: number
  valorTotalVendas: number
  comissoesGeradas: number
  comissoesPagas: number
  comissoesPendentes: number
  variacaoMensal: number
  percentualPago: number
  percentualPendente: number
  evolucaoMensal: { mes: string; vendas: number; comissoes: number }[]
}

interface ParcelaVencida {
  id: string
  beneficiarioNome: string
  vendaCodigo: string
  valor: number
  dataVencimento: string
  diasAtraso: number
}

interface VendaRecente {
  id: string
  codigo: string
  clienteNome: string
  empreendimento: string
  valorVenda: number
  comissaoTotal: number
  status: "aprovada" | "pendente" | "em_analise" | "cancelada"
  createdAt: string
}

// Helper functions
const formatCurrency = (value: number) => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`
  return `R$ ${value.toLocaleString("pt-BR")}`
}

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

const getStatusConfig = (status: VendaRecente["status"]) => {
  const configs = {
    aprovada: { label: "Aprovada", color: "bg-emerald-500", textColor: "text-emerald-600" },
    pendente: { label: "Pendente", color: "bg-amber-500", textColor: "text-amber-600" },
    em_analise: { label: "Em Analise", color: "bg-blue-500", textColor: "text-blue-600" },
    cancelada: { label: "Cancelada", color: "bg-red-500", textColor: "text-red-600" },
  }
  return configs[status] || configs.pendente
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"]

// Loading skeleton components
function KPISkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-0 bg-white/80 dark:bg-gray-900/80">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-10 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center h-[250px]">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}

function ParcelasVencidasSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/50">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function IntermediacaoPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [consolidado, setConsolidado] = useState<ConsolidadoData | null>(null)
  const [parcelasVencidas, setParcelasVencidas] = useState<ParcelaVencida[]>([])
  const [vendasRecentes, setVendasRecentes] = useState<VendaRecente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  usePageTracking("admin-intermediacao-dashboard")

  // Fetch all data
  const fetchData = async () => {
    try {
      const [consolidadoRes, parcelasRes, vendasRes] = await Promise.all([
        fetch("/api/intermediacao/relatorios/consolidado"),
        fetch("/api/intermediacao/parcelas/vencidas"),
        fetch("/api/intermediacao/vendas?limit=5"),
      ])

      if (consolidadoRes.ok) {
        const data = await consolidadoRes.json()
        setConsolidado(data)
      } else {
        // API failed - show zeros instead of mock data
        setConsolidado({
          totalVendas: 0,
          valorTotalVendas: 0,
          comissoesGeradas: 0,
          comissoesPagas: 0,
          comissoesPendentes: 0,
          variacaoMensal: 0,
          percentualPago: 0,
          percentualPendente: 0,
          evolucaoMensal: [],
        })
        toast.error("Erro ao carregar dados consolidados")
      }

      if (parcelasRes.ok) {
        const data = await parcelasRes.json()
        setParcelasVencidas(data.parcelas || [])
      } else {
        // API failed - show empty list instead of mock data
        setParcelasVencidas([])
        toast.error("Erro ao carregar parcelas vencidas")
      }

      if (vendasRes.ok) {
        const data = await vendasRes.json()
        setVendasRecentes(data.vendas || [])
      } else {
        // API failed - show empty list instead of mock data
        setVendasRecentes([])
        toast.error("Erro ao carregar vendas recentes")
      }
    } catch (error) {
      console.error("Error fetching intermediacao data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Exporting report...")
  }

  // Access denied
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
              Esta area e exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/empreendimentos")}>Voltar</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  // Loading auth
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

  return (
    <AppShell title="Intermediacao Imobiliaria">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-green-500/15 dark:bg-green-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeInDown">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl blur opacity-40 animate-pulse" />
                <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Intermediacao Imobiliaria
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {currentTime.toLocaleTimeString("pt-BR")} - {currentTime.toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => router.push("/admin/intermediacao/vendas/nova")}
              className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0 shadow-lg shadow-emerald-500/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Venda
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-200 hover:border-gray-400 dark:border-gray-800"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* KPIs */}
        {loading ? (
          <KPISkeletons />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Vendas */}
            <div className="group animate-fadeInUp" style={{ animationDelay: "100ms" }}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">
                    {formatCurrency(consolidado?.valorTotalVendas || 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {consolidado?.totalVendas || 0} vendas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Comissoes Geradas */}
            <div className="group animate-fadeInUp" style={{ animationDelay: "200ms" }}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    {consolidado && consolidado.variacaoMensal !== 0 && (
                      <div className={cn("flex items-center gap-1", consolidado.variacaoMensal > 0 ? "text-emerald-600" : "text-red-500")}>
                        {consolidado.variacaoMensal > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        <span className="text-xs font-medium">{consolidado.variacaoMensal > 0 ? "+" : ""}{consolidado.variacaoMensal}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-1">
                    {formatCurrency(consolidado?.comissoesGeradas || 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Comissoes Geradas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pago */}
            <div className="group animate-fadeInUp" style={{ animationDelay: "300ms" }}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 border-0">
                      {consolidado?.percentualPago || 0}%
                    </Badge>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                    {formatCurrency(consolidado?.comissoesPagas || 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pago
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pendente */}
            <div className="group animate-fadeInUp" style={{ animationDelay: "400ms" }}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 border-0">
                      {consolidado?.percentualPendente || 0}%
                    </Badge>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-1">
                    {formatCurrency(consolidado?.comissoesPendentes || 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pendente
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Evolucao Mensal */}
          <Card className="lg:col-span-3 animate-fadeInUp border-0 bg-white/80 dark:bg-gray-900/80" style={{ animationDelay: "500ms" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                Evolucao Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartSkeleton />
              ) : consolidado?.evolucaoMensal && consolidado.evolucaoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={consolidado.evolucaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrencyFull(value)}
                      labelFormatter={(label) => `Mes: ${label}`}
                    />
                    <Bar dataKey="comissoes" name="Comissoes" radius={[4, 4, 0, 0]}>
                      {consolidado.evolucaoMensal.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  <p>Nenhum dado disponivel</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parcelas Vencidas */}
          <Card className="lg:col-span-2 animate-fadeInUp border-0 bg-white/80 dark:bg-gray-900/80" style={{ animationDelay: "600ms" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                Parcelas Vencidas
                {parcelasVencidas.length > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-0">
                    {parcelasVencidas.length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 text-xs"
                onClick={() => router.push("/admin/intermediacao/parcelas?status=vencida")}
              >
                Ver todas
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ParcelasVencidasSkeleton />
              ) : parcelasVencidas.length > 0 ? (
                <div className="space-y-3 max-h-[230px] overflow-y-auto pr-1">
                  {parcelasVencidas.slice(0, 5).map((parcela) => (
                    <div
                      key={parcela.id}
                      className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-100 dark:border-red-900/50 hover:border-red-200 dark:hover:border-red-800 transition-all cursor-pointer"
                      onClick={() => router.push(`/admin/intermediacao/parcelas/${parcela.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {parcela.beneficiarioNome}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {parcela.vendaCodigo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 dark:text-red-400 text-sm">
                            {formatCurrencyFull(parcela.valor)}
                          </p>
                          <p className="text-xs text-red-500">
                            Venc: {new Date(parcela.dataVencimento).toLocaleDateString("pt-BR")} ({parcela.diasAtraso}d)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                    <CreditCard className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium">Nenhuma parcela vencida</p>
                  <p className="text-xs text-gray-400">Todas as parcelas estao em dia!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vendas Recentes */}
        <Card className="animate-fadeInUp border-0 bg-white/80 dark:bg-gray-900/80" style={{ animationDelay: "700ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Vendas Recentes
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 text-xs"
              onClick={() => router.push("/admin/intermediacao/vendas")}
            >
              Ver todas
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : vendasRecentes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-800">
                      <TableHead className="text-gray-600 dark:text-gray-400">Codigo</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Cliente</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400 hidden sm:table-cell">Empreendimento</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400 text-right">Valor</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400 text-right hidden md:table-cell">Comissao</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasRecentes.map((venda) => {
                      const statusConfig = getStatusConfig(venda.status)
                      return (
                        <TableRow
                          key={venda.id}
                          className="border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/admin/intermediacao/vendas/${venda.id}`)}
                        >
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                            {venda.codigo}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {venda.clienteNome}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                            {venda.empreendimento}
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrencyFull(venda.valorVenda)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium hidden md:table-cell">
                            {formatCurrencyFull(venda.comissaoTotal)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className={cn("h-2 w-2 rounded-full", statusConfig.color)} />
                              <span className={cn("text-xs font-medium", statusConfig.textColor)}>
                                {statusConfig.label}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium">Nenhuma venda encontrada</p>
                <p className="text-xs text-gray-400">Cadastre sua primeira venda!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Links Rapidos */}
        <Card className="animate-fadeInUp border-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800" style={{ animationDelay: "800ms" }}>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-emerald-500" />
              Links Rapidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950"
                onClick={() => router.push("/admin/intermediacao/vendas")}
              >
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-medium">Vendas</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
                onClick={() => router.push("/admin/intermediacao/beneficiarios")}
              >
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium">Beneficiarios</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-900 dark:hover:bg-purple-950"
                onClick={() => router.push("/admin/intermediacao/parcelas")}
              >
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="text-xs font-medium">Parcelas</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-950"
                onClick={() => router.push("/admin/intermediacao/pagamentos")}
              >
                <CreditCard className="h-5 w-5 text-orange-600" />
                <span className="text-xs font-medium">Pagamentos</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4 border-pink-200 hover:border-pink-400 hover:bg-pink-50 dark:border-pink-900 dark:hover:bg-pink-950"
                onClick={() => router.push("/admin/intermediacao/relatorios")}
              >
                <BarChart3 className="h-5 w-5 text-pink-600" />
                <span className="text-xs font-medium">Relatorios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
