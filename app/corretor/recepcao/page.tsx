"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  PauseCircle,
  PlayCircle,
  Coffee,
  UserCheck,
  ScanLine,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  RulesCard,
  QualificationProgress,
  StarProgress,
  DualQueueCard,
  OfertaQuickForm,
  CelebrationModal,
} from "@/components/recepcao"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface PlantaoHoje {
  id: string
  local_id: string
  local_nome: string
  data: string
  hora_inicio: string
  hora_fim: string
  hora_limite_checkin: string | null
  is_current: boolean
  sorteio_realizado: boolean
  meta_ofertas: number
}

interface MinhaPresenca {
  id: string
  plantao_id: string
  status: string
  posicao_fila: number
  sorteio_posicao: number | null
  posicao_fila_leads: number | null
  em_atendimento: boolean
  pausado: boolean
  feedback_pendente: boolean
  leads_ativos: number
  checkin_at: string
}

interface QualificacaoData {
  total_ofertas: number
  meta_ofertas: number
  qualificado: boolean
  posicao_roleta_leads: number | null
}

interface GamificacaoData {
  estrelas_disponiveis: number
  pode_resgatar: boolean
  estrelas_para_pix: number
}

type CelebrationType = "star" | "qualification" | "pix" | null

export default function CorretorRecepcaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [plantoesHoje, setPlantoesHoje] = useState<PlantaoHoje[]>([])
  const [selectedPlantao, setSelectedPlantao] = useState<string>("")
  const [minhaPresenca, setMinhaPresenca] = useState<MinhaPresenca | null>(null)
  const [qualificacao, setQualificacao] = useState<QualificacaoData | null>(null)
  const [gamificacao, setGamificacao] = useState<GamificacaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [pausaLoading, setPausaLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Modais
  const [ofertaFormOpen, setOfertaFormOpen] = useState(false)
  const [ofertaLoading, setOfertaLoading] = useState(false)
  const [celebrationType, setCelebrationType] = useState<CelebrationType>(null)
  const [celebrationData, setCelebrationData] = useState<any>({})

  const qrToken = searchParams.get("qr")

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/recepcao/plantoes/hoje")
      const result = await response.json()

      if (result.success) {
        setPlantoesHoje(result.data)

        const current = result.current || result.data[0]
        if (current && !selectedPlantao) {
          setSelectedPlantao(current.id)
        }
      }
    } catch (error) {
      console.error("Error fetching plantoes:", error)
    }
  }, [selectedPlantao])

  const fetchMinhaPresenca = useCallback(async () => {
    if (!selectedPlantao) return

    try {
      const response = await fetch(`/api/recepcao/fila?plantao_id=${selectedPlantao}`)
      const result = await response.json()

      if (result.success && user) {
        const minha = result.data.find((f: any) => f.user_id === (user as any).id)
        setMinhaPresenca(minha || null)
      }
    } catch (error) {
      console.error("Error fetching presenca:", error)
    }
  }, [selectedPlantao, user])

  const fetchQualificacao = useCallback(async () => {
    if (!selectedPlantao || !minhaPresenca) return

    try {
      const response = await fetch(`/api/recepcao/qualificacao?plantao_id=${selectedPlantao}`)
      const result = await response.json()

      if (result.success) {
        setQualificacao(result.data)
      }
    } catch (error) {
      console.error("Error fetching qualificacao:", error)
    }
  }, [selectedPlantao, minhaPresenca])

  const fetchGamificacao = useCallback(async () => {
    if (!minhaPresenca) return

    try {
      const response = await fetch("/api/recepcao/gamificacao")
      const result = await response.json()

      if (result.success) {
        setGamificacao(result.data)
      }
    } catch (error) {
      console.error("Error fetching gamificacao:", error)
    }
  }, [minhaPresenca])

  // Effects
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    if (isAuthenticated) {
      setLoading(true)
      fetchData().finally(() => setLoading(false))
    }
  }, [isAuthenticated, authLoading, router, fetchData])

  useEffect(() => {
    if (selectedPlantao && isAuthenticated) {
      fetchMinhaPresenca()

      const interval = setInterval(fetchMinhaPresenca, 10000)
      return () => clearInterval(interval)
    }
  }, [selectedPlantao, isAuthenticated, fetchMinhaPresenca])

  useEffect(() => {
    if (minhaPresenca) {
      fetchQualificacao()
      fetchGamificacao()
    }
  }, [minhaPresenca, fetchQualificacao, fetchGamificacao])

  // Auto check-in via QR Code
  useEffect(() => {
    if (qrToken && isAuthenticated && !loading) {
      handleCheckinQr(qrToken)
    }
  }, [qrToken, isAuthenticated, loading])

  // Handlers
  const handleCheckinManual = async () => {
    if (!selectedPlantao) {
      toast.error("Selecione um plantao")
      return
    }

    setCheckinLoading(true)
    try {
      const response = await fetch("/api/recepcao/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantao_id: selectedPlantao }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Show! Voce esta na fila.")
        await fetchMinhaPresenca()
      } else {
        toast.error(result.error || "Erro ao fazer check-in")
      }
    } catch (error) {
      toast.error("Erro ao fazer check-in")
    }
    setCheckinLoading(false)
  }

  const handleCheckinGps = async () => {
    if (!selectedPlantao) {
      toast.error("Selecione um plantao")
      return
    }

    if (!navigator.geolocation) {
      toast.error("Geolocalizacao nao suportada pelo navegador")
      return
    }

    setGpsLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/recepcao/checkin/gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plantao_id: selectedPlantao,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          })

          const result = await response.json()

          if (result.success) {
            toast.success("Cheguei! Voce esta na fila.")
            await fetchMinhaPresenca()
          } else {
            toast.error(result.error || "Erro ao fazer check-in")
          }
        } catch (error) {
          toast.error("Erro ao fazer check-in")
        }
        setGpsLoading(false)
      },
      (error) => {
        toast.error("Erro ao obter localizacao")
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCheckinQr = async (token: string) => {
    setCheckinLoading(true)
    try {
      const response = await fetch("/api/recepcao/checkin/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_token: token }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Check-in por QR Code realizado!")
        router.replace("/corretor/recepcao")
        await fetchData()
        await fetchMinhaPresenca()
      } else {
        toast.error(result.error || "Erro ao fazer check-in")
      }
    } catch (error) {
      toast.error("Erro ao fazer check-in")
    }
    setCheckinLoading(false)
  }

  const handleCheckout = async () => {
    if (!minhaPresenca) return

    setCheckoutLoading(true)
    try {
      const response = await fetch("/api/recepcao/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presenca_id: minhaPresenca.id }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Ate a proxima!")
        setMinhaPresenca(null)
        setQualificacao(null)
      } else {
        toast.error(result.error || "Erro ao fazer check-out")
      }
    } catch (error) {
      toast.error("Erro ao fazer check-out")
    }
    setCheckoutLoading(false)
  }

  const handlePausar = async () => {
    if (!minhaPresenca) return

    setPausaLoading(true)
    try {
      const response = await fetch("/api/recepcao/pausar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presenca_id: minhaPresenca.id }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Intervalo! Descanse um pouco.")
        await fetchMinhaPresenca()
      } else {
        toast.error(result.error || "Erro ao pausar")
      }
    } catch (error) {
      toast.error("Erro ao pausar")
    }
    setPausaLoading(false)
  }

  const handleRetomar = async () => {
    if (!minhaPresenca) return

    setPausaLoading(true)
    try {
      const response = await fetch("/api/recepcao/retomar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presenca_id: minhaPresenca.id }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Bora! De volta a fila.")
        await fetchMinhaPresenca()
      } else {
        toast.error(result.error || "Erro ao retomar")
      }
    } catch (error) {
      toast.error("Erro ao retomar")
    }
    setPausaLoading(false)
  }

  const handleRegistrarOferta = async (data: {
    empreendimento_id: number | null
    empreendimento_nome: string
    lead_origem: string
    lead_telefone?: string
    lead_nome?: string
  }) => {
    setOfertaLoading(true)
    try {
      const response = await fetch("/api/recepcao/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantao_id: selectedPlantao,
          ...data,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        setOfertaFormOpen(false)

        // Verificar se acabou de qualificar
        if (result.data.just_qualified) {
          setCelebrationData({ totalOfertas: result.data.total_ofertas })
          setCelebrationType("qualification")
        }

        // Atualizar dados
        await fetchQualificacao()
      } else {
        toast.error(result.error || "Erro ao registrar oferta")
      }
    } catch (error) {
      toast.error("Erro ao registrar oferta")
    }
    setOfertaLoading(false)
  }

  const handleResgatarPix = async () => {
    try {
      const response = await fetch("/api/recepcao/gamificacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const result = await response.json()

      if (result.success) {
        setCelebrationData({
          valorPix: 50,
          referencia: result.data.resgate_id?.slice(0, 8),
        })
        setCelebrationType("pix")
        await fetchGamificacao()
      } else {
        toast.error(result.error || "Erro ao resgatar")
      }
    } catch (error) {
      toast.error("Erro ao resgatar")
    }
  }

  // Helpers
  const getStatusInfo = () => {
    if (!minhaPresenca) return null

    if (minhaPresenca.em_atendimento) {
      return { label: "Atendendo agora", subtitle: "Foco total!", color: "text-blue-600", bg: "bg-blue-100" }
    }
    if (minhaPresenca.feedback_pendente) {
      return { label: "Conte como foi", subtitle: "So 1 minuto", color: "text-orange-600", bg: "bg-orange-100" }
    }
    if (minhaPresenca.pausado) {
      return { label: "Intervalo", subtitle: "Voce merece", color: "text-amber-600", bg: "bg-amber-100" }
    }
    if (minhaPresenca.leads_ativos >= 5) {
      return { label: "Voce esta voando!", subtitle: "Finalize alguns", color: "text-purple-600", bg: "bg-purple-100" }
    }
    return { label: "Na fila", subtitle: "Aguardando", color: "text-emerald-600", bg: "bg-emerald-100" }
  }

  const selectedPlantaoData = plantoesHoje.find(p => p.id === selectedPlantao)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statusInfo = getStatusInfo()

  // Saudacao baseada na hora
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite"
  const primeiroNome = (user as any)?.nome?.split(" ")[0] || "Corretor"

  return (
    <AppShell title="Roleta">
      <div className="container px-4 py-6 animate-page-in space-y-5 max-w-lg mx-auto">
        {/* Header com saudacao */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {saudacao}, {primeiroNome}!
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          {!minhaPresenca && (
            <p className="text-sm mt-1 text-primary font-medium">
              Pronto pra mais um dia de conquistas?
            </p>
          )}
        </div>

        {/* Select Plantao */}
        {plantoesHoje.length > 0 ? (
          <Card>
            <CardContent className="pt-4">
              <Select value={selectedPlantao} onValueChange={setSelectedPlantao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plantao" />
                </SelectTrigger>
                <SelectContent>
                  {plantoesHoje.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{p.local_nome}</span>
                        <span className="text-muted-foreground">
                          ({p.hora_inicio.slice(0, 5)} - {p.hora_fim.slice(0, 5)})
                        </span>
                        {p.is_current && (
                          <Badge variant="default" className="text-xs">
                            AGORA
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-semibold">Nenhum plantao hoje</h3>
              <p className="text-sm text-muted-foreground">
                Nao ha plantoes agendados para hoje
              </p>
            </CardContent>
          </Card>
        )}

        {/* Conteudo quando logado */}
        {minhaPresenca ? (
          <>
            {/* Card de Status Atual */}
            <Card className={cn("border-2", statusInfo?.bg)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={cn("h-5 w-5", statusInfo?.color)} />
                    <div>
                      <p className={cn("font-semibold", statusInfo?.color)}>
                        {statusInfo?.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {statusInfo?.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Posicao</p>
                    <p className="text-2xl font-bold">#{minhaPresenca.posicao_fila}</p>
                  </div>
                </div>

                {minhaPresenca.feedback_pendente && (
                  <Button
                    className="w-full mt-3"
                    variant="outline"
                    onClick={() => router.push("/corretor/recepcao/atribuicoes")}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Enviar Feedback Pendente
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Qualificacao Progress */}
            {qualificacao && (
              <QualificationProgress
                totalOfertas={qualificacao.total_ofertas}
                metaOfertas={qualificacao.meta_ofertas}
                qualificado={qualificacao.qualificado}
                onRegisterClick={() => setOfertaFormOpen(true)}
              />
            )}

            {/* Estrelas */}
            {gamificacao && (
              <StarProgress
                estrelasDisponiveis={gamificacao.estrelas_disponiveis}
                podeResgatar={gamificacao.pode_resgatar}
                onResgatar={handleResgatarPix}
                onVerHistorico={() => router.push("/corretor/recepcao/estrelas")}
              />
            )}

            {/* Fila Dupla */}
            <DualQueueCard
              posicaoPortaria={minhaPresenca.sorteio_posicao || minhaPresenca.posicao_fila}
              totalPortaria={10} // TODO: buscar do backend
              statusPortaria={
                minhaPresenca.em_atendimento ? "atendendo" :
                minhaPresenca.pausado ? "pausado" :
                minhaPresenca.feedback_pendente ? "feedback" :
                minhaPresenca.leads_ativos >= 5 ? "limite" :
                "disponivel"
              }
              sorteioRealizado={selectedPlantaoData?.sorteio_realizado || false}
              posicaoLeads={qualificacao?.posicao_roleta_leads || null}
              totalLeads={5} // TODO: buscar do backend
              statusLeads={
                !qualificacao?.qualificado ? "nao_qualificado" :
                minhaPresenca.em_atendimento ? "atendendo" :
                minhaPresenca.pausado ? "pausado" :
                minhaPresenca.feedback_pendente ? "feedback" :
                minhaPresenca.leads_ativos >= 5 ? "limite" :
                "disponivel"
              }
              qualificado={qualificacao?.qualificado || false}
              totalOfertas={qualificacao?.total_ofertas || 0}
              metaOfertas={qualificacao?.meta_ofertas || 30}
              leadsAtivos={minhaPresenca.leads_ativos}
              maxLeads={5}
              onRegisterOferta={() => setOfertaFormOpen(true)}
            />

            {/* Botoes de Acao */}
            <div className="grid grid-cols-2 gap-3">
              {minhaPresenca.pausado ? (
                <Button
                  variant="outline"
                  onClick={handleRetomar}
                  disabled={pausaLoading || minhaPresenca.em_atendimento}
                  className="gap-2"
                >
                  {pausaLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Retomar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handlePausar}
                  disabled={pausaLoading || minhaPresenca.em_atendimento}
                  className="gap-2"
                >
                  {pausaLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Coffee className="h-4 w-4" />
                  )}
                  Pausar
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={handleCheckout}
                disabled={checkoutLoading || minhaPresenca.em_atendimento}
                className="gap-2"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sair
              </Button>
            </div>

            {/* Link para atribuicoes */}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/corretor/recepcao/atribuicoes")}
            >
              Ver Minhas Atribuicoes
            </Button>
          </>
        ) : selectedPlantao ? (
          /* Check-in Options */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fazer Check-in</CardTitle>
              <CardDescription>
                Escolha uma opcao para entrar na fila
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={handleCheckinGps}
                disabled={gpsLoading || checkinLoading}
              >
                {gpsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                Cheguei! (via GPS)
              </Button>

              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={handleCheckinManual}
                disabled={checkinLoading || gpsLoading}
              >
                {checkinLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Estou aqui
              </Button>

              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <ScanLine className="h-3 w-3" />
                Ou escaneie o QR Code do stand
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Regras do Atendimento */}
        <RulesCard
          defaultOpen={!minhaPresenca}
          horaLimiteCheckin={selectedPlantaoData?.hora_limite_checkin?.slice(0, 5)}
          metaOfertas={selectedPlantaoData?.meta_ofertas}
        />
      </div>

      {/* Modal de Oferta */}
      <OfertaQuickForm
        open={ofertaFormOpen}
        onOpenChange={setOfertaFormOpen}
        onSubmit={handleRegistrarOferta}
        isLoading={ofertaLoading}
      />

      {/* Modais de Celebracao */}
      <CelebrationModal
        open={celebrationType !== null}
        onOpenChange={(open) => !open && setCelebrationType(null)}
        type={celebrationType || "star"}
        data={celebrationData}
      />
    </AppShell>
  )
}
