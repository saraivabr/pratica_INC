"use client"

import { Loader2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: string
  bgColor?: string
  loading?: boolean
  variant?: "default" | "compact"
  gradient?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = "text-emerald-500",
  bgColor = "bg-emerald-500/10",
  loading = false,
  variant = "default",
  gradient = "from-emerald-400 to-green-500",
}: StatsCardProps) {
  return (
    <div className="relative group">
      {/* Card glow effect */}
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r rounded-3xl blur-lg opacity-20 transition-opacity duration-300 group-hover:opacity-30 will-change-transform",
        gradient
      )} />

      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-emerald-900/10 dark:shadow-emerald-400/5 border border-white/60 dark:border-gray-800/60 overflow-hidden">
        {/* Animated top border */}
        <div className={cn("h-1 bg-gradient-to-r animate-gradient will-change-transform", gradient)} />

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p
                className={cn(
                  "text-gray-500 dark:text-gray-400 mb-2",
                  variant === "default"
                    ? "text-xs font-semibold uppercase tracking-wider"
                    : "text-sm"
                )}
              >
                {title}
              </p>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              ) : (
                <p className="text-4xl font-bold text-gray-900 dark:text-white animate-fadeInUp">
                  {value}
                </p>
              )}
            </div>
            
            {/* Icon with glow */}
            <div className="relative">
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br rounded-xl blur-md opacity-50 transition-all duration-300 group-hover:opacity-70 group-hover:scale-110 will-change-transform",
                gradient
              )} />
              <div
                className={cn(
                  "relative p-3 rounded-xl bg-gradient-to-br transition-all duration-300 group-hover:scale-110 will-change-transform",
                  gradient
                )}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
