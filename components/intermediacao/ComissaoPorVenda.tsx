'use client'

import * as React from 'react'
import { CheckCircle2, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  formatarMoeda,
  formatarNumeroPercentual,
  getIniciais,
} from '@/lib/intermediacao/formatters'
import type { VendaComDistribuicaoLegado } from '@/lib/intermediacao/types'

export interface ComissaoPorVendaProps {
  venda: VendaComDistribuicaoLegado
  className?: string
}

/**
 * Visualizacao de comissao de uma venda
 *
 * Card completo:
 * +-------------------------------------------------------------+
 * | Comissao da Venda VND-202601-01                             |
 * | ----------------------------------------------------------- |
 * | Valor Venda: R$ 500.000 x 5% = R$ 25.000                    |
 * | ----------------------------------------------------------- |
 * | Distribuicao:                                               |
 * | +-------------------------------------------------------+   |
 * | | Joao Silva      | 60% | R$ 15.000 | 3 parcelas       |   |
 * | | Maria Gerente   | 40% | R$ 10.000 | 2 parcelas       |   |
 * | +-------------------------------------------------------+   |
 * | ----------------------------------------------------------- |
 * | Status: 100% distribuido | 5 parcelas | 2 pagas            |
 * +-------------------------------------------------------------+
 */
export function ComissaoPorVenda({ venda, className }: ComissaoPorVendaProps) {
  const {
    codigo,
    valorVenda,
    percentualComissao,
    comissaoTotal,
    distribuicoes,
    totalParcelas,
    parcelasPagas,
    status,
  } = venda

  const percentualDistribuido = distribuicoes.reduce(
    (acc, d) => acc + d.percentual,
    0
  )

  const getStatusBadge = () => {
    switch (status) {
      case 'distribuido':
        return (
          <Badge variant="default" className="bg-emerald-500">
            100% distribuido
          </Badge>
        )
      case 'parcialmente_distribuido':
        return (
          <Badge variant="secondary" className="bg-amber-500 text-white">
            {formatarNumeroPercentual(percentualDistribuido)}% distribuido
          </Badge>
        )
      case 'nao_distribuido':
        return (
          <Badge variant="outline" className="border-muted-foreground">
            Nao distribuido
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Comissao da Venda {codigo}</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calculo da Comissao */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Calculo:</span>
          <span className="font-mono">
            {formatarMoeda(valorVenda)}{' '}
            <span className="text-muted-foreground">x</span>{' '}
            {formatarNumeroPercentual(percentualComissao)}%{' '}
            <span className="text-muted-foreground">=</span>{' '}
            <span className="font-bold text-primary">
              {formatarMoeda(comissaoTotal)}
            </span>
          </span>
        </div>

        <Separator />

        {/* Distribuicao */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Distribuicao:</p>
          {distribuicoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma distribuicao definida
            </p>
          ) : (
            <div className="border rounded-lg divide-y">
              {distribuicoes.map((dist, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 text-sm"
                >
                  {/* Avatar */}
                  <Avatar className="h-8 w-8 shrink-0">
                    {dist.beneficiario.avatar ? (
                      <AvatarImage
                        src={dist.beneficiario.avatar}
                        alt={dist.beneficiario.nome}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {dist.beneficiario.nome ? (
                        getIniciais(dist.beneficiario.nome)
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  {/* Nome */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {dist.beneficiario.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dist.beneficiario.cargo}
                    </p>
                  </div>

                  {/* Percentual */}
                  <span className="font-mono text-muted-foreground">
                    {formatarNumeroPercentual(dist.percentual)}%
                  </span>

                  {/* Valor */}
                  <span className="font-mono font-medium w-28 text-right">
                    {formatarMoeda(dist.valor)}
                  </span>

                  {/* Parcelas */}
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {dist.parcelas} parcela{dist.parcelas !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Status Geral */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {status === 'distribuido' && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>100% distribuido</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              {totalParcelas} parcela{totalParcelas !== 1 ? 's' : ''}
            </span>
            <span>|</span>
            <span
              className={cn(
                parcelasPagas === totalParcelas &&
                  totalParcelas > 0 &&
                  'text-emerald-600 dark:text-emerald-400 font-medium'
              )}
            >
              {parcelasPagas} paga{parcelasPagas !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
