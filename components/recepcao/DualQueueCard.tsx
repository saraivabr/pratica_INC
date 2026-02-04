"use client"

import { useState } from "react"
import {
  Users,
  Smartphone,
  Hash,
  Zap,
  MessageCircle,
  Coffee,
  Lock,
  Unlock,
  AlertCircle,
  Rocket,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type StatusPortaria = "disponivel" | "atendendo" | "pausado" | "feedback" | "limite" | "ausente"
type StatusLeads = "nao_qualificado" | "disponivel" | "atendendo" | "pausado" | "feedback" | "limite" | "ausente"

interface CorretorFila {
  id: string
  user_id: string
  nome: string
  avatar_url?: string
  posicao: number
  status: StatusPortaria | StatusLeads
}

interface DualQueueCardProps {
  // Dados da fila da portaria
  posicaoPortaria: number | null
  totalPortaria: number
  statusPortaria: StatusPortaria
  proximosPortaria?: CorretorFila[]
  sorteioRealizado?: boolean
  // Dados da fila de leads
  posicaoLeads: number | null
  totalLeads: number
  statusLeads: StatusLeads
  qualificado: boolean
  totalOfertas: number
  metaOfertas: number
  proximosLeads?: CorretorFila[]
  // Leads ativos
  leadsAtivos: number
  maxLeads: number
  // Callbacks
  onRegisterOferta?: () => void
  className?: string
}

const statusConfig = {
  disponivel: {
    label: "Disponivel",
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: Zap,
  },
  atendendo: {
    label: "Atendendo agora",
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: MessageCircle,
  },
  pausado: {
    label: "Intervalo",
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: Coffee,
  },
  feedback: {
    label: "Conte como foi",
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    icon: AlertCircle,
  },
  limite: {
    label: "Voce esta voando!",
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    icon: Rocket,
  },
  ausente: {
    label: "Ausente",
    color: "text-zinc-500",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    icon: Clock,
  },
  nao_qualificado: {
    label: "Nao qualificado",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: Lock,
  },
}

const statusSubtitle: Record<StatusPortaria | StatusLeads, string> = {
  disponivel: "Aguardando oportunidades",
  atendendo: "Foco total!",
  pausado: "Descanse - voce merece",
  feedback: "So 1 minuto do seu tempo",
  limite: "Finalize alguns para receber mais",
  ausente: "Voce saiu do plantao",
  nao_qualificado: "Faca ofertas para desbloquear",
}

export function DualQueueCard({
  posicaoPortaria,
  totalPortaria,
  statusPortaria,
  proximosPortaria = [],
  sorteioRealizado = false,
  posicaoLeads,
  totalLeads,
  statusLeads,
  qualificado,
  totalOfertas,
  metaOfertas,
  proximosLeads = [],
  leadsAtivos,
  maxLeads,
  onRegisterOferta,
  className,
}: DualQueueCardProps) {
  const [activeTab, setActiveTab] = useState<"portaria" | "leads">("portaria")

  const renderPositionCard = (
    posicao: number | null,
    total: number,
    status: StatusPortaria | StatusLeads,
    title: string,
    subtitle: string,
    showQualificationBlock?: boolean
  ) => {
    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <div className="space-y-4">
        {/* Posicao */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {posicao ? (
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">#{posicao}</span>
                <span className="text-lg text-muted-foreground">de {total}</span>
              </div>
            ) : (
              <p className="text-lg font-medium text-muted-foreground">-</p>
            )}
          </div>
          <div className={cn("p-3 rounded-full", config.bg)}>
            <Icon className={cn("h-6 w-6", config.color)} />
          </div>
        </div>

        {/* Status Badge */}
        <div className={cn("flex items-center gap-2 p-3 rounded-lg", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
          <div>
            <p className={cn("font-medium", config.color)}>{config.label}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {/* Leads ativos (se aplicavel) */}
        {leadsAtivos !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <span className="text-sm">Leads ativos</span>
            <span className={cn(
              "font-bold",
              leadsAtivos >= maxLeads ? "text-red-600" : "text-emerald-600"
            )}>
              {leadsAtivos}/{maxLeads}
            </span>
          </div>
        )}

        {/* Bloqueio de qualificacao */}
        {showQualificationBlock && !qualificado && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              <p className="font-medium text-red-700 dark:text-red-300">
                Voce ainda nao esta na Roleta de Leads
              </p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">
              Faca {metaOfertas} ofertas para desbloquear.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${Math.min((totalOfertas / metaOfertas) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-red-600">
                {totalOfertas}/{metaOfertas}
              </span>
            </div>
            {onRegisterOferta && (
              <button
                onClick={onRegisterOferta}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Registrar Oferta
              </button>
            )}
          </div>
        )}

        {/* Qualificado */}
        {showQualificationBlock && qualificado && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <Unlock className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Voce esta qualificado! Leads de Facebook, QR Code e ligacoes chegam automaticamente.
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderProximos = (proximos: CorretorFila[], title: string) => {
    if (proximos.length === 0) return null

    return (
      <div className="mt-4 pt-4 border-t space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
        <div className="space-y-2">
          {proximos.slice(0, 3).map((corretor, index) => (
            <div
              key={corretor.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
            >
              <span className="text-sm font-medium text-muted-foreground w-6">
                #{corretor.posicao}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={corretor.avatar_url} />
                <AvatarFallback className="text-xs">
                  {corretor.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium flex-1 truncate">{corretor.nome}</span>
              <Badge
                variant="outline"
                className={cn("text-xs", statusConfig[corretor.status]?.color)}
              >
                {statusConfig[corretor.status]?.label || corretor.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Sua Posicao
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "portaria" | "leads")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="portaria" className="gap-2">
              <Users className="h-4 w-4" />
              Portaria
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portaria" className="mt-0">
            {renderPositionCard(
              posicaoPortaria,
              totalPortaria,
              statusPortaria,
              "Sua posicao",
              sorteioRealizado
                ? statusSubtitle[statusPortaria]
                : "Aguardando sorteio do dia"
            )}
            {!sorteioRealizado && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Ordem definida pelo sorteio do dia
              </p>
            )}
            {renderProximos(proximosPortaria, "Proximos na fila")}
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            {renderPositionCard(
              qualificado ? posicaoLeads : null,
              totalLeads,
              statusLeads,
              "Sua posicao",
              statusSubtitle[statusLeads],
              true
            )}
            {qualificado && renderProximos(proximosLeads, "Proximos na fila de leads")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
