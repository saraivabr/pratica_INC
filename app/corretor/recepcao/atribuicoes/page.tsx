"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  User,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
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
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface Atribuicao {
  id: string
  lead_nome: string | null
  lead_telefone: string | null
  lead_email: string | null
  lead_origem: string
  lead_observacoes: string | null
  atribuido_at: string
  atendimento_iniciado_at: string | null
  atendimento_finalizado_at: string | null
  feedback_status: string | null
  feedback_observacoes: string | null
  atribuido_por_nome: string | null
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
}

export default function MinhasAtribuicoesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
    <AppShell title="Minhas Atribuicoes">
      <div className="container px-4 py-6 animate-page-in space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Minhas Atribuicoes</h1>
            <p className="text-muted-foreground text-sm">
              Leads recebidos e feedback
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-5 w-5" />
                Feedback Pendente ({pendentes.length})
              </CardTitle>
              <CardDescription className="text-orange-600">
                Envie o feedback para voltar a fila
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendentes.map((atribuicao) => {
                const origem = origemConfig[atribuicao.lead_origem] || origemConfig.presencial

                return (
                  <div
                    key={atribuicao.id}
                    className="p-4 rounded-lg bg-white border border-orange-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {origem.icon}
                            <span className="ml-1">{origem.label}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(atribuicao.atribuido_at), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>

                        {atribuicao.lead_nome && (
                          <p className="font-medium">{atribuicao.lead_nome}</p>
                        )}

                        {atribuicao.lead_telefone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {atribuicao.lead_telefone}
                          </p>
                        )}

                        {atribuicao.lead_observacoes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {atribuicao.lead_observacoes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {!atribuicao.atendimento_iniciado_at ? (
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
                      ) : null}

                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenFeedback(atribuicao)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Feedback
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
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
              <h3 className="font-semibold">Nenhuma atribuicao</h3>
              <p className="text-sm text-muted-foreground">
                Voce ainda nao recebeu leads hoje
              </p>
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
      </div>
    </AppShell>
  )
}
