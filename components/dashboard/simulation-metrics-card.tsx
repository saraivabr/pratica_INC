"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calculator,
  TrendingUp,
  Building2,
  Clock,
  BarChart3,
  PieChart,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SimulationStats {
  totalSimulations: number
  sbpeCount: number
  mcmvCount: number
  sbpePercentage: string
  mcmvPercentage: string
  avgCET: string
  cetRanges: {
    '0-10%': number
    '10-12%': number
    '12-14%': number
    '14%+': number
  }
  avgLoanAmount: number
  simulationsPerDay: Array<{ date: string; count: number }>
  avgTimeToSimulation: number
}

function formatCurrency(value: number): string {
  if (value === undefined || value === null || Number.isNaN(value) || !isFinite(value)) return "R$ 0";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "success" | "primary"
}) {
  const variantStyles = {
    default: "bg-secondary/50",
    success: "bg-emerald-500/10 border border-emerald-500/20",
    primary: "bg-primary/10 border border-primary/20",
  }

  const textStyles = {
    default: "text-foreground",
    success: "text-emerald-600",
    primary: "text-primary",
  }

  return (
    <div className={cn("p-4 rounded-xl", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
            {label}
          </p>
          <p className={cn("text-2xl font-bold", textStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", variantStyles[variant])}>
          <Icon className={cn("h-5 w-5", textStyles[variant])} />
        </div>
      </div>
    </div>
  )
}

export function SimulationMetricsCard() {
  const [stats, setStats] = useState<SimulationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats/simulations?days=30')
        const result = await response.json()

        if (result.success) {
          setStats(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Erro ao carregar métricas')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Métricas de Simulações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-8 w-8 animate-spin mx-auto mb-2" />
            Carregando métricas...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Métricas de Simulações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error || 'Sem dados disponíveis'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Métricas de Simulações CEF
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Últimos 30 dias • {stats.totalSimulations} simulações
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total de Simulações"
            value={stats.totalSimulations}
            icon={Calculator}
            variant="primary"
          />
          <StatCard
            label="CET Médio"
            value={`${stats.avgCET}%`}
            subtitle="Custo efetivo total"
            icon={TrendingUp}
          />
          <StatCard
            label="Valor Médio"
            value={formatCurrency(stats.avgLoanAmount)}
            subtitle="Financiamento"
            icon={Building2}
          />
          <StatCard
            label="Tempo Médio"
            value={`${stats.avgTimeToSimulation}min`}
            subtitle="Até simulação"
            icon={Clock}
          />
        </div>

        {/* SBPE vs MCMV Breakdown */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">SBPE vs MCMV</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SBPE (10,49%)</span>
                <Badge variant="outline">{stats.sbpePercentage}%</Badge>
              </div>
              <p className="text-2xl font-bold">{stats.sbpeCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Financiamento padrão
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">MCMV (5%)</span>
                <Badge variant="default">{stats.mcmvPercentage}%</Badge>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.mcmvCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Taxa subsidiada
              </p>
            </div>
          </div>
        </div>

        {/* CET Distribution */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">Distribuição por CET</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(stats.cetRanges).map(([range, count]) => {
              const percentage = stats.totalSimulations > 0
                ? (count / stats.totalSimulations * 100).toFixed(0)
                : 0;
              
              return (
                <div key={range} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-[60px]">{range}</span>
                  <div className="flex-1 h-8 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium min-w-[60px] text-right">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Simulations Per Day */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">Simulações nos Últimos 7 Dias</h4>
          </div>
          <div className="flex items-end justify-between gap-1 h-24">
            {stats.simulationsPerDay.map((day) => {
              const maxCount = Math.max(...stats.simulationsPerDay.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary rounded-t transition-all duration-500 hover:bg-primary/80"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    title={`${day.count} simulações`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
