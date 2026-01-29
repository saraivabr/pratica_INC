"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  HelpCircle,
  Loader2,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  Users,
  XCircle,
  MessageSquare,
  RotateCcw,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

type EventoStatus = "rascunho" | "ativo" | "finalizado" | "cancelado"
type ConvidadoStatus = "pendente" | "confirmado" | "recusado" | "talvez"

interface Convidado {
  id: string
  evento_id: string
  tenant_id: number
  nome: string
  celular: string
  origem: "cvcrm" | "importado"
  cvcrm_id: number | null
  status: ConvidadoStatus
  convite_enviado_at: string | null
  lembrete_enviado_at: string | null
  confirmado_at: string | null
  created_at: string
}

interface Evento {
  id: string
  tenant_id: number
  nome: string
  descricao: string | null
  data_hora: string
  local: string
  lembrete_horas: number
  status: EventoStatus
  created_at: string
  updated_at: string
  total_convidados: number
  confirmados: number
  recusados: number
  talvez: number
  pendentes: number
}

interface ConvidadosStats {
  total: number
  pendentes: number
  confirmados: number
  recusados: number
  talvez: number
}

const eventoStatusConfig: Record<EventoStatus, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: "Rascunho", color: "text-zinc-600", bgColor: "bg-zinc-100" },
  ativo: { label: "Ativo", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  finalizado: { label: "Finalizado", color: "text-blue-600", bgColor: "bg-blue-100" },
  cancelado: { label: "Cancelado", color: "text-red-600", bgColor: "bg-red-100" },
}

const convidadoStatusConfig: Record<ConvidadoStatus, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  pendente: { label: "Pendente", color: "text-amber-600", bgColor: "bg-amber-100", icon: Clock },
  confirmado: { label: "Confirmado", color: "text-emerald-600", bgColor: "bg-emerald-100", icon: CheckCircle2 },
  recusado: { label: "Recusado", color: "text-red-600", bgColor: "bg-red-100", icon: XCircle },
  talvez: { label: "Talvez", color: "text-blue-600", bgColor: "bg-blue-100", icon: HelpCircle },
}


