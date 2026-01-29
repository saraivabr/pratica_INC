"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Clock,
  Award,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Metricas {
  total_leads: number
  leads_periodo: number
  total_ganhos: number
  ganhos_periodo: number
  taxa_conversao: number
  tempo_medio_conversao: number
  valor_total_vendas: number
  valor_periodo: number
}

interface PerformanceData {
  metricas: Metricas
  leads_por_status: Array<{ status: string; count: string }>
  timeline: Array<{ data: string; leads: string; conversoes: string }>
  top_empreendimentos: Array<{
    nome: string
    leads_count: string
    vendas: string
    valor_total: string
  }>
}

export default function PerformancePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PerformanceData | null>(null)
  const [periodo, setPeriodo] = useState(30)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch(`/api/corretor/performance?periodo=${periodo}`)
        const json = await res.json()
        
        if (json.success) {
          setData(json)
        }
      } catch (error) {
        console.error("Erro ao carregar performance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [periodo])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (!data) {
    return (
      <AppShell>
        <div className="p-8 text-center text-slate-500">
          Erro ao carregar dados de performance
        </div>
      </AppShell>
    )
  }

  const { metricas } = data

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Performance</h1>
            <p className="text-slate-500">Análise de vendas e conversão</p>
          </div>

          {/* Period selector */}
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setPeriodo(days)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  periodo === days
                    ? "bg-primary text-white shadow-lg"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label="Total de Leads"
            value={metricas.total_leads}
            change={metricas.leads_periodo}
            changeLabel={`+${metricas.leads_periodo} neste período`}
            color="blue"
          />

          <MetricCard
            icon={<Award className="h-5 w-5" />}
            label="Vendas Fechadas"
            value={metricas.total_ganhos}
            change={metricas.ganhos_periodo}
            changeLabel={`+${metricas.ganhos_periodo} neste período`}
            color="emerald"
          />

          <MetricCard
            icon={<Target className="h-5 w-5" />}
            label="Taxa de Conversão"
            value={`${metricas.taxa_conversao.toFixed(1)}%`}
            change={metricas.taxa_conversao > 15 ? 1 : -1}
            changeLabel={metricas.taxa_conversao > 15 ? "Acima da média" : "Abaixo da média"}
            color="purple"
          />

          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Tempo Médio"
            value={`${metricas.tempo_medio_conversao.toFixed(0)} dias`}
            change={metricas.tempo_medio_conversao < 30 ? 1 : -1}
            changeLabel="Para conversão"
            color="amber"
          />
        </div>

        {/* Revenue Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Valor Total em Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                R$ {(metricas.valor_total_vendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-emerald-100 text-sm mt-2">
              R$ {(metricas.valor_periodo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} nos últimos {periodo} dias
            </p>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.leads_por_status.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{item.status}</span>
                        <span className="text-sm text-slate-500">{item.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${(parseInt(item.count) / metricas.leads_periodo) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Empreendimentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Empreendimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.top_empreendimentos.slice(0, 5).map((emp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="font-medium text-sm">{emp.nome}</p>
                      <p className="text-xs text-slate-500">
                        {emp.vendas} vendas de {emp.leads_count} leads
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        R$ {parseFloat(emp.valor_total || '0').toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function MetricCard({
  icon,
  label,
  value,
  change,
  changeLabel,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  color: string
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2 rounded-lg", colorClasses[color as keyof typeof colorClasses])}>
            {icon}
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              {change > 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {changeLabel && (
            <p className="text-xs text-slate-500 mt-1">{changeLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
