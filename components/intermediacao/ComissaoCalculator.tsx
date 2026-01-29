'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  formatarMoeda,
  formatarNumeroPercentual,
  calcularComissao,
} from '@/lib/intermediacao/formatters'

export interface ComissaoCalculatorProps {
  valorVenda: number
  percentual: number
  onChange?: (comissao: number) => void
  className?: string
}

/**
 * Calculadora de comissao
 * Mostra formula explicita e atualiza em tempo real
 *
 * Visual:
 * +---------------------------------------------+
 * | Calculo da Comissao                         |
 * | ------------------------------------------- |
 * | Valor da Venda:    R$ 500.000,00            |
 * | Percentual:        x 5,00%                  |
 * |                    -----------              |
 * | Comissao Total:    = R$ 25.000,00           |
 * +---------------------------------------------+
 */
export function ComissaoCalculator({
  valorVenda,
  percentual,
  onChange,
  className,
}: ComissaoCalculatorProps) {
  const comissao = calcularComissao(valorVenda, percentual)

  // Notifica mudanca quando o valor muda
  React.useEffect(() => {
    onChange?.(comissao)
  }, [comissao, onChange])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Calculo da Comissao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valor da Venda */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Valor da Venda:</span>
          <span className="font-mono text-lg font-medium">
            {formatarMoeda(valorVenda)}
          </span>
        </div>

        {/* Percentual */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Percentual:</span>
          <span className="font-mono text-lg">
            <span className="text-muted-foreground mr-1">x</span>
            {formatarNumeroPercentual(percentual)}%
          </span>
        </div>

        {/* Divisor */}
        <div className="border-t border-dashed" />

        {/* Resultado */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">
            Comissao Total:
          </span>
          <span className="font-mono text-xl font-bold text-primary">
            <span className="text-muted-foreground mr-1">=</span>
            {formatarMoeda(comissao)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