export default function EventoDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [evento, setEvento] = useState<Evento | null>(null)
  const [convidados, setConvidados] = useState<Convidado[]>([])
  const [stats, setStats] = useState<ConvidadosStats>({ total: 0, pendentes: 0, confirmados: 0, recusados: 0, talvez: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingConvidados, setLoadingConvidados] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [resendingId, setResendingId] = useState<string | null>(null)

  const eventoId = params.id as string
  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess && eventoId) {
      fetchEvento()
      fetchConvidados()
    }
  }, [hasAccess, eventoId])

  const fetchEvento = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/eventos/${eventoId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar evento")
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar evento")
      }

      setEvento(data.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar evento"
      console.error("Error fetching evento:", err)
      setError(message)
      toast.error(message)
      setEvento(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchConvidados = async () => {
    setLoadingConvidados(true)
    try {
      const params = new URLSearchParams()
      params.set("limit", "200") // Fetch more convidados at once
      if (statusFilter !== "todos") {
        params.set("status", statusFilter)
      }
      if (debouncedSearchTerm) {
        params.set("search", debouncedSearchTerm)
      }

      const response = await fetch(`/api/eventos/${eventoId}/convidados?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar convidados")
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar convidados")
      }

      setConvidados(data.data || [])
      setStats(data.stats || { total: 0, pendentes: 0, confirmados: 0, recusados: 0, talvez: 0 })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar convidados"
      console.error("Error fetching convidados:", err)
      toast.error(message)
      setConvidados([])
    } finally {
      setLoadingConvidados(false)
    }
  }

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Refetch convidados when filters change
  useEffect(() => {
    if (hasAccess && eventoId && !loading) {
      fetchConvidados()
    }
  }, [statusFilter, debouncedSearchTerm])

  const handleResendConvite = async (convidadoId: string) => {
    setResendingId(convidadoId)
    try {
      // Get user's WhatsApp instance
      const sessionResponse = await fetch("/api/whatsapp/session/status")
      const sessionData = await sessionResponse.json()

      if (!sessionResponse.ok || !sessionData.connected || !sessionData.instance_name) {
        throw new Error("WhatsApp nao esta conectado. Conecte seu WhatsApp primeiro.")
      }

      // Use the disparar API with specific convidado_id and reenviar flag
      const response = await fetch(`/api/eventos/${eventoId}/disparar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instance_name: sessionData.instance_name,
          convidado_ids: [convidadoId],
          reenviar: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao reenviar convite")
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao reenviar convite")
      }

      toast.success("Convite sendo reenviado!")
      // Refresh convidados to update status
      fetchConvidados()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao reenviar convite"
      console.error("Error resending convite:", err)
      toast.error(message)
    } finally {
      setResendingId(null)
    }
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, "HH:mm", { locale: ptBR })
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  // Filtered convidados - filtering is now done on the API side
  // but we keep local filtering for immediate UI response while API fetches
  const filteredConvidados = convidados

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

  if (loading) {
    return (
      <AppShell title="Carregando...">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (!evento || error) {
    return (
      <AppShell title={error ? "Erro" : "Evento nao encontrado"}>
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">{error ? "Erro ao carregar evento" : "Evento nao encontrado"}</h1>
            <p className="text-muted-foreground mb-6">
              {error || "O evento que voce esta procurando nao existe ou foi removido."}
            </p>
            <div className="flex gap-3 justify-center">
              {error && (
                <Button variant="outline" onClick={() => { fetchEvento(); fetchConvidados(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              )}
              <Button onClick={() => router.push("/admin/eventos")}>
                Voltar para lista
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  const statusInfo = eventoStatusConfig[evento.status]

  return (
    <AppShell title={evento.nome} showBackButton backHref="/admin/eventos">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/eventos")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{evento.nome}</h1>
                <Badge className={cn("border-0", statusInfo.bgColor, statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </div>
              {evento.descricao && (
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  {evento.descricao}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchEvento(); fetchConvidados(); }} disabled={loading || loadingConvidados}>
              <RefreshCw className={cn("h-4 w-4 mr-2", (loading || loadingConvidados) && "animate-spin")} />
              Atualizar
            </Button>
            {evento.status === "rascunho" && (
              <Button onClick={() => router.push(`/admin/eventos/${evento.id}/convidados`)}>
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Convidados
              </Button>
            )}
          </div>
        </div>

        {/* Event Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data e Hora</p>
                  <p className="font-medium">{formatDate(evento.data_hora)}</p>
                  <p className="text-sm text-muted-foreground">{formatTime(evento.data_hora)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Local</p>
                  <p className="font-medium">{evento.local}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lembrete</p>
                  <p className="font-medium">{evento.lembrete_horas}h antes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">convidados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.pendentes}</div>
              <p className="text-xs text-muted-foreground">aguardando</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Confirmados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{stats.confirmados}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? `${Math.round((stats.confirmados / stats.total) * 100)}%` : "0%"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Recusados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.recusados}</div>
              <p className="text-xs text-muted-foreground">nao vao</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Talvez
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.talvez}</div>
              <p className="text-xs text-muted-foreground">incertos</p>
            </CardContent>
          </Card>
        </div>

        {/* Convidados List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Convidados</CardTitle>
                <CardDescription>
                  {filteredConvidados.length} de {stats.total} convidados
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-[200px]">
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="confirmado">Confirmados</SelectItem>
                    <SelectItem value="recusado">Recusados</SelectItem>
                    <SelectItem value="talvez">Talvez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingConvidados ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConvidados.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">Nenhum convidado encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "todos"
                    ? "Tente ajustar os filtros de busca"
                    : "Adicione convidados ao evento"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Convidado</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConvidados.map((convidado) => {
                      const statusInfo = convidadoStatusConfig[convidado.status]
                      const StatusIcon = statusInfo.icon

                      return (
                        <TableRow key={convidado.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary text-sm font-semibold">
                                  {convidado.nome[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium">{convidado.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatPhone(convidado.celular)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {convidado.origem === "cvcrm" ? "CV CRM" : "Importado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border-0 gap-1", statusInfo.bgColor, statusInfo.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {convidado.confirmado_at
                              ? formatDateTime(convidado.confirmado_at)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {convidado.status === "pendente" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleResendConvite(convidado.id)}
                                    disabled={resendingId === convidado.id}
                                  >
                                    {resendingId === convidado.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                    )}
                                    Reenviar convite
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Ver conversa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
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
      </div>
    </AppShell>
  )
}
