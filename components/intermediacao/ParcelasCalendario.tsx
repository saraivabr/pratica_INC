'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { calcularDiasParaVencimento, getStatusVisual } from './ParcelaStatusBadge'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
  isValid,
  getDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Parcela } from './types'

interface ParcelasCalendarioProps {
  parcelas: Parcela[]
  mes?: number
  ano?: number
  onDiaClick?: (data: Date, parcelas: Parcela[]) => void
}

type StatusVisual = 'paga' | 'cancelada' | 'vencida' | 'proxima' | 'futura'

interface DiaComParcelas {
  data: Date
  parcelas: Parcela[]
  statusPrioritario: StatusVisual
  valorTotal: number
}

function formatarMoedaCurta(valor: number): string {
  if (valor >= 1000000) {
    return `${(valor / 1000000).toFixed(1)}M`
  }
  if (valor >= 1000) {
    return `${(valor / 1000).toFixed(0)}K`
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

function getStatusColor(status: string) {
  switch (status) {
    case 'vencida':
      return 'bg-red-500'
    case 'proxima':
      return 'bg-amber-500'
    case 'paga':
      return 'bg-emerald-500'
    default:
      return 'bg-emerald-400'
  }
}

function getStatusBgColor(status: string) {
  switch (status) {
    case 'vencida':
      return 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
    case 'proxima':
      return 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30'
    case 'paga':
      return 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
    default:
      return 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20'
  }
}

function getPrioridadeStatus(status: string): number {
  switch (status) {
    case 'vencida':
      return 0
    case 'proxima':
      return 1
    case 'futura':
      return 2
    case 'paga':
      return 3
    default:
      return 4
  }
}

export function ParcelasCalendario({
  parcelas,
  mes,
  ano,
  onDiaClick,
}: ParcelasCalendarioProps) {
  const hoje = new Date()
  const [mesAtual, setMesAtual] = useState(() => {
    if (mes !== undefined && ano !== undefined) {
      return new Date(ano, mes - 1, 1)
    }
    return startOfMonth(hoje)
  })

  // Agrupa parcelas por dia
  const diasComParcelas = useMemo(() => {
    const mapa = new Map<string, DiaComParcelas>()

    parcelas.forEach((parcela) => {
      if (parcela.status === 'cancelada') return

      const dataVencimento = typeof parcela.dataVencimento === 'string'
        ? parseISO(parcela.dataVencimento)
        : parcela.dataVencimento

      if (!isValid(dataVencimento)) return

      const chave = format(dataVencimento, 'yyyy-MM-dd')
      const statusVisual = getStatusVisual(parcela.status, parcela.dataVencimento)

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          data: dataVencimento,
          parcelas: [],
          statusPrioritario: statusVisual,
          valorTotal: 0,
        })
      }

      const dia = mapa.get(chave)!
      dia.parcelas.push(parcela)
      dia.valorTotal += parcela.valor

      // Atualiza status prioritario (vencida > proxima > futura > paga)
      if (getPrioridadeStatus(statusVisual) < getPrioridadeStatus(dia.statusPrioritario)) {
        dia.statusPrioritario = statusVisual
      }
    })

    return mapa
  }, [parcelas])

  // Gera dias do mes
  const diasDoMes = useMemo(() => {
    const inicio = startOfMonth(mesAtual)
    const fim = endOfMonth(mesAtual)
    return eachDayOfInterval({ start: inicio, end: fim })
  }, [mesAtual])

  // Calcula offset para comecar no dia certo da semana
  const offsetInicio = getDay(startOfMonth(mesAtual))

  const handleMesAnterior = () => {
    setMesAtual(subMonths(mesAtual, 1))
  }

  const handleProximoMes = () => {
    setMesAtual(addMonths(mesAtual, 1))
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  return (
    <div className="w-full">
      {/* Header com navegacao */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleMesAnterior}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">
          {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={handleProximoMes}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendario */}
      <div className="grid grid-cols-7 gap-1">
        {/* Header dias da semana */}
        {diasSemana.map((dia) => (
          <div
            key={dia}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {dia}
          </div>
        ))}

        {/* Espacos vazios no inicio */}
        {Array.from({ length: offsetInicio }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Dias do mes */}
        {diasDoMes.map((dia) => {
          const chave = format(dia, 'yyyy-MM-dd')
          const diaComParcelas = diasComParcelas.get(chave)
          const isHoje = isSameDay(dia, hoje)
          const temParcelas = !!diaComParcelas

          if (!temParcelas) {
            return (
              <div
                key={chave}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-lg text-sm',
                  !isSameMonth(dia, mesAtual) && 'text-muted-foreground/50',
                  isHoje && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <span>{format(dia, 'd')}</span>
              </div>
            )
          }

          return (
            <Popover key={chave}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors cursor-pointer',
                    getStatusBgColor(diaComParcelas.statusPrioritario),
                    isHoje && 'ring-2 ring-primary ring-offset-2'
                  )}
                  onClick={() => onDiaClick?.(dia, diaComParcelas.parcelas)}
                >
                  <span className="font-medium">{format(dia, 'd')}</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <div
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        getStatusColor(diaComParcelas.statusPrioritario)
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {diaComParcelas.parcelas.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium">
                    {formatarMoedaCurta(diaComParcelas.valorTotal)}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {format(dia, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {diaComParcelas.parcelas.length} parcela(s)
                    </span>
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {diaComParcelas.parcelas.map((parcela) => {
                      const statusVisual = getStatusVisual(parcela.status, parcela.dataVencimento)
                      return (
                        <div
                          key={parcela.id}
                          className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                getStatusColor(statusVisual)
                              )}
                            />
                            <span className="text-muted-foreground">
                              #{parcela.numero}
                            </span>
                          </div>
                          <span className="font-mono font-medium">
                            {formatarMoeda(parcela.valor)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between text-sm font-medium">
                    <span>Total:</span>
                    <span className="text-primary">
                      {formatarMoeda(diaComParcelas.valorTotal)}
                    </span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Vencida</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Proxima</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Futura</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Paga</span>
        </div>
      </div>
    </div>
  )
}
