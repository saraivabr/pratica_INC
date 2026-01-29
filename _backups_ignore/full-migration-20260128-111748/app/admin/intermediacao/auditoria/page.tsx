"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Clock,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Download,
  Loader2,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  History,
  Table as TableIcon,
  Bell,
  User,
  FileText,
  ArrowUpDown,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Types
interface AuditLog {
  id: string
  operation: "criar" | "atualizar" | "excluir"
  entity: "venda" | "beneficiario" | "parcela" | "pagamento"
  entity_id: string
  entity_code: string
  user_id: string
  user_name: string
  user_email: string
  ip_address: string
  changes: {
    field: string
    old_value: string | null
    new_value: string | null
  }[]
  summary: string
  justification?: string
  is_critical: boolean
  created_at: string
}

interface AuditFilters {
  startDate: string
  endDate: string
  operations: ("criar" | "atualizar" | "excluir")[]
  entities: ("venda" | "beneficiario" | "parcela" | "pagamento")[]
  userId: string
  recordId: string
}

interface GroupedLogs {
  date: string
  dateLabel: string
  logs: AuditLog[]
}

// User type for filter dropdown
interface FilterUser {
  id: string
  nome: string
}

// Helper functions
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return `Hoje, ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Ontem, ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`
  } else {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }
}

