'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { RotateCcw, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ComissaoCorretor, ComissaoParcela, MatrizPlanilhaRow } from '@/lib/comissao/types'

// ============================================================================
// TYPES
// ============================================================================

interface MatrizEditavelProps {
  vendaId: number
  corretores: ComissaoCorretor[]
  parcelas: ComissaoParcela[]
  matriz: MatrizPlanilhaRow[]
  totaisParcela: number[]
  totalGeral: number
  onCelulaChange?: (corretorId: number, parcelaId: number, valor: number) => void
  onReset?: (corretorId: number, parcelaId: number) => void
  readOnly?: boolean
}

interface CelulaEditavelState {
  [key: string]: {
    valorManual: number | null
    editando: boolean
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function parseCurrencyInput(value: string): number {
  // Remove currency formatting and parse
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function formatInputValue(value: number): string {
  // Format for input display (without R$)
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getCelulaKey(corretorId: number, parcelaIndex: number): string {
  return `${corretorId}-${parcelaIndex}`
}

// ============================================================================
// CELULA EDITAVEL COMPONENT
// ============================================================================

interface CelulaEditavelProps {
  corretorId: number
  parcelaId: number
  parcelaIndex: number
  valorCalculado: number
  valorManual: number | null
  valorFinal: number
  readOnly: boolean
  onChange: (corretorId: number, parcelaId: number, valor: number) => void
  onReset: (corretorId: number, parcelaId: number) => void
}

function CelulaEditavel({
  corretorId,
  parcelaId,
  parcelaIndex,
  valorCalculado,
  valorManual,
  valorFinal,
  readOnly,
  onChange,
  onReset,
}: CelulaEditavelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isManualEdit = valorManual !== null && valorManual !== valorCalculado
  const displayValue = valorManual !== null ? valorManual : valorCalculado

  const handleStartEdit = useCallback(() => {
    if (readOnly) return
    setInputValue(formatInputValue(displayValue))
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [readOnly, displayValue])

  const handleFinishEdit = useCallback(() => {
    const newValue = parseCurrencyInput(inputValue)
    if (newValue !== valorCalculado) {
      onChange(corretorId, parcelaId, newValue)
    }
    setIsEditing(false)
  }, [inputValue, valorCalculado, corretorId, parcelaId, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleFinishEdit()
      } else if (e.key === 'Escape') {
        setIsEditing(false)
      }
    },
    [handleFinishEdit]
  )

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onReset(corretorId, parcelaId)
    },
    [corretorId, parcelaId, onReset]
  )

  if (isEditing) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleFinishEdit}
          onKeyDown={handleKeyDown}
          className="h-8 w-28 text-right text-sm font-mono"
          autoFocus
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleStartEdit}
            className={cn(
              'group relative flex items-center justify-end gap-1 rounded px-2 py-1 transition-colors',
              !readOnly && 'cursor-pointer hover:bg-muted',
              isManualEdit && 'bg-amber-50 dark:bg-amber-950/30'
            )}
          >
            <span className={cn('font-mono text-sm', isManualEdit && 'font-medium text-amber-700 dark:text-amber-400')}>
              {formatCurrency(displayValue)}
            </span>
            {isManualEdit && !readOnly && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Valor calculado:</span>
              <span className="font-mono">{formatCurrency(valorCalculado)}</span>
            </div>
            {isManualEdit && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Valor manual:</span>
                <span className="font-mono font-medium text-amber-600">{formatCurrency(valorManual!)}</span>
              </div>
            )}
            {!readOnly && (
              <div className="mt-2 border-t pt-2 text-muted-foreground">
                Clique para editar{isManualEdit ? ' ou use o botao para resetar' : ''}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// WARNING BADGE COMPONENT
// ============================================================================

interface WarningBadgeProps {
  message: string
}

function WarningBadge({ message }: WarningBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ml-1 inline-flex cursor-help">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="text-xs">{message}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MatrizEditavel({
  vendaId,
  corretores,
  parcelas,
  matriz,
  totaisParcela,
  totalGeral,
  onCelulaChange,
  onReset,
  readOnly = false,
}: MatrizEditavelProps) {
  // Local state for tracking edits when callbacks not provided
  const [localEdits, setLocalEdits] = useState<CelulaEditavelState>({})

  // Calculate real-time totals based on current values
  const { totaisLinhaCalculados, totaisColunaCalculados, totalGeralCalculado, warnings } = useMemo(() => {
    const totaisLinha: number[] = []
    const totaisColuna: number[] = new Array(parcelas.length).fill(0)
    let totalGeral = 0
    const warnings: { type: 'row' | 'column'; index: number; message: string }[] = []

    matriz.forEach((row, rowIndex) => {
      let totalLinha = 0

      parcelas.forEach((_, colIndex) => {
        const celulaKey = getCelulaKey(row.corretor_id, colIndex)
        const localEdit = localEdits[celulaKey]

        // Determine final value
        let valorFinal: number
        if (localEdit?.valorManual !== null && localEdit?.valorManual !== undefined) {
          valorFinal = localEdit.valorManual
        } else if (row.valores_finais_por_parcela?.[colIndex] !== undefined) {
          valorFinal = row.valores_finais_por_parcela[colIndex]
        } else if (row.valores_manuais_por_parcela?.[colIndex] !== null && row.valores_manuais_por_parcela?.[colIndex] !== undefined) {
          valorFinal = row.valores_manuais_por_parcela[colIndex]!
        } else {
          valorFinal = row.valores_por_parcela[colIndex] || 0
        }

        totalLinha += valorFinal
        totaisColuna[colIndex] += valorFinal
      })

      totaisLinha.push(totalLinha)
      totalGeral += totalLinha

      // Check row warning
      const expectedRowTotal = row.corretor_comissao_total
      const tolerance = 0.01 // 1 centavo
      if (Math.abs(totalLinha - expectedRowTotal) > tolerance) {
        warnings.push({
          type: 'row',
          index: rowIndex,
          message: `Soma da linha (${formatCurrency(totalLinha)}) difere do valor esperado (${formatCurrency(expectedRowTotal)})`,
        })
      }
    })

    // Check column warnings
    parcelas.forEach((parcela, colIndex) => {
      const expectedColTotal = totaisParcela[colIndex] || 0
      const tolerance = 0.01
      if (Math.abs(totaisColuna[colIndex] - expectedColTotal) > tolerance) {
        warnings.push({
          type: 'column',
          index: colIndex,
          message: `Soma da coluna (${formatCurrency(totaisColuna[colIndex])}) difere do esperado (${formatCurrency(expectedColTotal)})`,
        })
      }
    })

    return {
      totaisLinhaCalculados: totaisLinha,
      totaisColunaCalculados: totaisColuna,
      totalGeralCalculado: totalGeral,
      warnings,
    }
  }, [matriz, parcelas, totaisParcela, localEdits])

  // Handle cell change
  const handleCelulaChange = useCallback(
    (corretorId: number, parcelaId: number, valor: number) => {
      const parcelaIndex = parcelas.findIndex((p) => p.id === parcelaId)
      if (parcelaIndex === -1) return

      const celulaKey = getCelulaKey(corretorId, parcelaIndex)
      setLocalEdits((prev) => ({
        ...prev,
        [celulaKey]: {
          valorManual: valor,
          editando: false,
        },
      }))

      onCelulaChange?.(corretorId, parcelaId, valor)
    },
    [parcelas, onCelulaChange]
  )

  // Handle reset
  const handleReset = useCallback(
    (corretorId: number, parcelaId: number) => {
      const parcelaIndex = parcelas.findIndex((p) => p.id === parcelaId)
      if (parcelaIndex === -1) return

      const celulaKey = getCelulaKey(corretorId, parcelaIndex)
      setLocalEdits((prev) => {
        const newState = { ...prev }
        delete newState[celulaKey]
        return newState
      })

      onReset?.(corretorId, parcelaId)
    },
    [parcelas, onReset]
  )

  // Get value for a cell considering local edits
  const getCelulaValues = useCallback(
    (row: MatrizPlanilhaRow, parcelaIndex: number) => {
      const celulaKey = getCelulaKey(row.corretor_id, parcelaIndex)
      const localEdit = localEdits[celulaKey]

      const valorCalculado = row.valores_por_parcela[parcelaIndex] || 0
      const valorManualOriginal = row.valores_manuais_por_parcela?.[parcelaIndex] ?? null

      // Priority: local edit > original manual > calculated
      let valorManual: number | null = null
      if (localEdit?.valorManual !== null && localEdit?.valorManual !== undefined) {
        valorManual = localEdit.valorManual
      } else if (valorManualOriginal !== null) {
        valorManual = valorManualOriginal
      }

      const valorFinal = valorManual !== null ? valorManual : valorCalculado

      return { valorCalculado, valorManual, valorFinal }
    },
    [localEdits]
  )

  // Check if a row has warning
  const getRowWarning = useCallback(
    (rowIndex: number) => {
      return warnings.find((w) => w.type === 'row' && w.index === rowIndex)
    },
    [warnings]
  )

  // Check if a column has warning
  const getColumnWarning = useCallback(
    (colIndex: number) => {
      return warnings.find((w) => w.type === 'column' && w.index === colIndex)
    },
    [warnings]
  )

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-[200px] font-semibold">Beneficiario</TableHead>
            <TableHead className="w-24 text-right font-semibold">% Part.</TableHead>
            <TableHead className="w-32 text-right font-semibold">Total</TableHead>
            {parcelas.map((parcela, index) => (
              <TableHead key={parcela.id} className="min-w-[140px] text-right font-semibold">
                <div className="flex items-center justify-end">
                  <span>
                    {parcela.descricao || `Parcela ${parcela.numero}`}
                  </span>
                  {getColumnWarning(index) && <WarningBadge message={getColumnWarning(index)!.message} />}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {matriz.map((row, rowIndex) => {
            const rowWarning = getRowWarning(rowIndex)
            const corretor = corretores.find((c) => c.id === row.corretor_id)

            return (
              <TableRow
                key={row.corretor_id}
                className={cn(rowWarning && 'bg-amber-50/50 dark:bg-amber-950/20')}
              >
                {/* Beneficiario Name */}
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{row.corretor_nome}</span>
                    {row.cargo && (
                      <span className="text-xs text-muted-foreground">{row.cargo}</span>
                    )}
                    {row.documento && (
                      <span className="font-mono text-xs text-muted-foreground">{row.documento}</span>
                    )}
                  </div>
                </TableCell>

                {/* Percentual */}
                <TableCell className="text-right font-mono">
                  {formatPercent(row.percentual_participacao)}
                </TableCell>

                {/* Total da linha */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <span className="font-mono font-semibold">
                      {formatCurrency(totaisLinhaCalculados[rowIndex])}
                    </span>
                    {rowWarning && <WarningBadge message={rowWarning.message} />}
                  </div>
                </TableCell>

                {/* Celulas editaveis por parcela */}
                {parcelas.map((parcela, colIndex) => {
                  const { valorCalculado, valorManual, valorFinal } = getCelulaValues(row, colIndex)

                  return (
                    <TableCell key={parcela.id} className="p-1">
                      <CelulaEditavel
                        corretorId={row.corretor_id}
                        parcelaId={parcela.id}
                        parcelaIndex={colIndex}
                        valorCalculado={valorCalculado}
                        valorManual={valorManual}
                        valorFinal={valorFinal}
                        readOnly={readOnly}
                        onChange={handleCelulaChange}
                        onReset={handleReset}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>

        <TableFooter>
          <TableRow className="bg-muted font-semibold">
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right">
              <span className="font-mono">{formatCurrency(totalGeralCalculado)}</span>
            </TableCell>
            {parcelas.map((parcela, colIndex) => {
              const colWarning = getColumnWarning(colIndex)
              return (
                <TableCell key={parcela.id} className="text-right">
                  <div className="flex items-center justify-end">
                    <span className="font-mono">{formatCurrency(totaisColunaCalculados[colIndex])}</span>
                    {colWarning && <WarningBadge message={colWarning.message} />}
                  </div>
                </TableCell>
              )
            })}
          </TableRow>
        </TableFooter>
      </Table>

      {/* Warnings summary */}
      {warnings.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Atencao: valores inconsistentes detectados
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-amber-50 dark:bg-amber-950/30" />
          <span>Valor editado manualmente</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="h-3 w-3" />
          <span>Clique para resetar ao valor calculado</span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3" />
            <span>Clique em qualquer celula para editar</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MatrizEditavel
