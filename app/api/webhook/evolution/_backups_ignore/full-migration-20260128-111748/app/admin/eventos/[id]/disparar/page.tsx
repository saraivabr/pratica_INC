"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  Ban,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  QrCode,
  Bot,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface Convidado {
  id: string
  nome: string
  celular: string
  origem: "cvcrm" | "importado"
  status: string
  convite_enviado_at?: string
}

interface Evento {
  id: string
  nome: string
  descricao?: string
  data_hora: string
  local: string
  lembrete_horas: number
  status: string
}

interface MensagemPreview {
  nomeCorretor: string
  mensagem: string
}

interface WhatsAppStatus {
  status: "loading" | "connected" | "disconnected"
  instanceName?: string
}

export default function DispararPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const eventoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [convidados, setConvidados] = useState<Convidado[]>([])
  const [mensagens, setMensagens] = useState<MensagemPreview[]>([])
  const [regenerating, setRegenerating] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchProgress, setDispatchProgress] = useState(0)
  const [dispatchComplete, setDispatchComplete] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<{ enviados: number; falhas: number } | null>(null)

  // WhatsApp status
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({ status: "loading" })

  // Opção de Sofia responder automaticamente
  const [comSofia, setComSofia] = useState(true)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  // Convidados pendentes (sem convite enviado)
  const convidadosPendentes = convidados.filter(c => !c.convite_enviado_at)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess && eventoId) {
      fetchEvento()
      checkWhatsAppStatus()
    }
  }, [hasAccess, eventoId])

  // Verificar status do WhatsApp do usuário
  const checkWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/session/status")
      const data = await res.json()
      setWhatsappStatus({
        status: data.status === "ready" ? "connected" : "disconnected",
        instanceName: data.instanceName,
      })
    } catch {
      setWhatsappStatus({ status: "disconnected" })
    }
  }

  const fetchEvento = async () => {
    setLoading(true)
    try {
      // Buscar evento
      const eventoRes = await fetch(`/api/eventos/${eventoId}`)
      const eventoData = await eventoRes.json()

      if (!eventoData.success) {
        throw new Error(eventoData.error || "Evento não encontrado")
      }

      setEvento(eventoData.data)

      // Buscar convidados
      const convidadosRes = await fetch(`/api/eventos/${eventoId}/convidados`)
      const convidadosData = await convidadosRes.json()

      if (convidadosData.success) {
        setConvidados(convidadosData.data || [])
      }

      // Gerar preview de mensagens
      if (eventoData.data && convidadosData.data?.length > 0) {
        await generateMessagePreviews(eventoData.data, convidadosData.data.slice(0, 3))
      }
    } catch (error: any) {
      console.error("Error fetching evento:", error)
      toast.error(error.message || "Erro ao carregar evento")
    }
    setLoading(false)
  }

  const generateMessagePreviews = async (eventoData: Evento, sampleConvidados: Convidado[]) => {
    const previews: MensagemPreview[] = []

    for (const convidado of sampleConvidados) {
      try {
        const res = await fetch(`/api/eventos/${eventoId}/gerar-mensagem`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome_convidado: convidado.nome,
            usar_ia: false, // Usar variações locais para preview (mais rápido)
          }),
        })
        const data = await res.json()

        if (data.success && data.data?.mensagem) {
          previews.push({
            nomeCorretor: convidado.nome,
            mensagem: data.data.mensagem,
          })
        }
      } catch (error) {
        console.error("Error generating message preview:", error)
      }
    }

    if (previews.length > 0) {
      setMensagens(previews)
    }
  }

  const handleRegenerate = async () => {
    if (!evento || convidados.length === 0) return

    setRegenerating(true)
    try {
      await generateMessagePreviews(evento, convidados.slice(0, 3))
      toast.success("Mensagens regeneradas!")
    } catch (error) {
      toast.error("Erro ao regenerar mensagens")
    }
    setRegenerating(false)
  }

  const handleDispatch = async () => {
    if (!evento || !whatsappStatus.instanceName) return

    setDispatching(true)
    setDispatchProgress(0)

    try {
      // Simular progresso enquanto aguarda resposta
      const progressInterval = setInterval(() => {
        setDispatchProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 1000)

      const response = await fetch(`/api/eventos/${eventoId}/disparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instance_name: whatsappStatus.instanceName,
          com_sofia: comSofia,
        }),
      })

      clearInterval(progressInterval)

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao disparar convites")
      }

      setDispatchProgress(100)
      setDispatchResult({
        enviados: data.data?.enviados || 0,
        falhas: data.data?.falhas || 0,
      })
      setDispatchComplete(true)
      toast.success(`${data.data?.enviados || 0} convites enviados!`)
    } catch (error: any) {
      console.error("Error dispatching:", error)
      toast.error(error.message || "Erro ao disparar convites")
      setConfirmDialogOpen(false)
    }
    setDispatching(false)
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
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
              Esta área é exclusiva para gerentes e administradores.
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

  if (!evento) {
    return (
      <AppShell title="Evento não encontrado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Evento não encontrado</h1>
            <p className="text-muted-foreground mb-6">
              O evento que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => router.push("/admin/eventos")}>
              Voltar para lista
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Revisar e Disparar" showBackButton backHref={`/admin/eventos/${eventoId}/convidados`}>
      <div className="container max-w-4xl px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/eventos/${eventoId}/convidados`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Revisar e Disparar</h1>
            <p className="text-muted-foreground">
              Revise as mensagens antes de enviar os convites
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              <Check className="h-4 w-4" />
            </div>
            <span>Dados do Evento</span>
          </div>
          <div className="h-px flex-1 bg-primary" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              <Check className="h-4 w-4" />
            </div>
            <span>Convidados</span>
          </div>
          <div className="h-px flex-1 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              3
            </div>
            <span className="font-medium">Disparar</span>
          </div>
        </div>

        {/* WhatsApp Status Alert */}
        {whatsappStatus.status === "loading" ? (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Verificando WhatsApp...</AlertTitle>
            <AlertDescription>
              Aguarde enquanto verificamos a conexão do seu WhatsApp.
            </AlertDescription>
          </Alert>
        ) : whatsappStatus.status === "disconnected" ? (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>WhatsApp Desconectado</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Você precisa conectar seu WhatsApp antes de disparar os convites.</span>
              <Link href="/onboarding/whatsapp">
                <Button size="sm" variant="outline" className="gap-2 ml-4">
                  <QrCode className="h-4 w-4" />
                  Conectar WhatsApp
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <Wifi className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">WhatsApp Conectado</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Seu WhatsApp está pronto para enviar os convites.
            </AlertDescription>
          </Alert>
        )}

        {/* Event Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {evento.nome}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatDateTime(evento.data_hora)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{evento.local}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{convidadosPendentes.length} convidados pendentes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No pending guests alert */}
        {convidadosPendentes.length === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Todos os convites já foram enviados</AlertTitle>
            <AlertDescription>
              Todos os {convidados.length} convidados já receberam o convite.
              <Link href={`/admin/eventos/${eventoId}`} className="ml-2 underline">
                Ver dashboard do evento
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Anti-spam Notice */}
        {convidadosPendentes.length > 0 && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Mensagens únicas anti-spam</AlertTitle>
            <AlertDescription>
              Cada corretor receberá uma mensagem única, variando saudação,
              formato de data, emojis e tom. Isso evita detecção de spam pelo WhatsApp.
            </AlertDescription>
          </Alert>
        )}

        {/* Message Preview */}
        {mensagens.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Preview das Mensagens
                  </CardTitle>
                  <CardDescription>
                    Exemplos de como as mensagens serão variadas
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mensagens.map((preview, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-xs font-semibold">
                        {preview.nomeCorretor[0]}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{preview.nomeCorretor}</span>
                  </div>
                  <div className="ml-8 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                    <p className="text-sm whitespace-pre-wrap">{preview.mensagem}</p>
                  </div>
                  {index < mensagens.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recipients Summary */}
        {convidadosPendentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Destinatários ({convidadosPendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {convidadosPendentes.slice(0, 10).map((convidado) => (
                  <Badge key={convidado.id} variant="outline" className="py-1">
                    {convidado.nome}
                  </Badge>
                ))}
                {convidadosPendentes.length > 10 && (
                  <Badge variant="secondary" className="py-1">
                    +{convidadosPendentes.length - 10} mais
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Opções de Disparo */}
        {convidadosPendentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Opções de Disparo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="com-sofia" className="text-base font-medium">
                    Sofia responde automaticamente
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    A Sofia irá responder dúvidas e coletar confirmações dos convidados
                  </p>
                </div>
                <Switch
                  id="com-sofia"
                  checked={comSofia}
                  onCheckedChange={setComSofia}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dispatch Warning */}
        {convidadosPendentes.length > 0 && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Antes de disparar</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Certifique-se de que todos os dados estão corretos. Após o disparo,
              os convites serão enviados com delay de 5-15 segundos entre cada um.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/eventos/${eventoId}/convidados`)}
          >
            Voltar
          </Button>
          <Button
            onClick={() => setConfirmDialogOpen(true)}
            disabled={whatsappStatus.status !== "connected" || convidadosPendentes.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Disparar Convites
          </Button>
        </div>

        {/* Confirm Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md">
            {dispatchComplete ? (
              <>
                <DialogHeader>
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <DialogTitle className="text-center">Convites Disparados!</DialogTitle>
                  <DialogDescription className="text-center">
                    {dispatchResult?.enviados || 0} convites foram enviados com sucesso.
                    {dispatchResult?.falhas ? ` (${dispatchResult.falhas} falhas)` : ""}
                    {comSofia
                      ? " A Sofia irá coletar as respostas automaticamente."
                      : " Os convites foram enviados sem resposta automática."}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                  <Button onClick={() => router.push(`/admin/eventos/${eventoId}`)}>
                    Ver Dashboard do Evento
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Confirmar Disparo</DialogTitle>
                  <DialogDescription>
                    Você está prestes a enviar {convidadosPendentes.length} convites via WhatsApp.
                    Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>

                {dispatching ? (
                  <div className="py-6 space-y-4">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Enviando convites... {Math.round(dispatchProgress)}%
                      </p>
                    </div>
                    <Progress value={dispatchProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      Aguarde enquanto os convites são enviados com delay anti-spam
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="py-4">
                      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Evento</span>
                          <span className="font-medium">{evento.nome}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Data</span>
                          <span className="font-medium">{formatDateTime(evento.data_hora)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Convidados</span>
                          <span className="font-medium">{convidadosPendentes.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tempo estimado</span>
                          <span className="font-medium">
                            ~{Math.ceil(convidadosPendentes.length * 10 / 60)} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleDispatch}>
                        <Send className="h-4 w-4 mr-2" />
                        Confirmar e Disparar
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
