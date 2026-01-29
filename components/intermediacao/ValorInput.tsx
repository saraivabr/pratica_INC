'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatarMoeda, parseMoeda } from '@/lib/intermediacao/formatters'

export interface ValorInputProps {
  value: number
  onChange: (value: number) => void
  currency?: string
  disabled?: boolean
  className?: string
  placeholder?: string
}

/**
 * Input de valor monetario com mascara
 * Aceita: 1234.56 ou 1.234,56
 * Exibe: R$ 1.234,56
 * Retorna: number (1234.56)
 */
export function ValorInput({
  value,
  onChange,
  currency = 'BRL',
  disabled = false,
  className,
  placeholder = 'R$ 0,00',
}: ValorInputProps) {
  const [displayValue, setDisplayValue] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(false)

  // Atualiza o valor exibido quando o valor externo muda
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value > 0 ? formatarMoeda(value) : '')
    }
  }, [value, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value

    // Permite apenas números, vírgula e ponto
    const cleanValue = rawValue.replace(/[^\d.,]/g, '')
    setDisplayValue(cleanValue)

    // Parse e notifica a mudança
    const numericValue = parseMoeda(cleanValue)
    onChange(numericValue)
  }

  const handleFocus = () => {
    setIsFocused(true)
    // Ao focar, mostra apenas o número sem formatação
    if (value > 0) {
      setDisplayValue(value.toFixed(2).replace('.', ','))
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Ao perder foco, formata o valor
    if (value > 0) {
      setDisplayValue(formatarMoeda(value))
    } else {
      setDisplayValue('')
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'text-right font-mono',
          disabled && 'bg-muted cursor-not-allowed'
        )}
      />
    </div>
  )
}
