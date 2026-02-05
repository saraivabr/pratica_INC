"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useEmpreendimentos } from "@/lib/hooks"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import {
  Loader2,
  Building2,
  Grid3X3,
  Search,
  ChevronDown,
  X,
  Bed,
  Car,
  Maximize2,
  DollarSign,
  Phone,
  MessageCircle,
  FileText,
  Share2,
  Check,
  Info,
  Eye,
  Filter,
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

// Status colors
const statusConfig = {
  disponivel: {
    bg: "bg-emerald-500",
    bgHover: "hover:bg-emerald-400",
    border: "border-emerald-400",
    text: "text-emerald-500",
    label: "Disponível",
    gradient: "from-emerald-500 to-green-500"
  },
  reservada: {
    bg: "bg-amber-500",
    bgHover: "hover:bg-amber-400",
    border: "border-amber-400",
    text: "text-amber-500",
    label: "Reservada",
    gradient: "from-amber-500 to-yellow-500"
  },
  vendida: {
    bg: "bg-rose-500",
    bgHover: "hover:bg-rose-400",
    border: "border-rose-400",
    text: "text-rose-500",
    label: "Vendida",
    gradient: "from-rose-500 to-red-500"
  }
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

// Unit cell component
function UnitCell({
  unit,
  onClick,
  compact = false
}: {
  unit: Unidade
  onClick: () => void
  compact?: boolean
}) {
  const config = statusConfig[unit.status]

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group transition-all duration-200",
        compact ? "w-10 h-10 sm:w-12 sm:h-12" : "w-14 h-14 sm:w-16 sm:h-16",
        config.bg,
        config.bgHover,
        "rounded-lg shadow-md hover:shadow-xl hover:scale-105",
        "flex items-center justify-center",
        "text-white font-semibold text-xs sm:text-sm",
        "border-2 border-white/20"
      )}
    >
      <span className="truncate px-0.5">{unit.numero.slice(-3)}</span>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
          <div className="font-bold">{unit.numero}</div>
          <div className="text-zinc-300">{unit.quartos}q • {unit.area}m²</div>
          <div className="text-emerald-400 font-medium">{formatCurrency(unit.valor)}</div>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900" />
      </div>
    </button>
  )
}

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

  const config = statusConfig[unit.status]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-0 shadow-2xl">
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r",
          config.gradient
        )} />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
              config.bg
            )}>
              {unit.numero.slice(-3)}
            </div>
            <div>
              <div className="text-xl font-bold">Unidade {unit.numero}</div>
              <div className="text-sm text-gray-500">{empreendimento.nome}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "px-3 py-1.5 text-white border-0",
              config.bg
            )}>
              {config.label}
            </Badge>
            <span className="text-sm text-gray-500">{unit.tipologia}</span>
          </div>

          {/* Main info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Bed className="h-4 w-4" />
                Quartos
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {unit.quartos}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Maximize2 className="h-4 w-4" />
                Área
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {unit.area}m²
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Car className="h-4 w-4" />
                Vagas
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {unit.vagas || 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Building2 className="h-4 w-4" />
                Andar
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {unit.andar || "-"}º
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Valor
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(unit.valor)}
            </div>
          </div>

          {/* Actions */}
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

