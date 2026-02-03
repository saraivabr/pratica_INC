"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Phone,
  PhoneCall,
  MessageSquare,
  Plus,
  RefreshCw,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  PlayCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  status: string
  total_presentes: number
  disponiveis: number
  em_atendimento: number
  pausados: number
  aguardando_feedback: number
  total_atribuicoes: number
}

interface FilaItem {
  presenca_id: string
  plantao_id: string
  user_id: string
  corretor_nome: string
  corretor_telefone: string
  corretor_avatar: string | null
  posicao_fila: number
  status: string
  checkin_at: string
  checkin_method: string
  em_atendimento: boolean
  pausado: boolean
  feedback_pendente: boolean
  leads_ativos: number
  status_legivel: string
  disponivel: boolean
}

interface ProximoCorretor {
  presenca_id: string
  user_id: string
  user_nome: string
  user_telefone: string
  posicao_fila: number
}

export default function FilaPlantaoPage() {
  const router = useRouter()
  const params = useParams()
  const plantaoId = params.id as string

  const [plantao, setPlantao] = useState<Plantao | null>(null)
  const [fila, setFila] = useState<FilaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Atribuir Lead Dialog
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false)
  const [proximoCorretor, setProximoCorretor] = useState<ProximoCorretor | null>(null)
  const [atribuindo, setAtribuindo] = useState(false)
  const [leadForm, setLeadForm] = useState({
    lead_nome: "",
    lead_telefone: "",
    lead_email: "",
    lead_origem: "presencial" as "presencial" | "telefone" | "whatsapp",
    lead_observacoes: "",
  })

  const fetchData = useCallback(async () => {
    try {
      const [plantaoRes, filaRes] = await Promise.all([
        fetch(`/api/recepcao/plantoes/${plantaoId}`),
        fetch(`/api/recepcao/fila?plantao_id=${plantaoId}`),
      ])

      const [plantaoData, filaData] = await Promise.all([
        plantaoRes.json(),
        filaRes.json(),
      ])

      if (plantaoData.success) {
        setPlantao(plantaoData.data)
      }

      if (filaData.success) {
        setFila(filaData.data)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Erro ao carregar dados")
    }
  }, [plantaoId])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleProximoCorretor = async () => {
    try {
      const response = await fetch(`/api/recepcao/fila/proximo?plantao_id=${plantaoId}`)
      const result = await response.json()

      if (result.success) {
        if (result.data) {
          setProximoCorretor(result.data)
          setAtribuirDialogOpen(true)
        } else {
          toast.info("Nao ha corretores disponiveis na fila")
        }
      } else {
        toast.error(result.error || "Erro ao buscar proximo corretor")
      }
    } catch (error) {
      toast.error("Erro ao buscar proximo corretor")
    }
  }

  const handleAtribuirLead = async () => {
    if (!proximoCorretor) return

    setAtribuindo(true)
    try {
      const response = await fetch("/api/recepcao/atribuir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantao_id: plantaoId,
          presenca_id: proximoCorretor.presenca_id,
          lead_nome: leadForm.lead_nome.trim() || undefined,
          lead_telefone: leadForm.lead_telefone.trim() || undefined,
          lead_email: leadForm.lead_email.trim() || undefined,
          lead_origem: leadForm.lead_origem,
          lead_observacoes: leadForm.lead_observacoes.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Lead atribuido a ${proximoCorretor.user_nome}!`)
        setAtribuirDialogOpen(false)
        setProximoCorretor(null)
        setLeadForm({
          lead_nome: "",
          lead_telefone: "",
          lead_email: "",
          lead_origem: "presencial",
          lead_observacoes: "",
        })
        await fetchData()
      } else {
        toast.error(result.error || "Erro ao atribuir lead")
      }
    } catch (error) {
      toast.error("Erro ao atribuir lead")
    }
    setAtribuindo(false)
  }

  const getStatusIcon = (item: FilaItem) => {
    if ((item.leads_ativos || 0) >= 5) return <UserMinus className="h-4 w-4 text-red-600" />
    if (item.em_atendimento) return <PhoneCall className="h-4 w-4 text-blue-600" />
    if (item.pausado) return <PauseCircle className="h-4 w-4 text-amber-600" />
    if (item.feedback_pendente) return <AlertCircle className="h-4 w-4 text-orange-600" />
    if (item.disponivel) return <CheckCircle className="h-4 w-4 text-emerald-600" />
    return <UserMinus className="h-4 w-4 text-zinc-400" />
  }

  const getStatusColor = (item: FilaItem) => {
    if ((item.leads_ativos || 0) >= 5) return "border-red-200 bg-red-50"
    if (item.em_atendimento) return "border-blue-200 bg-blue-50"
    if (item.pausado) return "border-amber-200 bg-amber-50"
    if (item.feedback_pendente) return "border-orange-200 bg-orange-50"
    if (item.disponivel) return "border-emerald-200 bg-emerald-50"
    return "border-zinc-200 bg-zinc-50"
  }

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "HH:mm", { locale: ptBR })
  }

  if (loading) {
    return (
      <AppShell title="Carregando...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (!plantao) {
    return (
      <AppShell title="Plantao nao encontrado">
        <div className="container px-4 py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg">Plantao nao encontrado</h3>
          <Button className="mt-4" onClick={() => router.push("/admin/recepcao/plantoes")}>
            Voltar
          </Button>
        </div>
      </AppShell>
    )
  }

  const disponiveis = fila.filter(f => f.disponivel)

  return (
    <AppShell title={`Fila - ${plantao.local_nome}`}>
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{plantao.local_nome}</h1>
                <Badge variant={plantao.status === "ativo" ? "default" : "secondary"}>
                  {plantao.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(plantao.data), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {plantao.hora_inicio.slice(0, 5)} - {plantao.hora_fim.slice(0, 5)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={handleProximoCorretor} disabled={disponiveis.length === 0}>
              <UserPlus className="h-4 w-4 mr-2" />
              Proximo Corretor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plantao.disponiveis}</p>
                  <p className="text-xs text-muted-foreground">Disponiveis</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <PhoneCall className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plantao.em_atendimento}</p>
                  <p className="text-xs text-muted-foreground">Atendendo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <PauseCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plantao.pausados}</p>
                  <p className="text-xs text-muted-foreground">Pausados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plantao.aguardando_feedback}</p>
                  <p className="text-xs text-muted-foreground">Ag. Feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plantao.total_presentes}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fila */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Fila de Corretores
            </CardTitle>
            <CardDescription>
              {disponiveis.length > 0
                ? `${disponiveis.length} corretor(es) disponivel(is)`
                : "Nenhum corretor disponivel no momento"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fila.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold">Nenhum corretor na fila</h3>
                <p className="text-sm text-muted-foreground">
                  Aguardando check-in de corretores
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {fila.map((item) => (
                  <div
                    key={item.presenca_id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      getStatusColor(item)
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border text-sm font-bold">
                          {item.posicao_fila}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={item.corretor_avatar || undefined} />
                          <AvatarFallback>
                            {item.corretor_nome?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.corretor_nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {item.corretor_telefone}
                            </span>
                            <span>•</span>
                            <span>Check-in: {formatTime(item.checkin_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item)}
                          <span className="text-sm font-medium">{item.status_legivel}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            (item.leads_ativos || 0) >= 5 && "bg-red-100 border-red-300 text-red-700"
                          )}
                        >
                          {item.leads_ativos || 0}/5 leads
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.checkin_method}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atribuir Lead Dialog */}
        <Dialog open={atribuirDialogOpen} onOpenChange={setAtribuirDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Atribuir Lead</DialogTitle>
              <DialogDescription>
                Proximo corretor: <strong>{proximoCorretor?.user_nome}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lead_origem">Origem do Lead *</Label>
                <Select
                  value={leadForm.lead_origem}
                  onValueChange={(value) =>
                    setLeadForm({ ...leadForm, lead_origem: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Presencial
                      </span>
                    </SelectItem>
                    <SelectItem value="telefone">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefone
                      </span>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead_nome">Nome do Cliente</Label>
                <Input
                  id="lead_nome"
                  placeholder="Nome do cliente"
                  value={leadForm.lead_nome}
                  onChange={(e) => setLeadForm({ ...leadForm, lead_nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead_telefone">Telefone</Label>
                <Input
                  id="lead_telefone"
                  placeholder="(11) 99999-9999"
                  value={leadForm.lead_telefone}
                  onChange={(e) => setLeadForm({ ...leadForm, lead_telefone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead_observacoes">Observacoes</Label>
                <Textarea
                  id="lead_observacoes"
                  placeholder="Interesse, preferencias, etc..."
                  value={leadForm.lead_observacoes}
                  onChange={(e) => setLeadForm({ ...leadForm, lead_observacoes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAtribuirDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAtribuirLead} disabled={atribuindo}>
                {atribuindo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Atribuir Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
