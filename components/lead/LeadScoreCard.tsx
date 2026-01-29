/**
 * @fileoverview Componente de card detalhado para score do lead
 * @module components/lead/LeadScoreCard
 */

"use client"

import { cn } from "@/lib/utils"
import {
  Clock,
  MessageSquare,
  Building2,
  Activity,
  TrendingUp,
  Info,
  Target,
} from "lucide-react"
import type { LeadScore } from "@/types/leadScore"
import { getTemperatureConfig } from "@/utils/leadScore"
import { LeadScoreBadge } from "./LeadScoreBadge"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// =============================================================================
// TIPOS
// =============================================================================

interface LeadScoreCardProps {
  /** Dados completos do score */
  leadScore: LeadScore

  /** Mostrar breakdown detalhado dos fatores */
  showBreakdown?: boolean

  /** Variante visual */
  variant?: "default" | "compact" | "detailed"

  /** Classe CSS adicional */
  className?: string
}

// =============================================================================
// MAPA DE ÍCONES PARA FATORES
// =============================================================================

const FACTOR_ICON_MAP: Record<string, React.ElementType> = {
  "Tempo sem Resposta": Clock,
  "Interação Recente": MessageSquare,
  "Tipo de Imóvel": Building2,
  "Ações do Cliente": Activity,
  "Histórico do Corretor": TrendingUp,
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

/**
 * Gauge circular para mostrar o score principal
 */
function ScoreGauge({ score, temperature }: { score: number; temperature: string }) {
  const config = getTemperatureConfig(temperature as any)
  const percentage = score
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative h-32 w-32">
      <svg
        className="h-32 w-32 -rotate-90 transform"
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-muted/20"
        />

        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cn("transition-all duration-700", config.bgColor.replace("bg-", "stroke-"))}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold tabular-nums", config.textColor)}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">de 100</span>
      </div>
    </div>
  )
}

/**
 * Barra de progresso para um fator individual
 */
function FactorBar({ factor }: { factor: any }) {
  const Icon = FACTOR_ICON_MAP[factor.name] || Info
  const percentage = factor.percentage

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="space-y-2 cursor-help">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{factor.name}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {factor.points}/{factor.maxPoints}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{factor.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function LeadScoreCard({
  leadScore,
  showBreakdown = true,
  variant = "default",
  className,
}: LeadScoreCardProps) {
  const config = getTemperatureConfig(leadScore.temperature)

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-lg border",
          config.bgColorLight,
          config.borderColor,
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                config.bgColor
              )}
            >
              <span className="text-lg font-bold text-white">
                {leadScore.score}
              </span>
            </div>
          </div>
          <div>
            <LeadScoreBadge
              temperature={leadScore.temperature}
              showIcon={true}
              size="sm"
              variant="outline"
              showTooltip={false}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Prioridade: {leadScore.priority}/10
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {leadScore.mainReason}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header com score e temperatura */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6",
          config.bgColorLight,
          config.borderColor
        )}
      >
        {/* Barra de destaque no topo */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
            config.gradient
          )}
        />

        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <LeadScoreBadge
                temperature={leadScore.temperature}
                score={leadScore.score}
                showScore={true}
                size="lg"
                variant="solid"
                showTooltip={false}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                {leadScore.actionMessage}
              </p>
              <p className="text-xs text-muted-foreground">
                {leadScore.mainReason}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span>Prioridade: {leadScore.priority}/10</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  Calculado: {new Date(leadScore.calculatedAt).toLocaleTimeString("pt-BR")}
                </span>
              </div>
            </div>
          </div>

          {/* Gauge circular */}
          <ScoreGauge score={leadScore.score} temperature={leadScore.temperature} />
        </div>
      </div>

      {/* Breakdown dos fatores */}
      {showBreakdown && variant === "detailed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4" />
            <span>Breakdown do Score</span>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-4">
            {leadScore.factorDetails.map((factor) => (
              <FactorBar key={factor.name} factor={factor} />
            ))}
          </div>

          {/* Resumo dos pontos */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {leadScore.factorDetails.map((factor) => {
              const Icon = FACTOR_ICON_MAP[factor.name] || Info
              return (
                <div
                  key={factor.name}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card text-center"
                >
                  <Icon className="h-5 w-5 text-muted-foreground mb-2" />
                  <span className="text-lg font-bold">{factor.points}</span>
                  <span className="text-xs text-muted-foreground">
                    de {factor.maxPoints}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
