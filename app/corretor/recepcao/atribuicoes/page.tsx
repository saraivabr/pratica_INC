"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  RefreshCw,
  Send,
  User,
  Mail,
  Eye,
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
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface Atribuicao {
  id: string
  lead_nome: string | null
  lead_telefone: string | null
  lead_email: string | null
  lead_origem: string
  lead_observacoes: string | null
  cvcrm_lead_id: number | null
  atribuido_at: string
  atendimento_iniciado_at: string | null
  atendimento_finalizado_at: string | null
  feedback_status: string | null
  feedback_observacoes: string | null
  atribuido_por_nome: string | null
  // JOIN data from cvcrm_leads
  lead_empreendimentos: any | null
  lead_crm_origem: string | null
  lead_score: number | null
  lead_situacao: string | null
  lead_ultima_conversao: string | null
  lead_crm_telefone: string | null
  lead_celular: string | null
  lead_created_at: string | null
}

interface Anotacao {
  id: string
  tipo: string
  conteudo: string
  created_at: string
  user_nome: string
}

const feedbackOptions = [
  { value: "interessado", label: "Interessado", color: "text-emerald-600" },
  { value: "agendou_visita", label: "Agendou Visita", color: "text-blue-600" },
  { value: "fechou_negocio", label: "Fechou Negocio", color: "text-purple-600" },
  { value: "sem_interesse", label: "Sem Interesse", color: "text-zinc-600" },
  { value: "nao_compareceu", label: "Nao Compareceu", color: "text-amber-600" },
  { value: "outro", label: "Outro", color: "text-zinc-500" },
]

const origemConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  presencial: { icon: <User className="h-4 w-4" />, label: "Presencial" },
  telefone: { icon: <Phone className="h-4 w-4" />, label: "Telefone" },
  whatsapp: { icon: <MessageSquare className="h-4 w-4" />, label: "WhatsApp" },
  sistema: { icon: <RefreshCw className="h-4 w-4" />, label: "Sistema" },
}

const tipoAnotacaoConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  nota: { icon: <Pencil className="h-3 w-3" />, label: "Nota", color: "text-zinc-500" },
  ligacao: { icon: <PhoneCall className="h-3 w-3" />, label: "Ligacao", color: "text-blue-500" },
  whatsapp: { icon: <MessageSquare className="h-3 w-3" />, label: "WhatsApp", color: "text-green-500" },
  visita: { icon: <Eye className="h-3 w-3" />, label: "Visita", color: "text-purple-500" },
  email: { icon: <Mail className="h-3 w-3" />, label: "Email", color: "text-orange-500" },
}

