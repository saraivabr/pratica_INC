"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Clock,
  LayoutList,
  CalendarDays,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Types
interface Parcela {
  id: string
  venda_id: string
  venda_codigo: string
  beneficiario_id: string
  beneficiario_nome: string
  numero_parcela: number
  total_parcelas: number
  valor: number
  data_vencimento: string
  data_pagamento?: string
  status: "pendente" | "vencida" | "proxima" | "paga"
  metodo_pagamento?: string
  comprovante?: string
}

// API response types
interface ApiCalendarioParcela {
  id: number
  numero_parcela: number
  valor: number
  status: string
  beneficiario: {
    id: number
    nome: string
  }
  venda: {
    id: number
    cliente_nome: string
    empreendimento: string
  }
}

interface ApiCalendarioDia {
  dia: string
  quantidade: number
  valor_total: number
  valor_pago: number
  valor_pendente: number
  quantidade_paga: number
  quantidade_pendente: number
  parcelas: ApiCalendarioParcela[]
}

// Helper functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000) {
    return `R$${(value / 1000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("pt-BR")
}

function getDaysUntilDue(dateString: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dateString + "T00:00:00")
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

function getStatusColor(
  parcela: Parcela
): "red" | "amber" | "emerald" | "gray" {
  if (parcela.status === "paga") return "gray"
  const days = getDaysUntilDue(parcela.data_vencimento)
  if (days < 0) return "red"
  if (days <= 7) return "amber"
  return "emerald"
}

// Payment Modal Component
function PaymentModal({
  open,
  onOpenChange,
  parcela,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parcela: Parcela | null
  onConfirm: (data: {
    data_pagamento: string
    metodo_pagamento: string
    comprovante: string
  }) => void
}) {
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [metodoPagamento, setMetodoPagamento] = useState("transferencia")
  const [comprovante, setComprovante] = useState("")
  const [loading, setLoading] = useState(false)

  if (!parcela) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm({
        data_pagamento: dataPagamento,
        metodo_pagamento: metodoPagamento,
        comprovante,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
          <DialogDescription>
            Registrar pagamento da parcela {parcela.numero_parcela}/
            {parcela.total_parcelas}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parcela:</span>
              <span className="font-medium">
                {parcela.venda_codigo} - {parcela.numero_parcela}/
                {parcela.total_parcelas}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Beneficiario:</span>
              <span className="font-medium">{parcela.beneficiario_nome}</span>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm text-muted-foreground">Valor:</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(parcela.valor)}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_pagamento">Data do Pagamento</Label>
            <Input
              id="data_pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo">Metodo de Pagamento</Label>
            <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
              <SelectTrigger id="metodo">
                <SelectValue placeholder="Selecione o metodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comprovante">Comprovante/Referencia</Label>
            <Input
              id="comprovante"
              placeholder="Numero do comprovante ou referencia"
              value={comprovante}
              onChange={(e) => setComprovante(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Day Details Modal
function DayDetailsModal({
  open,
  onOpenChange,
  date,
  parcelas,
  onPayParcela,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  parcelas: Parcela[]
  onPayParcela: (parcela: Parcela) => void
}) {
  if (!date) return null

  const totalValor = parcelas.reduce((acc, p) => acc + p.valor, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Parcelas - {date.toLocaleDateString("pt-BR", { dateStyle: "long" })}
          </DialogTitle>
          <DialogDescription>
            {parcelas.length} parcela{parcelas.length !== 1 ? "s" : ""} | Total:{" "}
            {formatCurrency(totalValor)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {parcelas.map((parcela) => {
            const color = getStatusColor(parcela)
            const isPaid = parcela.status === "paga"

            return (
              <div
                key={parcela.id}
                className={cn(
                  "p-4 rounded-lg border",
                  color === "red" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
                  color === "amber" && "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
                  color === "emerald" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
                  color === "gray" && "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/admin/intermediacao/vendas/${parcela.venda_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {parcela.venda_codigo}
                      </Link>
                      <Badge variant="outline">
                        {parcela.numero_parcela}/{parcela.total_parcelas}
                      </Badge>
                      {isPaid && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Paga
                        </Badge>
                      )}
                    </div>
                    <Link
                      href={`/admin/intermediacao/beneficiarios/${parcela.beneficiario_id}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {parcela.beneficiario_nome}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(parcela.valor)}</p>
                    {!isPaid && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => onPayParcela(parcela)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function CalendarioParcelasPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // State
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [parcelaParaPagar, setParcelaParaPagar] = useState<Parcela | null>(null)

  usePageTracking("admin-intermediacao-parcelas-calendario")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  // Fetch parcelas from API
  const fetchParcelas = useCallback(async (date: Date) => {
    setLoading(true)
    try {
      const mes = date.getMonth() + 1
      const ano = date.getFullYear()

      const response = await fetch(
        `/api/intermediacao/parcelas/calendario?mes=${mes}&ano=${ano}&incluir_pagas=true`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao carregar parcelas")
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar parcelas")
      }

      // Transform API data to component format
      const transformedParcelas: Parcela[] = []

      data.data.calendario.forEach((dia: ApiCalendarioDia) => {
        dia.parcelas.forEach((p: ApiCalendarioParcela) => {
          // Determine status based on date and API status
          let status: Parcela["status"] = "pendente"
          if (p.status === "paga") {
            status = "paga"
          } else {
            const daysUntil = getDaysUntilDue(dia.dia)
            if (daysUntil < 0) {
              status = "vencida"
            } else if (daysUntil <= 7) {
              status = "proxima"
            }
          }

          transformedParcelas.push({
            id: String(p.id),
            venda_id: String(p.venda?.id || ""),
            venda_codigo: p.venda?.empreendimento
              ? `${p.venda.empreendimento} - ${p.venda.cliente_nome}`
              : p.venda?.cliente_nome || "N/A",
            beneficiario_id: String(p.beneficiario?.id || ""),
            beneficiario_nome: p.beneficiario?.nome || "N/A",
            numero_parcela: p.numero_parcela,
            total_parcelas: p.numero_parcela, // API doesn't return total, using current as placeholder
            valor: p.valor,
            data_vencimento: dia.dia,
            status,
          })
        })
      })

      setParcelas(transformedParcelas)
    } catch (error) {
      console.error("Erro ao carregar parcelas:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao carregar parcelas")
      setParcelas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch data when authenticated and month changes
  useEffect(() => {
    if (isAuthenticated && hasAccess) {
      fetchParcelas(currentDate)
    }
  }, [isAuthenticated, hasAccess, currentDate, fetchParcelas])

  // Calendar calculations
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of month
    const firstDay = new Date(year, month, 1)
    const startingDayOfWeek = firstDay.getDay()

    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Generate calendar days
    const days: {
      date: Date
      isCurrentMonth: boolean
      parcelas: Parcela[]
      totalValor: number
      status: "red" | "amber" | "emerald" | "gray" | null
    }[] = []

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i)
      days.push({
        date,
        isCurrentMonth: false,
        parcelas: [],
        totalValor: 0,
        status: null,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split("T")[0]
      const dayParcelas = parcelas.filter(
        (p) => p.data_vencimento === dateStr
      )
      const totalValor = dayParcelas.reduce((acc, p) => acc + p.valor, 0)

      // Determine the status color (priority: red > amber > emerald > gray)
      let status: "red" | "amber" | "emerald" | "gray" | null = null
      if (dayParcelas.length > 0) {
        const hasOverdue = dayParcelas.some(
          (p) => p.status !== "paga" && getDaysUntilDue(p.data_vencimento) < 0
        )
        const hasUpcoming = dayParcelas.some(
          (p) =>
            p.status !== "paga" &&
            getDaysUntilDue(p.data_vencimento) >= 0 &&
            getDaysUntilDue(p.data_vencimento) <= 7
        )
        const hasPending = dayParcelas.some(
          (p) => p.status !== "paga" && getDaysUntilDue(p.data_vencimento) > 7
        )
        const allPaid = dayParcelas.every((p) => p.status === "paga")

        if (hasOverdue) status = "red"
        else if (hasUpcoming) status = "amber"
        else if (hasPending) status = "emerald"
        else if (allPaid) status = "gray"
      }

      days.push({
        date,
        isCurrentMonth: true,
        parcelas: dayParcelas,
        totalValor,
        status,
      })
    }

    // Next month days (fill remaining slots)
    const remainingSlots = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= remainingSlots; i++) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        parcelas: [],
        totalValor: 0,
        status: null,
      })
    }

    return days
  }, [currentDate, parcelas])

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Day click handler
  const handleDayClick = (day: (typeof calendarData)[0]) => {
    if (day.parcelas.length > 0) {
      setSelectedDate(day.date)
      setDayDetailsOpen(true)
    }
  }

  // Payment handlers
  const handlePayParcela = (parcela: Parcela) => {
    setParcelaParaPagar(parcela)
    setDayDetailsOpen(false)
    setPaymentModalOpen(true)
  }

  const handleConfirmPayment = async (data: {
    data_pagamento: string
    metodo_pagamento: string
    comprovante: string
  }) => {
    if (!parcelaParaPagar) return

    try {
      const response = await fetch(
        `/api/intermediacao/parcelas/${parcelaParaPagar.id}/pagar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data_pagamento: data.data_pagamento,
            metodo: data.metodo_pagamento,
            comprovante: data.comprovante,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao registrar pagamento")
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Erro ao registrar pagamento")
      }

      // Update local state
      setParcelas((prev) =>
        prev.map((p) =>
          p.id === parcelaParaPagar.id
            ? {
                ...p,
                status: "paga" as const,
                data_pagamento: data.data_pagamento,
                metodo_pagamento: data.metodo_pagamento,
                comprovante: data.comprovante,
              }
            : p
        )
      )

      toast.success("Pagamento registrado com sucesso")
      setParcelaParaPagar(null)
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao registrar pagamento")
    }
  }

  // Selected date parcelas
  const selectedDateParcelas = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split("T")[0]
    return parcelas.filter((p) => p.data_vencimento === dateStr)
  }, [selectedDate, parcelas])

  // Format month/year
  const monthYearText = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })

  // Weekday headers
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

  // Access check
  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Esta area e exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppShell title="Calendario de Vencimentos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Calendario de Vencimentos</h1>
            <p className="text-muted-foreground">
              Visualizacao mensal das parcelas
            </p>
          </div>
          <Link href="/admin/intermediacao/parcelas">
            <Button variant="outline" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Ver Lista
            </Button>
          </Link>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>
          <h2 className="text-xl font-semibold capitalize">{monthYearText}</h2>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Vencida</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Proxima (7 dias)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Futura</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-muted-foreground">Paga</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Calendar Days */}
          {!loading && <div className="grid grid-cols-7">
            {calendarData.map((day, index) => {
              const isToday =
                day.date.toDateString() === new Date().toDateString()
              const hasParcelas = day.parcelas.length > 0

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-[100px] p-2 border-b border-r transition-colors",
                    !day.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    hasParcelas && "cursor-pointer hover:bg-muted/50",
                    index % 7 === 6 && "border-r-0"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full",
                        isToday &&
                          "bg-primary text-primary-foreground font-bold"
                      )}
                    >
                      {day.date.getDate()}
                    </span>
                    {day.status && (
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          day.status === "red" && "bg-red-500",
                          day.status === "amber" && "bg-amber-500",
                          day.status === "emerald" && "bg-emerald-500",
                          day.status === "gray" && "bg-gray-400"
                        )}
                      />
                    )}
                  </div>

                  {hasParcelas && (
                    <div className="mt-2 space-y-1">
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                          day.status === "red" &&
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          day.status === "amber" &&
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                          day.status === "emerald" &&
                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                          day.status === "gray" &&
                            "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {day.status === "red" && (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {day.status === "amber" && (
                          <Clock className="h-3 w-3" />
                        )}
                        {day.status === "emerald" && (
                          <CalendarDays className="h-3 w-3" />
                        )}
                        {day.status === "gray" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        <span>{day.parcelas.length}</span>
                      </div>
                      <p className="text-xs font-medium truncate">
                        {formatCurrencyCompact(day.totalValor)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>}
        </div>
      </div>

      {/* Day Details Modal */}
      <DayDetailsModal
        open={dayDetailsOpen}
        onOpenChange={setDayDetailsOpen}
        date={selectedDate}
        parcelas={selectedDateParcelas}
        onPayParcela={handlePayParcela}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        parcela={parcelaParaPagar}
        onConfirm={handleConfirmPayment}
      />
    </AppShell>
  )
}
