"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { usePerformance } from "@/lib/use-performance"
import { MetricCard } from "@/components/performance/metric-card"
import { PeriodSelector } from "@/components/performance/period-selector"
import { StatusChart } from "@/components/performance/status-chart"
import { TimelineChart } from "@/components/performance/timeline-chart"
import { RankingTable } from "@/components/performance/ranking-table"
import {
  Users,
  Target,
  TrendingUp,
  Award,
  BarChart3,
  UserCircle,
} from "lucide-react"

export default function GerentePerformancePage() {
  usePageTracking("gerente-performance")
  const { user } = useAuth()
  const [period, setPeriod] = useState("30d")
  const [selectedCorretor, setSelectedCorretor] = useState<string | undefined>(undefined)
  
  const { data, loading, error } = usePerformance({ 
    period,
    // Gerente filtering is handled server-side via auth
  })

  return (
    <AppShell title="Performance da Equipe">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-500" />
              Performance da Equipe
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Acompanhe os resultados da sua equipe de corretores
            </p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Team Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total de Leads"
            value={data?.metrics.total_leads ?? '-'}
            change={data?.comparativo.total_leads}
            changeLabel="vs anterior"
            icon={Users}
            iconColor="text-blue-500"
            loading={loading}
          />
          <MetricCard
            title="Convertidos"
            value={data?.metrics.leads_convertidos ?? '-'}
            change={data?.comparativo.leads_convertidos}
            changeLabel="vs anterior"
            icon={Target}
            iconColor="text-emerald-500"
            loading={loading}
          />
          <MetricCard
            title="Taxa de Conversão"
            value={data ? `${data.metrics.taxa_conversao}%` : '-'}
            change={data?.comparativo.taxa_conversao}
            changeLabel="pp"
            icon={TrendingUp}
            iconColor="text-indigo-500"
            loading={loading}
          />
          <MetricCard
            title="Vendas Realizadas"
            value={data?.metrics.vendas_realizadas ?? '-'}
            icon={Award}
            iconColor="text-amber-500"
            loading={loading}
          />
          <MetricCard
            title="Corretores Ativos"
            value={data?.ranking.length ?? '-'}
            icon={UserCircle}
            iconColor="text-purple-500"
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimelineChart data={data?.timeline ?? []} loading={loading} />
          <StatusChart data={data?.leads_por_status ?? []} loading={loading} />
        </div>

        {/* Ranking */}
        <RankingTable
          data={data?.ranking ?? []}
          loading={loading}
          showAlerts={true}
          onCorretorClick={(nome) => {
            // Could navigate to detailed view
            setSelectedCorretor(nome)
          }}
        />

        {/* Selected corretor detail */}
        {selectedCorretor && data?.ranking && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Detalhes: {selectedCorretor}
              </h3>
              <button
                onClick={() => setSelectedCorretor(undefined)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Fechar
              </button>
            </div>
            {(() => {
              const c = data.ranking.find(r => r.corretor_nome === selectedCorretor)
              if (!c) return <p className="text-sm text-zinc-500">Corretor não encontrado</p>
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Leads</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{c.total_leads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Convertidos</p>
                    <p className="text-lg font-bold text-emerald-600">{c.convertidos}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Perdidos</p>
                    <p className="text-lg font-bold text-red-500">{c.perdidos}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Em Atendimento</p>
                    <p className="text-lg font-bold text-blue-600">{c.em_atendimento}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Taxa Conversão</p>
                    <p className="text-lg font-bold text-indigo-600">{c.taxa_conversao}%</p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </AppShell>
  )
}
