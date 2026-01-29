'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatarMoeda, formatarNumeroPercentual } from '@/lib/intermediacao/formatters'
import type { Distribuicao } from '@/lib/intermediacao/types'

export interface DistribuicaoResumoProps {
  distribuicoes: Distribuicao[]
  comissaoTotal: number
  className?: string
}

/**
 * Resumo da distribuicao em tabela
 *
 * +----------------+---------+-----------+----------+
 * | Beneficiario   | Cargo   | Percentual| Valor    |
 * +----------------+---------+-----------+----------+
 * | Joao Silva     | Corretor| 60%       | R$ 15.000|
 * | Maria Gerente  | Gerente | 40%       | R$ 10.000|
 * +----------------+---------+-----------+----------+
 * | TOTAL          |         | 100%      | R$ 25.000|
 * +----------------+---------+-----------+----------+
 */
export function DistribuicaoResumo({
  distribuicoes,
  comissaoTotal,
  className,
}: DistribuicaoResumoProps) {
  const totalPercentual = distribuicoes.reduce(
    (acc, d) => acc + d.percentual,
    0
  )
  const totalValor = distribuicoes.reduce((acc, d) => acc + d.valor, 0)

  if (distribuicoes.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Distribuicao</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma distribuicao definida
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Resumo da Distribuicao</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beneficiario</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Percentual</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distribuicoes.map((dist) => (
              <TableRow key={dist.beneficiarioId}>
                <TableCell className="font-medium">
                  {dist.beneficiario.nome}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dist.beneficiario.cargo}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatarNumeroPercentual(dist.percentual)}%
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatarMoeda(dist.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">TOTAL</TableCell>
              <TableCell />
              <TableCell
                className={cn(
                  'text-right font-mono font-bold',
                  Math.abs(totalPercentual - 100) > 0.01 && 'text-destructive'
                )}
              >
                {formatarNumeroPercentual(totalPercentual)}%
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-mono font-bold',
                  Math.abs(totalValor - comissaoTotal) > 0.01 && 'text-destructive'
                )}
              >
                {formatarMoeda(totalValor)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}
