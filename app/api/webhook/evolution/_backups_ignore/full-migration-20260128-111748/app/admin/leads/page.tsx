"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Clock4,
  Eye,
  Filter,
  Kanban,
  LayoutList,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { useLeads } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { LeadDetailModal } from "@/components/lead/LeadDetailModal"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { KanbanStage, KanbanLead } from "@/components/crm/types"

type LeadStatus = "ativo" | "irregular" | "perdido"
type ViewMode = "list" | "kanban"

export default function AdminLeadsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({})
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const { leads, total, loading, error, refetch } = useLeads(200)

  usePageTracking("admin-leads")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads
    const search = searchTerm.toLowerCase()
    return leads.filter((lead: any) => {
      const corretorNome = typeof lead.corretor === "object" ? lead.corretor?.nome : lead.corretor
      return (
        (lead.nome && String(lead.nome).toLowerCase().includes(search)) ||
        (lead.email && String(lead.email).toLowerCase().includes(search)) ||
        (lead.telefone && String(lead.telefone).toLowerCase().includes(search)) ||
        (corretorNome && String(corretorNome).toLowerCase().includes(search))
      )
    })
  }, [leads, searchTerm])

  const leadsWithStatus = useMemo(() => {
    const now = Date.now()
    return filteredLeads.map((lead: any) => {
      const interacoes = lead.interacao || lead.interacoes || []
      const lastInteraction = interacoes[interacoes.length - 1]
      const lastDate = lastInteraction?.data_cad ? Date.parse(lastInteraction.data_cad) : 0
      const daysSince = lastDate ? Math.round((now - lastDate) / (1000 * 60 * 60 * 24)) : null

      let status: LeadStatus = "ativo"
      const situacaoLower = (lead.situacao || "").toLowerCase()
      if (situacaoLower.includes("perd")) {
        status = "perdido"
      } else if (daysSince !== null && daysSince > 7) {
        status = "irregular"
      }

      return { ...lead, status, lastInteraction, daysSince }
    })
  }, [filteredLeads])

  const grouped = useMemo(() => {
    const buckets: Record<LeadStatus, typeof leadsWithStatus> = {
      ativo: [],
      irregular: [],
      perdido: [],
    }
    leadsWithStatus.forEach((lead) => {
      buckets[lead.status as LeadStatus].push(lead)
    })
    return buckets
  }, [leadsWithStatus])

  // Kanban stages and leads conversion
  const kanbanStages: KanbanStage[] = useMemo(() => [
    { id: "ativo", name: "Em Andamento", color: "#22C55E", position: 0 },
    { id: "irregular", name: "Irregulares", color: "#F59E0B", position: 1 },
    { id: "perdido", name: "Perdidos", color: "#EF4444", position: 2 },
  ], [])

  const kanbanLeads: KanbanLead[] = useMemo(() => {
    return leadsWithStatus.map((lead: any) => ({
      id: lead.id || lead.idlead?.toString() || Math.random().toString(),
      name: lead.nome || "Sem nome",
      email: lead.email,
      phone: lead.telefone || lead.celular,
      stage_id: lead.status,
      score: lead.score,
      temperature: lead.daysSince === null ? "warm" : lead.daysSince <= 3 ? "hot" : lead.daysSince <= 7 ? "warm" : "cold",
      last_interaction_at: lead.lastInteraction?.data_cad,
      tags: [lead.origem, lead.empreendimento?.nome].filter(Boolean) as string[],
    }))
  }, [leadsWithStatus])

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
              Esta área é exclusiva para gerentes e administradores.
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

  const handleAction = async (lead: any, dryRun: boolean) => {
    if (!user?.id) {
      setActionStatus((prev) => ({ ...prev, [lead.id]: "Faça login" }))
      return
    }
    setActionStatus((prev) => ({ ...prev, [lead.id]: dryRun ? "Simulando..." : "Enviando..." }))
    try {
      const url = `/api/lead-recovery?userId=${user.id}&limit=1&leadId=${lead.id}${
        dryRun ? "&dryRun=true" : ""
      }`
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()
      const result = data.runs?.[0]?.results?.[0]
      if (!res.ok || !result) {
        throw new Error(data.error || "Falha na ação")
      }
      setActionStatus((prev) => ({
        ...prev,
        [lead.id]: dryRun
          ? "Simulação pronta (sem envio)"
          : result.status === "sent"
          ? "Enviado"
          : result.reason || "Processado",
      }))
    } catch (error) {
      setActionStatus((prev) => ({
        ...prev,
        [lead.id]: error instanceof Error ? error.message : "Erro",
      }))
    }
  }

  const statusMeta: Record<LeadStatus, { title: string; desc: string; color: string }> = {
    ativo: { title: "Em andamento", desc: "Leads ativos ou recentes", color: "from-primary/20" },
    irregular: { title: "Irregulares", desc: "Sem interação há +7 dias", color: "from-amber-300/30" },
    perdido: { title: "Perdidos", desc: "Marcados como perdidos no CVCRM", color: "from-red-400/30" },
  }

  return (
    <AppShell title="Leads">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              {loading ? "Carregando..." : `${total || leads.length} leads no total`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex border rounded-lg p-1 bg-muted/30">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
                Lista
              </Button>
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setViewMode("kanban")}
              >
                <Kanban className="h-4 w-4" />
                Kanban
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Filter className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Conectado ao CVCRM
          </div>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-4">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total", value: leadsWithStatus.length, icon: Workflow },
              { label: "Ativos", value: grouped.ativo.length, icon: CheckCircle2 },
              { label: "Irregulares", value: grouped.irregular.length, icon: Clock4 },
              { label: "Perdidos", value: grouped.perdido.length, icon: MessageCircle },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/70 bg-background/80 p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Erro ao carregar leads</p>
              <p className="text-sm text-muted-foreground">{error?.message}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : viewMode === "kanban" ? (
          <div className="h-[calc(100vh-350px)] min-h-[500px]">
            <KanbanBoard
              initialStages={kanbanStages}
              initialLeads={kanbanLeads}
              onRefresh={refetch}
            />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {(Object.keys(grouped) as LeadStatus[]).map((status) => (
              <div
                key={status}
                className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 space-y-3"
              >
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {statusMeta[status].title}
                  </div>
                  <p className="text-sm text-muted-foreground">{statusMeta[status].desc}</p>
                </div>
                <div className="h-1 rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                {grouped[status].length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum lead aqui.</div>
                ) : (
                  <div className="space-y-3">
                    {grouped[status].map((lead: any) => (
                      <div
                        key={lead.id}
                        className="rounded-xl border border-border/60 bg-background/80 p-3 hover:-translate-y-[2px] transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold leading-tight">{lead.nome || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">{lead.telefone || "-"}</p>
                          </div>
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {(lead.origem || lead.midia || statusMeta[status].title).toString().slice(0, 18)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          {typeof lead.corretor === "object" ? lead.corretor?.nome : lead.corretor ? (
                            <p className="truncate">Corretor: {lead.corretor?.nome || lead.corretor}</p>
                          ) : null}
                          {lead.empreendimento && typeof lead.empreendimento === "object" && lead.empreendimento.nome && (
                            <p className="truncate">Interesse: {lead.empreendimento.nome}</p>
                          )}
                          {lead.lastInteraction?.descricao && (
                            <p className="line-clamp-2">Última: {lead.lastInteraction.descricao}</p>
                          )}
                          {lead.daysSince !== null && lead.daysSince !== undefined && (
                            <p className="text-xs">Sem interação há {lead.daysSince} dia(s)</p>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-center"
                            onClick={() => {
                              setSelectedLead(lead)
                              setModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-center"
                            onClick={() => handleAction(lead, true)}
                          >
                            <Loader2
                              className={cn(
                                "h-4 w-4 mr-2",
                                actionStatus[lead.id]?.includes("Simulando") && "animate-spin"
                              )}
                            />
                            Simular resposta
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="justify-center"
                            onClick={() => handleAction(lead, false)}
                          >
                            Enviar pelo Whats
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                        {actionStatus[lead.id] && (
                          <p className="mt-2 text-xs text-muted-foreground">{actionStatus[lead.id]}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {lead.email && (
                            <a className="flex items-center gap-1" href={`mailto:${lead.email}`}>
                              <Mail className="h-3 w-3" /> Email
                            </a>
                          )}
                          {(lead.telefone || lead.celular) && (
                            <a
                              className="flex items-center gap-1"
                              href={`https://wa.me/55${(lead.telefone || lead.celular).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Phone className="h-3 w-3" /> Whats
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
