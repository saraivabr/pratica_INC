'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { calcularDiasParaVencimento } from './ParcelaStatusBadge'
import {
  Clock,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react'
import type { Parcela, ResumoParcelasStats } from './types'

interface ParcelasResumoProps {
  parcelas: Parcela[]
  onCategoryClick?: (category: 'pendentes' | 'vencidas' | 'proximas' | 'pagas') => void
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(valor)
}

function formatarMoedaCompleta(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function calcularStats(parcelas: Parcela[]): ResumoParcelasStats {
  const stats: ResumoParcelasStats = {
    pendentes: { quantidade: 0, valor: 0 },
    vencidas: { quantidade: 0, valor: 0 },
    proximas: { quantidade: 0, valor: 0 },
    pagas: { quantidade: 0, valor: 0 },
  }

  parcelas.forEach((parcela) => {
    if (parcela.status === 'paga') {
      stats.pagas.quantidade++
      stats.pagas.valor += parcela.valor
      return
    }

    if (parcela.status === 'cancelada') {
      return // Ignora canceladas no resumo
    }

    const dias = calcularDiasParaVencimento(parcela.dataVencimento)

    if (dias < 0) {
      stats.vencidas.quantidade++
      stats.vencidas.valor += parcela.valor
    } else if (dias <= 7) {
      stats.proximas.quantidade++
      stats.proximas.valor += parcela.valor
    } else {
      stats.pendentes.quantidade++
      stats.pendentes.valor += parcela.valor
    }
  })

  return stats
}

interface StatCardProps {
  title: string
  quantidade: number
  valor: number
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  onClick?: () => void
}

function StatCard({
  title,
  quantidade,
  valor,
  icon,
  color,
  bgColor,
  borderColor,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        'border-l-4',
        borderColor,
        onClick && 'active:scale-[0.98]'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('text-3xl font-bold', color)}>{quantidade}</p>
            <p className="text-sm font-medium text-muted-foreground">
              {formatarMoeda(valor)}
            </p>
          </div>
          <div className={cn('p-3 rounded-full', bgColor)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ParcelasResumo({
  parcelas,
  onCategoryClick,
}: ParcelasResumoProps) {
  const stats = useMemo(() => calcularStats(parcelas), [parcelas])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Pendentes"
        quantidade={stats.pendentes.quantidade}
        valor={stats.pendentes.valor}
        icon={<Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
        color="text-emerald-600 dark:text-emerald-400"
        bgColor="bg-emerald-100 dark:bg-emerald-900/30"
        borderColor="border-l-emerald-500"
        onClick={() => onCategoryClick?.('pendentes')}
      />

      <StatCard
        title="Vencidas"
        quantidade={stats.vencidas.quantidade}
        valor={stats.vencidas.valor}
        icon={<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />}
        color="text-red-600 dark:text-red-400"
        bgColor="bg-red-100 dark:bg-red-900/30"
        borderColor="border-l-red-500"
        onClick={() => onCategoryClick?.('vencidas')}
      />

      <StatCard
        title="Proximas (7d)"
        quantidade={stats.proximas.quantidade}
        valor={stats.proximas.valor}
        icon={<CalendarClock className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
        color="text-amber-600 dark:text-amber-400"
        bgColor="bg-amber-100 dark:bg-amber-900/30"
        borderColor="border-l-amber-500"
        onClick={() => onCategoryClick?.('proximas')}
      />

      <StatCard
        title="Pagas"
        quantidade={stats.pagas.quantidade}
        valor={stats.pagas.valor}
        icon={<CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
        color="text-blue-600 dark:text-blue-400"
        bgColor="bg-blue-100 dark:bg-blue-900/30"
        borderColor="border-l-blue-500"
        onClick={() => onCategoryClick?.('pagas')}
      />
    </div>
  )
}

// Exporta funcao de calculo para uso externo
export { calcularStats }
