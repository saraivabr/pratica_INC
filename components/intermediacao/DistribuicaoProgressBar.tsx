'use client'

import * as React from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatarNumeroPercentual } from '@/lib/intermediacao/formatters'

export interface DistribuicaoProgressBarProps {
  percentualAtual: number
  percentualMeta: number
  className?: string
}

/**
 * Barra de progresso da distribuicao
 *
 * Visual:
 * [################    ] 80% de 100%
 * Faltam 20% para distribuir
 *
 * Cores:
 * < 100%: amarelo
 * = 100%: verde
 * > 100%: vermelho
 *
 * Mostra diferenca
 */
export function DistribuicaoProgressBar({
  percentualAtual,
  percentualMeta = 100,
  className,
}: DistribuicaoProgressBarProps) {
  const diferenca = percentualMeta - percentualAtual
  const progressValue = Math.min((percentualAtual / percentualMeta) * 100, 100)

  // Determina o status e cor
  const getStatus = () => {
    const tolerancia = 0.01
    if (Math.abs(diferenca) <= tolerancia) {
      return 'completo'
    }
    return diferenca > 0 ? 'incompleto' : 'excedido'
  }

  const status = getStatus()

  const getProgressColor = () => {
    switch (status) {
      case 'completo':
        return 'bg-emerald-500'
      case 'incompleto':
        return 'bg-amber-500'
      case 'excedido':
        return 'bg-destructive'
      default:
        return 'bg-primary'
    }
  }

  const getTextColor = () => {
    switch (status) {
      case 'completo':
        return 'text-emerald-600 dark:text-emerald-400'
      case 'incompleto':
        return 'text-amber-600 dark:text-amber-400'
      case 'excedido':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  const getMessage = () => {
    switch (status) {
      case 'completo':
        return 'Distribuicao completa'
      case 'incompleto':
        return `Faltam ${formatarNumeroPercentual(diferenca)}% para distribuir`
      case 'excedido':
        return `Excedido em ${formatarNumeroPercentual(Math.abs(diferenca))}%`
      default:
        return ''
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progresso:</span>
        <span className={cn('font-mono font-medium', getTextColor())}>
          {formatarNumeroPercentual(percentualAtual)}% de {formatarNumeroPercentual(percentualMeta)}%
        </span>
      </div>
      <div className="relative">
        <Progress
          value={progressValue}
          className="h-3"
        />
        <div
          className={cn(
            'absolute inset-0 h-3 rounded-full transition-all',
            getProgressColor()
          )}
          style={{ width: `${Math.min(progressValue, 100)}%` }}
        />
      </div>
      <p className={cn('text-sm', getTextColor())}>
        {getMessage()}
      </p>
    </div>
  )
}
