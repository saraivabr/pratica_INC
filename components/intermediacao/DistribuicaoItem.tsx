'use client'

import * as React from 'react'
import { X, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { formatarMoeda, getIniciais } from '@/lib/intermediacao/formatters'
import { PercentualInput } from './PercentualInput'
import type { Beneficiario } from '@/lib/intermediacao/types'

export interface DistribuicaoItemProps {
  beneficiario: Beneficiario
  percentual: number
  valor: number
  onPercentualChange: (percentual: number) => void
  onRemove: () => void
  disabled?: boolean
  className?: string
}

/**
 * Item individual de distribuicao
 *
 * Card com:
 * - Avatar/icone do beneficiario
 * - Nome e cargo
 * - Input de percentual (com %)
 * - Valor calculado (readonly)
 * - Botao remover
 */
export function DistribuicaoItem({
  beneficiario,
  percentual,
  valor,
  onPercentualChange,
  onRemove,
  disabled = false,
  className,
}: DistribuicaoItemProps) {
  return (
    <Card className={cn('relative', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            {beneficiario.avatar ? (
              <AvatarImage src={beneficiario.avatar} alt={beneficiario.nome} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              {beneficiario.nome ? (
                getIniciais(beneficiario.nome)
              ) : (
                <User className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{beneficiario.nome}</p>
            <p className="text-sm text-muted-foreground truncate">
              {beneficiario.cargo}
            </p>
          </div>

          {/* Percentual Input */}
          <div className="w-28 shrink-0">
            <label className="text-xs text-muted-foreground block mb-1">
              Percentual
            </label>
            <PercentualInput
              value={percentual}
              onChange={onPercentualChange}
              disabled={disabled}
              min={0}
              max={100}
            />
          </div>

          {/* Valor Calculado */}
          <div className="w-36 shrink-0 text-right">
            <label className="text-xs text-muted-foreground block mb-1">
              Valor
            </label>
            <p className="font-mono text-lg font-semibold text-primary">
              {formatarMoeda(valor)}
            </p>
          </div>

          {/* Botao Remover */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={disabled}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remover beneficiario</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
