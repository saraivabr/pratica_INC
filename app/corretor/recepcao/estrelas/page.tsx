"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Star,
  Gift,
  Sparkles,
  ArrowLeft,
  Loader2,
  Trophy,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { CelebrationModal } from "@/components/recepcao"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface EstrelaHistorico {
  id: string
  tipo: string
  valor: number
  resgatado: boolean
  resgatado_at: string | null
  created_at: string
  plantao_data: string | null
  local_nome: string | null
}

interface RankingItem {
  user_id: string
  user_nome: string
  avatar_url: string | null
  total_estrelas: number
  estrelas_hoje: number
}

interface GamificacaoData {
  estrelas_disponiveis: number
  estrelas_resgatadas: number
  pix_pendentes: number
  pix_pagos: number
  total_pix_recebido: number
  pode_resgatar: boolean
  estrelas_para_pix: number
  historico: EstrelaHistorico[]
}

const tipoLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  estrela_agendamento: { label: "Visita agendada", icon: Calendar, color: "text-yellow-500" },
  estrela_fechamento: { label: "Negocio fechado", icon: Trophy, color: "text-yellow-500" },
  bonus_pix: { label: "Bonus PIX", icon: Gift, color: "text-green-500" },
}

export default function EstrelasPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [gamificacao, setGamificacao] = useState<GamificacaoData | null>(null)
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [minhaPosicao, setMinhaPosicao] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [resgatando, setResgatando] = useState(false)

  // Celebracao
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState<any>({})

  const fetchData = useCallback(async () => {
    try {
      const [gamificacaoRes, rankingRes] = await Promise.all([
        fetch("/api/recepcao/gamificacao?historico=true&limit=30"),
        fetch("/api/recepcao/gamificacao/ranking?periodo=semana&limit=5"),
      ])

      const gamificacaoResult = await gamificacaoRes.json()
      const rankingResult = await rankingRes.json()

      if (gamificacaoResult.success) {
        setGamificacao(gamificacaoResult.data)
      }

      if (rankingResult.success) {
        setRanking(rankingResult.data.ranking)
        setMinhaPosicao(rankingResult.data.minha_posicao)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, authLoading, router, fetchData])

  const handleResgatarPix = async () => {
    setResgatando(true)
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
        setShowCelebration(true)
        await fetchData()
      } else {
        toast.error(result.error || "Erro ao resgatar")
      }
    } catch (error) {
      toast.error("Erro ao resgatar")
    }
    setResgatando(false)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!gamificacao) {
    return (
      <AppShell title="Estrelas">
        <div className="container px-4 py-6 text-center">
          <p>Erro ao carregar dados</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Minhas Estrelas">
      <div className="container px-4 py-6 animate-page-in space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Minhas Estrelas</h1>
            <p className="text-sm text-muted-foreground">
              Agende visitas, ganhe recompensas
            </p>
          </div>
        </div>

        {/* Card principal de estrelas */}
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/50 dark:to-amber-950/50 border-yellow-200">
          <CardContent className="py-6">
            {/* Visualizacao das 5 estrelas */}
            <div className="flex justify-center items-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map((index) => {
                const isActive = index <= (gamificacao.estrelas_disponiveis % 5 || (gamificacao.pode_resgatar ? 5 : 0))
                return (
                  <div key={index} className="relative">
                    <Star
                      className={cn(
                        "h-10 w-10 transition-all",
                        isActive
                          ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                          : "text-zinc-300 dark:text-zinc-600"
                      )}
                    />
                    {isActive && (
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Contador */}
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold text-yellow-600">
                {gamificacao.estrelas_disponiveis}
                <span className="text-lg font-normal text-muted-foreground"> / 5</span>
              </p>
              {gamificacao.pode_resgatar ? (
                <p className="text-sm font-medium text-green-600">
                  Voce pode resgatar R$50!
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Mais {gamificacao.estrelas_para_pix} para ganhar R$50
                </p>
              )}
            </div>

            {/* Botao de resgate */}
            {gamificacao.pode_resgatar && (
              <Button
                onClick={handleResgatarPix}
                disabled={resgatando}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 gap-2"
                size="lg"
              >
                {resgatando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    Resgatar R$50 PIX
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}

            {/* Estatisticas */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-yellow-200 dark:border-yellow-800">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {gamificacao.estrelas_disponiveis + gamificacao.estrelas_resgatadas}
                </p>
                <p className="text-xs text-muted-foreground">Total ganhas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {gamificacao.pix_pagos}
                </p>
                <p className="text-xs text-muted-foreground">PIX recebidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  R${gamificacao.total_pix_recebido}
                </p>
                <p className="text-xs text-muted-foreground">Valor total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mini ranking */}
        {ranking.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Top 5 da Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ranking.map((item, index) => {
                const isMe = item.user_id === (user as any)?.id
                return (
                  <div
                    key={item.user_id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      isMe ? "bg-yellow-50 dark:bg-yellow-950/30" : "bg-zinc-50 dark:bg-zinc-800/50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-yellow-400 text-yellow-900" :
                        index === 1 ? "bg-zinc-300 text-zinc-700" :
                        index === 2 ? "bg-amber-600 text-white" :
                        "bg-zinc-200 text-zinc-600"
                      )}
                    >
                      {index + 1}
                    </span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {item.user_nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("flex-1 text-sm font-medium truncate", isMe && "text-yellow-700 dark:text-yellow-300")}>
                      {isMe ? "Voce" : item.user_nome.split(" ")[0]}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-bold">{item.total_estrelas}</span>
                    </div>
                  </div>
                )
              })}

              {minhaPosicao && minhaPosicao > 5 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  Voce esta em #{minhaPosicao} lugar
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Historico */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historico</CardTitle>
          </CardHeader>
          <CardContent>
            {gamificacao.historico.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma estrela ainda</p>
                <p className="text-xs">Agende visitas para comecar a ganhar!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {gamificacao.historico.map((item) => {
                  const config = tipoLabels[item.tipo] || tipoLabels.estrela_agendamento
                  const Icon = config.icon

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div className={cn("p-2 rounded-full", item.tipo === "bonus_pix" ? "bg-green-100" : "bg-yellow-100")}>
                        {item.tipo.startsWith("estrela") ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Icon className={cn("h-4 w-4", config.color)} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {item.tipo === "bonus_pix" ? (
                        <Badge variant={item.resgatado ? "default" : "outline"} className="gap-1">
                          {item.resgatado ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Pago
                            </>
                          ) : (
                            "Pendente"
                          )}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <span className="font-bold">+{item.valor}</span>
                          <Star className="h-4 w-4 fill-current" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Como funciona */}
        <Card className="bg-zinc-50 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>Agende uma visita = +1 estrela</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>Feche negocio = +2 estrelas</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-500" />
              <span>5 estrelas = R$50 via PIX</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de celebracao */}
      <CelebrationModal
        open={showCelebration}
        onOpenChange={setShowCelebration}
        type="pix"
        data={celebrationData}
      />
    </AppShell>
  )
}