export default function MinhasAtribuicoesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Anotações per atribuição
  const [anotacoesMap, setAnotacoesMap] = useState<Record<string, Anotacao[]>>({})
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [anotacaoForm, setAnotacaoForm] = useState({ tipo: "nota", conteudo: "" })
  const [savingAnotacao, setSavingAnotacao] = useState(false)

  // Follow-up dialog
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false)
  const [followupAtribuicao, setFollowupAtribuicao] = useState<Atribuicao | null>(null)
  const [followupForm, setFollowupForm] = useState({
    data_agendamento: "",
    tipo: "whatsapp" as string,
    observacoes: "",
  })
  const [savingFollowup, setSavingFollowup] = useState(false)

  // Feedback Dialog
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<Atribuicao | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({
    feedback_status: "",
    feedback_observacoes: "",
  })
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [startingAtendimento, setStartingAtendimento] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    if (isAuthenticated) {
      fetchAtribuicoes()
    }
  }, [isAuthenticated, authLoading, router])

  const fetchAtribuicoes = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/recepcao/atribuicoes?meus=true")
      const result = await response.json()

      if (result.success) {
        setAtribuicoes(result.data)
      } else {
        toast.error(result.error || "Erro ao carregar atribuicoes")
      }
    } catch (error) {
      console.error("Error fetching atribuicoes:", error)
      toast.error("Erro ao carregar atribuicoes")
    }
    setLoading(false)
  }

  const fetchAnotacoes = useCallback(async (atribuicaoId: string) => {
    try {
      const response = await fetch(`/api/recepcao/atribuicoes/${atribuicaoId}/anotacoes`)
      const result = await response.json()
      if (result.success) {
        setAnotacoesMap((prev) => ({ ...prev, [atribuicaoId]: result.data }))
      }
    } catch (error) {
      console.error("Error fetching anotacoes:", error)
    }
  }, [])

  const handleExpandCard = (atribuicaoId: string) => {
    if (expandedCard === atribuicaoId) {
      setExpandedCard(null)
    } else {
      setExpandedCard(atribuicaoId)
      if (!anotacoesMap[atribuicaoId]) {
        fetchAnotacoes(atribuicaoId)
      }
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAtribuicoes()
    setRefreshing(false)
  }

  const handleIniciarAtendimento = async (atribuicao: Atribuicao) => {
    setStartingAtendimento(atribuicao.id)
    try {
      const response = await fetch(`/api/recepcao/atribuicoes/${atribuicao.id}/iniciar`, {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Atendimento iniciado!")
        await fetchAtribuicoes()
      } else {
        toast.error(result.error || "Erro ao iniciar atendimento")
      }
    } catch (error) {
      toast.error("Erro ao iniciar atendimento")
    }
    setStartingAtendimento(null)
  }

  const handleOpenFeedback = (atribuicao: Atribuicao) => {
    setSelectedAtribuicao(atribuicao)
    setFeedbackForm({
      feedback_status: "",
      feedback_observacoes: "",
    })
    setFeedbackDialogOpen(true)
  }

  const handleSendFeedback = async () => {
    if (!selectedAtribuicao || !feedbackForm.feedback_status) {
      toast.error("Selecione o resultado do atendimento")
      return
    }

    setSendingFeedback(true)
    try {
      const response = await fetch(`/api/recepcao/atribuicoes/${selectedAtribuicao.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackForm),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || "Feedback enviado!")
        setFeedbackDialogOpen(false)
        setSelectedAtribuicao(null)
        await fetchAtribuicoes()
      } else {
        toast.error(result.error || "Erro ao enviar feedback")
      }
    } catch (error) {
      toast.error("Erro ao enviar feedback")
    }
    setSendingFeedback(false)
  }

  const handleSaveAnotacao = async (atribuicaoId: string) => {
    if (!anotacaoForm.conteudo.trim()) {
      toast.error("Escreva algo na anotacao")
      return
    }

    setSavingAnotacao(true)
    try {
      const response = await fetch(`/api/recepcao/atribuicoes/${atribuicaoId}/anotacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(anotacaoForm),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Anotacao salva!")
        setAnotacaoForm({ tipo: "nota", conteudo: "" })
        await fetchAnotacoes(atribuicaoId)
      } else {
        toast.error(result.error || "Erro ao salvar anotacao")
      }
    } catch (error) {
      toast.error("Erro ao salvar anotacao")
    }
    setSavingAnotacao(false)
  }

  const handleOpenFollowup = (atribuicao: Atribuicao) => {
    setFollowupAtribuicao(atribuicao)
    setFollowupForm({ data_agendamento: "", tipo: "whatsapp", observacoes: "" })
    setFollowupDialogOpen(true)
  }

  const handleSaveFollowup = async () => {
    if (!followupAtribuicao || !followupForm.data_agendamento) {
      toast.error("Selecione a data do follow-up")
      return
    }

    setSavingFollowup(true)
    try {
      const response = await fetch(`/api/recepcao/atribuicoes/${followupAtribuicao.id}/agendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(followupForm),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Follow-up agendado!")
        setFollowupDialogOpen(false)
        await fetchAnotacoes(followupAtribuicao.id)
      } else {
        toast.error(result.error || "Erro ao agendar")
      }
    } catch (error) {
      toast.error("Erro ao agendar")
    }
    setSavingFollowup(false)
  }

  // Helpers
  const getPhoneForActions = (a: Atribuicao) => {
    return a.lead_telefone || a.lead_crm_telefone || a.lead_celular || ""
  }

  const getEmpreendimentoNome = (a: Atribuicao) => {
    if (!a.lead_empreendimentos) return null
    try {
      const emps = typeof a.lead_empreendimentos === "string"
        ? JSON.parse(a.lead_empreendimentos)
        : a.lead_empreendimentos
      if (Array.isArray(emps) && emps.length > 0) {
        return emps[0]?.nome || emps[0]?.empreendimento || null
      }
      return null
    } catch {
      return null
    }
  }

  const getDiasSemContato = (a: Atribuicao) => {
    const ref = a.lead_ultima_conversao || a.lead_created_at
    if (!ref) return null
    const days = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const pendentes = atribuicoes.filter(a => !a.feedback_status)
  const finalizados = atribuicoes.filter(a => a.feedback_status)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppShell title="Meus Leads">
      <div className="container px-4 py-6 animate-page-in space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Meus Leads</h1>
            <p className="text-muted-foreground text-sm">
              {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""} / {finalizados.length} finalizado{finalizados.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Pendentes - Lead Workspace Cards */}
        {pendentes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Feedback Pendente ({pendentes.length})
            </h2>

            {pendentes.map((atribuicao) => {
              const origem = origemConfig[atribuicao.lead_origem] || origemConfig.presencial
              const phone = getPhoneForActions(atribuicao)
              const cleanPhone = phone.replace(/\D/g, "")
              const empreendimento = getEmpreendimentoNome(atribuicao)
              const diasSemContato = getDiasSemContato(atribuicao)
              const isExpanded = expandedCard === atribuicao.id
              const anotacoes = anotacoesMap[atribuicao.id] || []

              return (
                <Card
                  key={atribuicao.id}
                  className="border-orange-200 bg-white overflow-hidden"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Lead header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {origem.icon}
                            <span className="ml-1">{origem.label}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(atribuicao.atribuido_at), "HH:mm", { locale: ptBR })}
                          </span>
                          {atribuicao.lead_score && atribuicao.lead_score > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Score {atribuicao.lead_score}
                            </Badge>
                          )}
                        </div>

                        <p className="font-semibold text-base">
                          {atribuicao.lead_nome || "Lead"}
                        </p>

                        {phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {phone}
                          </p>
                        )}

                        {empreendimento && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span className="text-base">🏠</span>
                            {empreendimento}
                          </p>
                        )}

                        {diasSemContato !== null && diasSemContato > 0 && (
                          <p className={cn(
                            "text-xs mt-1 flex items-center gap-1",
                            diasSemContato > 7 ? "text-red-500" : diasSemContato > 3 ? "text-orange-500" : "text-muted-foreground"
                          )}>
                            <Clock className="h-3 w-3" />
                            Ha {diasSemContato} dia{diasSemContato !== 1 ? "s" : ""} sem contato
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex gap-2">
                      {cleanPhone && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => {
                              const firstName = atribuicao.lead_nome?.split(" ")[0] || "cliente"
                              window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Ola ${firstName}! Tudo bem?`)}`, "_blank")
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => window.location.href = `tel:+55${cleanPhone}`}
                          >
                            <PhoneCall className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExpandCard(atribuicao.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Expanded: Anotações + Actions */}
                    {isExpanded && (
                      <div className="space-y-3 pt-2 border-t">
                        {/* Anotações timeline */}
                        {anotacoes.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Anotacoes</p>
                            {anotacoes.map((an) => {
                              const tipoConfig = tipoAnotacaoConfig[an.tipo] || tipoAnotacaoConfig.nota
                              return (
                                <div key={an.id} className="flex gap-2 text-sm">
                                  <span className={cn("mt-0.5", tipoConfig.color)}>
                                    {tipoConfig.icon}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm">{an.conteudo}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {format(new Date(an.created_at), "HH:mm", { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Add annotation form */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Select
                              value={anotacaoForm.tipo}
                              onValueChange={(v) => setAnotacaoForm({ ...anotacaoForm, tipo: v })}
                            >
                              <SelectTrigger className="w-[120px] h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nota">Nota</SelectItem>
                                <SelectItem value="ligacao">Ligacao</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="visita">Visita</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="O que aconteceu..."
                              value={anotacaoForm.conteudo}
                              onChange={(e) => setAnotacaoForm({ ...anotacaoForm, conteudo: e.target.value })}
                              className="h-9 flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveAnotacao(atribuicao.id)
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-9"
                              onClick={() => handleSaveAnotacao(atribuicao.id)}
                              disabled={savingAnotacao || !anotacaoForm.conteudo.trim()}
                            >
                              {savingAnotacao ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Follow-up button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleOpenFollowup(atribuicao)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar Follow-up
                        </Button>
                      </div>
                    )}

                    {/* Bottom actions */}
                    <div className="flex gap-2 pt-1">
                      {!atribuicao.atendimento_iniciado_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleIniciarAtendimento(atribuicao)}
                          disabled={startingAtendimento === atribuicao.id}
                        >
                          {startingAtendimento === atribuicao.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 mr-2" />
                          )}
                          Iniciar
                        </Button>
                      )}

                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenFeedback(atribuicao)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Dar Feedback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Finalizados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Finalizados ({finalizados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {finalizados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atribuicao finalizada
              </p>
            ) : (
              <div className="space-y-3">
                {finalizados.slice(0, 10).map((atribuicao) => {
                  const origem = origemConfig[atribuicao.lead_origem] || origemConfig.presencial
                  const feedback = feedbackOptions.find(f => f.value === atribuicao.feedback_status)

                  return (
                    <div
                      key={atribuicao.id}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {origem.icon}
                          <span className="font-medium text-sm">
                            {atribuicao.lead_nome || "Lead"}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", feedback?.color)}
                        >
                          {feedback?.label || atribuicao.feedback_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(atribuicao.atribuido_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty State */}
        {atribuicoes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-semibold">Nenhum lead ainda</h3>
              <p className="text-sm text-muted-foreground">
                Puxe seu primeiro lead na tela da Roleta
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/corretor/recepcao")}
              >
                Ir para Roleta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Feedback</DialogTitle>
              <DialogDescription>
                {selectedAtribuicao?.lead_nome
                  ? `Lead: ${selectedAtribuicao.lead_nome}`
                  : "Como foi o atendimento?"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Resultado do Atendimento *</Label>
                <Select
                  value={feedbackForm.feedback_status}
                  onValueChange={(value) =>
                    setFeedbackForm({ ...feedbackForm, feedback_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    {feedbackOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observacoes (opcional)</Label>
                <Textarea
                  placeholder="Detalhes do atendimento..."
                  value={feedbackForm.feedback_observacoes}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, feedback_observacoes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendFeedback}
                disabled={sendingFeedback || !feedbackForm.feedback_status}
              >
                {sendingFeedback ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Follow-up Dialog */}
        <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Follow-up</DialogTitle>
              <DialogDescription>
                {followupAtribuicao?.lead_nome || "Lead"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Data e hora *</Label>
                <Input
                  type="datetime-local"
                  value={followupForm.data_agendamento}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, data_agendamento: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={followupForm.tipo}
                  onValueChange={(v) => setFollowupForm({ ...followupForm, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="ligacao">Ligacao</SelectItem>
                    <SelectItem value="visita">Visita</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observacoes (opcional)</Label>
                <Textarea
                  placeholder="O que abordar no follow-up..."
                  value={followupForm.observacoes}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, observacoes: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFollowupDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveFollowup}
                disabled={savingFollowup || !followupForm.data_agendamento}
              >
                {savingFollowup ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Agendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