export default function EspelhoPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { empreendimentos, loading } = useEmpreendimentos()
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<Empreendimento | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unidade | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  usePageTracking("corretor-espelho")

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

  // Filter empreendimentos by search
  const filteredEmpreendimentos = useMemo(() => {
    if (!search) return empreendimentos
    const query = search.toLowerCase()
    return empreendimentos.filter(e =>
      e.nome.toLowerCase().includes(query) ||
      e.bairro?.toLowerCase().includes(query) ||
      e.cidade?.toLowerCase().includes(query)
    )
  }, [empreendimentos, search])

  // Organize units by floor
  const unitsByFloor = useMemo(() => {
    if (!selectedEmpreendimento) return {}

    let units = selectedEmpreendimento.unidades || []

    // Apply status filter
    if (statusFilter !== "todos") {
      units = units.filter(u => u.status === statusFilter)
    }

    // Group by floor
    const grouped: Record<number, Unidade[]> = {}
    units.forEach(unit => {
      const floor = unit.andar || 0
      if (!grouped[floor]) grouped[floor] = []
      grouped[floor].push(unit)
    })

    // Sort units within each floor by numero
    Object.keys(grouped).forEach(floor => {
      grouped[Number(floor)].sort((a, b) => a.numero.localeCompare(b.numero))
    })

    return grouped
  }, [selectedEmpreendimento, statusFilter])

  // Get floor numbers sorted descending (top to bottom)
  const floors = useMemo(() => {
    return Object.keys(unitsByFloor)
      .map(Number)
      .sort((a, b) => b - a)
  }, [unitsByFloor])

  // Stats
  const stats = useMemo(() => {
    if (!selectedEmpreendimento) return { total: 0, disponivel: 0, reservada: 0, vendida: 0 }
    const units = selectedEmpreendimento.unidades || []
    return {
      total: units.length,
      disponivel: units.filter(u => u.status === "disponivel").length,
      reservada: units.filter(u => u.status === "reservada").length,
      vendida: units.filter(u => u.status === "vendida").length
    }
  }, [selectedEmpreendimento])

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
    <AppShell title="Espelho de Vendas">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                  <Grid3X3 className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-gray-900 dark:from-white dark:via-emerald-300 dark:to-white bg-clip-text text-transparent mb-2">
              Espelho de Vendas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Visualize a disponibilidade das unidades
            </p>
          </div>

          {/* Empreendimento Selector */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 via-green-400/30 to-teal-400/30 rounded-2xl blur-xl opacity-60" />
            <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Buscar empreendimento..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 h-12 text-base bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>

                {/* Empreendimento Select */}
                <Select
                  value={selectedEmpreendimento?.id.toString()}
                  onValueChange={(val) => {
                    const emp = empreendimentos.find(e => e.id.toString() === val)
                    if (emp) setSelectedEmpreendimento(emp as any)
                  }}
                >
                  <SelectTrigger className="h-12 w-full sm:w-[280px] bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl">
                    <Building2 className="h-5 w-5 mr-2 text-emerald-500" />
                    <SelectValue placeholder="Selecione um empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEmpreendimentos.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{emp.nome}</span>
                          <Badge variant="outline" className="text-xs">
                            {emp.unidadesDisponiveis} disp.
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
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
                  const reservadas = units.filter((u: any) => u.status === "reservada").length
                  const vendidas = units.filter((u: any) => u.status === "vendida").length
                  const pct = total > 0 ? Math.round((disponiveis / total) * 100) : 0

                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmpreendimento(emp as any)
                        setStatusFilter("todos")
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
                              <span className="truncate">{emp.bairro}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="bg-white/20 rounded-full p-1 flex-shrink-0">
                              <Sparkles className="h-3.5 w-3.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Stacked availability bar */}
                        <div className="mb-2">
                          <div className={cn(
                            "h-2 rounded-full overflow-hidden flex",
                            isSelected ? "bg-white/20" : "bg-gray-100 dark:bg-zinc-800"
                          )}>
                            <div
                              className={cn("h-full transition-all duration-700", isSelected ? "bg-white/70" : "bg-emerald-500")}
                              style={{ width: `${total > 0 ? (disponiveis / total) * 100 : 0}%` }}
                            />
                            <div
                              className={cn("h-full transition-all duration-700", isSelected ? "bg-white/40" : "bg-amber-400")}
                              style={{ width: `${total > 0 ? (reservadas / total) * 100 : 0}%` }}
                            />
                            <div
                              className={cn("h-full transition-all duration-700", isSelected ? "bg-white/20" : "bg-rose-400")}
                              style={{ width: `${total > 0 ? (vendidas / total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Mini stats */}
                        <div className="flex items-center gap-3">
                          <div className={cn("flex items-center gap-1 text-xs", isSelected ? "text-white/90" : "text-gray-600 dark:text-gray-400")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : "bg-emerald-500")} />
                            <span className="font-bold">{disponiveis}</span>
                            <span className="hidden sm:inline">disp.</span>
                          </div>
                          <div className={cn("flex items-center gap-1 text-xs", isSelected ? "text-white/70" : "text-gray-400")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/40" : "bg-amber-400")} />
                            <span>{reservadas}</span>
                          </div>
                          <div className={cn("flex items-center gap-1 text-xs", isSelected ? "text-white/50" : "text-gray-400")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/20" : "bg-rose-400")} />
                            <span>{vendidas}</span>
                          </div>
                          <span className={cn("text-xs ml-auto font-medium", isSelected ? "text-white/60" : "text-gray-400")}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Status Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-xl px-4 py-3 border border-white/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-1">
                  {(["todos", "disponivel", "reservada", "vendida"] as const).map((status) => {
                    const cfg = status === "todos"
                      ? { bg: "bg-gray-500", activeBg: "bg-gray-700", label: "Todas", count: stats.total }
                      : { bg: statusConfig[status].bg, activeBg: statusConfig[status].bg, label: statusConfig[status].label, count: stats[status] }
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                          statusFilter === status
                            ? `${cfg.activeBg} text-white font-semibold shadow-md`
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        {statusFilter !== status && <div className={cn("w-2 h-2 rounded-full", cfg.bg)} />}
                        <span className="hidden sm:inline">{cfg.label}</span>
                        <span className={cn("font-bold", statusFilter === status ? "text-white" : "")}>{cfg.count}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="text-xs text-gray-400">
                  {stats.total} unidades total
                </div>
              </div>

              {/* Floor Grid */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 via-green-400/20 to-teal-400/20 rounded-3xl blur-xl opacity-60" />
                <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/60 dark:border-zinc-800/60 p-6 overflow-hidden">

                  {/* Building header */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-zinc-700">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedEmpreendimento.nome}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedEmpreendimento.bairro}, {selectedEmpreendimento.cidade}
                      </p>
                    </div>
                  </div>

                  {floors.length > 0 ? (
                    <div className="space-y-3">
                      {floors.map((floor) => (
                        <div key={floor} className="flex items-center gap-3">
                          {/* Floor label */}
                          <div className="w-12 sm:w-16 flex-shrink-0 text-right">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                              {floor}º
                            </span>
                          </div>

                          {/* Units row */}
                          <div className="flex-1 flex flex-wrap gap-2">
                            {unitsByFloor[floor]?.map((unit) => (
                              <UnitCell
                                key={unit.id}
                                unit={unit}
                                onClick={() => handleUnitClick(unit)}
                                compact={floors.length > 10}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Info className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {statusFilter !== "todos"
                          ? `Nenhuma unidade ${statusFilter} encontrada`
                          : "Nenhuma unidade disponível"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Info footer */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <Info className="inline h-4 w-4 mr-1" />
                Clique em uma unidade para ver detalhes e ações
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                Selecione um empreendimento
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Escolha um empreendimento para visualizar o espelho de vendas
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
