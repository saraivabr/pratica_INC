'use client'

import { useState } from 'react'
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
  CreditCard,
  Loader2,
  Banknote,
  QrCode,
  Building2,
  MoreHorizontal,
} from 'lucide-react'
import type { Parcela, Beneficiario, DadosPagamento, MetodoPagamento } from './types'

interface ParcelaConfirmarPagamentoProps {
  parcela: (Parcela & { vendaCodigo?: string; beneficiario?: Beneficiario }) | (Parcela & { vendaCodigo?: string; beneficiario?: Beneficiario })[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (dados: DadosPagamento) => void
  onCancel: () => void
  isLoading?: boolean
}

const metodosOptions: { value: MetodoPagamento; label: string; icon: React.ReactNode }[] = [
  { value: 'transferencia', label: 'Transferencia Bancaria', icon: <Building2 className="h-4 w-4" /> },
  { value: 'pix', label: 'PIX', icon: <QrCode className="h-4 w-4" /> },
  { value: 'deposito', label: 'Deposito', icon: <Banknote className="h-4 w-4" /> },
  { value: 'outro', label: 'Outro', icon: <MoreHorizontal className="h-4 w-4" /> },
]

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

export function ParcelaConfirmarPagamento({
  parcela,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isLoading = false,
}: ParcelaConfirmarPagamentoProps) {
  const [dataPagamento, setDataPagamento] = useState<Date>(new Date())
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix')
  const [comprovante, setComprovante] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

  const isMultiple = Array.isArray(parcela)
  const parcelas = isMultiple ? parcela : [parcela]
  const totalValor = parcelas.reduce((acc, p) => acc + p.valor, 0)

  const handleConfirm = () => {
    onConfirm({
      dataPagamento,
      metodoPagamento,
      comprovante: comprovante || undefined,
    })
  }

  const handleCancel = () => {
    setDataPagamento(new Date())
    setMetodoPagamento('pix')
    setComprovante('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Confirmar Pagamento
          </DialogTitle>
          <DialogDescription>
            {isMultiple
              ? `Confirme o pagamento de ${parcelas.length} parcelas selecionadas`
              : 'Confirme os dados do pagamento da parcela'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info da(s) parcela(s) */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {isMultiple ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Parcelas:</span>
                  <span className="font-medium">{parcelas.length} selecionadas</span>
                </div>
                <div className="max-h-[120px] overflow-y-auto space-y-1">
                  {parcelas.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1"
                    >
                      <span className="text-muted-foreground">
                        {p.vendaCodigo} - {p.numero}/{(p as { totalParcelas?: number }).totalParcelas || '?'}
                      </span>
                      <span className="font-mono">{formatarMoeda(p.valor)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Total a pagar:</span>
                  <span className="text-lg text-primary">{formatarMoeda(totalValor)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Parcela:</span>
                  <span className="font-mono">
                    {parcelas[0].vendaCodigo} - {parcelas[0].numero}/{(parcelas[0] as { totalParcelas?: number }).totalParcelas || '?'}
                  </span>
                </div>
                {parcelas[0].beneficiario && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Beneficiario:</span>
                    <span>{parcelas[0].beneficiario.nome}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold text-primary">
                    {formatarMoeda(parcelas[0].valor)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span>{formatarData(parcelas[0].dataVencimento)}</span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Formulario */}
          <div className="space-y-4">
            {/* Data do Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="dataPagamento">Data do Pagamento</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dataPagamento && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataPagamento ? format(dataPagamento, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataPagamento}
                    onSelect={(date) => {
                      if (date) {
                        setDataPagamento(date)
                        setCalendarOpen(false)
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Metodo de Pagamento */}
            <div className="space-y-2">
              <Label>Metodo de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {metodosOptions.map((metodo) => (
                  <Button
                    key={metodo.value}
                    type="button"
                    variant={metodoPagamento === metodo.value ? 'default' : 'outline'}
                    className={cn(
                      'justify-start h-auto py-3',
                      metodoPagamento === metodo.value && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => setMetodoPagamento(metodo.value)}
                  >
                    {metodo.icon}
                    <span className="ml-2 text-sm">{metodo.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Comprovante/Referencia */}
            <div className="space-y-2">
              <Label htmlFor="comprovante">Comprovante/Referencia (opcional)</Label>
              <Input
                id="comprovante"
                placeholder="Numero do comprovante, ID da transacao..."
                value={comprovante}
                onChange={(e) => setComprovante(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
