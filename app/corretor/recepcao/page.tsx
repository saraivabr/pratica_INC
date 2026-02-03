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
  QrCode,
  RefreshCw,
  User,
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
  is_current: boolean
}

interface MinhaPresenca {
  id: string
  plantao_id: string
  status: string
  posicao_fila: number
  em_atendimento: boolean
  pausado: boolean
  feedback_pendente: boolean
  leads_ativos: number
  checkin_at: string
}

export default function CorretorRecepcaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [plantoesHoje, setPlantoesHoje] = useState<PlantaoHoje[]>([])
  const [selectedPlantao, setSelectedPlantao] = useState<string>("")
  const [minhaPresenca, setMinhaPresenca] = useState<MinhaPresenca | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [pausaLoading, setPausaLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  const qrToken = searchParams.get("qr")

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/recepcao/plantoes/hoje")
      const result = await response.json()

      if (result.success) {
        setPlantoesHoje(result.data)

        // Auto-select current plantao
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

      // Auto-refresh every 10 seconds
      const interval = setInterval(fetchMinhaPresenca, 10000)
      return () => clearInterval(interval)
    }
  }, [selectedPlantao, isAuthenticated, fetchMinhaPresenca])

  // Auto check-in via QR Code
  useEffect(() => {
    if (qrToken && isAuthenticated && !loading) {
      handleCheckinQr(qrToken)
    }
  }, [qrToken, isAuthenticated, loading])

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
        toast.success(result.message || "Check-in realizado!")
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
            toast.success(result.message || "Check-in por GPS realizado!")
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
        toast.success(result.message || "Check-in por QR Code realizado!")
        // Remove QR param from URL
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
        toast.success("Check-out realizado!")
        setMinhaPresenca(null)
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
        toast.success("Pausado na fila")
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
        toast.success(result.message || "Retomado na fila!")
        await fetchMinhaPresenca()
      } else {
        toast.error(result.error || "Erro ao retomar")
      }
    } catch (error) {
      toast.error("Erro ao retomar")
    }
    setPausaLoading(false)
  }

  const getStatusInfo = () => {
    if (!minhaPresenca) return null

    if (minhaPresenca.em_atendimento) {
      return { label: "Em Atendimento", color: "text-blue-600", bg: "bg-blue-100" }
    }
    if (minhaPresenca.feedback_pendente) {
      return { label: "Feedback Pendente", color: "text-orange-600", bg: "bg-orange-100" }
    }
    if (minhaPresenca.pausado) {
      return { label: "Pausado", color: "text-amber-600", bg: "bg-amber-100" }
    }
    if (minhaPresenca.leads_ativos >= 5) {
      return { label: "Limite de Leads", color: "text-red-600", bg: "bg-red-100" }
    }
    return { label: "Disponivel", color: "text-emerald-600", bg: "bg-emerald-100" }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statusInfo = getStatusInfo()

  return (
    <AppShell title="Roleta">
      <div className="container px-4 py-6 animate-page-in space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Roleta</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Select Plantao */}
        {plantoesHoje.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Selecionar Plantao</CardTitle>
            </CardHeader>
            <CardContent>
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

        {/* Status atual */}
        {minhaPresenca ? (
          <Card className={cn("border-2", statusInfo?.bg)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className={cn("h-5 w-5", statusInfo?.color)} />
                  Voce esta no plantao!
                </CardTitle>
                <Badge className={cn(statusInfo?.bg, statusInfo?.color, "border-0")}>
                  {statusInfo?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">{minhaPresenca.posicao_fila}</p>
                  <p className="text-sm text-muted-foreground">Sua posicao na fila</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    <span className={minhaPresenca.leads_ativos >= 5 ? "text-red-600" : ""}>{minhaPresenca.leads_ativos || 0}</span>
                    <span className="text-lg text-muted-foreground">/5</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Leads ativos</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Check-in: {format(new Date(minhaPresenca.checkin_at), "HH:mm")}
              </div>

              {minhaPresenca.leads_ativos >= 5 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Voce atingiu o limite de 5 leads ativos.
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Envie feedback dos seus leads para receber novos.
                  </p>
                </div>
              )}

              {minhaPresenca.feedback_pendente && (
                <Button
                  className="w-full"
                  onClick={() => router.push("/corretor/recepcao/atribuicoes")}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Enviar Feedback Pendente
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                {minhaPresenca.pausado ? (
                  <Button
                    variant="outline"
                    onClick={handleRetomar}
                    disabled={pausaLoading || minhaPresenca.em_atendimento}
                  >
                    {pausaLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Retomar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handlePausar}
                    disabled={pausaLoading || minhaPresenca.em_atendimento}
                  >
                    {pausaLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PauseCircle className="h-4 w-4 mr-2" />
                    )}
                    Pausar
                  </Button>
                )}

                <Button
                  variant="destructive"
                  onClick={handleCheckout}
                  disabled={checkoutLoading || minhaPresenca.em_atendimento}
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : selectedPlantao ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fazer Check-in</CardTitle>
              <CardDescription>
                Escolha uma opcao para entrar na fila
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={handleCheckinGps}
                disabled={gpsLoading || checkinLoading}
              >
                {gpsLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Check-in por GPS
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={handleCheckinManual}
                disabled={checkinLoading || gpsLoading}
              >
                {checkinLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Check-in Manual
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Ou escaneie o QR Code do local
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Quick Actions */}
        {minhaPresenca && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/corretor/recepcao/atribuicoes")}
          >
            Ver Minhas Atribuicoes
          </Button>
        )}
      </div>
    </AppShell>
  )
}
