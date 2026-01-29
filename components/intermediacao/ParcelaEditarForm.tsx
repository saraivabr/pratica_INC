'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarIcon,
  Pencil,
  AlertTriangle,
  Info,
} from 'lucide-react'
import type { Parcela, ParcelaEditData } from './types'

interface ParcelaEditarFormProps {
  parcela: Parcela
  valorMaximo: number // valor restante disponivel
  somaAtualParcelas: number // soma de todas as parcelas (exceto esta)
  valorTotalEsperado: number // valor total que deveria ser distribuido
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (dados: ParcelaEditData) => void
  onCancel: () => void
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function parseMoeda(texto: string): number {
  // Remove tudo exceto digitos, virgula e ponto
  const limpo = texto.replace(/[^\d,.-]/g, '')
  // Converte virgula para ponto
  const normalizado = limpo.replace(',', '.')
  return parseFloat(normalizado) || 0
}

export function ParcelaEditarForm({
  parcela,
  valorMaximo,
  somaAtualParcelas,
  valorTotalEsperado,
  open,
  onOpenChange,
  onSubmit,
  onCancel,
}: ParcelaEditarFormProps) {
  const [valor, setValor] = useState(parcela.valor)
  const [valorInput, setValorInput] = useState(formatarMoeda(parcela.valor))
  const [dataVencimento, setDataVencimento] = useState<Date>(() => {
    const data = typeof parcela.dataVencimento === 'string'
      ? parseISO(parcela.dataVencimento)
      : parcela.dataVencimento
    return isValid(data) ? data : new Date()
  })
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Recalcula quando parcela muda
  useEffect(() => {
    setValor(parcela.valor)
    setValorInput(formatarMoeda(parcela.valor))
    const data = typeof parcela.dataVencimento === 'string'
      ? parseISO(parcela.dataVencimento)
      : parcela.dataVencimento
    setDataVencimento(isValid(data) ? data : new Date())
  }, [parcela])

  const novaSoma = somaAtualParcelas + valor
  const diferenca = valorTotalEsperado - novaSoma
  const temDiferenca = Math.abs(diferenca) > 0.01
  const valorExcedido = valor > valorMaximo + parcela.valor

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value
    setValorInput(texto)
    const novoValor = parseMoeda(texto)
    setValor(novoValor)
  }

  const handleValorBlur = () => {
    setValorInput(formatarMoeda(valor))
  }

  const handleSubmit = () => {
    onSubmit({
      valor,
      dataVencimento,
    })
  }

  const handleCancel = () => {
    setValor(parcela.valor)
    setValorInput(formatarMoeda(parcela.valor))
    const data = typeof parcela.dataVencimento === 'string'
      ? parseISO(parcela.dataVencimento)
      : parcela.dataVencimento
    setDataVencimento(isValid(data) ? data : new Date())
    onCancel()
  }

  const canSubmit = valor > 0 && !valorExcedido && dataVencimento

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Parcela
          </DialogTitle>
          <DialogDescription>
            Parcela {parcela.numero} - Altere o valor e/ou data de vencimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info atual */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor atual:</span>
              <span className="font-medium">{formatarMoeda(parcela.valor)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vencimento atual:</span>
              <span className="font-medium">
                {format(
                  typeof parcela.dataVencimento === 'string'
                    ? parseISO(parcela.dataVencimento)
                    : parcela.dataVencimento,
                  'dd/MM/yyyy',
                  { locale: ptBR }
                )}
              </span>
            </div>
          </div>

          <Separator />

          {/* Formulario */}
          <div className="space-y-4">
            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="valor">Novo Valor</Label>
              <Input
                id="valor"
                value={valorInput}
                onChange={handleValorChange}
                onBlur={handleValorBlur}
                placeholder="R$ 0,00"
                className={cn(
                  valorExcedido && 'border-red-500 focus-visible:ring-red-500'
                )}
              />
              {valorExcedido && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Valor excede o maximo disponivel ({formatarMoeda(valorMaximo + parcela.valor)})
                </p>
              )}
            </div>

            {/* Data de Vencimento */}
            <div className="space-y-2">
              <Label>Nova Data de Vencimento</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dataVencimento && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataVencimento
                      ? format(dataVencimento, 'PPP', { locale: ptBR })
                      : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataVencimento}
                    onSelect={(date) => {
                      if (date) {
                        setDataVencimento(date)
                        setCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Resumo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Soma atual (outras parcelas):</span>
              <span className="font-mono">{formatarMoeda(somaAtualParcelas)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Esta parcela:</span>
              <span className="font-mono">{formatarMoeda(valor)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Nova soma total:</span>
              <span
                className={cn(
                  'font-mono',
                  temDiferenca ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {formatarMoeda(novaSoma)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor esperado:</span>
              <span className="font-mono">{formatarMoeda(valorTotalEsperado)}</span>
            </div>

            {temDiferenca && (
              <div
                className={cn(
                  'flex items-start gap-2 p-2 rounded-lg text-xs mt-2',
                  diferenca > 0
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                )}
              >
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  {diferenca > 0 ? (
                    <p>
                      Faltam <strong>{formatarMoeda(diferenca)}</strong> para completar o valor total.
                      Ajuste esta ou outras parcelas.
                    </p>
                  ) : (
                    <p>
                      A soma excede o valor esperado em <strong>{formatarMoeda(Math.abs(diferenca))}</strong>.
                      Reduza o valor desta ou de outras parcelas.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Salvar Alteracoes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
