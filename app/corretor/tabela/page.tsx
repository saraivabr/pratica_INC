"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useEmpreendimentos } from "@/lib/hooks"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import {
  Loader2,
  Building2,
  Table,
  Search,
  Download,
  Filter,
  ChevronUp,
  ChevronDown,
  Bed,
  Car,
  Maximize2,
  DollarSign,
  ArrowUpDown,
  Eye,
  Share2,
  FileText,
  MessageCircle,
  MapPin,
  TrendingUp,
  Sparkles
} from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Empreendimento, Unidade } from "@/lib/empreendimentos-data"

// Status badge component
function StatusBadge({ status }: { status: Unidade["status"] }) {
  const config = {
    disponivel: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "Disponível" },
    reservada: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Reservada" },
    vendida: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", label: "Vendida" },
  }
  const c = config[status]
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  )
}

// Sort indicator
function SortIndicator({ column, sortBy, sortDir }: { column: string; sortBy: string; sortDir: "asc" | "desc" }) {
  if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />
  return sortDir === "asc" ? (
    <ChevronUp className="h-4 w-4 text-emerald-500" />
  ) : (
    <ChevronDown className="h-4 w-4 text-emerald-500" />
  )
}

// Empreendimento color palette
const empColors = [
  { gradient: "from-emerald-500 to-green-600", bg: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  { gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400" },
  { gradient: "from-violet-500 to-purple-600", bg: "bg-violet-500", light: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400" },
  { gradient: "from-amber-500 to-orange-600", bg: "bg-amber-500", light: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" },
  { gradient: "from-rose-500 to-pink-600", bg: "bg-rose-500", light: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400" },
  { gradient: "from-teal-500 to-cyan-600", bg: "bg-teal-500", light: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400" },
]

// Unit detail modal
function UnitDetailModal({
  unit,
  empreendimento,
  open,
  onClose
}: {
  unit: Unidade | null
  empreendimento: Empreendimento | null
  open: boolean
  onClose: () => void
}) {
  if (!unit || !empreendimento) return null

  const statusConfig = {
    disponivel: { gradient: "from-emerald-500 to-green-500", bg: "bg-emerald-500" },
    reservada: { gradient: "from-amber-500 to-yellow-500", bg: "bg-amber-500" },
    vendida: { gradient: "from-rose-500 to-red-500", bg: "bg-rose-500" }
  }
  const config = statusConfig[unit.status]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-0 shadow-2xl">
        <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r", config.gradient)} />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg", config.bg)}>
              {unit.numero.slice(-3)}
            </div>
            <div>
              <div className="text-xl font-bold">Unidade {unit.numero}</div>
              <div className="text-sm text-gray-500">{empreendimento.nome}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={unit.status} />
            <span className="text-sm text-gray-500">{unit.tipologia}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Bed className="h-4 w-4" />
                Quartos
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{unit.quartos}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Maximize2 className="h-4 w-4" />
                Área
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{unit.area}m²</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Car className="h-4 w-4" />
                Vagas
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{unit.vagas || 0}</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Building2 className="h-4 w-4" />
                Andar
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{unit.andar || "-"}º</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Valor
            </div>
            <div className="text-3xl font-bold">{formatCurrency(unit.valor)}</div>
            <div className="text-emerald-100 text-sm mt-1">
              {formatCurrency(unit.valor / unit.area)}/m²
            </div>
          </div>

          {unit.status === "disponivel" && (
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors">
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </button>
              <button className="flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors">
                <FileText className="h-5 w-5" />
                Simular
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
              <Share2 className="h-4 w-4" />
              Compartilhar
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
              <Eye className="h-4 w-4" />
              Ver Planta
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TabelaPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { empreendimentos, loading } = useEmpreendimentos()
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<Empreendimento | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unidade | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [quartosFilter, setQuartosFilter] = useState<string>("todos")
  const [sortBy, setSortBy] = useState<string>("numero")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  usePageTracking("corretor-tabela")

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Auto-select first empreendimento
  useEffect(() => {
    if (empreendimentos.length > 0 && !selectedEmpreendimento) {
      setSelectedEmpreendimento(empreendimentos[0] as any)
    }
  }, [empreendimentos, selectedEmpreendimento])

  // Filter and sort units
  const filteredUnits = useMemo(() => {
    if (!selectedEmpreendimento) return []

    let units = selectedEmpreendimento.unidades || []

    // Apply search filter
    if (search) {
      const query = search.toLowerCase()
      units = units.filter(u =>
        u.numero.toLowerCase().includes(query) ||
        u.tipologia.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== "todos") {
      units = units.filter(u => u.status === statusFilter)
    }

    // Apply quartos filter
    if (quartosFilter !== "todos") {
      const q = parseInt(quartosFilter)
      if (quartosFilter === "4") {
        units = units.filter(u => u.quartos >= 4)
      } else {
        units = units.filter(u => u.quartos === q)
      }
    }

    // Sort
    units = [...units].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "numero":
          comparison = a.numero.localeCompare(b.numero)
          break
        case "quartos":
          comparison = a.quartos - b.quartos
          break
        case "area":
          comparison = a.area - b.area
          break
        case "valor":
          comparison = a.valor - b.valor
          break
        case "andar":
          comparison = (a.andar || 0) - (b.andar || 0)
          break
        case "status":
          const statusOrder = { disponivel: 0, reservada: 1, vendida: 2 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
      }
      return sortDir === "asc" ? comparison : -comparison
    })

    return units
  }, [selectedEmpreendimento, search, statusFilter, quartosFilter, sortBy, sortDir])

  // Stats
  const stats = useMemo(() => {
    if (!selectedEmpreendimento) return { total: 0, disponivel: 0, reservada: 0, vendida: 0, valorMin: 0, valorMax: 0 }
    const units = selectedEmpreendimento.unidades || []
    const disponiveis = units.filter(u => u.status === "disponivel")
    return {
      total: units.length,
      disponivel: disponiveis.length,
      reservada: units.filter(u => u.status === "reservada").length,
      vendida: units.filter(u => u.status === "vendida").length,
      valorMin: disponiveis.length > 0 ? Math.min(...disponiveis.map(u => u.valor)) : 0,
      valorMax: disponiveis.length > 0 ? Math.max(...disponiveis.map(u => u.valor)) : 0
    }
  }, [selectedEmpreendimento])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortDir("asc")
    }
  }

  const handleUnitClick = (unit: Unidade) => {
    setSelectedUnit(unit)
    setIsModalOpen(true)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AppShell title="Tabela de Preços">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                  <Table className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-gray-900 dark:from-white dark:via-emerald-300 dark:to-white bg-clip-text text-transparent mb-2">
              Tabela de Preços
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Preços e condições das unidades
            </p>
          </div>

          {/* Empreendimento Selector & Filters */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 via-green-400/30 to-teal-400/30 rounded-2xl blur-xl opacity-60" />
            <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 p-4">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Buscar unidade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 h-12 text-base bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>

                {/* Filters */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 w-full lg:w-[160px] bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl">
                    <Filter className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="reservada">Reservada</SelectItem>
                    <SelectItem value="vendida">Vendida</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={quartosFilter} onValueChange={setQuartosFilter}>
                  <SelectTrigger className="h-12 w-full lg:w-[140px] bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl">
                    <Bed className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Quartos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="1">1 quarto</SelectItem>
                    <SelectItem value="2">2 quartos</SelectItem>
                    <SelectItem value="3">3 quartos</SelectItem>
                    <SelectItem value="4">4+ quartos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : selectedEmpreendimento ? (
            <>
              {/* Empreendimento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {empreendimentos.map((emp, idx) => {
                  const isSelected = selectedEmpreendimento?.id === emp.id
                  const color = empColors[idx % empColors.length]
                  const units = (emp as any).unidades || []
                  const total = units.length
                  const disponiveis = units.filter((u: any) => u.status === "disponivel").length
                  const pct = total > 0 ? Math.round((disponiveis / total) * 100) : 0
                  const valores = units.filter((u: any) => u.status === "disponivel").map((u: any) => u.valor)
                  const minVal = valores.length > 0 ? Math.min(...valores) : 0
                  const maxVal = valores.length > 0 ? Math.max(...valores) : 0

                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmpreendimento(emp as any)
                        setStatusFilter("todos")
                        setQuartosFilter("todos")
                        setSearch("")
                      }}
                      className={cn(
                        "relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 group",
                        isSelected
                          ? `bg-gradient-to-br ${color.gradient} text-white shadow-2xl scale-[1.02]`
                          : "bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-zinc-800/60 hover:shadow-xl hover:scale-[1.01]"
                      )}
                    >
                      {/* Decorative elements */}
                      <div className={cn(
                        "absolute -right-8 -top-8 w-28 h-28 rounded-full transition-all duration-500",
                        isSelected ? "bg-white/10 scale-100" : `${color.bg} opacity-[0.04] group-hover:opacity-[0.08] group-hover:scale-110`
                      )} />
                      <div className={cn(
                        "absolute -left-4 -bottom-4 w-16 h-16 rounded-full transition-all duration-500",
                        isSelected ? "bg-white/5" : `${color.bg} opacity-[0.03] group-hover:opacity-[0.06]`
                      )} />

                      <div className="relative">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                isSelected ? "bg-white/20" : `${color.light}`
                              )}>
                                <Building2 className={cn("h-4 w-4", isSelected ? "text-white" : color.text)} />
                              </div>
                              <h3 className={cn(
                                "font-bold text-sm leading-tight truncate",
                                isSelected ? "text-white" : "text-gray-900 dark:text-white"
                              )}>
                                {emp.nome}
                              </h3>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1 text-xs ml-10",
                              isSelected ? "text-white/70" : "text-gray-500"
                            )}>
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{emp.bairro}, {emp.cidade}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="bg-white/20 rounded-full p-1 flex-shrink-0">
                              <Sparkles className="h-3.5 w-3.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Availability bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className={cn(isSelected ? "text-white/80" : "text-gray-500")}>
                              Disponibilidade
                            </span>
                            <span className={cn("font-bold", isSelected ? "text-white" : color.text)}>
                              {disponiveis}/{total}
                            </span>
                          </div>
                          <div className={cn(
                            "h-2 rounded-full overflow-hidden",
                            isSelected ? "bg-white/20" : "bg-gray-100 dark:bg-zinc-800"
                          )}>
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                isSelected ? "bg-white/70" : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Price range */}
                        {minVal > 0 && (
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs",
                            isSelected ? "text-white/80" : "text-gray-600 dark:text-gray-400"
                          )}>
                            <TrendingUp className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">{formatCurrency(minVal)}</span>
                            <span className="opacity-50">~</span>
                            <span className="font-medium">{formatCurrency(maxVal)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Compact Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-xl px-4 py-3 border border-white/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</span>
                  {(["disponivel", "reservada", "vendida"] as const).map((status) => {
                    const cfg = {
                      disponivel: { bg: "bg-emerald-500", label: "Disponíveis", count: stats.disponivel },
                      reservada: { bg: "bg-amber-500", label: "Reservadas", count: stats.reservada },
                      vendida: { bg: "bg-rose-500", label: "Vendidas", count: stats.vendida },
                    }[status]
                    return (
                      <div key={status} className="flex items-center gap-1.5 text-sm">
                        <div className={cn("w-2.5 h-2.5 rounded-full", cfg.bg)} />
                        <span className="hidden sm:inline text-gray-500 dark:text-gray-400">{cfg.label}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{cfg.count}</span>
                      </div>
                    )
                  })}
                </div>
                {stats.valorMin > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.valorMin)}</span>
                    <span className="text-gray-400">a</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.valorMax)}</span>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 via-green-400/20 to-teal-400/20 rounded-3xl blur-xl opacity-60" />
                <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50">
                          <th className="text-left p-4">
                            <button
                              onClick={() => handleSort("numero")}
                              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                            >
                              Unidade
                              <SortIndicator column="numero" sortBy={sortBy} sortDir={sortDir} />
                            </button>
                          </th>
                          <th className="text-left p-4">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Tipologia
                            </span>
                          </th>
                          <th className="text-center p-4">
                            <button
                              onClick={() => handleSort("quartos")}
                              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white mx-auto"
                            >
                              <Bed className="h-4 w-4" />
                              <SortIndicator column="quartos" sortBy={sortBy} sortDir={sortDir} />
                            </button>
                          </th>
                          <th className="text-center p-4">
                            <button
                              onClick={() => handleSort("area")}
                              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white mx-auto"
                            >
                              Área
                              <SortIndicator column="area" sortBy={sortBy} sortDir={sortDir} />
                            </button>
                          </th>
                          <th className="text-center p-4 hidden sm:table-cell">
                            <button
                              onClick={() => handleSort("andar")}
                              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white mx-auto"
                            >
                              Andar
                              <SortIndicator column="andar" sortBy={sortBy} sortDir={sortDir} />
                            </button>
                          </th>
                          <th className="text-right p-4">
                            <button
                              onClick={() => handleSort("valor")}
                              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white ml-auto"
                            >
                              Valor
                              <SortIndicator column="valor" sortBy={sortBy} sortDir={sortDir} />
                            </button>
                          </th>
                          <th className="text-center p-4">
                            <button
                              onClick={() => handleSort("status")}
                              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white mx-auto"
                            >
                              Status
                              <SortIndicator column="status" sortBy={sortBy} sortDir={sortDir} />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnits.map((unit, idx) => (
                          <tr
                            key={unit.id}
                            onClick={() => handleUnitClick(unit)}
                            className={cn(
                              "border-b border-gray-100 dark:border-zinc-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors",
                              idx % 2 === 0 ? "bg-white/30 dark:bg-zinc-900/30" : "bg-gray-50/30 dark:bg-zinc-800/30"
                            )}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm",
                                  unit.status === "disponivel" ? "bg-emerald-500" :
                                    unit.status === "reservada" ? "bg-amber-500" : "bg-rose-500"
                                )}>
                                  {unit.numero.slice(-3)}
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {unit.numero}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {unit.tipologia}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {unit.quartos}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {unit.area}m²
                              </span>
                            </td>
                            <td className="p-4 text-center hidden sm:table-cell">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {unit.andar ? `${unit.andar}º` : "-"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(unit.valor)}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(unit.valor / unit.area)}/m²
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <StatusBadge status={unit.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredUnits.length === 0 && (
                    <div className="text-center py-12">
                      <Table className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Nenhuma unidade encontrada com os filtros aplicados
                      </p>
                    </div>
                  )}

                  {/* Table Footer */}
                  <div className="p-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {filteredUnits.length} unidade{filteredUnits.length !== 1 ? "s" : ""} encontrada{filteredUnits.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                Selecione um empreendimento
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Escolha um empreendimento para ver a tabela de preços
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unit Detail Modal */}
      <UnitDetailModal
        unit={selectedUnit}
        empreendimento={selectedEmpreendimento}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </AppShell>
  )
}
