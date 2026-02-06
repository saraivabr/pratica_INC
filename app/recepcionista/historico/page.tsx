"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Clock,
  Calendar,
  ClipboardList,
  User,
  Phone,
  Filter,
  Loader2,
  UserCircle,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
interface Lead {
  id: string
  nome: string
  whatsapp: string
  corretor_id?: string
  corretor_nome?: string
  tipo_visita: string
  fonte: string
  observacoes?: string
  created_at: string
  registrado_por_nome?: string
}

interface Stats {
  total: number
  primeira_vez: number
  indicacao: number
  retorno: number
  por_fonte: Array<{ fonte: string; total: string }>
  por_corretor: Array<{ corretor_id: string; corretor_nome: string; total: string }>
}

// ────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────
const TIPOS_VISITA = [
  { value: "primeira_vez", label: "1a Vez", color: "emerald" },
  { value: "indicacao", label: "Indicacao", color: "blue" },
  { value: "retorno", label: "Retorno", color: "amber" },
] as const

const FONTES = [
  { value: "presencial", label: "Presencial", color: "emerald" },
  { value: "telefone", label: "Telefone", color: "blue" },
  { value: "whatsapp", label: "WhatsApp", color: "green" },
  { value: "instagram", label: "Instagram", color: "pink" },
  { value: "facebook", label: "Facebook", color: "indigo" },
  { value: "site", label: "Site", color: "violet" },
  { value: "indicacao", label: "Indicacao", color: "amber" },
  { value: "outros", label: "Outros", color: "zinc" },
] as const

const DATE_FILTERS = [
  { value: "today", label: "Hoje", days: 0 },
  { value: "7days", label: "Ultimos 7 dias", days: 7 },
  { value: "30days", label: "Ultimos 30 dias", days: 30 },
] as const

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  green: { bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-300", border: "border-pink-200 dark:border-pink-800" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  zinc: { bg: "bg-zinc-50 dark:bg-zinc-800/40", text: "text-zinc-700 dark:text-zinc-300", border: "border-zinc-200 dark:border-zinc-700" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
}

// ────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return {
    date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    full: date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  }
}

function getDateForFilter(filterValue: string): string {
  const filter = DATE_FILTERS.find(f => f.value === filterValue)
  if (!filter) return new Date().toISOString().split('T')[0]

  const date = new Date()
  date.setDate(date.getDate() - filter.days)
  return date.toISOString().split('T')[0]
}

// ────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────
export default function HistoricoPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    primeira_vez: 0,
    indicacao: 0,
    retorno: 0,
    por_fonte: [],
    por_corretor: []
  })
  const [dateFilter, setDateFilter] = useState("today")
  const [loading, setLoading] = useState(true)

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      try {
        const date = getDateForFilter(dateFilter)
        const res = await fetch(`/api/recepcionista/leads?date=${date}&limit=200`)
        const data = await res.json()

        if (data.success) {
          setLeads(data.data)
          setStats(data.stats)
        }
      } catch (error) {
        console.error("Erro ao buscar historico:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [dateFilter])

  const filterLabel = DATE_FILTERS.find(f => f.value === dateFilter)?.label || "Hoje"

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/recepcionista")}
            className="mb-3 -ml-2 text-white hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Historico de Leads</h1>
              <p className="text-emerald-100 text-sm mt-0.5">{filterLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-zinc-500" />
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium",
                dateFilter === filter.value
                  ? "bg-emerald-500 text-white border-transparent shadow-md"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Total</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">1a Vez</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.primeira_vez}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Indicacao</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.indicacao}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Retorno</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.retorno}</p>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-zinc-400" />
            Leads cadastrados
            {leads.length > 0 && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                {leads.length}
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Carregando...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <ClipboardList className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Nenhum lead encontrado</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Tente outro periodo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Cliente
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                    Telefone
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Tipo
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                    Fonte
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">
                    Corretor
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Data/Hora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {leads.map((lead) => {
                  const tipoInfo = TIPOS_VISITA.find((t) => t.value === lead.tipo_visita)
                  const fonteInfo = FONTES.find((f) => f.value === lead.fonte)
                  const tipoColors = tipoInfo ? colorMap[tipoInfo.color] : colorMap.zinc
                  const fonteColors = fonteInfo ? colorMap[fonteInfo.color] : colorMap.zinc
                  const dateTime = formatDateTime(lead.created_at)

                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Cliente */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                            {lead.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {lead.nome}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate sm:hidden">
                              {lead.whatsapp}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <Phone className="h-3.5 w-3.5 text-zinc-400" />
                          {lead.whatsapp}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          "inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full",
                          tipoColors.bg, tipoColors.text
                        )}>
                          {tipoInfo?.label || lead.tipo_visita}
                        </span>
                      </td>

                      {/* Fonte */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className={cn(
                          "inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full",
                          fonteColors.bg, fonteColors.text
                        )}>
                          {fonteInfo?.label || lead.fonte}
                        </span>
                      </td>

                      {/* Corretor */}
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {lead.corretor_nome ? (
                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <UserCircle className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="truncate max-w-[150px]">{lead.corretor_nome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                        )}
                      </td>

                      {/* Data/Hora */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          <p className="font-medium">{dateTime.date}</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{dateTime.time}</p>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats - Por Fonte e Corretor */}
      {!loading && leads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Por Fonte */}
          {stats.por_fonte.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 text-sm">Por Fonte</h3>
              <div className="space-y-2">
                {stats.por_fonte.map((item) => {
                  const fonteInfo = FONTES.find(f => f.value === item.fonte)
                  const colors = fonteInfo ? colorMap[fonteInfo.color] : colorMap.zinc
                  return (
                    <div key={item.fonte} className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-full",
                        colors.bg, colors.text
                      )}>
                        {fonteInfo?.label || item.fonte}
                      </span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {item.total}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Por Corretor */}
          {stats.por_corretor.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 text-sm">Por Corretor</h3>
              <div className="space-y-2">
                {stats.por_corretor.map((item) => (
                  <div key={item.corretor_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {item.corretor_nome.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                        {item.corretor_nome}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-2">
                      {item.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
