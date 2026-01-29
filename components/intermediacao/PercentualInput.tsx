'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatarNumeroPercentual, parsePercentual } from '@/lib/intermediacao/formatters'

export interface PercentualInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  className?: string
  placeholder?: string
}

/**
 * Input de percentual com mascara
 * Aceita: 5 ou 5.5 ou 5,5
 * Exibe: 5,00%
 * Retorna: number (5.0)
 * Validacao de range
 */
export function PercentualInput({
  value,
  onChange,
  min = 0,
  max = 100,
  disabled = false,
  className,
  placeholder = '0,00%',
}: PercentualInputProps) {
  const [displayValue, setDisplayValue] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Atualiza o valor exibido quando o valor externo muda
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value > 0 ? `${formatarNumeroPercentual(value)}%` : '')
    }
  }, [value, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value

    // Permite apenas números, vírgula e ponto
    const cleanValue = rawValue.replace(/[^\d.,]/g, '')
    setDisplayValue(cleanValue)

    // Parse e valida
    const numericValue = parsePercentual(cleanValue)

    // Valida range
    if (numericValue < min) {
      setError(`Minimo: ${min}%`)
    } else if (numericValue > max) {
      setError(`Maximo: ${max}%`)
    } else {
      setError(null)
    }

    // Clamp o valor dentro do range
    const clampedValue = Math.min(Math.max(numericValue, min), max)
    onChange(clampedValue)
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
    setError(null)
    // Ao perder foco, formata o valor
    if (value > 0) {
      setDisplayValue(`${formatarNumeroPercentual(value)}%`)
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
          disabled && 'bg-muted cursor-not-allowed',
          error && 'border-destructive focus-visible:ring-destructive/50'
        )}
        aria-invalid={!!error}
      />
      {error && (
        <p className="text-destructive text-xs mt-1 absolute -bottom-5 right-0">
          {error}
        </p>
      )}
    </div>
  )
}
