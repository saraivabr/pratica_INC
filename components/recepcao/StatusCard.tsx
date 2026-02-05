"use client"

import {
  Zap,
  MessageCircle,
  Coffee,
  AlertCircle,
  Rocket,
  Clock,
  Users,
  Smartphone,
  Lock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StatusType =
  | "na_fila"
  | "sua_vez"
  | "atendendo"
  | "pausado"
  | "feedback_pendente"
  | "limite_leads"
  | "sem_checkin"
  | "qualificado_leads"

interface StatusCardProps {
  status: StatusType
  posicao?: number | null
  totalFila?: number
  filaType?: "portaria" | "leads"
  className?: string
}

const statusConfig: Record<StatusType, {
  label: string
  subtitle: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ElementType
  pulse?: boolean
}> = {
  na_fila: {
    label: "NA FILA DA PORTARIA",
    subtitle: "Aguardando sua vez",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: Users,
  },
  sua_vez: {
    label: "SUA VEZ!",
    subtitle: "Cliente aguardando",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-400 dark:border-blue-600",
    icon: Zap,
    pulse: true,
  },
  atendendo: {
    label: "ATENDENDO",
    subtitle: "Foco total!",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: MessageCircle,
  },
  pausado: {
    label: "PAUSADO",
    subtitle: "Descansando",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: Coffee,
  },
  feedback_pendente: {
    label: "FEEDBACK PENDENTE",
    subtitle: "Conte como foi",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: AlertCircle,
  },
  limite_leads: {
    label: "LIMITE DE LEADS",
    subtitle: "Finalize alguns para receber mais",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: Rocket,
  },
  sem_checkin: {
    label: "SEM CHECK-IN",
    subtitle: "Faca check-in para entrar na fila",
    color: "text-zinc-500",
    bgColor: "bg-zinc-50 dark:bg-zinc-900",
    borderColor: "border-zinc-200 dark:border-zinc-800",
    icon: Clock,
  },
  qualificado_leads: {
    label: "ROLETA ATIVA",
    subtitle: "Leads chegando automaticamente",
    color: "text-yellow-600",
    bgColor: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    icon: Smartphone,
  },
}

export function StatusCard({
  status,
  posicao,
  totalFila,
  filaType = "portaria",
  className,
}: StatusCardProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  const positionMessage = posicao
    ? `Voce e o ${posicao}o da vez`
    : null

  return (
    <Card
      className={cn(
        "border-2 transition-all duration-300",
        config.bgColor,
        config.borderColor,
        config.pulse && "animate-pulse",
        className
      )}
    >
      <CardContent className="py-6">
        <div className="text-center space-y-4">
          {/* Status Label */}
          <div className="flex items-center justify-center gap-2">
            <div className={cn(
              "p-2 rounded-full",
              config.bgColor === "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30"
                ? "bg-yellow-100 dark:bg-yellow-900/50"
                : config.bgColor.replace("bg-", "bg-").replace("50", "100")
            )}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <span className={cn("font-bold text-sm tracking-wide", config.color)}>
              {config.label}
            </span>
          </div>

          {/* Position Display - Big Number */}
          {posicao !== undefined && posicao !== null && (
            <div className="py-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className={cn(
                  "text-6xl font-black tabular-nums transition-all duration-500",
                  config.color
                )}>
                  #{posicao}
                </span>
                {totalFila && (
                  <span className="text-xl text-muted-foreground">
                    de {totalFila}
                  </span>
                )}
              </div>
              {positionMessage && (
                <p className="text-sm text-muted-foreground mt-2">
                  "{positionMessage}"
                </p>
              )}
            </div>
          )}

          {/* Status Subtitle */}
          <p className="text-sm text-muted-foreground">
            {config.subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para card de fila de leads bloqueado
interface LeadsQueueCardProps {
  totalOfertas: number
  metaOfertas: number
  onRegisterClick?: () => void
  className?: string
}

export function LeadsQueueCard({
  totalOfertas,
  metaOfertas,
  onRegisterClick,
  className,
}: LeadsQueueCardProps) {
  const isQualificado = totalOfertas >= metaOfertas
  const progresso = Math.min((totalOfertas / metaOfertas) * 100, 100)
  const faltam = Math.max(metaOfertas - totalOfertas, 0)

  return (
    <Card
      className={cn(
        "border-2 transition-all",
        isQualificado
          ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30"
          : "border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "p-3 rounded-full shrink-0",
            isQualificado
              ? "bg-yellow-100 dark:bg-yellow-900/50"
              : "bg-zinc-100 dark:bg-zinc-800"
          )}>
            {isQualificado ? (
              <Smartphone className="h-6 w-6 text-yellow-600" />
            ) : (
              <Lock className="h-6 w-6 text-zinc-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">ROLETA DE LEADS</span>
            </div>

            {isQualificado ? (
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Qualificado! Leads chegam automaticamente.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-1">
                  Nao qualificado
                </p>

                {/* Progress bar */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Ofertas: {totalOfertas} / {metaOfertas}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                </div>

                {/* CTA Button */}
                {onRegisterClick && (
                  <button
                    onClick={onRegisterClick}
                    className="mt-3 w-full py-2 px-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 rounded-lg transition-colors"
                  >
                    + REGISTRAR OFERTA ({faltam} restantes)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
