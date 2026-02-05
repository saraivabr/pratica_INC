"use client"

import { useMemo } from "react"
import {
  Building2,
  Users,
  BarChart3,
  Home,
  Phone,
  TrendingUp,
  MapPin,
  Layers,
  DoorOpen,
  Car,
  Ruler,
  BadgeDollarSign,
  ChevronRight,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { empreendimentos as empreendimentosData } from "@/lib/empreendimentos-data"

// ============================================================================
// Types
// ============================================================================

export interface DataBlock {
  toolName: string
  payload: any
}

// ============================================================================
// Main renderer — picks the right visual based on payload.tipo
// ============================================================================

export function DataRenderer({ block }: { block: DataBlock }) {
  const { payload } = block
  if (!payload || payload.error) return null

  switch (payload.tipo) {
    case "empreendimentos":
      return <EmpreendimentosCarousel dados={payload.dados} />
    case "unidades":
      return <UnidadesTable dados={payload.dados} total={payload.total} mostrando={payload.mostrando} />
    case "resumo_unidades":
      return <ResumoUnidadesCards dados={payload.dados} />
    case "leads":
      return <LeadsTable dados={payload.dados} total={payload.total} mostrando={payload.mostrando} />
    case "contagem_leads":
      return <ContagemLeadsBars dados={payload.dados} />
    case "reservas":
      return <ReservasTable dados={payload.dados} />
    case "estatisticas":
      return <EstatisticasDashboard data={payload} />
    default:
      return null
  }
}

// ============================================================================
// Helper: format currency
// ============================================================================

function fmtCurrency(v: number | string | null | undefined): string {
  if (v == null) return "—"
  const n = typeof v === "string" ? parseFloat(v) : v
  if (isNaN(n) || n === 0) return "Consultar"
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function fmtPhone(t: string | null | undefined): string {
  if (!t) return "—"
  const clean = t.replace(/\D/g, "")
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  return t
}

// ============================================================================
// Empreendimentos Carousel
// ============================================================================

function EmpreendimentosCarousel({ dados }: { dados: any[] }) {
  if (!dados?.length) return null

  // Match images from static data
  const imageMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const e of empreendimentosData) {
      map[e.nome.toLowerCase()] = e.imagem
    }
    return map
  }, [])

  return (
    <div className="my-3">
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
        {dados.map((emp, i) => {
          const img = imageMap[emp.nome?.toLowerCase()] || null
          return (
            <div
              key={i}
              className="snap-start shrink-0 w-[260px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="h-32 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 relative overflow-hidden">
                {img ? (
                  <img src={img} alt={emp.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Building2 className="h-10 w-10 text-violet-300 dark:text-violet-700" />
                  </div>
                )}
                {emp.unidades_disponiveis != null && (
                  <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-sm">
                    {emp.unidades_disponiveis} disponíveis
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-3 space-y-1.5">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{emp.nome}</h4>
                {emp.cidade && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <MapPin className="h-3 w-3" />
                    {emp.cidade}{emp.uf ? `/${emp.uf}` : ""}
                  </div>
                )}
                {emp.metragem && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <Ruler className="h-3 w-3" />
                    {emp.metragem}
                  </div>
                )}
                {emp.dormitorios && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <DoorOpen className="h-3 w-3" />
                    {emp.dormitorios} dorm.
                  </div>
                )}
                {emp.faixa_preco && (
                  <p className="text-[12px] font-semibold text-violet-600 dark:text-violet-400">{emp.faixa_preco}</p>
                )}
                {emp.tipos_unidade && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-1">{emp.tipos_unidade}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Unidades Table (Espelho de Vendas when bloco/andar data exists)
// ============================================================================

const SITUACAO_COLORS: Record<string, string> = {
  "Disponível": "bg-emerald-500",
  "Reservada": "bg-amber-500",
  "Vendida": "bg-red-500",
  "Bloqueada": "bg-zinc-400",
  "Em Análise": "bg-blue-500",
}

const SITUACAO_BG: Record<string, string> = {
  "Disponível": "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  "Reservada": "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "Vendida": "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  "Bloqueada": "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  "Em Análise": "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
}

function UnidadesTable({ dados, total, mostrando }: { dados: any[]; total?: number; mostrando?: number }) {
  if (!dados?.length) return null

  // Check if we have enough bloco/andar data for an espelho grid
  const hasGrid = dados.filter((d) => d.bloco && d.andar != null).length > dados.length * 0.5

  if (hasGrid) return <EspelhoGrid dados={dados} total={total} mostrando={mostrando} />

  return (
    <div className="my-3">
      {total != null && mostrando != null && total > mostrando && (
        <p className="text-[11px] text-zinc-400 mb-1.5">Mostrando {mostrando} de {total} unidades</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
        <table className="w-full text-[12px]">
          <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Unidade</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Tipo</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Área</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Dorms</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Valor</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {dados.map((u, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{u.unidade}</td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{u.tipo || "—"}</td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{u.area_privativa_m2 ? `${u.area_privativa_m2}m²` : "—"}</td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{u.dormitorios || "—"}</td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{fmtCurrency(u.valor)}</td>
                <td className="px-3 py-2">
                  <SituacaoBadge situacao={u.situacao} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Espelho de Vendas Grid
// ============================================================================

function EspelhoGrid({ dados, total, mostrando }: { dados: any[]; total?: number; mostrando?: number }) {
  // Group by bloco -> andar
  const blocos = useMemo(() => {
    const map: Record<string, Record<number, any[]>> = {}
    for (const u of dados) {
      const b = u.bloco || "Único"
      const a = u.andar ?? 0
      if (!map[b]) map[b] = {}
      if (!map[b][a]) map[b][a] = []
      map[b][a].push(u)
    }
    return map
  }, [dados])

  return (
    <div className="my-3 space-y-3">
      {total != null && mostrando != null && total > mostrando && (
        <p className="text-[11px] text-zinc-400">Mostrando {mostrando} de {total} unidades</p>
      )}

      {Object.entries(blocos).map(([bloco, andares]) => {
        const sortedAndares = Object.entries(andares)
          .map(([a, units]) => ({ andar: Number(a), units }))
          .sort((a, b) => b.andar - a.andar)

        return (
          <div key={bloco} className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-800/80 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Bloco {bloco}
              </span>
            </div>
            <div className="p-2 space-y-1">
              {sortedAndares.map(({ andar, units }) => (
                <div key={andar} className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-8 text-right shrink-0">{andar}º</span>
                  <div className="flex gap-1 flex-wrap">
                    {units.map((u: any, j: number) => (
                      <div
                        key={j}
                        className={cn(
                          "group relative w-10 h-8 rounded flex items-center justify-center text-[9px] font-medium text-white cursor-default transition-transform hover:scale-110",
                          SITUACAO_COLORS[u.situacao] || "bg-zinc-400"
                        )}
                        title={`${u.unidade} — ${u.tipo || ""} ${u.area_privativa_m2 ? u.area_privativa_m2 + "m²" : ""} ${fmtCurrency(u.valor)}`}
                      >
                        {u.unidade?.replace(/[^\d]/g, "").slice(-3) || "?"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex gap-3 px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              {Object.entries(SITUACAO_COLORS).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1">
                  <span className={cn("w-2.5 h-2.5 rounded-sm", color)} />
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Resumo Unidades Cards
// ============================================================================

function ResumoUnidadesCards({ dados }: { dados: any[] }) {
  if (!dados?.length) return null

  // Group by empreendimento
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const d of dados) {
      const key = d.empreendimento_nome || "Sem empreendimento"
      if (!map[key]) map[key] = []
      map[key].push(d)
    }
    return map
  }, [dados])

  return (
    <div className="my-3 space-y-3">
      {Object.entries(grouped).map(([emp, items]) => (
        <div key={emp} className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
            <h4 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{emp}</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
            {items.map((item: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  SITUACAO_BG[item.situacao] || "bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                )}
              >
                <p className="text-[18px] font-bold">{item.quantidade}</p>
                <p className="text-[10px] font-medium">{item.tipo_unidade || "Unidades"}</p>
                <p className="text-[10px] opacity-75">{item.situacao}</p>
                {item.valor_min && (
                  <p className="text-[9px] mt-1 opacity-60">
                    {fmtCurrency(item.valor_min)} — {fmtCurrency(item.valor_max)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Leads Table
// ============================================================================

function LeadsTable({ dados, total, mostrando }: { dados: any[]; total?: number; mostrando?: number }) {
  if (!dados?.length) return null

  return (
    <div className="my-3">
      {total != null && mostrando != null && total > mostrando && (
        <p className="text-[11px] text-zinc-400 mb-1.5">Mostrando {mostrando} de {total} leads</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
        <table className="w-full text-[12px]">
          <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Nome</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Telefone</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Situação</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Score</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Empreend.</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Corretor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {dados.map((lead, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{lead.nome || "—"}</td>
                <td className="px-3 py-2">
                  {lead.telefone ? (
                    <a href={`tel:${lead.telefone}`} className="text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap">
                      {fmtPhone(lead.telefone)}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-3 py-2"><LeadSituacaoBadge situacao={lead.situacao} /></td>
                <td className="px-3 py-2"><ScoreBar score={lead.score} /></td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 max-w-[120px] truncate">{lead.empreendimentos || "—"}</td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{lead.corretor || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Contagem Leads (Horizontal Bars)
// ============================================================================

const LEAD_COLORS: Record<string, string> = {
  "Em Atendimento": "bg-blue-500",
  "Aguardando Atendimento": "bg-amber-500",
  "Visita Agendada": "bg-indigo-500",
  "Visita Realizada": "bg-purple-500",
  "Simulação": "bg-cyan-500",
  "Com Reserva": "bg-emerald-500",
  "Em Análise de Crédito": "bg-teal-500",
  "Montagem Pasta": "bg-lime-600",
  "Venda Realizada": "bg-green-600",
  "Perdido": "bg-red-500",
  "Aguardando Atendimento Corretor": "bg-orange-500",
}

function ContagemLeadsBars({ dados }: { dados: any[] }) {
  if (!dados?.length) return null

  const maxVal = Math.max(...dados.map((d: any) => Number(d.total) || 0))
  const totalLeads = dados.reduce((sum: number, d: any) => sum + (Number(d.total) || 0), 0)

  return (
    <div className="my-3 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Leads por Situação</span>
        <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">{totalLeads} total</span>
      </div>
      <div className="p-3 space-y-2">
        {dados.map((d: any, i: number) => {
          const pct = maxVal > 0 ? (Number(d.total) / maxVal) * 100 : 0
          const color = LEAD_COLORS[d.situacao_nome] || "bg-zinc-400"
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 w-[180px] truncate shrink-0">{d.situacao_nome}</span>
              <div className="flex-1 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", color)}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 w-10 text-right">{d.total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Reservas Table
// ============================================================================

const RESERVA_STATUS_COLORS: Record<string, string> = {
  "Ativa": "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  "Cancelada": "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  "Vencida": "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  "Vendida": "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
}

function ReservasTable({ dados }: { dados: any[] }) {
  if (!dados?.length) return null

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
      <table className="w-full text-[12px]">
        <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Reserva</th>
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Empreendimento</th>
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Unidade</th>
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Cliente</th>
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Valor</th>
            <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {dados.map((r: any, i: number) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
              <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{r.numero_reserva || "—"}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{r.empreendimento_nome || "—"}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{r.unidade_nome || "—"}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{r.cliente_principal_nome || "—"}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{fmtCurrency(r.valor_venda || r.valor_reserva)}</td>
              <td className="px-3 py-2">
                <span className={cn(
                  "inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium",
                  RESERVA_STATUS_COLORS[r.status] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                )}>
                  {r.status || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// Estatísticas Dashboard
// ============================================================================

function EstatisticasDashboard({ data }: { data: any }) {
  const cards = [
    { label: "Total de Leads", value: data.total_leads, icon: Users, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" },
    { label: "Empreendimentos Ativos", value: data.empreendimentos_ativos, icon: Building2, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20" },
    { label: "Reservas", value: data.total_reservas, icon: Home, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" },
    { label: "Vendas Realizadas", value: data.vendas_realizadas, icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" },
  ]

  return (
    <div className="my-3 space-y-3">
      {/* Main stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", c.color)}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="text-[22px] font-bold text-zinc-900 dark:text-zinc-100">{c.value ?? "—"}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Leads por situação */}
      {data.leads_por_situacao?.length > 0 && (
        <ContagemLeadsBars dados={data.leads_por_situacao} />
      )}

      {/* Unidades por empreendimento */}
      {data.unidades_por_empreendimento?.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Unidades por Empreendimento</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.unidades_por_empreendimento.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-[12px]">
                <span className="text-zinc-700 dark:text-zinc-300 truncate mr-3">{u.empreendimento_nome}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{u.disponiveis} disp.</span>
                  <span className="text-red-500 dark:text-red-400">{u.vendidas} vend.</span>
                  <span className="text-zinc-400">{u.total} total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Shared Badge Components
// ============================================================================

function SituacaoBadge({ situacao }: { situacao: string }) {
  const color = SITUACAO_COLORS[situacao] || "bg-zinc-400"
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-[11px] text-zinc-600 dark:text-zinc-400">{situacao || "—"}</span>
    </span>
  )
}

const LEAD_SITUACAO_COLORS: Record<string, string> = {
  "Em Atendimento": "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  "Aguardando Atendimento": "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  "Visita Agendada": "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400",
  "Visita Realizada": "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  "Simulação": "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400",
  "Com Reserva": "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  "Venda Realizada": "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  "Perdido": "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
}

function LeadSituacaoBadge({ situacao }: { situacao: string }) {
  if (!situacao) return <span className="text-[11px] text-zinc-400">—</span>
  const color = LEAD_SITUACAO_COLORS[situacao] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", color)}>
      {situacao}
    </span>
  )
}

function ScoreBar({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-[11px] text-zinc-400">—</span>
  const pct = Math.min(Math.max(Number(score), 0), 100)
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{score}</span>
    </div>
  )
}
