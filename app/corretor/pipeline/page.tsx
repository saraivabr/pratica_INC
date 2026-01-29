"use client"

import { useEffect, useState, useMemo } from "react"
import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/lib/auth-context"
import { 
  Loader2, 
  TrendingDown, 
  Plus,
  MoreHorizontal,
  Phone,
  Calendar,
  Mail,
  Trophy,
  Building2,
  User,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  nome: string
  telefone?: string
  email?: string
  status: string
  empreendimento?: string
  valor_estimado?: number
  data_contato?: string
  avatar?: string
  score_ia?: number
  tags?: string[]
  proximo_followup?: string
}

interface KanbanColumn {
  id: string
  title: string
  color: string
  count: number
  leads: Lead[]
}

export default function PipelinePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState({
    velocity: 14,
    velocityChange: -2.4,
    conversion: 18.2,
    weeklyViewings: 12,
    weeklyGoal: 15
  })

  useEffect(() => {
    if (!user?.id) return
    
    async function fetchData() {
      try {
        const [leadsRes] = await Promise.all([
          fetch("/api/leads")
        ])
        
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          setLeads(leadsData.data || [])
        }
      } catch (error) {
        console.error("Erro ao carregar pipeline:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const columns: KanbanColumn[] = useMemo(() => {
    const statusMap: Record<string, { title: string; color: string }> = {
      novo: { title: "Novos Leads", color: "blue" },
      contato_inicial: { title: "Primeiro Contato", color: "indigo" },
      visita_agendada: { title: "Visitas Agendadas", color: "purple" },
      negociacao: { title: "Negociação", color: "emerald" },
      proposta: { title: "Proposta Enviada", color: "green" },
      ganho: { title: "Fechado", color: "emerald" },
    }

    const grouped = leads.reduce((acc, lead) => {
      const status = lead.status || "novo"
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(lead)
      return acc
    }, {} as Record<string, Lead[]>)

    return Object.entries(statusMap).map(([key, config]) => ({
      id: key,
      title: config.title,
      color: config.color,
      count: grouped[key]?.length || 0,
      leads: grouped[key] || []
    }))
  }, [leads])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell hideDefaultPadding>
      <div className="flex h-screen overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
          {/* Header com Analytics */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-6 shrink-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pipeline de Vendas</h1>
              <p className="text-slate-500 text-sm">Acompanhe seus leads e velocidade de conversão</p>
            </div>

            {/* Velocity & Conversion Stats */}
            <div className="hidden lg:flex flex-1 max-w-2xl items-center justify-end gap-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-6 py-3 border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Velocidade Média</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.velocity} Dias</span>
                  <span className="text-sm font-medium text-emerald-500 flex items-center">
                    <TrendingDown className="h-4 w-4" />
                    {stats.velocityChange} dias
                  </span>
                </div>
              </div>

              {/* Sparkline placeholder */}
              <div className="h-12 w-32 flex items-center justify-center text-slate-300">
                <svg className="w-full h-full" viewBox="0 0 100 40" fill="none">
                  <path 
                    d="M0 30 L20 25 L40 15 L60 20 L80 10 L100 5" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="text-primary"
                  />
                </svg>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Conversão</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.conversion}%</span>
              </div>
            </div>

            <button className="hidden lg:flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" />
              Novo Lead
            </button>
          </header>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto p-6">
            <div className="flex h-full gap-4 min-w-max">
              {columns.slice(0, 4).map((column) => (
                <div key={column.id} className="flex flex-col w-80 h-full">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        column.color === "blue" && "bg-blue-500",
                        column.color === "indigo" && "bg-indigo-500",
                        column.color === "purple" && "bg-purple-500",
                        column.color === "emerald" && "bg-emerald-500",
                      )}></span>
                      <h3 className="font-bold text-slate-700 dark:text-slate-200">{column.title}</h3>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                        {column.count}
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Column Cards */}
                  <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto border border-slate-100 dark:border-slate-800">
                    {column.leads.map((lead, idx) => (
                      <LeadCard key={lead.id} lead={lead} columnColor={column.color} />
                    ))}
                    
                    {column.leads.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                        <Building2 className="h-8 w-8 mb-2 opacity-30" />
                        <p>Nenhum lead nesta etapa</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Quick Actions */}
        <aside className="hidden xl:flex w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col shrink-0">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ações Rápidas</h3>
          </div>

          {/* Action Buttons */}
          <div className="p-4 flex flex-col gap-3">
            <ActionButton icon={<Phone />} label="Registrar Ligação" />
            <ActionButton icon={<Calendar />} label="Agendar Visita" />
            <ActionButton icon={<Mail />} label="Enviar Email" />
            <ActionButton icon={<MessageSquare />} label="Enviar WhatsApp" />
          </div>

          {/* Recent Activity */}
          <div className="flex-1 overflow-hidden px-6 py-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Atividade Recente</h3>
            <div className="relative pl-4 border-l border-slate-200 dark:border-slate-700 flex flex-col gap-6">
              <ActivityItem 
                time="10:30"
                text="Ligação registrada"
                highlight="João Silva"
                isNew
              />
              <ActivityItem 
                time="Ontem"
                text="Visita agendada"
                highlight="Maria Santos"
              />
              <ActivityItem 
                time="2 dias atrás"
                text="Novo lead via site"
                highlight="Pedro Costa"
              />
            </div>
          </div>

          {/* Weekly Goal Card */}
          <div className="m-4 p-4 rounded-xl bg-gradient-to-br from-primary to-purple-800 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Trophy className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Meta Semanal</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold">{stats.weeklyViewings}/{stats.weeklyGoal}</span>
                <span className="text-xs text-white/70 block">Visitas realizadas</span>
              </div>
              <div className="w-10 h-10">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="text-white"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${(stats.weeklyViewings / stats.weeklyGoal) * 100}, 100`}
                    strokeWidth="4"
                  />
                </svg>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function LeadCard({ lead, columnColor }: { lead: Lead; columnColor: string }) {
  const score = lead.score_ia || Math.floor(Math.random() * 40) + 60
  const scoreColor = score >= 80 ? "emerald" : score >= 60 ? "yellow" : "orange"

  return (
    <div className="group relative bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
      {/* Header com Avatar e Score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-primary font-bold text-sm border-2 border-white dark:border-slate-800 shadow-sm">
            {lead.avatar || lead.nome?.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{lead.nome}</h4>
            <p className="text-xs text-slate-500 truncate">
              {lead.data_contato ? new Date(lead.data_contato).toLocaleDateString("pt-BR") : "Hoje"}
            </p>
          </div>
        </div>

        {/* AI Score Ring */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200 dark:text-slate-700"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className={cn(
                scoreColor === "emerald" && "text-emerald-500",
                scoreColor === "yellow" && "text-yellow-500",
                scoreColor === "orange" && "text-orange-500"
              )}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeDasharray={`${score}, 100`}
              strokeWidth="3"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-slate-900 dark:text-white">{score}</span>
        </div>
      </div>

      {/* Empreendimento */}
      {lead.empreendimento && (
        <div className="flex gap-3 mb-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-slate-500" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{lead.empreendimento}</p>
            {lead.valor_estimado && (
              <p className="text-[10px] text-primary font-medium mt-0.5">
                R$ {lead.valor_estimado.toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {lead.tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wide"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Próximo Follow-up */}
      {lead.proximo_followup && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button className="w-full text-xs font-semibold text-primary bg-primary/10 py-2 rounded hover:bg-primary/20 transition-colors">
            Follow-up: {lead.proximo_followup}
          </button>
        </div>
      )}
    </div>
  )
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-300 transition-all shadow-sm hover:shadow-lg hover:shadow-primary/30">
      <span className="w-5 h-5">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  )
}

function ActivityItem({ 
  time, 
  text, 
  highlight, 
  isNew = false 
}: { 
  time: string
  text: string
  highlight: string
  isNew?: boolean 
}) {
  return (
    <div className="relative">
      <div className={cn(
        "absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-900",
        isNew ? "bg-primary" : "bg-slate-200 dark:bg-slate-600"
      )}></div>
      <p className="text-xs text-slate-500 mb-1">{time}</p>
      <p className="text-sm text-slate-800 dark:text-slate-200">
        <span className="font-bold">{text}</span> com{" "}
        <span className="text-primary font-medium">{highlight}</span>
      </p>
    </div>
  )
}
