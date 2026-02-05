"use client"

import { cn } from "@/lib/utils"

interface QueuePositionProps {
  posicao: number | null
  total?: number
  label?: string
  subtitle?: string
  size?: "sm" | "md" | "lg"
  color?: "emerald" | "blue" | "yellow" | "amber" | "purple" | "zinc"
  pulse?: boolean
  className?: string
}

const sizeConfig = {
  sm: {
    number: "text-3xl",
    total: "text-sm",
    label: "text-xs",
    subtitle: "text-xs",
  },
  md: {
    number: "text-5xl",
    total: "text-lg",
    label: "text-sm",
    subtitle: "text-sm",
  },
  lg: {
    number: "text-7xl",
    total: "text-2xl",
    label: "text-base",
    subtitle: "text-base",
  },
}

const colorConfig = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  amber: "text-amber-600 dark:text-amber-400",
  purple: "text-purple-600 dark:text-purple-400",
  zinc: "text-zinc-500 dark:text-zinc-400",
}

export function QueuePosition({
  posicao,
  total,
  label,
  subtitle,
  size = "md",
  color = "emerald",
  pulse = false,
  className,
}: QueuePositionProps) {
  const sizeClasses = sizeConfig[size]
  const colorClass = colorConfig[color]

  if (posicao === null || posicao === undefined) {
    return (
      <div className={cn("text-center", className)}>
        <span className={cn(sizeClasses.number, "font-bold text-muted-foreground")}>
          -
        </span>
        {label && (
          <p className={cn(sizeClasses.label, "text-muted-foreground mt-1")}>
            {label}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn("text-center", pulse && "animate-pulse", className)}>
      {/* Label acima */}
      {label && (
        <p className={cn(sizeClasses.label, "text-muted-foreground mb-1 uppercase tracking-wide font-medium")}>
          {label}
        </p>
      )}

      {/* Numero grande */}
      <div className="flex items-baseline justify-center gap-1">
        <span
          className={cn(
            sizeClasses.number,
            "font-black tabular-nums transition-all duration-500",
            colorClass
          )}
        >
          #{posicao}
        </span>
        {total && (
          <span className={cn(sizeClasses.total, "text-muted-foreground font-medium")}>
            de {total}
          </span>
        )}
      </div>

      {/* Subtitle abaixo */}
      {subtitle && (
        <p className={cn(sizeClasses.subtitle, "text-muted-foreground mt-1")}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// Versao inline compacta para uso em listas
interface QueuePositionBadgeProps {
  posicao: number
  color?: "emerald" | "blue" | "yellow" | "amber" | "purple" | "zinc"
  className?: string
}

export function QueuePositionBadge({
  posicao,
  color = "emerald",
  className,
}: QueuePositionBadgeProps) {
  const bgColors = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  }

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
        bgColors[color],
        className
      )}
    >
      {posicao}
    </div>
  )
}
