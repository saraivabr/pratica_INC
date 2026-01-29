'use client'

import { cn } from '@/lib/utils'
import { ParcelaStatusBadge, calcularDiasParaVencimento, getStatusVisual } from './ParcelaStatusBadge'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, Circle } from 'lucide-react'
import type { Parcela } from './types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ParcelaTimelineProps {
  parcelas: Parcela[]
  orientation?: 'vertical' | 'horizontal'
}

function formatarMoedaCurta(valor: number): string {
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`
  }
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor)
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function formatarData(data: Date | string): string {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  if (!isValid(dataObj)) return '--/--/--'
  return format(dataObj, 'dd/MM/yy', { locale: ptBR })
}

function formatarDataCompleta(data: Date | string): string {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  if (!isValid(dataObj)) return '--/--/----'
  return format(dataObj, 'dd/MM/yyyy', { locale: ptBR })
}

function getStatusColor(status: string, dias: number) {
  if (status === 'paga') return 'bg-emerald-500 border-emerald-500'
  if (status === 'cancelada') return 'bg-gray-400 border-gray-400'
  if (dias < 0) return 'bg-red-500 border-red-500'
  if (dias <= 7) return 'bg-amber-500 border-amber-500'
  return 'bg-emerald-400 border-emerald-400'
}

function getLineColor(nextParcela: Parcela | undefined, currentParcela: Parcela) {
  if (currentParcela.status === 'paga') return 'bg-emerald-300'
  return 'bg-muted-foreground/20'
}

export function ParcelaTimeline({
  parcelas,
  orientation = 'vertical',
}: ParcelaTimelineProps) {
  const sortedParcelas = [...parcelas].sort((a, b) => a.numero - b.numero)

  if (orientation === 'horizontal') {
    return (
      <TooltipProvider>
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex items-start min-w-max">
            {sortedParcelas.map((parcela, index) => {
              const dias = calcularDiasParaVencimento(parcela.dataVencimento)
              const isPaga = parcela.status === 'paga'
              const statusVisual = getStatusVisual(parcela.status, parcela.dataVencimento)
              const isLast = index === sortedParcelas.length - 1

              return (
                <div key={parcela.id} className="flex items-start">
                  <div className="flex flex-col items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-default transition-all',
                            isPaga
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-background',
                            !isPaga && getStatusColor(parcela.status, dias)
                          )}
                        >
                          {isPaga ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Circle className="h-3 w-3 fill-current" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">
                            Parcela {parcela.numero}/{sortedParcelas.length}
                          </p>
                          <p>{formatarMoeda(parcela.valor)}</p>
                          <p>Vencimento: {formatarDataCompleta(parcela.dataVencimento)}</p>
                          {isPaga && parcela.dataPagamento && (
                            <p className="text-emerald-400">
                              Paga em {formatarDataCompleta(parcela.dataPagamento)}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    <div className="mt-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        {parcela.numero}/{sortedParcelas.length}
                      </p>
                      <p className="text-xs font-medium">
                        {formatarMoedaCurta(parcela.valor)}
                      </p>
                      <div className="mt-1">
                        <ParcelaStatusBadge
                          status={parcela.status}
                          diasParaVencimento={dias}
                          compact
                        />
                      </div>
                    </div>
                  </div>

                  {!isLast && (
                    <div
                      className={cn(
                        'h-0.5 w-12 mt-4 mx-1',
                        getLineColor(sortedParcelas[index + 1], parcela)
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // Vertical orientation
  return (
    <div className="relative space-y-0">
      {sortedParcelas.map((parcela, index) => {
        const dias = calcularDiasParaVencimento(parcela.dataVencimento)
        const isPaga = parcela.status === 'paga'
        const isLast = index === sortedParcelas.length - 1

        return (
          <div key={parcela.id} className="relative flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-background',
                  isPaga
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : getStatusColor(parcela.status, dias)
                )}
              >
                {isPaga ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Circle className="h-2 w-2 fill-current text-white" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[40px]',
                    getLineColor(sortedParcelas[index + 1], parcela)
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Parcela {parcela.numero}/{sortedParcelas.length}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatarMoeda(parcela.valor)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatarData(parcela.dataVencimento)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <ParcelaStatusBadge
                    status={parcela.status}
                    diasParaVencimento={dias}
                    compact
                  />
                </div>
              </div>

              {isPaga && parcela.dataPagamento && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Paga em {formatarDataCompleta(parcela.dataPagamento)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
