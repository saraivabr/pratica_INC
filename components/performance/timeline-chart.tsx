"use client"

import { useMemo } from "react"

interface TimelineItem {
  date: string
  total: number
  convertidos: number
}

interface TimelineChartProps {
  data: TimelineItem[]
  loading?: boolean
}

export function TimelineChart({ data, loading }: TimelineChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-40 mb-4 animate-pulse" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>
    )
  }

  const maxValue = useMemo(() => Math.max(...data.map(d => d.total), 1), [data])

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Leads ao Longo do Tempo</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sem dados no período</p>
      </div>
    )
  }

  // Show at most ~30 bars
  const displayData = data.length > 35 ? data.filter((_, i) => i % Math.ceil(data.length / 30) === 0) : data

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Leads ao Longo do Tempo</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        Total <span className="inline-block w-3 h-2 bg-blue-400 rounded-sm mx-1" /> 
        Convertidos <span className="inline-block w-3 h-2 bg-emerald-400 rounded-sm mx-1" />
      </p>
      
      <div className="flex items-end gap-[2px] h-48">
        {displayData.map((item, i) => {
          const totalHeight = (item.total / maxValue) * 100
          const convertidosHeight = (item.convertidos / maxValue) * 100
          const dateStr = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-zinc-900 dark:bg-zinc-700 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                {dateStr}: {item.total} leads, {item.convertidos} convertidos
              </div>
              
              <div className="w-full flex flex-col items-center justify-end h-full">
                {/* Total bar */}
                <div
                  className="w-full bg-blue-400 dark:bg-blue-500 rounded-t-sm relative min-h-[2px]"
                  style={{ height: `${totalHeight}%` }}
                >
                  {/* Converted overlay */}
                  {item.convertidos > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-emerald-400 dark:bg-emerald-500 rounded-t-sm"
                      style={{ height: `${(item.convertidos / item.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              
              {/* Date label - show every few bars */}
              {(i === 0 || i === displayData.length - 1 || i % Math.max(1, Math.floor(displayData.length / 5)) === 0) && (
                <span className="text-[9px] text-zinc-400 mt-1 rotate-0">{dateStr}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
