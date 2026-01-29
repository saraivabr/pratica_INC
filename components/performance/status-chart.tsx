"use client"

import { cn } from "@/lib/utils"

interface StatusItem {
  status: string
  count: number
}

interface StatusChartProps {
  data: StatusItem[]
  loading?: boolean
}

const statusColors: Record<string, string> = {
  'Venda Realizada': 'bg-emerald-500',
  'Com Reserva': 'bg-emerald-400',
  'Em Atendimento': 'bg-blue-500',
  'Visita Agendada': 'bg-blue-400',
  'Visita Realizada': 'bg-blue-300',
  'Em Análise de Crédito': 'bg-indigo-400',
  'Montagem Pasta': 'bg-indigo-300',
  'Simulação': 'bg-indigo-200',
  'Aguardando Atendimento': 'bg-amber-400',
  'Aguardando Atendimento Corretor': 'bg-amber-500',
  'Perdido': 'bg-red-400',
}

function getColor(status: string) {
  return statusColors[status] || 'bg-zinc-400'
}

export function StatusChart({ data, loading }: StatusChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-32 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Leads por Status</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sem dados no período</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Leads por Status</h3>
      
      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-3 mb-4">
        {data.map((item, i) => (
          <div
            key={i}
            className={cn("transition-all", getColor(item.status))}
            style={{ width: `${(item.count / total) * 100}%` }}
            title={`${item.status}: ${item.count}`}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", getColor(item.status))} />
              <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">{item.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-900 dark:text-white">{item.count}</span>
              <span className="text-zinc-400 text-xs">({Math.round((item.count / total) * 100)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
