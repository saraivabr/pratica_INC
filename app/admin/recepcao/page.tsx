"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Users,
  UserCheck,
  UserMinus,
  Ban,
  QrCode,
  AlertCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

interface PlantaoHoje {
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
  is_current: boolean
}

interface Local {
  id: string
  nome: string
  endereco: string | null
  is_active: boolean
}

export default function RecepcaoPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [plantoesHoje, setPlantoesHoje] = useState<PlantaoHoje[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPlantao, setCurrentPlantao] = useState<PlantaoHoje | null>(null)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchData()
    }
  }, [hasAccess])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plantoesRes, locaisRes] = await Promise.all([
        fetch("/api/recepcao/plantoes/hoje"),
        fetch("/api/recepcao/locais"),
      ])

      const [plantoesData, locaisData] = await Promise.all([
        plantoesRes.json(),
        locaisRes.json(),
      ])

      if (plantoesData.success) {
        setPlantoesHoje(plantoesData.data)
        setCurrentPlantao(plantoesData.current)
      }

      if (locaisData.success) {
        setLocais(locaisData.data)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Erro ao carregar dados")
    }
    setLoading(false)
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
              Esta area e exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Roleta">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roleta de Leads</h1>
            <p className="text-muted-foreground">
              Controle de presenca e distribuicao de leads
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push("/admin/recepcao/locais")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Locais</p>
                <p className="text-sm text-muted-foreground">{locais.length} cadastrados</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push("/admin/recepcao/plantoes")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Plantoes</p>
                <p className="text-sm text-muted-foreground">Gerenciar turnos</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push("/admin/recepcao/locais/novo")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Plus className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Novo Local</p>
                <p className="text-sm text-muted-foreground">Cadastrar stand</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push("/admin/recepcao/plantoes/novo")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Novo Plantao</p>
                <p className="text-sm text-muted-foreground">Agendar turno</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plantões de Hoje */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Plantoes de Hoje
            </CardTitle>
            <CardDescription>
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : plantoesHoje.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold">Nenhum plantao agendado para hoje</h3>
                <p className="text-muted-foreground mb-4">
                  Crie um novo plantao para comecar
                </p>
                <Button onClick={() => router.push("/admin/recepcao/plantoes/novo")}>
                  Criar Plantao
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {plantoesHoje.map((plantao) => (
                  <div
                    key={plantao.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                      plantao.is_current && "border-primary bg-primary/5"
                    )}
                    onClick={() => router.push(`/admin/recepcao/plantoes/${plantao.id}/fila`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          plantao.is_current ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{plantao.local_nome}</p>
                            {plantao.is_current && (
                              <Badge variant="default" className="text-xs">
                                AGORA
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {plantao.hora_inicio.slice(0, 5)} - {plantao.hora_fim.slice(0, 5)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-4 w-4 text-emerald-600" />
                            <span className="font-medium">{plantao.disponiveis}</span>
                            <span className="text-muted-foreground">disp.</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{plantao.em_atendimento}</span>
                            <span className="text-muted-foreground">atend.</span>
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">{plantao.total_presentes}</span>
                            <span>total</span>
                          </span>
                        </div>

                        <Button
                          variant={plantao.is_current ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/admin/recepcao/plantoes/${plantao.id}/fila`)
                          }}
                        >
                          {plantao.is_current ? "Abrir Fila" : "Ver Fila"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
