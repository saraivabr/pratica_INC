"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  Loader2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Trophy,
  ShieldAlert,
  ShieldQuestion,
  ShieldCheck,
  ShieldPlus,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ScoreDisplayProps {
  score: number
  probabilidade?: string
  faixa?: string
  loading?: boolean
}

// Configuracao detalhada de cada faixa de score
const SCORE_RANGES = [
  {
    min: 0,
    max: 300,
    label: "Ruim",
    icon: AlertTriangle,
    shieldIcon: ShieldAlert,
    color: {
      text: "text-red-500",
      bg: "bg-red-500",
      bgLight: "bg-red-500/10",
      border: "border-red-500/30",
      gradient: "from-red-500 to-red-400",
      hex: "#ef4444",
      glow: "rgba(239, 68, 68, 0.5)"
    },
    description: "Alto risco de inadimplencia",
    details: "Score entre 0-300 indica historico de credito muito comprometido. Recomenda-se cautela maxima.",
    recommendation: "Solicitar garantias adicionais ou pagamento antecipado"
  },
  {
    min: 301,
    max: 500,
    label: "Regular",
    icon: TrendingDown,
    shieldIcon: ShieldQuestion,
    color: {
      text: "text-orange-500",
      bg: "bg-orange-500",
      bgLight: "bg-orange-500/10",
      border: "border-orange-500/30",
      gradient: "from-orange-500 to-orange-400",
      hex: "#f97316",
      glow: "rgba(249, 115, 22, 0.5)"
    },
    description: "Risco moderado a alto",
    details: "Score entre 301-500 indica historico de credito com pendencias. Analise caso a caso.",
    recommendation: "Avaliar condicoes de pagamento diferenciadas"
  },
  {
    min: 501,
    max: 700,
    label: "Bom",
    icon: TrendingUp,
    shieldIcon: ShieldCheck,
    color: {
      text: "text-yellow-500",
      bg: "bg-yellow-500",
      bgLight: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      gradient: "from-yellow-500 to-yellow-400",
      hex: "#eab308",
      glow: "rgba(234, 179, 8, 0.5)"
    },
    description: "Risco baixo a moderado",
    details: "Score entre 501-700 indica bom historico de credito com algumas restricoes.",
    recommendation: "Condicoes de pagamento padrao podem ser aplicadas"
  },
  {
    min: 701,
    max: 1000,
    label: "Excelente",
    icon: Trophy,
    shieldIcon: ShieldPlus,
    color: {
      text: "text-emerald-500",
      bg: "bg-emerald-500",
      bgLight: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      gradient: "from-emerald-500 to-emerald-400",
      hex: "#10b981",
      glow: "rgba(16, 185, 129, 0.5)"
    },
    description: "Baixissimo risco",
    details: "Score entre 701-1000 indica excelente historico de credito e comportamento financeiro.",
    recommendation: "Cliente confiavel para condicoes facilitadas"
  }
]

function getScoreRange(score: number) {
  return SCORE_RANGES.find(range => score >= range.min && score <= range.max) || SCORE_RANGES[0]
}

function getScoreConfig(score: number) {
  const range = getScoreRange(score)
  return {
    text: range.color.text,
    bg: range.color.bg,
    bgLight: range.color.bgLight,
    label: range.label,
    gradientId: `scoreGradient${range.label}`,
    colors: {
      start: range.color.hex,
      mid: range.color.hex,
      end: range.color.hex
    },
    glowColor: range.color.glow,
    shadowColor: `0 0 30px ${range.color.glow}`
  }
}

function getCirclePoint(angle: number, radius: number, cx: number, cy: number) {
  const radians = (angle - 90) * (Math.PI / 180)
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  }
}

