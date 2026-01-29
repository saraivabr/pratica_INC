"use client"

import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface DashboardSectionProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  count?: number
  countLabel?: string
  children: React.ReactNode
  glowColor?: string
  emptyMessage?: string
  emptyIcon?: LucideIcon
}

export function DashboardSection({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-emerald-600 dark:text-emerald-400",
  count,
  countLabel,
  children,
  glowColor = "from-emerald-400 via-green-400 to-teal-400",
  emptyMessage = "Nenhum item para exibir",
  emptyIcon: EmptyIcon,
}: DashboardSectionProps) {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="relative">
              <div className={cn("absolute inset-0 bg-gradient-to-r rounded-lg blur-lg opacity-30", glowColor)} />
              <div className={cn("relative h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center", glowColor)}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {title}
              {count !== undefined && (
                <span className={cn("text-sm font-semibold px-2.5 py-0.5 rounded-full bg-gradient-to-r text-white", glowColor)}>
                  {count}
                </span>
              )}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {countLabel && count !== undefined && (
          <div className="text-right hidden sm:block">
            <p className="text-sm text-gray-500 dark:text-gray-400">{countLabel}</p>
            <p className={cn("text-2xl font-bold", iconColor)}>{count}</p>
          </div>
        )}
      </div>

      {/* Section Content */}
      <div className="relative">
        {/* Content area with glow effect */}
        <div className="relative group">
          <div className={cn("absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur opacity-10 group-hover:opacity-20 transition-all duration-500", glowColor)} />
          <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-800/60 overflow-hidden">
            {children || (
              <div className="p-12 text-center">
                {EmptyIcon && <EmptyIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />}
                <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
