"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Types
type VendaStatus = "rascunho" | "processando" | "concluida" | "paga"

interface Venda {
  id: string
  codigo: string
  cliente_nome: string
  cliente_cpf: string
  cliente_email?: string
  cliente_telefone?: string
  empreendimento_id: string
  empreendimento_nome: string
  unidade: string
  valor_total: number
  percentual_intermediacao: number
  valor_comissao: number
  status: VendaStatus
  data_venda: string
  descricao?: string
  created_at: string
  updated_at: string
}

const statusConfig: Record<VendaStatus, { label: string; color: string; icon: React.ElementType }> = {
  rascunho: { label: "Rascunho", color: "bg-zinc-500", icon: FileText },
  processando: { label: "Em Processamento", color: "bg-amber-500", icon: Clock },
  concluida: { label: "Concluida", color: "bg-emerald-500", icon: CheckCircle2 },
  paga: { label: "Paga", color: "bg-blue-500", icon: DollarSign },
}

export default function VendasPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // State
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("todas")
  const [searchTerm, setSearchTerm] = useState("")
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState<string>("all")
  const [periodoFilter, setPeriodoFilter] = useState<string>("all")
  const [selectedVendas, setSelectedVendas] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<string>("data_venda")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchVendas()
    }
  }, [hasAccess])

  const fetchVendas = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/intermediacao/vendas?limit=1000")
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao carregar vendas")
      }

      // Map API response to component's expected format
      const mappedVendas: Venda[] = (json.data || []).map((v: any) => ({
        id: v.id,
        codigo: v.codigo,
        cliente_nome: v.cliente_nome,
        cliente_cpf: v.cliente_cpf || "",
        cliente_email: v.cliente_email,
        cliente_telefone: v.cliente_telefone,
        empreendimento_id: v.empreendimento_id || v.id,
        empreendimento_nome: v.empreendimento,
        unidade: v.unidade,
        valor_total: Number(v.valor_total),
        percentual_intermediacao: Number(v.percentual_intermediacao),
        valor_comissao: Number(v.valor_comissao),
        status: v.status === "em_processamento" ? "processando" : v.status,
        data_venda: v.data_venda,
        descricao: v.descricao,
        created_at: v.created_at,
        updated_at: v.updated_at,
      }))

      setVendas(mappedVendas)
    } catch (error: any) {
      console.error("Error fetching vendas:", error)
      toast.error(error.message || "Erro ao carregar vendas")
    }
    setLoading(false)
  }

  // Filter vendas
  const filteredVendas = useMemo(() => {
    let result = [...vendas]

    // Filter by status tab
    if (activeTab !== "todas") {
      result = result.filter(v => v.status === activeTab)
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(v =>
        v.codigo.toLowerCase().includes(search) ||
        v.cliente_nome.toLowerCase().includes(search) ||
        v.empreendimento_nome.toLowerCase().includes(search)
      )
    }

    // Filter by empreendimento
    if (empreendimentoFilter !== "all") {
      result = result.filter(v => v.empreendimento_id === empreendimentoFilter)
    }

    // Filter by periodo
    if (periodoFilter !== "all") {
      const now = new Date()
      let startDate: Date
      switch (periodoFilter) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }
      result = result.filter(v => new Date(v.data_venda) >= startDate)
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Venda]
      let bVal: any = b[sortColumn as keyof Venda]

      if (sortColumn === "data_venda") {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    return result
  }, [vendas, activeTab, searchTerm, empreendimentoFilter, periodoFilter, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredVendas.length / itemsPerPage)
  const paginatedVendas = filteredVendas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Stats
  const stats = useMemo(() => {
    return {
      total: vendas.length,
      rascunho: vendas.filter(v => v.status === "rascunho").length,
      processando: vendas.filter(v => v.status === "processando").length,
      concluida: vendas.filter(v => v.status === "concluida").length,
      paga: vendas.filter(v => v.status === "paga").length,
      valorTotal: vendas.reduce((sum, v) => sum + v.valor_total, 0),
      comissaoTotal: vendas.reduce((sum, v) => sum + v.valor_comissao, 0),
    }
  }, [vendas])

  // Empreendimentos (extraidos das vendas)
  const empreendimentos = useMemo(() => {
    const uniqueMap = new Map<string, { id: string; nome: string }>()
    vendas.forEach((v) => {
      if (v.empreendimento_id && v.empreendimento_nome && !uniqueMap.has(v.empreendimento_id)) {
        uniqueMap.set(v.empreendimento_id, { id: v.empreendimento_id, nome: v.empreendimento_nome })
      }
    })
    return Array.from(uniqueMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [vendas])

  // Handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const handleSelectAll = () => {
    if (selectedVendas.size === paginatedVendas.length) {
      setSelectedVendas(new Set())
    } else {
      setSelectedVendas(new Set(paginatedVendas.map(v => v.id)))
    }
  }

  const handleSelectVenda = (id: string) => {
    const newSelected = new Set(selectedVendas)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedVendas(newSelected)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR")
  }

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
    <AppShell title="Vendas">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestao de Vendas</h1>
            <p className="text-muted-foreground">
              Gerencie vendas e comissoes de intermediacao
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchVendas} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={() => router.push("/admin/intermediacao/vendas/nova")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Venda
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.valorTotal)} em valor total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissao Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(stats.comissaoTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                {((stats.comissaoTotal / stats.valorTotal) * 100 || 0).toFixed(1)}% medio
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Processamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.processando}</div>
              <p className="text-xs text-muted-foreground">
                aguardando conclusao
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pagas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.paga}</div>
              <p className="text-xs text-muted-foreground">
                comissoes finalizadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todas" className="gap-2">
              Todas
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rascunho" className="gap-2">
              Rascunho
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.rascunho}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="processando" className="gap-2">
              Em Processamento
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.processando}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="concluida" className="gap-2">
              Concluidas
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.concluida}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="paga" className="gap-2">
              Pagas
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.paga}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por codigo, cliente ou empreendimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os periodos</SelectItem>
                    <SelectItem value="7d">Ultimos 7 dias</SelectItem>
                    <SelectItem value="30d">Ultimos 30 dias</SelectItem>
                    <SelectItem value="90d">Ultimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={empreendimentoFilter} onValueChange={setEmpreendimentoFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {empreendimentos.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedVendas.size > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedVendas.size} venda(s) selecionada(s)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatorio
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedVendas.size === paginatedVendas.length && paginatedVendas.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort("codigo")}
                      >
                        Codigo
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort("cliente_nome")}
                      >
                        Cliente
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort("empreendimento_nome")}
                      >
                        Empreendimento
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort("valor_total")}
                      >
                        Valor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center hidden lg:table-cell">%</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">
                      Comissao
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort("data_venda")}
                      >
                        Data
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-12">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <DollarSign className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {searchTerm || empreendimentoFilter !== "all" || periodoFilter !== "all"
                            ? "Nenhuma venda encontrada com os filtros aplicados"
                            : "Nenhuma venda cadastrada"}
                        </p>
                        {!searchTerm && empreendimentoFilter === "all" && periodoFilter === "all" && (
                          <Button
                            className="mt-4"
                            onClick={() => router.push("/admin/intermediacao/vendas/nova")}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Cadastrar primeira venda
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVendas.map((venda) => {
                      const statusInfo = statusConfig[venda.status]
                      return (
                        <TableRow
                          key={venda.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            selectedVendas.has(venda.id) && "bg-primary/5"
                          )}
                          onClick={() => router.push(`/admin/intermediacao/vendas/${venda.id}`)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedVendas.has(venda.id)}
                              onChange={() => handleSelectVenda(venda.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {venda.codigo}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{venda.cliente_nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {venda.unidade}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {venda.empreendimento_nome}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(venda.valor_total)}
                          </TableCell>
                          <TableCell className="text-center hidden lg:table-cell">
                            <Badge variant="outline">
                              {venda.percentual_intermediacao}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell font-medium text-emerald-600">
                            {formatCurrency(venda.valor_comissao)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "gap-1",
                                statusInfo.color,
                                "text-white border-0"
                              )}
                            >
                              <statusInfo.icon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(venda.data_venda)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/intermediacao/vendas/${venda.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/intermediacao/vendas/${venda.id}?edit=true`)}
                                  disabled={venda.status === "paga"}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredVendas.length)} de{" "}
              {filteredVendas.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
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
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
