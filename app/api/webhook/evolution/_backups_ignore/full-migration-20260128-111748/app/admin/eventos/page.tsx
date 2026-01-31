"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  CalendarPlus,
  Clock,
  Filter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Edit,
  Ban,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

type EventoStatus = "rascunho" | "ativo" | "finalizado" | "cancelado"

interface Evento {
  id: string
  nome: string
  descricao?: string
  data_hora: string
  local: string
  lembrete_horas: number
  status: EventoStatus
  created_at: string
  stats: {
    total: number
    pendentes: number
    confirmados: number
    recusados: number
    talvez: number
  }
}

const statusConfig: Record<EventoStatus, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: "Rascunho", color: "text-zinc-600", bgColor: "bg-zinc-100" },
  ativo: { label: "Ativo", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  finalizado: { label: "Finalizado", color: "text-blue-600", bgColor: "bg-blue-100" },
  cancelado: { label: "Cancelado", color: "text-red-600", bgColor: "bg-red-100" },
}

export default function EventosPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [eventoToCancel, setEventoToCancel] = useState<Evento | null>(null)
  const [canceling, setCanceling] = useState(false)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchEventos()
    }
  }, [hasAccess, statusFilter])

  const fetchEventos = async () => {
    setLoading(true)
    try {
      const status = statusFilter !== "todos" ? `?status=${statusFilter}` : ""
      const response = await fetch(`/api/eventos${status}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao carregar eventos")
      }

      // Transform API response to match frontend interface
      const eventosTransformed: Evento[] = result.data.map((e: any) => ({
        id: e.id,
        nome: e.nome,
        descricao: e.descricao,
        data_hora: e.data_hora,
        local: e.local,
        lembrete_horas: e.lembrete_horas,
        status: e.status,
        created_at: e.created_at,
        stats: {
          total: e.total_convidados || 0,
          pendentes: e.pendentes || 0,
          confirmados: e.confirmados || 0,
          recusados: e.recusados || 0,
          talvez: e.talvez || 0,
        },
      }))

      setEventos(eventosTransformed)
    } catch (error) {
      console.error("Error fetching eventos:", error)
      toast.error("Erro ao carregar eventos")
    }
    setLoading(false)
  }

  const handleCancelEvento = async () => {
    if (!eventoToCancel) return

    setCanceling(true)
    try {
      const response = await fetch(`/api/eventos/${eventoToCancel.id}`, {
        method: "DELETE",
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao cancelar evento")
      }

      setEventos(eventos.map(e =>
        e.id === eventoToCancel.id
          ? { ...e, status: "cancelado" as EventoStatus }
          : e
      ))

      toast.success("Evento cancelado com sucesso")
      setCancelDialogOpen(false)
      setEventoToCancel(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar evento")
    }
    setCanceling(false)
  }

  const filteredEventos = eventos.filter((evento) => {
    const matchesSearch = evento.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evento.local.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "todos" || evento.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
  }

  // Stats for header cards
  const stats = {
    total: eventos.length,
    ativos: eventos.filter(e => e.status === "ativo").length,
    rascunhos: eventos.filter(e => e.status === "rascunho").length,
    finalizados: eventos.filter(e => e.status === "finalizado").length,
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Ban className="h-8 w-8 text-destructive" />
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

  return (
    <AppShell title="Eventos">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Disparador de Eventos</h1>
            <p className="text-muted-foreground">
              Crie eventos e convide corretores via WhatsApp
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchEventos} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={() => router.push("/admin/eventos/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">eventos criados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.ativos}</div>
              <p className="text-xs text-muted-foreground">aguardando confirmacoes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">Rascunhos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-600">{stats.rascunhos}</div>
              <p className="text-xs text-muted-foreground">a serem disparados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Finalizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.finalizados}</div>
              <p className="text-xs text-muted-foreground">concluidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEventos.length === 0 ? (
              <div className="text-center py-12">
                <CalendarPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">Nenhum evento encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "todos"
                    ? "Tente ajustar os filtros de busca"
                    : "Crie seu primeiro evento para comecar"}
                </p>
                {!searchTerm && statusFilter === "todos" && (
                  <Button onClick={() => router.push("/admin/eventos/novo")}>
                    Criar Evento
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead className="hidden md:table-cell">Local</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confirmacoes</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEventos.map((evento) => {
                      const status = statusConfig[evento.status]
                      const confirmedPercent = evento.stats.total > 0
                        ? Math.round((evento.stats.confirmados / evento.stats.total) * 100)
                        : 0

                      return (
                        <TableRow
                          key={evento.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/admin/eventos/${evento.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{evento.nome}</p>
                                {evento.descricao && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                    {evento.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{formatDateTime(evento.data_hora)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2 max-w-[200px]">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{evento.local}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border-0", status.bgColor, status.color)}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{evento.stats.total}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {evento.stats.confirmados}
                                </span>
                                <span className="flex items-center gap-1 text-amber-600">
                                  <HelpCircle className="h-3 w-3" />
                                  {evento.stats.talvez}
                                </span>
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-3 w-3" />
                                  {evento.stats.recusados}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/admin/eventos/${evento.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                {evento.status === "rascunho" && (
                                  <>
                                    <DropdownMenuItem onClick={() => router.push(`/admin/eventos/${evento.id}/convidados`)}>
                                      <Users className="h-4 w-4 mr-2" />
                                      Selecionar convidados
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push(`/admin/eventos/${evento.id}/disparar`)}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Disparar convites
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                {evento.status !== "cancelado" && evento.status !== "finalizado" && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setEventoToCancel(evento)
                                      setCancelDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancelar evento
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Evento</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja cancelar o evento "{eventoToCancel?.nome}"?
                Esta acao nao pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleCancelEvento} disabled={canceling}>
                {canceling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancelar Evento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
