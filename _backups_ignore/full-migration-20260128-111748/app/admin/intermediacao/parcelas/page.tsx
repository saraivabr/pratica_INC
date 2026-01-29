"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  Loader2,
  Search,
  ShieldAlert,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

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

interface Beneficiario {
  id: string
  nome: string
}

// API response types
interface ApiParcela {
  id: number
  numero_parcela: number
  valor: number
  data_vencimento: string
  status: string
  dias_atraso: number
  created_at: string
  updated_at: string
  venda: {
    id: number
    valor_venda: number
    cliente_nome: string
    empreendimento: string
    unidade: string
    status: string
  } | null
  beneficiario: {
    id: number
    nome: string
    documento: string
    cargo: string
  } | null
  pagamento: {
    id: number
    data_pagamento: string
    metodo: string
    comprovante: string
  } | null
}

interface ApiBeneficiario {
  id: number
  codigo: string
  nome: string
  tipo_documento: string
  documento: string
  cargo: string
  email: string
  telefone: string | null
  ativo: boolean
}

// Helper functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
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

function getStatusInfo(parcela: Parcela): {
  color: string
  bgColor: string
  text: string
  icon: React.ElementType
} {
  const days = getDaysUntilDue(parcela.data_vencimento)

  if (parcela.status === "paga") {
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "Paga",
      icon: CheckCircle2,
    }
  }

  if (days < 0) {
    return {
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      text: `${days}d`,
      icon: AlertCircle,
    }
  }

  if (days <= 7) {
    return {
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      text: `${days}d`,
      icon: Clock,
    }
  }

  return {
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    text: `${days}d`,
    icon: CheckCircle2,
  }
}

