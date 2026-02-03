"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  Filter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  UserCheck,
  Ban,
  Eye,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface Plantao {
  id: string
  local_id: string
  local_nome: string
  local_endereco: string | null
  data: string
  hora_inicio: string
  hora_fim: string
  max_corretores: number | null
  descricao: string | null
  status: string
  total_presentes: number
  disponiveis: number
  em_atendimento: number
}

interface Local {
  id: string
  nome: string
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  ativo: { label: "Ativo", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  encerrado: { label: "Encerrado", color: "text-blue-600", bgColor: "bg-blue-100" },
  cancelado: { label: "Cancelado", color: "text-red-600", bgColor: "bg-red-100" },
}

export default function PlantoesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [plantoes, setPlantoes] = useState<Plantao[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ativo")
  const [localFilter, setLocalFilter] = useState("todos")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [plantaoToCancel, setPlantaoToCancel] = useState<Plantao | null>(null)
  const [canceling, setCanceling] = useState(false)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchLocais()
    }
  }, [hasAccess])

  useEffect(() => {
    if (hasAccess) {
      fetchPlantoes()
    }
  }, [hasAccess, statusFilter, localFilter])

  const fetchLocais = async () => {
    try {
      const response = await fetch("/api/recepcao/locais")
      const result = await response.json()
      if (result.success) {
        setLocais(result.data)
      }
    } catch (error) {
      console.error("Error fetching locais:", error)
    }
  }

  const fetchPlantoes = async () => {
    setLoading(true)
    try {
      let url = "/api/recepcao/plantoes?"
      if (statusFilter !== "todos") {
        url += `status=${statusFilter}&`
      }
      if (localFilter !== "todos") {
        url += `local_id=${localFilter}&`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setPlantoes(result.data)
      } else {
        toast.error(result.error || "Erro ao carregar plantoes")
      }
    } catch (error) {
      console.error("Error fetching plantoes:", error)
      toast.error("Erro ao carregar plantoes")
    }
    setLoading(false)
  }

  const handleCancel = async () => {
    if (!plantaoToCancel) return

    setCanceling(true)
    try {
      const response = await fetch(`/api/recepcao/plantoes/${plantaoToCancel.id}`, {
        method: "DELETE",
      })
      const result = await response.json()

      if (result.success) {
        setPlantoes(plantoes.map(p =>
          p.id === plantaoToCancel.id ? { ...p, status: "cancelado" } : p
        ))
        toast.success("Plantao cancelado com sucesso")
      } else {
        toast.error(result.error || "Erro ao cancelar plantao")
      }
    } catch (error) {
      toast.error("Erro ao cancelar plantao")
    }
    setCanceling(false)
    setCancelDialogOpen(false)
    setPlantaoToCancel(null)
  }

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR })
  }

  const formatWeekday = (dateStr: string) => {
    return format(parseISO(dateStr), "EEEE", { locale: ptBR })
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
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Plantoes">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Plantoes</h1>
            <p className="text-muted-foreground">
              Gerenciar turnos de atendimento
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPlantoes} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={() => router.push("/admin/recepcao/plantoes/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plantao
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={localFilter} onValueChange={setLocalFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar local" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os locais</SelectItem>
              {locais.map((local) => (
                <SelectItem key={local.id} value={local.id}>
                  {local.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="encerrado">Encerrados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : plantoes.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">Nenhum plantao encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Crie seu primeiro plantao para comecar
                </p>
                <Button onClick={() => router.push("/admin/recepcao/plantoes/novo")}>
                  Criar Plantao
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Presentes</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plantoes.map((plantao) => {
                      const status = statusConfig[plantao.status] || statusConfig.ativo

                      return (
                        <TableRow
                          key={plantao.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/admin/recepcao/plantoes/${plantao.id}/fila`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <MapPin className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium">{plantao.local_nome}</p>
                                {plantao.descricao && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {plantao.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatDate(plantao.data)}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {formatWeekday(plantao.data)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {plantao.hora_inicio.slice(0, 5)} - {plantao.hora_fim.slice(0, 5)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border-0", status.bgColor, status.color)}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                              <span>{plantao.disponiveis}</span>
                              <span className="text-muted-foreground">/</span>
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{plantao.total_presentes}</span>
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
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/recepcao/plantoes/${plantao.id}/fila`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Fila
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {plantao.status === "ativo" && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setPlantaoToCancel(plantao)
                                      setCancelDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancelar
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
              <DialogTitle>Cancelar Plantao</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja cancelar o plantao de {plantaoToCancel?.local_nome} em{" "}
                {plantaoToCancel && formatDate(plantaoToCancel.data)}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={canceling}>
                {canceling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancelar Plantao
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
