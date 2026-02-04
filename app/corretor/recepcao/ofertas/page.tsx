"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Phone,
  MessageSquare,
  User,
  QrCode,
  Plus,
  Loader2,
  ArrowLeft,
  Calendar,
  Building2,
  Clock,
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
import { OfertaQuickForm } from "@/components/recepcao"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface Oferta {
  id: string
  empreendimento_id: number | null
  empreendimento_nome: string
  lead_origem: string
  lead_telefone: string | null
  lead_nome: string | null
  created_at: string
  plantao_data: string
  local_nome: string
}

const origemConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ligacao: { label: "Ligacao", icon: Phone, color: "bg-blue-100 text-blue-700" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-green-100 text-green-700" },
  presencial: { label: "Presencial", icon: User, color: "bg-purple-100 text-purple-700" },
  facebook: { label: "Facebook", icon: () => <span className="text-xs font-bold">f</span>, color: "bg-blue-100 text-blue-800" },
  instagram: { label: "Instagram", icon: () => <span className="text-xs font-bold">IG</span>, color: "bg-pink-100 text-pink-700" },
  qr_terreno: { label: "QR Terreno", icon: QrCode, color: "bg-amber-100 text-amber-700" },
}

export default function OfertasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [plantaoFilter, setPlantaoFilter] = useState<string>("all")

  // Modal
  const [ofertaFormOpen, setOfertaFormOpen] = useState(false)
  const [ofertaLoading, setOfertaLoading] = useState(false)

  const plantaoId = searchParams.get("plantao_id")

  const fetchOfertas = useCallback(async () => {
    try {
      let url = "/api/recepcao/ofertas?limit=50"
      if (plantaoId) {
        url += `&plantao_id=${plantaoId}`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setOfertas(result.data)
        setTotal(result.total)
      }
    } catch (error) {
      console.error("Error fetching ofertas:", error)
    } finally {
      setLoading(false)
    }
  }, [plantaoId])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    if (isAuthenticated) {
      fetchOfertas()
    }
  }, [isAuthenticated, authLoading, router, fetchOfertas])

  const handleRegistrarOferta = async (data: {
    empreendimento_id: number | null
    empreendimento_nome: string
    lead_origem: string
    lead_telefone?: string
    lead_nome?: string
  }) => {
    setOfertaLoading(true)
    try {
      // Precisamos pegar o plantao_id do contexto
      // Por enquanto, usar o filtro atual ou buscar o plantao do dia
      const response = await fetch("/api/recepcao/plantoes/hoje")
      const plantoesResult = await response.json()

      if (!plantoesResult.success || plantoesResult.data.length === 0) {
        toast.error("Nenhum plantao ativo hoje")
        setOfertaLoading(false)
        return
      }

      const currentPlantao = plantoesResult.current || plantoesResult.data[0]

      const ofertaResponse = await fetch("/api/recepcao/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantao_id: plantaoId || currentPlantao.id,
          ...data,
        }),
      })

      const result = await ofertaResponse.json()

      if (result.success) {
        toast.success(result.message)
        setOfertaFormOpen(false)
        await fetchOfertas()
      } else {
        toast.error(result.error || "Erro ao registrar oferta")
      }
    } catch (error) {
      toast.error("Erro ao registrar oferta")
    }
    setOfertaLoading(false)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Agrupar ofertas por data
  const ofertasPorData = ofertas.reduce((acc, oferta) => {
    const data = format(new Date(oferta.plantao_data), "yyyy-MM-dd")
    if (!acc[data]) {
      acc[data] = []
    }
    acc[data].push(oferta)
    return acc
  }, {} as Record<string, Oferta[]>)

  const datasOrdenadas = Object.keys(ofertasPorData).sort((a, b) => b.localeCompare(a))

  return (
    <AppShell title="Minhas Ofertas">
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
            <h1 className="text-xl font-bold">Minhas Ofertas</h1>
            <p className="text-sm text-muted-foreground">
              {total} oferta{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Contador destaque */}
        <Card className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white border-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total hoje</p>
                <p className="text-4xl font-bold">
                  {ofertas.filter(o =>
                    format(new Date(o.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  ).length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Meta</p>
                <p className="text-2xl font-bold">30</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de ofertas */}
        {datasOrdenadas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Phone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-semibold">Nenhuma oferta registrada</h3>
              <p className="text-sm text-muted-foreground">
                Comece registrando suas ligacoes e contatos
              </p>
              <Button
                className="mt-4"
                onClick={() => setOfertaFormOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primeira Oferta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {datasOrdenadas.map((data) => {
              const ofertasDoDia = ofertasPorData[data]
              const isHoje = data === format(new Date(), "yyyy-MM-dd")

              return (
                <div key={data}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {isHoje ? "Hoje" : format(new Date(data), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ofertasDoDia.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {ofertasDoDia.map((oferta) => {
                      const config = origemConfig[oferta.lead_origem] || origemConfig.presencial
                      const Icon = config.icon

                      return (
                        <Card key={oferta.id} className="overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-lg", config.color)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-sm truncate">
                                    {oferta.empreendimento_nome}
                                  </span>
                                </div>
                                {oferta.lead_nome && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {oferta.lead_nome}
                                  </p>
                                )}
                                {oferta.lead_telefone && (
                                  <p className="text-xs text-muted-foreground">
                                    {oferta.lead_telefone}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(oferta.created_at), "HH:mm")}
                                </div>
                                <Badge variant="outline" className={cn("text-xs mt-1", config.color)}>
                                  {config.label}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setOfertaFormOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Modal */}
      <OfertaQuickForm
        open={ofertaFormOpen}
        onOpenChange={setOfertaFormOpen}
        onSubmit={handleRegistrarOferta}
        isLoading={ofertaLoading}
      />
    </AppShell>
  )
}
