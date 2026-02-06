"use client"

import { useState, useMemo, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { EmpreendimentoCard } from "@/components/empreendimento-card"
import { useEmpreendimentos } from "@/lib/hooks"
import { usePageTracking } from "@/lib/auth-context"
import {
  Loader2,
  Building2,
  Sparkles,
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Home,
  DollarSign,
  Bed,
  CheckCircle,
  ArrowUpDown,
  Filter,
  ChevronDown
} from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"
import { GlowButton } from "@/components/ui/glow-button"
import { EmptyState } from "@/components/ui/empty-state"

// Skeleton Card Component matching new design
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-pulse rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-md h-full flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Image Placeholder */}
      <div className="relative aspect-[4/3] bg-gray-200 dark:bg-gray-800">
        {/* Badge Placeholder */}
        <div className="absolute top-4 right-4 w-24 h-6 bg-gray-300 dark:bg-gray-700 rounded" />
        {/* Title Overlay Placeholder */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/50 to-transparent">
          <div className="h-6 w-3/4 bg-white/20 rounded mb-2" />
          <div className="h-4 w-1/2 bg-white/20 rounded" />
        </div>
      </div>

      {/* Stats Grid Placeholder */}
      <div className="grid grid-cols-4 bg-[#1a2e1a] py-3 divide-x divide-white/10 mt-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center px-1 space-y-1">
            <div className="h-2 w-8 bg-white/10 rounded" />
            <div className="h-3 w-6 bg-white/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Enhanced Search Filters Component with glassmorphism
function EnhancedSearchFilters({
  search,
  setSearch,
  cidade,
  setCidade,
  tipo,
  setTipo,
  precoRange,
  setPrecoRange,
  cidades,
  quartos,
  setQuartos,
  statusUnidade,
  setStatusUnidade,
  ordenacao,
  setOrdenacao,
}: {
  search: string
  setSearch: (value: string) => void
  cidade: string
  setCidade: (value: string) => void
  tipo: string
  setTipo: (value: string) => void
  precoRange: [number, number]
  setPrecoRange: (value: [number, number]) => void
  cidades: string[]
  quartos: string
  setQuartos: (value: string) => void
  statusUnidade: string
  setStatusUnidade: (value: string) => void
  ordenacao: string
  setOrdenacao: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const hasActiveFilters =
    cidade !== "todas" ||
    tipo !== "todos" ||
    precoRange[0] > 0 ||
    precoRange[1] < 3000000 ||
    quartos !== "todos" ||
    statusUnidade !== "todos"

  const activeFiltersCount = [
    cidade !== "todas",
    tipo !== "todos",
    precoRange[0] > 0 || precoRange[1] < 3000000,
    quartos !== "todos",
    statusUnidade !== "todos"
  ].filter(Boolean).length

  const clearFilters = () => {
    setCidade("todas")
    setTipo("todos")
    setPrecoRange([0, 3000000])
    setSearch("")
    setQuartos("todos")
    setStatusUnidade("todos")
    setOrdenacao("relevancia")
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main Search Bar with Glassmorphism */}
      <div className="relative">
        {/* Glow effect behind search bar */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 via-green-400/30 to-teal-400/30 rounded-xl sm:rounded-2xl blur-xl opacity-60" />

        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-xl sm:rounded-2xl shadow-xl border border-white/60 dark:border-gray-800/60 p-2.5 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-lg sm:rounded-xl opacity-0 group-focus-within:opacity-50 blur transition-opacity duration-300" />
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                />
              </div>
            </div>

            {/* Filter Button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="relative group h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                  {/* Button glow */}
                  <div className={cn(
                    "absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg sm:rounded-xl blur opacity-40 transition-opacity duration-300",
                    hasActiveFilters ? "opacity-60" : "group-hover:opacity-60"
                  )} />

                  <div className={cn(
                    "relative h-full w-full rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300",
                    hasActiveFilters
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg"
                      : "bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-400"
                  )}>
                    <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-emerald-600 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-fadeInUp">
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                </button>
              </SheetTrigger>

              <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-t border-white/60 dark:border-gray-800/60">
                {/* Animated top border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 animate-gradient rounded-t-3xl" />

                {/* Drag indicator */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />

                <SheetHeader className="pt-4">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl blur opacity-50" />
                      <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                        <Filter className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      Filtros Avancados
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                  {/* Cidade */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      Cidade
                    </label>
                    <Select value={cidade} onValueChange={setCidade}>
                      <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20">
                        <SelectValue placeholder="Todas as cidades" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 rounded-xl">
                        <SelectItem value="todas">Todas as cidades</SelectItem>
                        {cidades.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de Imovel */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Home className="h-4 w-4 text-blue-500" />
                      Tipo de Imovel
                    </label>
                    <Select value={tipo} onValueChange={setTipo}>
                      <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 rounded-xl">
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        <SelectItem value="apartamento">Apartamento</SelectItem>
                        <SelectItem value="casa">Casa</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Faixa de Preco */}
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Faixa de Preco
                    </label>
                    <div className="relative p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                      <Slider
                        value={precoRange}
                        onValueChange={(value) => setPrecoRange(value as [number, number])}
                        min={0}
                        max={3000000}
                        step={50000}
                        className="mt-2"
                      />
                      <div className="flex items-center justify-between text-sm font-medium mt-4">
                        <span className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(precoRange[0])}
                        </span>
                        <span className="text-gray-500">ate</span>
                        <span className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(precoRange[1])}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quartos */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Bed className="h-4 w-4 text-purple-500" />
                      Quartos
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "todos", label: "Todos" },
                        { value: "1", label: "1" },
                        { value: "2", label: "2" },
                        { value: "3", label: "3" },
                        { value: "4", label: "4+" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setQuartos(option.value)}
                          className={cn(
                            "px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300",
                            quartos === option.value
                              ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                              : "bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:text-emerald-600"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle className="h-4 w-4 text-cyan-500" />
                      Status
                    </label>
                    <Select value={statusUnidade} onValueChange={setStatusUnidade}>
                      <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 rounded-xl">
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="disponivel">Disponivel</SelectItem>
                        <SelectItem value="reservado">Reservado</SelectItem>
                        <SelectItem value="vendido">Vendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ordenacao */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <ArrowUpDown className="h-4 w-4 text-orange-500" />
                      Ordenar por
                    </label>
                    <Select value={ordenacao} onValueChange={setOrdenacao}>
                      <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20">
                        <SelectValue placeholder="Relevancia" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 rounded-xl">
                        <SelectItem value="relevancia">Relevancia</SelectItem>
                        <SelectItem value="preco-menor">Menor preco</SelectItem>
                        <SelectItem value="preco-maior">Maior preco</SelectItem>
                        <SelectItem value="disponiveis">Mais disponiveis</SelectItem>
                        <SelectItem value="entrega">Entrega mais proxima</SelectItem>
                        <SelectItem value="lancamento">Lancamentos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <button
                    onClick={clearFilters}
                    className="flex-1 h-12 rounded-xl font-medium text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-red-400 hover:text-red-500 transition-all duration-300"
                  >
                    Limpar Filtros
                  </button>
                  <GlowButton onClick={() => setIsOpen(false)} size="md" className="flex-1">
                    Aplicar Filtros
                  </GlowButton>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Quick Filter Pills - Scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide animate-fadeInUp" style={{ animationDelay: "100ms" }}>
        {[
          { key: "disponivel", label: "Disp.", fullLabel: "Disponíveis", active: statusUnidade === "disponivel" },
          { key: "lancamento", label: "Lanç.", fullLabel: "Lançamentos", active: ordenacao === "lancamento" },
          { key: "entrega", label: "Entrega", fullLabel: "Entrega Próxima", active: ordenacao === "entrega" },
          { key: "reservado", label: "Res.", fullLabel: "Reservados", active: statusUnidade === "reservado" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              if (filter.key === "disponivel" || filter.key === "reservado") {
                setStatusUnidade(statusUnidade === filter.key ? "todos" : filter.key)
              } else {
                setOrdenacao(ordenacao === filter.key ? "relevancia" : filter.key)
              }
            }}
            className={cn(
              "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0",
              filter.active
                ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                : "bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50 hover:border-emerald-400 hover:text-emerald-600 hover:scale-105"
            )}
          >
            <span className="sm:hidden">{filter.label}</span>
            <span className="hidden sm:inline">{filter.fullLabel}</span>
          </button>
        ))}
      </div>

      {/* Active Filters Tags - Scrollable on mobile */}
      {hasActiveFilters && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide animate-fadeInUp" style={{ animationDelay: "150ms" }}>
          {cidade !== "todas" && (
            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0">
              <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {cidade}
              <X
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 cursor-pointer hover:text-red-500 transition-colors"
                onClick={() => setCidade("todas")}
              />
            </Badge>
          )}
          {tipo !== "todos" && (
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0 gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0">
              <Home className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {tipo === "apartamento" ? "Apto" : tipo === "casa" ? "Casa" : "Com."}
              <X
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 cursor-pointer hover:text-red-500 transition-colors"
                onClick={() => setTipo("todos")}
              />
            </Badge>
          )}
          {(precoRange[0] > 0 || precoRange[1] < 3000000) && (
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-0 gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0">
              <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline">{formatCurrency(precoRange[0])} - {formatCurrency(precoRange[1])}</span>
              <span className="sm:hidden">Preço</span>
              <X
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 cursor-pointer hover:text-red-500 transition-colors"
                onClick={() => setPrecoRange([0, 3000000])}
              />
            </Badge>
          )}
          {quartos !== "todos" && (
            <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0 gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0">
              <Bed className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {quartos === "4" ? "4+" : quartos}q
              <X
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 cursor-pointer hover:text-red-500 transition-colors"
                onClick={() => setQuartos("todos")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

export default function EmpreendimentosPage() {
  const { empreendimentos, loading } = useEmpreendimentos()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [itemsToShow, setItemsToShow] = useState(12)
  const [cidade, setCidade] = useState("todas")
  const [tipo, setTipo] = useState("todos")
  const [precoRange, setPrecoRange] = useState<[number, number]>([0, 3000000])
  const [quartos, setQuartos] = useState("todos")
  const [statusUnidade, setStatusUnidade] = useState("todos")
  const [ordenacao, setOrdenacao] = useState("relevancia")

  usePageTracking("empreendimentos")

  // Debounce search com 150ms (mais responsivo)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 150)

    return () => clearTimeout(timer)
  }, [search])

  // Reset paginacao quando filtros mudam
  useEffect(() => {
    setItemsToShow(12)
  }, [debouncedSearch, cidade, tipo, precoRange, quartos, statusUnidade, ordenacao])

  const cidades = useMemo(() => [...new Set(empreendimentos.map((e) => e.cidade).filter((c): c is string => !!c))], [empreendimentos])

  const filteredEmpreendimentos = useMemo(() => {
    let result = empreendimentos.filter((e) => {
      // BUSCA INTELIGENTE MULTI-CAMPO
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()

        // Busca em multiplos campos
        const matches = [
          e.nome?.toLowerCase().includes(query),
          e.bairro?.toLowerCase().includes(query),
          e.cidade?.toLowerCase().includes(query),
          e.construtora?.toLowerCase().includes(query),
          e.descricao?.toLowerCase().includes(query),
          // Busca por numero de quartos: "2 quartos"
          query.match(/(\d+)\s*quarto/) &&
          e.unidades?.some(u => u.quartos === parseInt(RegExp.$1)),
          // Busca por status: "pronto", "disponivel"
          query.includes('pronto') &&
          e.previsaoEntrega?.toLowerCase().includes('pronto'),
          query.includes('disponivel') || query.includes('disponivel') &&
          e.unidades?.some(u => u.status === 'disponivel'),
        ].some(Boolean)

        if (!matches) return false
      }

      if (cidade !== "todas" && e.cidade !== cidade) return false
      if (tipo !== "todos" && e.tipo !== tipo) return false
      const minPrice = e.precoMinimo ?? 0
      const maxPrice = e.precoMaximo ?? Infinity
      if (minPrice > precoRange[1] || maxPrice < precoRange[0]) return false

      // Filtro de quartos
      if (quartos !== "todos") {
        const unidades = e.unidades || []
        const hasQuartos = unidades.some((u) => {
          if (quartos === "4") return u.quartos >= 4
          return u.quartos === parseInt(quartos)
        })
        if (!hasQuartos) return false
      }

      // Filtro de status
      if (statusUnidade !== "todos") {
        const unidades = e.unidades || []
        const hasStatus = unidades.some((u) => u.status === statusUnidade)
        if (!hasStatus) return false
      }

      return true
    })

    // Ordenacao
    switch (ordenacao) {
      case "preco-menor":
        result.sort((a, b) => (a.precoMinimo ?? Infinity) - (b.precoMinimo ?? Infinity))
        break
      case "preco-maior":
        result.sort((a, b) => (b.precoMinimo ?? 0) - (a.precoMinimo ?? 0))
        break
      case "disponiveis":
        result.sort((a, b) => {
          const aDisp = (a.unidades || []).filter((u) => u.status === "disponivel").length
          const bDisp = (b.unidades || []).filter((u) => u.status === "disponivel").length
          return bDisp - aDisp
        })
        break
      case "entrega":
        result.sort((a, b) => {
          const aEntrega = a.previsaoEntrega?.toLowerCase() || "zzz"
          const bEntrega = b.previsaoEntrega?.toLowerCase() || "zzz"
          if (aEntrega.includes("pronto") || aEntrega.includes("imediato")) return -1
          if (bEntrega.includes("pronto") || bEntrega.includes("imediato")) return 1
          return aEntrega.localeCompare(bEntrega)
        })
        break
      case "lancamento":
        result.sort((a, b) => {
          const aTotal = a.unidades?.length || 0
          const bTotal = b.unidades?.length || 0
          const aDisp = (a.unidades || []).filter((u) => u.status === "disponivel").length
          const bDisp = (b.unidades || []).filter((u) => u.status === "disponivel").length
          const aPercent = aTotal > 0 ? aDisp / aTotal : 0
          const bPercent = bTotal > 0 ? bDisp / bTotal : 0
          return bPercent - aPercent
        })
        break
      default:
        // relevancia - manter ordem original
        break
    }

    return result
  }, [debouncedSearch, cidade, tipo, precoRange, quartos, statusUnidade, ordenacao, empreendimentos])

  const paginatedEmpreendimentos = useMemo(() => {
    return filteredEmpreendimentos.slice(0, itemsToShow)
  }, [filteredEmpreendimentos, itemsToShow])

  const hasMore = filteredEmpreendimentos.length > itemsToShow

  const loadMore = () => {
    setItemsToShow(prev => prev + 12)
  }

  return (
    <AppShell title="Empreendimentos">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300/30 to-green-400/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-green-300/20 to-teal-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-emerald-200/20 to-cyan-300/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-10 text-center animate-fadeInDown">
          {/* Icon with glow */}
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative h-16 sm:h-20 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <Building2 className="h-8 sm:h-10 w-8 sm:w-10 text-white" />
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-300 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Title with gradient */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-gray-900 dark:from-white dark:via-emerald-300 dark:to-white bg-clip-text text-transparent mb-3">
            Empreendimentos
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur opacity-50 animate-pulse" />
                  <Loader2 className="relative h-4 w-4 sm:h-5 sm:w-5 animate-spin text-emerald-500" />
                </div>
                <span>Carregando empreendimentos incriveis...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  {filteredEmpreendimentos.length}
                </span>
                <span>empreendimento{filteredEmpreendimentos.length !== 1 ? "s" : ""} encontrado{filteredEmpreendimentos.length !== 1 ? "s" : ""}</span>
              </span>
            )}
          </p>
        </div>

        {/* Enhanced Filters */}
        <div className="mb-8 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
          <EnhancedSearchFilters
            search={search}
            setSearch={setSearch}
            cidade={cidade}
            setCidade={setCidade}
            tipo={tipo}
            setTipo={setTipo}
            precoRange={precoRange}
            setPrecoRange={setPrecoRange}
            cidades={cidades}
            quartos={quartos}
            setQuartos={setQuartos}
            statusUnidade={statusUnidade}
            setStatusUnidade={setStatusUnidade}
            ordenacao={ordenacao}
            setOrdenacao={setOrdenacao}
          />
        </div>

        {/* Content */}
        {loading ? (
          /* Skeleton Loading with shimmer */
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} delay={i * 100} />
            ))}
          </div>
        ) : filteredEmpreendimentos.length > 0 ? (
          <>
            {/* Empreendimentos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
              {paginatedEmpreendimentos.map((empreendimento, index) => (
                <div
                  key={empreendimento.id}
                  className="animate-fadeInUp"
                  style={{ animationDelay: `${(index % 12) * 50}ms` }}
                >
                  <EmpreendimentoCard empreendimento={empreendimento} />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-12 animate-fadeInUp">
                <GlowButton onClick={loadMore}>
                  <Sparkles className="h-5 w-5" />
                  Ver mais empreendimentos
                  <Badge className="ml-2 bg-white/20 text-white border-0">
                    {filteredEmpreendimentos.length - itemsToShow}
                  </Badge>
                </GlowButton>
              </div>
            )}

            {/* End of results indicator */}
            {!hasMore && paginatedEmpreendimentos.length > 12 && (
              <div className="text-center mt-10 animate-fadeInUp">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-gray-700/50">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando todos os {paginatedEmpreendimentos.length} empreendimentos
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <EmptyState
            icon={Building2}
            title="Nenhum empreendimento encontrado"
            description="Os empreendimentos cadastrados no CRM aparecerão aqui."
            action={{
              label: "Limpar todos os filtros",
              onClick: () => {
                setCidade("todas")
                setTipo("todos")
                setPrecoRange([0, 3000000])
                setSearch("")
                setQuartos("todos")
                setStatusUnidade("todos")
                setOrdenacao("relevancia")
              },
            }}
          />
        )}
      </div>

      {/* Add shimmer animation styles */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </AppShell>
  )
}
