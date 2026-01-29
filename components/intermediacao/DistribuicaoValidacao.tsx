'use client'

import * as React from 'react'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatarNumeroPercentual } from '@/lib/intermediacao/formatters'

export interface DistribuicaoValidacaoProps {
  percentualAtual: number
  percentualMeta: number
  tolerancia?: number
  className?: string
}

/**
 * Componente de validacao visual
 *
 * Estados:
 * - Soma dos percentuais esta correta (verde)
 * - Faltam X% para completar a distribuicao (amarelo)
 * - Soma dos percentuais excede em X% (vermelho)
 *
 * Sugestao de correcao quando nao bate
 */
export function DistribuicaoValidacao({
  percentualAtual,
  percentualMeta = 100,
  tolerancia = 0.01,
  className,
}: DistribuicaoValidacaoProps) {
  const diferenca = percentualAtual - percentualMeta
  const isValido = Math.abs(diferenca) <= tolerancia

  const getStatus = () => {
    if (isValido) {
      return 'valido'
    }
    return diferenca > 0 ? 'excedido' : 'incompleto'
  }

  const status = getStatus()

  const config = {
    valido: {
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      iconColor: 'text-emerald-500',
      message: 'Soma dos percentuais esta correta',
    },
    incompleto: {
      icon: AlertCircle,
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-500',
      message: `Faltam ${formatarNumeroPercentual(Math.abs(diferenca))}% para completar a distribuicao`,
    },
    excedido: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-500',
      message: `Soma dos percentuais excede em ${formatarNumeroPercentual(diferenca)}%`,
    },
  }

  const { icon: Icon, bgColor, borderColor, textColor, iconColor, message } = config[status]

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        bgColor,
        borderColor,
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', iconColor)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', textColor)}>{message}</p>
        {!isValido && (
          <p className="text-xs text-muted-foreground mt-1">
            {status === 'incompleto'
              ? 'Adicione mais beneficiarios ou aumente os percentuais'
              : 'Reduza os percentuais ou remova beneficiarios'}
          </p>
        )}
      </div>
    </div>
  )
}
