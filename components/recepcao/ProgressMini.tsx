"use client"

import { cn } from "@/lib/utils"

interface ProgressMiniProps {
  value: number
  max: number
  showLabel?: boolean
  labelFormat?: "fraction" | "percentage" | "remaining"
  size?: "xs" | "sm" | "md"
  color?: "blue" | "emerald" | "yellow" | "red" | "gradient"
  className?: string
}

const sizeConfig = {
  xs: "h-1",
  sm: "h-2",
  md: "h-3",
}

const colorConfig = {
  blue: "[&>div]:bg-blue-500",
  emerald: "[&>div]:bg-emerald-500",
  yellow: "[&>div]:bg-yellow-500",
  red: "[&>div]:bg-red-500",
  gradient: "[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-emerald-500",
}

export function ProgressMini({
  value,
  max,
  showLabel = true,
  labelFormat = "fraction",
  size = "sm",
  color = "gradient",
  className,
}: ProgressMiniProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const remaining = Math.max(max - value, 0)

  const formatLabel = () => {
    switch (labelFormat) {
      case "percentage":
        return `${Math.round(percentage)}%`
      case "remaining":
        return `${remaining} restantes`
      case "fraction":
      default:
        return `${value} / ${max}`
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatLabel()}</span>
          {percentage >= 100 && (
            <span className="text-emerald-600 font-medium">Completo!</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden",
          sizeConfig[size],
          colorConfig[color]
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Versao circular para uso compacto
interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  showValue?: boolean
  color?: "blue" | "emerald" | "yellow" | "red"
  className?: string
}

const circularColorConfig = {
  blue: "text-blue-500",
  emerald: "text-emerald-500",
  yellow: "text-yellow-500",
  red: "text-red-500",
}

export function CircularProgress({
  value,
  max,
  size = 48,
  strokeWidth = 4,
  showValue = true,
  color = "emerald",
  className,
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          className="text-zinc-200 dark:text-zinc-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500", circularColorConfig[color])}
        />
      </svg>
      {showValue && (
        <span className="absolute text-xs font-semibold">
          {value}
        </span>
      )}
    </div>
  )
}
