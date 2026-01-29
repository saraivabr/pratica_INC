'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ParcelaStatusBadge, calcularDiasParaVencimento } from './ParcelaStatusBadge'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CreditCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
} from 'lucide-react'
import type { Parcela, Beneficiario } from './types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ParcelaTableProps {
  parcelas: (Parcela & {
    vendaCodigo?: string
    totalParcelas?: number
    beneficiario?: Beneficiario
  })[]
  selectable?: boolean
  onSelectionChange?: (ids: string[]) => void
  onPagar?: (id: string) => void
}

type SortField = 'venda' | 'beneficiario' | 'parcela' | 'valor' | 'vencimento' | 'status'
type SortDirection = 'asc' | 'desc'

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function formatarMoedaCurta(valor: number): string {
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`
  }
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(1)}K`
  }
  return formatarMoeda(valor)
}

function formatarData(data: Date | string): string {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  if (!isValid(dataObj)) return '--/--/--'
  return format(dataObj, 'dd/MM/yy', { locale: ptBR })
}

export function ParcelaTable({
  parcelas,
  selectable = false,
  onSelectionChange,
  onPagar,
}: ParcelaTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('vencimento')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedParcelas = useMemo(() => {
    return [...parcelas].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'venda':
          comparison = (a.vendaCodigo || '').localeCompare(b.vendaCodigo || '')
          break
        case 'beneficiario':
          comparison = (a.beneficiario?.nome || '').localeCompare(b.beneficiario?.nome || '')
          break
        case 'parcela':
          comparison = a.numero - b.numero
          break
        case 'valor':
          comparison = a.valor - b.valor
          break
        case 'vencimento':
          const dateA = typeof a.dataVencimento === 'string' ? parseISO(a.dataVencimento) : a.dataVencimento
          const dateB = typeof b.dataVencimento === 'string' ? parseISO(b.dataVencimento) : b.dataVencimento
          comparison = dateA.getTime() - dateB.getTime()
          break
        case 'status':
          const statusOrder = { vencida: 0, pendente: 1, paga: 2, cancelada: 3 }
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [parcelas, sortField, sortDirection])

  const handleSelectAll = (checked: boolean) => {
    const selectableParcelas = parcelas.filter(p => p.status !== 'paga' && p.status !== 'cancelada')
    if (checked) {
      const newSelected = new Set(selectableParcelas.map(p => p.id))
      setSelectedIds(newSelected)
      onSelectionChange?.(Array.from(newSelected))
    } else {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
    onSelectionChange?.(Array.from(newSelected))
  }

  const selectableParcelas = parcelas.filter(p => p.status !== 'paga' && p.status !== 'cancelada')
  const allSelected = selectableParcelas.length > 0 && selectableParcelas.every(p => selectedIds.has(p.id))
  const someSelected = selectableParcelas.some(p => selectedIds.has(p.id)) && !allSelected

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    )
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    // @ts-expect-error - indeterminate is valid for HTML checkbox
                    indeterminate={someSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todas"
                  />
                </TableHead>
              )}
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('venda')}
              >
                <div className="flex items-center">
                  Venda
                  <SortIcon field="venda" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('beneficiario')}
              >
                <div className="flex items-center">
                  Beneficiario
                  <SortIcon field="beneficiario" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('parcela')}
              >
                <div className="flex items-center">
                  Parcela
                  <SortIcon field="parcela" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors text-right"
                onClick={() => handleSort('valor')}
              >
                <div className="flex items-center justify-end">
                  Valor
                  <SortIcon field="valor" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('vencimento')}
              >
                <div className="flex items-center">
                  Vencimento
                  <SortIcon field="vencimento" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              {onPagar && <TableHead className="text-right">Acoes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedParcelas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectable ? 8 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhuma parcela encontrada
                </TableCell>
              </TableRow>
            ) : (
              sortedParcelas.map((parcela) => {
                const dias = calcularDiasParaVencimento(parcela.dataVencimento)
                const isPaga = parcela.status === 'paga'
                const isCancelada = parcela.status === 'cancelada'
                const canSelect = !isPaga && !isCancelada
                const canPagar = canSelect

                return (
                  <TableRow
                    key={parcela.id}
                    className={cn(
                      'group',
                      isPaga && 'bg-muted/30',
                      isCancelada && 'bg-muted/20 opacity-60',
                      selectedIds.has(parcela.id) && 'bg-primary/5'
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(parcela.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(parcela.id, !!checked)
                          }
                          disabled={!canSelect}
                          aria-label={`Selecionar parcela ${parcela.numero}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">
                      {parcela.vendaCodigo || '--'}
                    </TableCell>
                    <TableCell>
                      {parcela.beneficiario ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-default">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">
                                {parcela.beneficiario.nome}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="text-xs">
                              <p className="font-medium">{parcela.beneficiario.nome}</p>
                              <p className="text-muted-foreground capitalize">
                                {parcela.beneficiario.cargo}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {parcela.numero}/{parcela.totalParcelas || '?'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium cursor-default">
                            {formatarMoedaCurta(parcela.valor)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {formatarMoeda(parcela.valor)}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm',
                          dias < 0 && !isPaga && 'text-red-600 dark:text-red-400 font-medium'
                        )}
                      >
                        {formatarData(parcela.dataVencimento)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ParcelaStatusBadge
                        status={parcela.status}
                        diasParaVencimento={dias}
                        compact
                      />
                    </TableCell>
                    {onPagar && (
                      <TableCell className="text-right">
                        {canPagar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPagar(parcela.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
