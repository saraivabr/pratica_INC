"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  iconColor?: string
  loading?: boolean
}

export function MetricCard({ title, value, change, changeLabel, icon: Icon, iconColor = "text-blue-500", loading }: MetricCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0
  const isNeutral = !change || change === 0

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 animate-pulse">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24 mb-3" />
        <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-16 mb-2" />
        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-20" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
        {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {isPositive && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
          {isNegative && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
          {isNeutral && <Minus className="h-3.5 w-3.5 text-zinc-400" />}
          <span className={cn(
            "text-xs font-medium",
            isPositive && "text-emerald-500",
            isNegative && "text-red-500",
            isNeutral && "text-zinc-400"
          )}>
            {isPositive ? "+" : ""}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-zinc-400 ml-1">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
