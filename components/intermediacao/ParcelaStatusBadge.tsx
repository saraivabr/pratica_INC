'use client'

import { cn } from '@/lib/utils'
import { Check, X, Clock, AlertCircle } from 'lucide-react'
import { differenceInDays, parseISO, isValid } from 'date-fns'

interface ParcelaStatusBadgeProps {
  status: 'pendente' | 'vencida' | 'paga' | 'cancelada'
  diasParaVencimento?: number
  dataVencimento?: Date | string
  compact?: boolean
}

function calcularDiasParaVencimento(dataVencimento: Date | string): number {
  const data = typeof dataVencimento === 'string' ? parseISO(dataVencimento) : dataVencimento
  if (!isValid(data)) return 0
  return differenceInDays(data, new Date())
}

function getStatusConfig(status: string, dias?: number) {
  // Se paga ou cancelada, retorna config fixo
  if (status === 'paga') {
    return {
      icon: Check,
      label: 'Paga',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      badge: null,
    }
  }

  if (status === 'cancelada') {
    return {
      icon: X,
      label: 'Cancelada',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      textColor: 'text-gray-600 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-700',
      badge: null,
    }
  }

  // Para pendente ou vencida, usa os dias para determinar visual
  const diasNum = dias ?? 0

  if (diasNum < 0) {
    // Vencida
    return {
      icon: AlertCircle,
      label: 'Vencida',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
      badge: `${diasNum}d`,
    }
  }

  if (diasNum <= 7) {
    // Proxima (7 dias ou menos)
    return {
      icon: Clock,
      label: 'Proxima',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      textColor: 'text-amber-700 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-800',
      badge: `${diasNum}d`,
    }
  }

  // Futura (mais de 7 dias)
  return {
    icon: Clock,
    label: 'Pendente',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-100 dark:border-emerald-800',
    badge: `+${diasNum}d`,
  }
}

export function ParcelaStatusBadge({
  status,
  diasParaVencimento,
  dataVencimento,
  compact = false,
}: ParcelaStatusBadgeProps) {
  // Calcula dias se nao fornecido mas tem data de vencimento
  const dias = diasParaVencimento ?? (dataVencimento ? calcularDiasParaVencimento(dataVencimento) : undefined)

  const config = getStatusConfig(status, dias)
  const Icon = config.icon

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
          config.bgColor,
          config.textColor,
          config.borderColor
        )}
      >
        <Icon className="h-3 w-3" />
        {config.badge && <span>{config.badge}</span>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
        config.bgColor,
        config.textColor,
        config.borderColor
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
      {config.badge && (
        <span className="font-bold">({config.badge})</span>
      )}
    </div>
  )
}

// Funcao utilitaria para determinar status visual baseado na data
export function getStatusVisual(status: string, dataVencimento?: Date | string): 'paga' | 'cancelada' | 'vencida' | 'proxima' | 'futura' {
  if (status === 'paga') return 'paga'
  if (status === 'cancelada') return 'cancelada'

  if (!dataVencimento) return 'futura'

  const dias = calcularDiasParaVencimento(dataVencimento)

  if (dias < 0) return 'vencida'
  if (dias <= 7) return 'proxima'
  return 'futura'
}

export { calcularDiasParaVencimento }