// Payment Modal Component
function PaymentModal({
  open,
  onOpenChange,
  parcelas,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parcelas: Parcela[]
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

  const totalValor = parcelas.reduce((acc, p) => acc + p.valor, 0)
  const isSingle = parcelas.length === 1

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
            {isSingle
              ? `Registrar pagamento da parcela ${parcelas[0]?.numero_parcela}/${parcelas[0]?.total_parcelas}`
              : `Registrar pagamento de ${parcelas.length} parcelas`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isSingle && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parcela:</span>
                <span className="font-medium">
                  {parcelas[0]?.venda_codigo} - {parcelas[0]?.numero_parcela}/
                  {parcelas[0]?.total_parcelas}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Beneficiario:</span>
                <span className="font-medium">
                  {parcelas[0]?.beneficiario_nome}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm text-muted-foreground">Valor Total:</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(totalValor)}
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

export default function ParcelasPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // State
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBeneficiarios, setLoadingBeneficiarios] = useState(true)
  const [activeTab, setActiveTab] = useState("todas")
  const [selectedParcelas, setSelectedParcelas] = useState<Set<string>>(
    new Set()
  )
  const [searchVenda, setSearchVenda] = useState("")
  const [filteredBeneficiario, setFilteredBeneficiario] = useState<string>("todos")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [parcelasParaPagar, setParcelasParaPagar] = useState<Parcela[]>([])

  const itemsPerPage = 10

  usePageTracking("admin-intermediacao-parcelas")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  // Fetch parcelas from API
  const fetchParcelas = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/intermediacao/parcelas?limit=1000")

      if (!response.ok) {
        throw new Error("Erro ao carregar parcelas")
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar parcelas")
      }

      // Transform API data to component format
      const transformedParcelas: Parcela[] = data.data.map((p: ApiParcela) => {
        // Determine status based on data_vencimento and if paid
        let status: "pendente" | "vencida" | "proxima" | "paga" = "pendente"
        if (p.status === "paga" || p.pagamento) {
          status = "paga"
        } else {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const dueDate = new Date(p.data_vencimento + "T00:00:00")
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays < 0) {
            status = "vencida"
          } else if (diffDays <= 7) {
            status = "proxima"
          } else {
            status = "pendente"
          }
        }

        return {
          id: String(p.id),
          venda_id: p.venda ? String(p.venda.id) : "",
          venda_codigo: p.venda ? `${p.venda.empreendimento} - ${p.venda.unidade}` : "N/A",
          beneficiario_id: p.beneficiario ? String(p.beneficiario.id) : "",
          beneficiario_nome: p.beneficiario?.nome || "N/A",
          numero_parcela: p.numero_parcela,
          total_parcelas: p.numero_parcela, // API doesn't provide total, will need adjustment
          valor: p.valor,
          data_vencimento: p.data_vencimento,
          data_pagamento: p.pagamento?.data_pagamento,
          status,
          metodo_pagamento: p.pagamento?.metodo,
          comprovante: p.pagamento?.comprovante,
        }
      })

      setParcelas(transformedParcelas)
    } catch (error: any) {
      console.error("Erro ao carregar parcelas:", error)
      toast.error(error.message || "Erro ao carregar parcelas")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch beneficiarios from API
  const fetchBeneficiarios = useCallback(async () => {
    try {
      setLoadingBeneficiarios(true)
      const response = await fetch("/api/intermediacao/beneficiarios?limit=1000&ativo=true")

      if (!response.ok) {
        throw new Error("Erro ao carregar beneficiarios")
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar beneficiarios")
      }

      // Transform API data to component format
      const transformedBeneficiarios: Beneficiario[] = data.data.map((b: ApiBeneficiario) => ({
        id: String(b.id),
        nome: b.nome,
      }))

      setBeneficiarios(transformedBeneficiarios)
    } catch (error: any) {
      console.error("Erro ao carregar beneficiarios:", error)
      toast.error(error.message || "Erro ao carregar beneficiarios")
    } finally {
      setLoadingBeneficiarios(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated && hasAccess) {
      fetchParcelas()
      fetchBeneficiarios()
    }
  }, [isAuthenticated, hasAccess, fetchParcelas, fetchBeneficiarios])

  // Calculate counts for tabs
  const counts = useMemo(() => {
    const vencidas = parcelas.filter(
      (p) => p.status !== "paga" && getDaysUntilDue(p.data_vencimento) < 0
    ).length
    const proximas = parcelas.filter(
      (p) =>
        p.status !== "paga" &&
        getDaysUntilDue(p.data_vencimento) >= 0 &&
        getDaysUntilDue(p.data_vencimento) <= 7
    ).length
    const pendentes = parcelas.filter(
      (p) => p.status !== "paga" && getDaysUntilDue(p.data_vencimento) > 7
    ).length
    const pagas = parcelas.filter((p) => p.status === "paga").length

    return { vencidas, proximas, pendentes, pagas, todas: parcelas.length }
  }, [parcelas])

  // Filter parcelas based on active tab and filters
  const filteredParcelas = useMemo(() => {
    let filtered = [...parcelas]

    // Filter by tab
    switch (activeTab) {
      case "pendentes":
        filtered = filtered.filter(
          (p) => p.status !== "paga" && getDaysUntilDue(p.data_vencimento) > 7
        )
        break
      case "vencidas":
        filtered = filtered.filter(
          (p) => p.status !== "paga" && getDaysUntilDue(p.data_vencimento) < 0
        )
        break
      case "proximas":
        filtered = filtered.filter(
          (p) =>
            p.status !== "paga" &&
            getDaysUntilDue(p.data_vencimento) >= 0 &&
            getDaysUntilDue(p.data_vencimento) <= 7
        )
        break
      case "pagas":
        filtered = filtered.filter((p) => p.status === "paga")
        break
    }

    // Filter by search (venda)
    if (searchVenda) {
      const search = searchVenda.toLowerCase()
      filtered = filtered.filter((p) =>
        p.venda_codigo.toLowerCase().includes(search)
      )
    }

    // Filter by beneficiario
    if (filteredBeneficiario && filteredBeneficiario !== "todos") {
      filtered = filtered.filter(
        (p) => p.beneficiario_id === filteredBeneficiario
      )
    }

    // Filter by date range
    if (dataInicio) {
      filtered = filtered.filter((p) => p.data_vencimento >= dataInicio)
    }
    if (dataFim) {
      filtered = filtered.filter((p) => p.data_vencimento <= dataFim)
    }

    // Sort by due date (oldest first for overdue, nearest first for others)
    filtered.sort((a, b) => {
      const dateA = new Date(a.data_vencimento).getTime()
      const dateB = new Date(b.data_vencimento).getTime()
      return dateA - dateB
    })

    return filtered
  }, [
    parcelas,
    activeTab,
    searchVenda,
    filteredBeneficiario,
    dataInicio,
    dataFim,
  ])

  // Pagination
  const totalPages = Math.ceil(filteredParcelas.length / itemsPerPage)
  const paginatedParcelas = filteredParcelas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedParcelas.size === paginatedParcelas.filter(p => p.status !== "paga").length) {
      setSelectedParcelas(new Set())
    } else {
      setSelectedParcelas(
        new Set(paginatedParcelas.filter(p => p.status !== "paga").map((p) => p.id))
      )
    }
  }, [paginatedParcelas, selectedParcelas])

  const handleSelectParcela = useCallback((id: string) => {
    setSelectedParcelas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // Payment handlers
  const handlePaySingle = (parcela: Parcela) => {
    setParcelasParaPagar([parcela])
    setPaymentModalOpen(true)
  }

  const handlePaySelected = () => {
    const selected = parcelas.filter((p) => selectedParcelas.has(p.id))
    setParcelasParaPagar(selected)
    setPaymentModalOpen(true)
  }

  const handleConfirmPayment = async (data: {
    data_pagamento: string
    metodo_pagamento: string
    comprovante: string
  }) => {
    try {
      const parcelaIds = parcelasParaPagar.map((p) => parseInt(p.id))

      // Use batch API for multiple parcelas, or single API for one
      if (parcelaIds.length === 1) {
        // Single payment
        const response = await fetch(`/api/intermediacao/parcelas/${parcelaIds[0]}/pagar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data_pagamento: data.data_pagamento,
            metodo: data.metodo_pagamento,
            comprovante: data.comprovante || null,
          }),
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Erro ao registrar pagamento")
        }

        toast.success("Pagamento registrado com sucesso")
      } else {
        // Batch payment
        const response = await fetch("/api/intermediacao/pagamentos/lote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parcela_ids: parcelaIds,
            data_pagamento: data.data_pagamento,
            metodo: data.metodo_pagamento,
            referencia: data.comprovante || null,
          }),
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Erro ao registrar pagamentos")
        }

        toast.success(result.message || `${parcelaIds.length} pagamentos registrados com sucesso`)
      }

      // Refresh data and reset selection
      setSelectedParcelas(new Set())
      setParcelasParaPagar([])
      await fetchParcelas()
    } catch (error: any) {
      console.error("Erro ao confirmar pagamento:", error)
      toast.error(error.message || "Erro ao registrar pagamento")
      throw error // Re-throw to keep modal open on error
    }
  }

  // Calculate selected total
  const selectedTotal = useMemo(() => {
    return parcelas
      .filter((p) => selectedParcelas.has(p.id))
      .reduce((acc, p) => acc + p.valor, 0)
  }, [parcelas, selectedParcelas])

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
    <AppShell title="Parcelas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Parcelas</h1>
            <p className="text-muted-foreground">
              Gestao de parcelas de intermediacao
            </p>
          </div>
          <Link href="/admin/intermediacao/parcelas/calendario">
            <Button variant="outline" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Ver Calendario
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger
              value="todas"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Todas
              <Badge variant="secondary" className="ml-2">
                {counts.todas}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="pendentes"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Pendentes
              <Badge variant="secondary" className="ml-2">
                {counts.pendentes}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="vencidas"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Vencidas
              {counts.vencidas > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {counts.vencidas}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="proximas"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Prox. 7 dias
              <Badge variant="secondary" className="ml-2">
                {counts.proximas}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="pagas"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Pagas
              <Badge variant="secondary" className="ml-2">
                {counts.pagas}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg border bg-card">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Vencimento
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                placeholder="De"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="date"
                placeholder="Ate"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Beneficiario
            </Label>
            <Select
              value={filteredBeneficiario}
              onValueChange={setFilteredBeneficiario}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {beneficiarios.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              Venda
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar venda..."
                value={searchVenda}
                onChange={(e) => setSearchVenda(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setDataInicio("")
                setDataFim("")
                setFilteredBeneficiario("todos")
                setSearchVenda("")
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      paginatedParcelas.filter(p => p.status !== "paga").length > 0 &&
                      selectedParcelas.size === paginatedParcelas.filter(p => p.status !== "paga").length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Beneficiario</TableHead>
                <TableHead className="text-center">Parc.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedParcelas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhuma parcela encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedParcelas.map((parcela) => {
                  const statusInfo = getStatusInfo(parcela)
                  const StatusIcon = statusInfo.icon
                  const isPaid = parcela.status === "paga"

                  return (
                    <TableRow key={parcela.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedParcelas.has(parcela.id)}
                          onCheckedChange={() =>
                            handleSelectParcela(parcela.id)
                          }
                          disabled={isPaid}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/intermediacao/vendas/${parcela.venda_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {parcela.venda_codigo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/intermediacao/beneficiarios/${parcela.beneficiario_id}`}
                          className="hover:underline"
                        >
                          {parcela.beneficiario_nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {parcela.numero_parcela}/{parcela.total_parcelas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parcela.valor)}
                      </TableCell>
                      <TableCell>{formatDate(parcela.data_vencimento)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "gap-1",
                            statusInfo.bgColor,
                            statusInfo.color
                          )}
                          variant="secondary"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePaySingle(parcela)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Selection Bar */}
        {selectedParcelas.size > 0 && (
          <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-primary text-primary-foreground shadow-lg">
              <span className="text-sm font-medium">
                Selecionados: {selectedParcelas.size}
              </span>
              <span className="text-sm">|</span>
              <span className="text-sm font-medium">
                Total: {formatCurrency(selectedTotal)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePaySelected}
                className="ml-2"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Pagar Selecionados
              </Button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredParcelas.length)} de{" "}
              {filteredParcelas.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        parcelas={parcelasParaPagar}
        onConfirm={handleConfirmPayment}
      />
    </AppShell>
  )
}