// Componente de Loading State melhorado
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      {/* Gauge animado de loading */}
      <div className="relative h-44 w-44">
        <svg className="h-44 w-44 -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
            className="stroke-muted/30"
          />
          {/* Arco animado */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-muted-foreground/40"
            style={{
              strokeDasharray: "66 198",
              animation: "spin 1.5s linear infinite",
              transformOrigin: "center"
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>

      {/* Skeleton da barra de progresso */}
      <div className="w-full max-w-sm space-y-3">
        <div className="flex justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-6 w-16 rounded-md bg-muted/50 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="h-4 w-full rounded-full bg-muted/30 overflow-hidden">
          <div
            className="h-full w-1/3 rounded-full bg-muted/50 animate-pulse"
            style={{
              animation: "shimmer 2s ease-in-out infinite"
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground animate-pulse">
          Consultando score de credito...
        </span>
        <span className="text-xs text-muted-foreground/60">
          Isso pode levar alguns segundos
        </span>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); opacity: 0.5; }
          50% { transform: translateX(200%); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Componente de segmento da barra de progresso
function ProgressSegment({
  range,
  isActive,
  isFilled,
  fillPercentage,
  animationDelay
}: {
  range: typeof SCORE_RANGES[0]
  isActive: boolean
  isFilled: boolean
  fillPercentage: number
  animationDelay: number
}) {
  const Icon = range.icon

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex-1 h-4 transition-all duration-500 cursor-help",
              "first:rounded-l-full last:rounded-r-full",
              "border-r border-background/50 last:border-r-0"
            )}
            style={{ animationDelay: `${animationDelay}ms` }}
          >
            {/* Background do segmento */}
            <div
              className={cn(
                "absolute inset-0 transition-all duration-300",
                "first:rounded-l-full last:rounded-r-full",
                isActive ? range.color.bgLight : "bg-muted/20",
                isActive && "ring-2 ring-offset-1 ring-offset-background",
                isActive && range.color.border.replace("border", "ring")
              )}
            />

            {/* Preenchimento do segmento */}
            {(isFilled || fillPercentage > 0) && (
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-700 ease-out",
                  "first:rounded-l-full",
                  fillPercentage >= 100 && "last:rounded-r-full",
                  `bg-gradient-to-r ${range.color.gradient}`
                )}
                style={{
                  width: `${Math.min(fillPercentage, 100)}%`,
                  boxShadow: isActive ? `0 0 12px ${range.color.glow}` : undefined
                }}
              />
            )}

            {/* Icone indicador quando ativo */}
            {isActive && (
              <div
                className={cn(
                  "absolute -top-8 left-1/2 -translate-x-1/2",
                  "flex items-center justify-center",
                  "h-6 w-6 rounded-full",
                  range.color.bg,
                  "text-white shadow-lg",
                  "animate-bounce"
                )}
                style={{
                  boxShadow: `0 0 15px ${range.color.glow}`
                }}
              >
                <Icon className="h-3 w-3" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className={cn(
            "max-w-xs p-3 space-y-2",
            range.color.border,
            "border-2"
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center h-6 w-6 rounded-lg",
              range.color.bgLight
            )}>
              <Icon className={cn("h-4 w-4", range.color.text)} />
            </div>
            <span className={cn("font-semibold", range.color.text)}>
              {range.label}
            </span>
            <span className="text-xs text-muted-foreground">
              ({range.min} - {range.max})
            </span>
          </div>
          <p className="text-sm">{range.details}</p>
          <div className="pt-1 border-t border-border/50">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              {range.recommendation}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ScoreDisplay({ score, probabilidade, faixa, loading }: ScoreDisplayProps) {
  const [animatedScore, setAnimatedScore] = useState(loading ? 0 : score)
  const [isAnimating, setIsAnimating] = useState(!loading)
  const [showDetails, setShowDetails] = useState(false)
  const animationRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLoadingRef = useRef(loading)
  const prevScoreRef = useRef(score)

  const config = getScoreConfig(score)
  const currentRange = getScoreRange(score)
  const percentage = (animatedScore / 1000) * 100
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const thresholds = [
    { value: 300, angle: (300 / 1000) * 360 },
    { value: 500, angle: (500 / 1000) * 360 },
    { value: 700, angle: (700 / 1000) * 360 }
  ]

  // Funcao de animacao usando useCallback para evitar recriacao
  const startAnimation = useCallback((targetScore: number) => {
    const duration = 1500
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const currentValue = Math.round(startValue + (targetScore - startValue) * eased)

      setAnimatedScore(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        timeoutRef.current = setTimeout(() => setShowDetails(true), 300)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  // Efeito para iniciar animacao quando loading muda de true para false
  // O setState sincrono aqui e intencional para animacoes baseadas em requestAnimationFrame
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    const scoreChanged = prevScoreRef.current !== score
    prevLoadingRef.current = loading
    prevScoreRef.current = score

    // Limpa animacoes anteriores
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (loading) {
      // Reset quando comeca a carregar
      setAnimatedScore(0)
      setIsAnimating(false)
      setShowDetails(false)
    } else if (wasLoading || scoreChanged) {
      // Inicia animacao quando termina de carregar ou score muda
      setAnimatedScore(0)
      setIsAnimating(true)
      setShowDetails(false)
      // Usa setTimeout para iniciar animacao no proximo tick
      setTimeout(() => startAnimation(score), 0)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [score, loading, startAnimation])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return <LoadingState />
  }

  const ShieldIcon = currentRange.shieldIcon
  const RangeIcon = currentRange.icon

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6">
      {/* Gauge Circular Premium */}
      <div
        className="relative h-44 w-44"
        style={{
          filter: isAnimating ? "none" : `drop-shadow(${config.shadowColor})`
        }}
      >
        <svg
          className="h-44 w-44 -rotate-90 transform"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id={config.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.colors.start} />
              <stop offset="50%" stopColor={config.colors.mid} />
              <stop offset="100%" stopColor={config.colors.end} />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="10"
            className="stroke-muted/30"
          />
          <circle
            cx="50"
            cy="50"
            r={radius - 6}
            fill="none"
            strokeWidth="1"
            className="stroke-muted/20"
          />
          <circle
            cx="50"
            cy="50"
            r={radius + 6}
            fill="none"
            strokeWidth="1"
            className="stroke-muted/20"
          />

          {thresholds.map((threshold) => {
            const innerPoint = getCirclePoint(threshold.angle, radius - 8, 50, 50)
            const outerPoint = getCirclePoint(threshold.angle, radius + 8, 50, 50)
            return (
              <line
                key={threshold.value}
                x1={innerPoint.x}
                y1={innerPoint.y}
                x2={outerPoint.x}
                y2={outerPoint.y}
                strokeWidth="1.5"
                className="stroke-muted-foreground/40"
              />
            )
          })}

          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke={`url(#${config.gradientId})`}
            filter="url(#glow)"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
              transition: isAnimating ? "none" : "stroke-dashoffset 0.3s ease-out"
            }}
          />

          {percentage > 0 && (
            <circle
              cx={getCirclePoint((percentage / 100) * 360, radius, 50, 50).x}
              cy={getCirclePoint((percentage / 100) * 360, radius, 50, 50).y}
              r="3"
              fill={config.colors.start}
              filter="url(#glow)"
              className="animate-pulse"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="relative"
            style={{ textShadow: `0 0 20px ${config.glowColor}` }}
          >
            <span className={cn("text-4xl font-black tracking-tight tabular-nums", config.text)}>
              {animatedScore}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-medium text-muted-foreground/60">de</span>
            <span className="text-sm font-semibold text-muted-foreground">1000</span>
          </div>
        </div>

        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-6 text-[10px] text-muted-foreground/50">
          <span>300</span>
          <span>500</span>
          <span>700</span>
        </div>
      </div>

      {/* Badge com icone representativo */}
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full cursor-help",
                "backdrop-blur-sm border-2 transition-all duration-300",
                currentRange.color.bgLight,
                currentRange.color.border,
                showDetails && "scale-100 opacity-100",
                !showDetails && "scale-95 opacity-0"
              )}
              style={{
                boxShadow: `0 0 20px ${currentRange.color.glow.replace("0.5", "0.3")}`
              }}
            >
              <ShieldIcon className={cn("h-5 w-5", currentRange.color.text)} />
              <span className={cn("font-bold text-base", currentRange.color.text)}>
                {faixa || currentRange.label}
              </span>
              <RangeIcon className={cn("h-4 w-4", currentRange.color.text)} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs p-3">
            <p className="font-medium mb-1">{currentRange.description}</p>
            <p className="text-xs text-muted-foreground">{currentRange.details}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Probabilidade */}
      {probabilidade && (
        <p className={cn(
          "text-sm text-muted-foreground transition-all duration-500",
          showDetails ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          Probabilidade: <span className={cn("font-semibold", config.text)}>{probabilidade}</span>
        </p>
      )}

      {/* Barra de Progresso Segmentada */}
      <div className={cn(
        "w-full max-w-sm space-y-3 transition-all duration-700",
        showDetails ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {/* Labels das faixas */}
        <div className="flex justify-between px-1">
          {SCORE_RANGES.map((range, index) => {
            const isActive = currentRange.label === range.label
            return (
              <TooltipProvider key={range.label}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex flex-col items-center gap-0.5 cursor-help transition-all duration-300",
                        isActive ? "scale-110" : "scale-100 opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-6 w-6 rounded-full transition-all",
                        isActive ? range.color.bg : range.color.bgLight,
                        isActive && "shadow-lg"
                      )}
                      style={isActive ? { boxShadow: `0 0 10px ${range.color.glow}` } : undefined}
                      >
                        <range.icon className={cn(
                          "h-3 w-3",
                          isActive ? "text-white" : range.color.text
                        )} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium transition-colors",
                        isActive ? range.color.text : "text-muted-foreground"
                      )}>
                        {range.label}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {range.min} - {range.max} pontos
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        {/* Barra segmentada */}
        <div className="relative flex h-4 w-full rounded-full overflow-visible bg-muted/10 gap-0.5">
          {SCORE_RANGES.map((range, index) => {
            const rangeSize = range.max - range.min + 1
            const rangeStart = range.min
            const isActive = animatedScore >= range.min && animatedScore <= range.max
            const isFilled = animatedScore > range.max

            // Calcula o preenchimento dentro deste segmento
            let fillPercentage = 0
            if (isFilled) {
              fillPercentage = 100
            } else if (isActive) {
              fillPercentage = ((animatedScore - range.min) / rangeSize) * 100
            }

            return (
              <ProgressSegment
                key={range.label}
                range={range}
                isActive={isActive}
                isFilled={isFilled}
                fillPercentage={fillPercentage}
                animationDelay={index * 100}
              />
            )
          })}
        </div>

        {/* Escala numerica */}
        <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
          <span>0</span>
          <span style={{ marginLeft: "25%" }}>300</span>
          <span style={{ marginLeft: "5%" }}>500</span>
          <span style={{ marginLeft: "5%" }}>700</span>
          <span className="ml-auto">1000</span>
        </div>
      </div>

      {/* Descricao da faixa atual */}
      <div className={cn(
        "w-full max-w-sm p-3 rounded-xl border transition-all duration-700",
        currentRange.color.border,
        currentRange.color.bgLight,
        showDetails ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-xl shrink-0",
            currentRange.color.bg
          )}
          style={{ boxShadow: `0 0 15px ${currentRange.color.glow}` }}
          >
            <ShieldIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("font-semibold text-sm", currentRange.color.text)}>
                {currentRange.description}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentRange.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Legenda das faixas - colapsavel */}
      <details className={cn(
        "w-full max-w-sm transition-all duration-700",
        showDetails ? "opacity-100" : "opacity-0"
      )}>
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 justify-center py-2">
          <Info className="h-3 w-3" />
          Ver todas as faixas de score
        </summary>
        <div className="mt-2 space-y-2 p-3 rounded-xl bg-muted/5 border border-border/50">
          {SCORE_RANGES.map((range) => (
            <div
              key={range.label}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg transition-all",
                currentRange.label === range.label && range.color.bgLight
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full shrink-0",
                range.color.bgLight
              )}>
                <range.shieldIcon className={cn("h-3.5 w-3.5", range.color.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", range.color.text)}>
                    {range.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {range.min} - {range.max}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {range.description}
                </p>
              </div>
              {currentRange.label === range.label && (
                <div className={cn(
                  "h-2 w-2 rounded-full animate-pulse",
                  range.color.bg
                )} />
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
