/**
 * @fileoverview Componente de badge para temperatura do lead
 * @module components/lead/LeadScoreBadge
 */

"use client"

import { cn } from "@/lib/utils"
import {
  Flame,
  Thermometer,
  Snowflake,
  AlertTriangle,
} from "lucide-react"
import type { LeadTemperature } from "@/types/leadScore"
import { getTemperatureConfig } from "@/utils/leadScore"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// =============================================================================
// TIPOS
// =============================================================================

interface LeadScoreBadgeProps {
  /** Temperatura do lead */
  temperature: LeadTemperature

  /** Score numérico (0-100) */
  score?: number

  /** Mostrar o score ao lado da temperatura */
  showScore?: boolean

  /** Tamanho do badge */
  size?: "sm" | "md" | "lg"

  /** Variante visual */
  variant?: "default" | "outline" | "solid"

  /** Mostrar ícone */
  showIcon?: boolean

  /** Classe CSS adicional */
  className?: string

  /** Mostrar tooltip com descrição */
  showTooltip?: boolean
}

// =============================================================================
// MAPA DE ÍCONES
// =============================================================================

const ICON_MAP = {
  Quente: Flame,
  Morno: Thermometer,
  Frio: Snowflake,
  Risco: AlertTriangle,
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function LeadScoreBadge({
  temperature,
  score,
  showScore = false,
  size = "md",
  variant = "default",
  showIcon = true,
  className,
  showTooltip = true,
}: LeadScoreBadgeProps) {
  const config = getTemperatureConfig(temperature)
  const Icon = ICON_MAP[temperature]

  // Classes de tamanho
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  }

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }

  // Classes de variante
  const variantClasses = {
    default: cn(
      config.bgColorLight,
      config.textColor,
      config.borderColor,
      "border"
    ),
    outline: cn(
      "bg-transparent",
      config.textColor,
      config.borderColor,
      "border-2"
    ),
    solid: cn(
      config.bgColor,
      "text-white",
      "border-transparent",
      "shadow-sm"
    ),
  }

  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all duration-200",
        sizeClasses[size],
        variantClasses[variant],
        variant === "default" && "hover:shadow-sm",
        variant === "solid" && "hover:shadow-md",
        className
      )}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span
          className={cn(
            "ml-1 font-bold tabular-nums",
            variant === "solid" ? "opacity-90" : "opacity-80"
          )}
        >
          {score}
        </span>
      )}
    </span>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="top"
          className={cn(
            "max-w-xs p-3",
            config.borderColor,
            "border-2"
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", config.textColor)} />
              <span className={cn("font-semibold", config.textColor)}>
                {config.label}
              </span>
              {score !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Score: {score}/100
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