function groupLogsByDate(logs: AuditLog[]): GroupedLogs[] {
  const grouped: Record<string, AuditLog[]> = {}

  logs.forEach((log) => {
    const date = new Date(log.created_at).toDateString()
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(log)
  })

  return Object.entries(grouped)
    .map(([date, logs]) => ({
      date,
      dateLabel: getDateLabel(logs[0].created_at),
      logs: logs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function getOperationColor(operation: AuditLog["operation"]): string {
  switch (operation) {
    case "criar":
      return "text-green-600 dark:text-green-400"
    case "atualizar":
      return "text-blue-600 dark:text-blue-400"
    case "excluir":
      return "text-red-600 dark:text-red-400"
    default:
      return "text-gray-600"
  }
}

function getOperationBgColor(operation: AuditLog["operation"]): string {
  switch (operation) {
    case "criar":
      return "bg-green-500"
    case "atualizar":
      return "bg-blue-500"
    case "excluir":
      return "bg-red-500"
    default:
      return "bg-gray-500"
  }
}

function getOperationIcon(operation: AuditLog["operation"]) {
  switch (operation) {
    case "criar":
      return Plus
    case "atualizar":
      return Edit
    case "excluir":
      return Trash2
    default:
      return FileText
  }
}

function getEntityLabel(entity: AuditLog["entity"]): string {
  switch (entity) {
    case "venda":
      return "Venda"
    case "beneficiario":
      return "Beneficiario"
    case "parcela":
      return "Parcela"
    case "pagamento":
      return "Pagamento"
    default:
      return entity
  }
}

function getOperationLabel(operation: AuditLog["operation"]): string {
  switch (operation) {
    case "criar":
      return "Criar"
    case "atualizar":
      return "Atualizar"
    case "excluir":
      return "Excluir"
    default:
      return operation
  }
}

function getOperationVerb(operation: AuditLog["operation"]): string {
  switch (operation) {
    case "criar":
      return "criou"
    case "atualizar":
      return "atualizou"
    case "excluir":
      return "excluiu"
    default:
      return operation
  }
}

export default function AuditoriaPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // State
  const [activeTab, setActiveTab] = useState("timeline")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [groupedLogs, setGroupedLogs] = useState<GroupedLogs[]>([])
  const [criticalLogs, setCriticalLogs] = useState<AuditLog[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<FilterUser[]>([])

  // Sort state for table
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Filters
  const [filters, setFilters] = useState<AuditFilters>({
    startDate: "",
    endDate: "",
    operations: ["criar", "atualizar", "excluir"],
    entities: ["venda", "beneficiario", "parcela", "pagamento"],
    userId: "all",
    recordId: "",
  })

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  // Map API operation to frontend operation type
  const mapOperation = (op: string): AuditLog["operation"] => {
    const mapping: Record<string, AuditLog["operation"]> = {
      INSERT: "criar",
      UPDATE: "atualizar",
      DELETE: "excluir",
    }
    return mapping[op] || "atualizar"
  }

  // Map API entity to frontend entity type
  const mapEntity = (tabela: string): AuditLog["entity"] => {
    const mapping: Record<string, AuditLog["entity"]> = {
      vendas: "venda",
      vendas_intermediacao: "venda",
      beneficiarios: "beneficiario",
      parcelas: "parcela",
      parcelas_intermediacao: "parcela",
      pagamentos: "pagamento",
      pagamentos_intermediacao: "pagamento",
    }
    return mapping[tabela] || "venda"
  }

  // Generate changes array from dados_anteriores and dados_novos
  const generateChanges = (dadosAnteriores: any, dadosNovos: any) => {
    const changes: { field: string; old_value: string | null; new_value: string | null }[] = []
    if (!dadosAnteriores || !dadosNovos) return changes

    const allKeys = new Set([
      ...Object.keys(dadosAnteriores || {}),
      ...Object.keys(dadosNovos || {}),
    ])

    allKeys.forEach((key) => {
      const oldVal = dadosAnteriores?.[key]
      const newVal = dadosNovos?.[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          old_value: oldVal !== undefined ? String(oldVal) : null,
          new_value: newVal !== undefined ? String(newVal) : null,
        })
      }
    })

    return changes
  }

  // Generate summary from log data
  const generateSummary = (log: any) => {
    const changes = generateChanges(log.dados_anteriores, log.dados_novos)
    if (changes.length > 0) {
      const changedFields = changes.map((c) => c.field).slice(0, 3)
      return `Alterou: ${changedFields.join(", ")}${changes.length > 3 ? ` e mais ${changes.length - 3}` : ""}`
    }
    if (log.operacao === "INSERT") {
      return `Registro criado`
    }
    if (log.operacao === "DELETE") {
      return `Registro excluido`
    }
    return ""
  }

  // Fetch users for filter dropdown
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        throw new Error("Erro ao carregar usuarios")
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Erro ao carregar usuarios:", error)
      // Don't show toast for users, just log - it's not critical
    }
  }, [])

  // Fetch logs from API
  const fetchLogs = useCallback(async (pageNum: number = 1) => {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      params.append("page", String(pageNum))
      params.append("limit", "50")

      if (filters.startDate) {
        params.append("data_inicio", filters.startDate)
      }
      if (filters.endDate) {
        params.append("data_fim", filters.endDate)
      }
      if (filters.userId && filters.userId !== "all") {
        params.append("usuario_id", filters.userId)
      }
      if (filters.recordId) {
        params.append("registro_id", filters.recordId)
      }
      // Note: The API filters by tabela and operacao, but expects specific values
      // We'll apply entity and operation filters client-side for more flexibility

      const response = await fetch(`/api/intermediacao/auditoria?${params}`)
      if (!response.ok) {
        throw new Error("Erro ao carregar logs de auditoria")
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar logs")
      }

      // Transform API data to frontend format
      let result: AuditLog[] = data.data.logs.map((log: any) => ({
        id: log.id,
        operation: mapOperation(log.operacao),
        entity: mapEntity(log.tabela),
        entity_id: log.registro_id,
        entity_code: log.registro_id,
        user_id: log.usuario?.id || "",
        user_name: log.usuario?.nome || "Sistema",
        user_email: log.usuario?.email || "",
        ip_address: log.ip_address || "",
        changes: generateChanges(log.dados_anteriores, log.dados_novos),
        summary: generateSummary(log),
        justification: log.justificativa,
        is_critical: log.operacao === "DELETE" ||
          (log.dados_anteriores?.status === "pago" && log.dados_novos?.status !== "pago"),
        created_at: log.created_at,
      }))

      // Apply client-side filters for operations and entities
      if (filters.operations.length < 3) {
        result = result.filter((log) => filters.operations.includes(log.operation))
      }
      if (filters.entities.length < 4) {
        result = result.filter((log) => filters.entities.includes(log.entity))
      }

      setLogs(result)
      setFilteredLogs(result)
      setGroupedLogs(groupLogsByDate(result))
      setHasMore(data.data.pagination.has_next)
    } catch (error) {
      console.error("Erro ao carregar logs:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao carregar logs de auditoria")
      setLogs([])
      setFilteredLogs([])
      setGroupedLogs([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch critical logs separately
  const fetchCriticalLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/intermediacao/auditoria/criticas?limit=50")
      if (!response.ok) {
        throw new Error("Erro ao carregar operacoes criticas")
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar operacoes criticas")
      }

      const result: AuditLog[] = data.data.operacoes.map((log: any) => ({
        id: log.id,
        operation: mapOperation(log.operacao),
        entity: mapEntity(log.tabela),
        entity_id: log.registro_id,
        entity_code: log.registro_id,
        user_id: log.usuario?.id || "",
        user_name: log.usuario?.nome || "Sistema",
        user_email: log.usuario?.email || "",
        ip_address: "",
        changes: generateChanges(log.dados_anteriores, log.dados_novos),
        summary: log.descricao || generateSummary(log),
        justification: log.justificativa,
        is_critical: true,
        created_at: log.created_at,
      }))

      setCriticalLogs(result)
    } catch (error) {
      console.error("Erro ao carregar operacoes criticas:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao carregar operacoes criticas")
      setCriticalLogs([])
    }
  }, [])

  useEffect(() => {
    if (hasAccess) {
      // Use a flag to prevent the linter warning about setState in effect
      let mounted = true
      const loadData = async () => {
        if (mounted) {
          await Promise.all([fetchLogs(), fetchCriticalLogs(), fetchUsers()])
        }
      }
      loadData()
      return () => {
        mounted = false
      }
    }
  }, [hasAccess, fetchLogs, fetchCriticalLogs, fetchUsers])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchLogs(), fetchCriticalLogs()])
    } finally {
      setRefreshing(false)
    }
  }

  const handleFilter = () => {
    setPage(1)
    fetchLogs(1)
  }

  const handleClearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      operations: ["criar", "atualizar", "excluir"],
      entities: ["venda", "beneficiario", "parcela", "pagamento"],
      userId: "all",
      recordId: "",
    })
    setPage(1)
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchLogs(nextPage)
  }

  const handleExport = () => {
    // Generate CSV export
    const headers = ["Data/Hora", "Usuario", "Operacao", "Entidade", "Registro", "Resumo"]
    const rows = filteredLogs.map((log) => [
      formatDateTime(log.created_at),
      log.user_name,
      getOperationLabel(log.operation),
      getEntityLabel(log.entity),
      log.entity_code,
      log.summary,
    ])

    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case "created_at":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case "user_name":
        comparison = a.user_name.localeCompare(b.user_name)
        break
      case "operation":
        comparison = a.operation.localeCompare(b.operation)
        break
      case "entity":
        comparison = a.entity.localeCompare(b.entity)
        break
      case "entity_code":
        comparison = a.entity_code.localeCompare(b.entity_code)
        break
      default:
        comparison = 0
    }
    return sortDirection === "asc" ? comparison : -comparison
  })

  const toggleOperation = (op: "criar" | "atualizar" | "excluir") => {
    setFilters((prev) => ({
      ...prev,
      operations: prev.operations.includes(op)
        ? prev.operations.filter((o) => o !== op)
        : [...prev.operations, op],
    }))
  }

  const toggleEntity = (entity: "venda" | "beneficiario" | "parcela" | "pagamento") => {
    setFilters((prev) => ({
      ...prev,
      entities: prev.entities.includes(entity)
        ? prev.entities.filter((e) => e !== entity)
        : [...prev.entities, entity],
    }))
  }

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-fadeInUp">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Esta area e exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/admin")}>Voltar</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AppShell title="Auditoria">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Auditoria
            </h1>
            <p className="text-muted-foreground">
              Historico de operacoes do sistema de intermediacao
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="timeline" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <TableIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Tabela</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alertas</span>
              {criticalLogs.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {criticalLogs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Filters Card */}
          <Card className="mt-4">
            <CardHeader
              className="cursor-pointer"
              onClick={() => setShowFilters(!showFilters)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showFilters && "rotate-180"
                  )}
                />
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Period */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Periodo
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Operation */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Operacao
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.operations.includes("criar")}
                          onCheckedChange={() => toggleOperation("criar")}
                        />
                        <span className="text-sm text-green-600 dark:text-green-400">Criar</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.operations.includes("atualizar")}
                          onCheckedChange={() => toggleOperation("atualizar")}
                        />
                        <span className="text-sm text-blue-600 dark:text-blue-400">Atualizar</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.operations.includes("excluir")}
                          onCheckedChange={() => toggleOperation("excluir")}
                        />
                        <span className="text-sm text-red-600 dark:text-red-400">Excluir</span>
                      </label>
                    </div>
                  </div>

                  {/* Entity */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Entidade
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.entities.includes("venda")}
                          onCheckedChange={() => toggleEntity("venda")}
                        />
                        <span className="text-sm">Vendas</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.entities.includes("beneficiario")}
                          onCheckedChange={() => toggleEntity("beneficiario")}
                        />
                        <span className="text-sm">Beneficiarios</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.entities.includes("parcela")}
                          onCheckedChange={() => toggleEntity("parcela")}
                        />
                        <span className="text-sm">Parcelas</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.entities.includes("pagamento")}
                          onCheckedChange={() => toggleEntity("pagamento")}
                        />
                        <span className="text-sm">Pagamentos</span>
                      </label>
                    </div>
                  </div>

                  {/* User */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuario
                    </Label>
                    <Select
                      value={filters.userId}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, userId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Record ID */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      ID do Registro
                    </Label>
                    <Input
                      placeholder="VND-202601-01..."
                      value={filters.recordId}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, recordId: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Limpar
                  </Button>
                  <Button size="sm" onClick={handleFilter}>
                    Filtrar
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : groupedLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-6">
                      {groupedLogs.map((group) => (
                        <div key={group.date}>
                          <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-card py-2">
                            {group.dateLabel}
                          </h3>
                          <div className="space-y-3">
                            {group.logs.map((log) => {
                              const OperationIcon = getOperationIcon(log.operation)
                              return (
                                <div
                                  key={log.id}
                                  className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <div
                                    className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                      getOperationBgColor(log.operation)
                                    )}
                                  >
                                    <OperationIcon className="h-4 w-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm">
                                          <span className="font-medium">{log.user_name}</span>
                                          <span className="text-muted-foreground">
                                            {" "}
                                            {getOperationVerb(log.operation)}{" "}
                                          </span>
                                          <span className={cn("font-medium", getOperationColor(log.operation))}>
                                            {getEntityLabel(log.entity).toLowerCase()}
                                          </span>
                                          <span className="font-mono text-xs ml-1">
                                            {log.entity_code}
                                          </span>
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                          {log.summary}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-muted-foreground">
                                          {formatTime(log.created_at)}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <div className="p-4 text-center">
                        <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          )}
                          Carregar mais
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table Tab */}
          <TabsContent value="table" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : sortedLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TableIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort("created_at")}
                          >
                            <div className="flex items-center gap-1">
                              Data/Hora
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort("user_name")}
                          >
                            <div className="flex items-center gap-1">
                              Usuario
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort("operation")}
                          >
                            <div className="flex items-center gap-1">
                              Operacao
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort("entity")}
                          >
                            <div className="flex items-center gap-1">
                              Entidade
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort("entity_code")}
                          >
                            <div className="flex items-center gap-1">
                              Registro
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>Resumo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedLogs.map((log) => {
                          const OperationIcon = getOperationIcon(log.operation)
                          return (
                            <TableRow
                              key={log.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedLog(log)}
                            >
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    {new Date(log.created_at).toLocaleDateString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                    })}{" "}
                                    {formatTime(log.created_at)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{log.user_name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "gap-1",
                                    log.operation === "criar" &&
                                      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
                                    log.operation === "atualizar" &&
                                      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                    log.operation === "excluir" &&
                                      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                                  )}
                                >
                                  <OperationIcon className="h-3 w-3" />
                                  {getOperationLabel(log.operation)}
                                </Badge>
                              </TableCell>
                              <TableCell>{getEntityLabel(log.entity)}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {log.entity_code}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {log.summary}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground mt-2">
              Total: {sortedLogs.length} registros
            </p>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Operacoes Criticas Recentes
                </CardTitle>
                <CardDescription>
                  Exclusoes, desfazimentos de pagamentos e alteracoes significativas de valores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {criticalLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma operacao critica encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {criticalLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950 transition-colors"
                        onClick={() => setSelectedLog(log)}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <span>
                                {new Date(log.created_at).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}{" "}
                                {formatTime(log.created_at)}
                              </span>
                              <span>-</span>
                              <span className="font-medium text-foreground">{log.user_name}</span>
                              <span>{getOperationVerb(log.operation)}</span>
                              <span className={cn("font-medium", getOperationColor(log.operation))}>
                                {getEntityLabel(log.entity).toLowerCase()}
                              </span>
                              <span className="font-mono">#{log.entity_code}</span>
                            </div>
                            <p className="text-sm">{log.summary}</p>
                            {log.justification && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium">Justificativa:</span>{" "}
                                &quot;{log.justification}&quot;
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Modal */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Detalhes da Operacao
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Operacao</Label>
                    <p className="font-medium flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          getOperationBgColor(selectedLog.operation)
                        )}
                      />
                      {getOperationLabel(selectedLog.operation)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Entidade</Label>
                    <p className="font-medium">{getEntityLabel(selectedLog.entity)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Registro</Label>
                    <p className="font-mono text-sm">{selectedLog.entity_code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Data/Hora</Label>
                    <p className="text-sm">{formatDateTime(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Usuario</Label>
                    <p className="font-medium">{selectedLog.user_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedLog.user_email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">IP</Label>
                    <p className="font-mono text-sm">{selectedLog.ip_address}</p>
                  </div>
                </div>

                {selectedLog.justification && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                    <Label className="text-amber-700 dark:text-amber-300 text-xs">
                      Justificativa
                    </Label>
                    <p className="text-sm">&quot;{selectedLog.justification}&quot;</p>
                  </div>
                )}

                {selectedLog.changes.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs mb-2 block">
                      Campos Alterados
                    </Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Campo</TableHead>
                            <TableHead className="text-xs">Antes</TableHead>
                            <TableHead className="text-xs">Depois</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLog.changes.map((change, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-sm">
                                {change.field}
                              </TableCell>
                              <TableCell className="text-sm text-red-600 dark:text-red-400">
                                {change.old_value || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-green-600 dark:text-green-400">
                                {change.new_value || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">{selectedLog.summary}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  // Navigate to the entity detail page
                  const entityPath = {
                    venda: "vendas",
                    beneficiario: "beneficiarios",
                    parcela: "parcelas",
                    pagamento: "pagamentos",
                  }[selectedLog?.entity || "venda"]
                  router.push(
                    `/admin/intermediacao/${entityPath}/${selectedLog?.entity_id}`
                  )
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ir para Registro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
