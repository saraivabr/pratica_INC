"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, Trophy, AlertTriangle } from "lucide-react"

interface RankingItem {
  corretor_nome: string
  total_leads: number
  convertidos: number
  perdidos: number
  em_atendimento: number
  score_medio: number
  taxa_conversao: number
}

interface RankingTableProps {
  data: RankingItem[]
  loading?: boolean
  onCorretorClick?: (nome: string) => void
  showAlerts?: boolean
}

type SortKey = keyof RankingItem
type SortDir = 'asc' | 'desc'

export function RankingTable({ data, loading, onCorretorClick, showAlerts = false }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('convertidos')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    }
    return sortDir === 'desc'
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal))
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="h-3 w-3 text-zinc-300" />
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-40 mb-4 animate-pulse" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded mb-2 animate-pulse" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Ranking de Corretores</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sem dados no período</p>
      </div>
    )
  }

  // Top 3 performers
  const topPerformers = [...data].sort((a, b) => b.taxa_conversao - a.taxa_conversao).slice(0, 3)
  // Need attention: high leads but low conversion
  const needAttention = data.filter(c => c.total_leads >= 10 && c.taxa_conversao < 2)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Ranking de Corretores</h3>
      
      {showAlerts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Top performers */}
          {topPerformers.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Top Performers</span>
              </div>
              {topPerformers.map((c, i) => (
                <p key={i} className="text-xs text-emerald-600 dark:text-emerald-300">
                  {['🥇', '🥈', '🥉'][i]} {c.corretor_nome} — {c.taxa_conversao}% conversão
                </p>
              ))}
            </div>
          )}
          
          {/* Need attention */}
          {needAttention.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Precisam de Atenção</span>
              </div>
              {needAttention.slice(0, 3).map((c, i) => (
                <p key={i} className="text-xs text-amber-600 dark:text-amber-300">
                  ⚠️ {c.corretor_nome} — {c.total_leads} leads, {c.taxa_conversao}% conv.
                </p>
              ))}
              {needAttention.length > 3 && (
                <p className="text-xs text-amber-500 mt-1">+{needAttention.length - 3} mais</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left py-2 px-2 text-zinc-500 dark:text-zinc-400 font-medium">#</th>
              <th
                className="text-left py-2 px-2 text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer hover:text-zinc-700"
                onClick={() => handleSort('corretor_nome')}
              >
                <span className="flex items-center gap-1">Corretor <SortIcon col="corretor_nome" /></span>
              </th>
              <th
                className="text-right py-2 px-2 text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer hover:text-zinc-700"
                onClick={() => handleSort('total_leads')}
              >
                <span className="flex items-center justify-end gap-1">Leads <SortIcon col="total_leads" /></span>
              </th>
              <th
                className="text-right py-2 px-2 text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer hover:text-zinc-700"
                onClick={() => handleSort('convertidos')}
              >
                <span className="flex items-center justify-end gap-1">Conv. <SortIcon col="convertidos" /></span>
              </th>
              <th
                className="text-right py-2 px-2 text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer hover:text-zinc-700"
                onClick={() => handleSort('perdidos')}
              >
                <span className="flex items-center justify-end gap-1">Perd. <SortIcon col="perdidos" /></span>
              </th>
              <th
                className="text-right py-2 px-2 text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer hover:text-zinc-700"
                onClick={() => handleSort('taxa_conversao')}
              >
                <span className="flex items-center justify-end gap-1">Taxa <SortIcon col="taxa_conversao" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
                  onCorretorClick && "cursor-pointer"
                )}
                onClick={() => onCorretorClick?.(item.corretor_nome)}
              >
                <td className="py-2.5 px-2 text-zinc-400">
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </td>
                <td className="py-2.5 px-2 font-medium text-zinc-900 dark:text-white truncate max-w-[200px]">
                  {item.corretor_nome}
                </td>
                <td className="py-2.5 px-2 text-right text-zinc-700 dark:text-zinc-300">
                  {item.total_leads}
                </td>
                <td className="py-2.5 px-2 text-right">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.convertidos}</span>
                </td>
                <td className="py-2.5 px-2 text-right">
                  <span className="text-red-500 dark:text-red-400">{item.perdidos}</span>
                </td>
                <td className="py-2.5 px-2 text-right">
                  <span className={cn(
                    "font-medium",
                    item.taxa_conversao >= 5 ? "text-emerald-600 dark:text-emerald-400" :
                    item.taxa_conversao >= 2 ? "text-amber-600 dark:text-amber-400" :
                    "text-red-500 dark:text-red-400"
                  )}>
                    {item.taxa_conversao}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
