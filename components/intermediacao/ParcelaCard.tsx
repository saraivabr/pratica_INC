'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ParcelaStatusBadge, calcularDiasParaVencimento } from './ParcelaStatusBadge'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CreditCard, Pencil, User } from 'lucide-react'
import type { Parcela, Beneficiario } from './types'

interface ParcelaCardProps {
  parcela: Parcela & {
    vendaCodigo?: string
    totalParcelas?: number
    beneficiario?: Beneficiario
  }
  onPagar?: () => void
  onEditar?: () => void
  showVenda?: boolean
  showBeneficiario?: boolean
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function formatarData(data: Date | string): string {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  if (!isValid(dataObj)) return '--/--/----'
  return format(dataObj, 'dd/MM/yyyy', { locale: ptBR })
}

export function ParcelaCard({
  parcela,
  onPagar,
  onEditar,
  showVenda = false,
  showBeneficiario = false,
}: ParcelaCardProps) {
  const numero = parcela.numero ?? 1
  const total = parcela.totalParcelas ?? 1
  const dias = calcularDiasParaVencimento(parcela.dataVencimento)
  const isPaga = parcela.status === 'paga'
  const isCancelada = parcela.status === 'cancelada'
  const canPagar = !isPaga && !isCancelada

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        isPaga && 'opacity-80 bg-muted/30',
        isCancelada && 'opacity-60'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Parcela {numero}/{total}
            </span>
          </div>
          <ParcelaStatusBadge
            status={parcela.status}
            diasParaVencimento={dias}
            compact
          />
        </div>

        {(showVenda || showBeneficiario) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {showVenda && parcela.vendaCodigo && (
              <span className="font-mono">{parcela.vendaCodigo}</span>
            )}
            {showVenda && showBeneficiario && parcela.vendaCodigo && parcela.beneficiario && (
              <span className="text-muted-foreground/50">-&gt;</span>
            )}
            {showBeneficiario && parcela.beneficiario && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {parcela.beneficiario.nome}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-semibold">{formatarMoeda(parcela.valor)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Vencimento:</span>
            <span className={cn(
              dias < 0 && !isPaga && 'text-red-600 dark:text-red-400 font-medium'
            )}>
              {formatarData(parcela.dataVencimento)}
            </span>
          </div>

          {isPaga && parcela.dataPagamento && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pago em:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatarData(parcela.dataPagamento)}
              </span>
            </div>
          )}
        </div>

        {(canPagar || onEditar) && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-end gap-2">
              {onEditar && canPagar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditar}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {onPagar && canPagar && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onPagar}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Pagar
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
