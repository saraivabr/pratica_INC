"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  DollarSign,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { LeadDetailModal } from "@/components/lead/LeadDetailModal"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { KanbanStage, KanbanLead } from "@/components/crm/types"

interface PipelineStats {
  totalLeads: number
  totalValor: number
  vendasRealizadas: number
  perdidos: number
  conversionRate: number
  emAndamento: number
}

const formatCurrency = (value: number) => {
  if (!value || !isFinite(value) || isNaN(value)) return "R$ 0"
  if (value >= 1000000000) return `R$ ${(value / 1000000000).toFixed(1)}B`
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
}

export default function AdminLeadsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [stages, setStages] = useState<KanbanStage[]>([])
  const [allLeads, setAllLeads] = useState<KanbanLead[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  usePageTracking("admin-leads")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const fetchPipeline = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/crm/pipeline-cvcrm?limit=1000")
      if (!res.ok) throw new Error("Erro ao carregar dados")
      const data = await res.json()

      // Map stages to KanbanStage format
      const pipelineStages: KanbanStage[] = (data.stages || [])
        .filter((s: any) => !s.isLostStage) // hide lost from main board
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          position: s.position,
        }))

      // Map leads to KanbanLead format
      const pipelineLeads: KanbanLead[] = (data.leads || [])
        .filter((l: any) => l.stage_id !== "perdido") // hide lost from main board
        .map((l: any) => ({
          id: String(l.id),
          name: l.name || "Sem nome",
          email: l.email || undefined,
          phone: l.phone || undefined,
          stage_id: l.stage_id,
          score: l.score || 0,
          temperature: l.temperature || "cold",
          last_interaction_at: l.last_interaction_at || undefined,
          tags: l.tags || [],
          corretor_nome: l.corretor || undefined,
          empreendimento: l.empreendimento || undefined,
          origem: l.source || undefined,
          valor_negocio: l.valor_negocio || 0,
          renda_familiar: l.renda_familiar || 0,
          simulacoes: l.simulacoes || 0,
          reservas: l.reservas || 0,
          possibilidade_venda: l.possibilidade_venda || 0,
        }))

      setStages(pipelineStages)
      setAllLeads(pipelineLeads)
      setStats(data.stats || null)
    } catch (err) {
      console.error("Error fetching pipeline:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isAuthenticated && hasAccess) {
      fetchPipeline()
    }
  }, [isAuthenticated, hasAccess])

  // Filter leads by search
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return allLeads
    const search = searchTerm.toLowerCase()
    return allLeads.filter((lead) =>
      lead.name.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.includes(search) ||
      lead.corretor_nome?.toLowerCase().includes(search) ||
      lead.empreendimento?.toLowerCase().includes(search)
    )
  }, [allLeads, searchTerm])

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statCards = stats ? [
    { label: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-blue-600", bg: "from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40" },
    { label: "Valor Total", value: formatCurrency(stats.totalValor), icon: DollarSign, color: "text-purple-600", bg: "from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40" },
    { label: "Vendas", value: stats.vendasRealizadas, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40" },
    { label: "Em Andamento", value: stats.emAndamento, icon: TrendingUp, color: "text-orange-600", bg: "from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40" },
    { label: "Perdidos", value: stats.perdidos, icon: XCircle, color: "text-red-600", bg: "from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40" },
    { label: "Conversao", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-teal-600", bg: "from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40" },
  ] : []

  return (
    <AppShell title="Leads">
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b bg-background/80 backdrop-blur-sm space-y-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
              <p className="text-sm text-muted-foreground">
                Funil de vendas em tempo real
                {stats ? ` • ${stats.totalLeads} leads` : ""}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lead, corretor, empreendimento..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchPipeline}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {statCards.map((item, i) => (
                <Card key={i} className={cn("border-0 bg-gradient-to-br", item.bg)}>
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                      <span className="text-[10px] text-muted-foreground truncate">{item.label}</span>
                    </div>
                    <p className={cn("text-lg font-bold leading-tight", item.color)}>
                      {item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Erro ao carregar leads</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-full">
              <KanbanBoard
                initialStages={stages}
                initialLeads={filteredLeads}
                onRefresh={fetchPipeline}
              />
            </div>
          )}
        </div>
      </div>

      <LeadDetailModal
        lead={selectedLead}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedLead(null)
        }}
      />
    </AppShell>
  )
}
