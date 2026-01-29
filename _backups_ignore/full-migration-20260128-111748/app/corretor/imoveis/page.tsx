"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { EmpreendimentoCard } from "@/components/empreendimento-card"
import { useEmpreendimentos } from "@/lib/hooks"
import { useAuth, usePageTracking } from "@/lib/auth-context"
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
  Heart,
  Star,
  Filter
} from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function CorretorImoveisPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
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
  const [activeTab, setActiveTab] = useState("catalogo")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  usePageTracking("corretor-imoveis")

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset pagination when filters change
  useEffect(() => {
    setItemsToShow(12)
  }, [debouncedSearch, cidade, tipo, precoRange, quartos, statusUnidade, ordenacao])

  const cidades = useMemo(() => [...new Set(empreendimentos.map((e) => e.cidade).filter((c): c is string => !!c))], [empreendimentos])

  const filteredEmpreendimentos = useMemo(() => {
    let result = empreendimentos.filter((e) => {
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()
        const matches = [
          e.nome?.toLowerCase().includes(query),
          e.bairro?.toLowerCase().includes(query),
          e.cidade?.toLowerCase().includes(query),
          e.construtora?.toLowerCase().includes(query),
        ].some(Boolean)
        if (!matches) return false
      }

      if (cidade !== "todas" && e.cidade !== cidade) return false
      if (tipo !== "todos" && e.tipo !== tipo) return false

      const minPrice = e.precoMinimo ?? 0
      const maxPrice = e.precoMaximo ?? Infinity
      if (minPrice > precoRange[1] || maxPrice < precoRange[0]) return false

      if (quartos !== "todos") {
        const unidades = e.unidades || []
        const hasQuartos = unidades.some((u) => {
          if (quartos === "4") return u.quartos >= 4
          return u.quartos === parseInt(quartos)
        })
        if (!hasQuartos) return false
      }

      if (statusUnidade !== "todos") {
        const unidades = e.unidades || []
        const hasStatus = unidades.some((u) => u.status === statusUnidade)
        if (!hasStatus) return false
      }

      return true
    })

    // Sorting
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
    }

    return result
  }, [debouncedSearch, cidade, tipo, precoRange, quartos, statusUnidade, ordenacao, empreendimentos])

  const paginatedEmpreendimentos = useMemo(() => {
    return filteredEmpreendimentos.slice(0, itemsToShow)
  }, [filteredEmpreendimentos, itemsToShow])

  const hasMore = filteredEmpreendimentos.length > itemsToShow

  const clearFilters = () => {
    setCidade("todas")
    setTipo("todos")
    setPrecoRange([0, 3000000])
    setSearch("")
    setQuartos("todos")
    setStatusUnidade("todos")
    setOrdenacao("relevancia")
  }

  const hasActiveFilters = cidade !== "todas" || tipo !== "todos" || precoRange[0] > 0 || precoRange[1] < 3000000 || quartos !== "todos" || statusUnidade !== "todos"

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
    <AppShell title="Imóveis">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-gray-900 dark:from-white dark:via-emerald-300 dark:to-white bg-clip-text text-transparent mb-2">
              Catálogo de Imóveis
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {loading ? "Carregando..." : `${filteredEmpreendimentos.length} empreendimento${filteredEmpreendimentos.length !== 1 ? "s" : ""} disponíve${filteredEmpreendimentos.length !== 1 ? "is" : "l"}`}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-1 rounded-xl">
              <TabsTrigger value="catalogo" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white rounded-lg">
                <Building2 className="h-4 w-4" />
                Catálogo
              </TabsTrigger>
              <TabsTrigger value="favoritos" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white rounded-lg">
                <Heart className="h-4 w-4" />
                Favoritos
              </TabsTrigger>
              <TabsTrigger value="clientes" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white rounded-lg">
                <Star className="h-4 w-4" />
                Clientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalogo" className="mt-6 space-y-6">
              {/* Search and Filters */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 via-green-400/30 to-teal-400/30 rounded-2xl blur-xl opacity-60" />
                  <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 p-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Buscar por nome, bairro, cidade..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-12 h-12 text-base bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl"
                        />
                      </div>

                      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                          <button className="relative group h-12 w-12 flex-shrink-0">
                            <div className={cn(
                              "absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl blur opacity-40 transition-opacity",
                              hasActiveFilters && "opacity-60"
                            )} />
                            <div className={cn(
                              "relative h-full w-full rounded-xl flex items-center justify-center transition-all",
                              hasActiveFilters
                                ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg"
                                : "bg-white/80 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700"
                            )}>
                              <SlidersHorizontal className="h-5 w-5" />
                            </div>
                          </button>
                        </SheetTrigger>

                        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 rounded-t-3xl" />
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />

                          <SheetHeader className="pt-4">
                            <SheetTitle className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                                <Filter className="h-5 w-5 text-white" />
                              </div>
                              <span className="text-xl font-bold">Filtros</span>
                            </SheetTitle>
                          </SheetHeader>

                          <div className="space-y-6 py-6 overflow-y-auto max-h-[calc(85vh-180px)]">
                            {/* Cidade */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 text-sm font-semibold">
                                <MapPin className="h-4 w-4 text-emerald-500" />
                                Cidade
                              </label>
                              <Select value={cidade} onValueChange={setCidade}>
                                <SelectTrigger className="h-12 bg-white/80 dark:bg-zinc-800/80 rounded-xl">
                                  <SelectValue placeholder="Todas as cidades" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todas">Todas as cidades</SelectItem>
                                  {cidades.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Tipo */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 text-sm font-semibold">
                                <Home className="h-4 w-4 text-blue-500" />
                                Tipo de Imóvel
                              </label>
                              <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger className="h-12 bg-white/80 dark:bg-zinc-800/80 rounded-xl">
                                  <SelectValue placeholder="Todos os tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todos">Todos os tipos</SelectItem>
                                  <SelectItem value="apartamento">Apartamento</SelectItem>
                                  <SelectItem value="casa">Casa</SelectItem>
                                  <SelectItem value="comercial">Comercial</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Preço */}
                            <div className="space-y-4">
                              <label className="flex items-center gap-2 text-sm font-semibold">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                Faixa de Preço
                              </label>
                              <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                                <Slider
                                  value={precoRange}
                                  onValueChange={(value) => setPrecoRange(value as [number, number])}
                                  min={0}
                                  max={3000000}
                                  step={50000}
                                  className="mt-2"
                                />
                                <div className="flex items-center justify-between text-sm font-medium mt-4">
                                  <span className="px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-emerald-600">
                                    {formatCurrency(precoRange[0])}
                                  </span>
                                  <span className="text-gray-400">até</span>
                                  <span className="px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-emerald-600">
                                    {formatCurrency(precoRange[1])}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Quartos */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 text-sm font-semibold">
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
                                      "px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
                                      quartos === option.value
                                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg"
                                        : "bg-white/80 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700"
                                    )}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 text-sm font-semibold">
                                <CheckCircle className="h-4 w-4 text-cyan-500" />
                                Status
                              </label>
                              <Select value={statusUnidade} onValueChange={setStatusUnidade}>
                                <SelectTrigger className="h-12 bg-white/80 dark:bg-zinc-800/80 rounded-xl">
                                  <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todos">Todos</SelectItem>
                                  <SelectItem value="disponivel">Disponível</SelectItem>
                                  <SelectItem value="reservado">Reservado</SelectItem>
                                  <SelectItem value="vendido">Vendido</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4 border-t">
                            <button
                              onClick={clearFilters}
                              className="flex-1 h-12 rounded-xl font-medium text-gray-600 bg-white/80 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700"
                            >
                              Limpar Filtros
                            </button>
                            <button
                              onClick={() => setIsFilterOpen(false)}
                              className="flex-1 h-12 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg"
                            >
                              Aplicar Filtros
                            </button>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                </div>

                {/* Active filters badges */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2">
                    {cidade !== "todas" && (
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 gap-1.5 px-3 py-1.5 rounded-full">
                        <MapPin className="h-3 w-3" />
                        {cidade}
                        <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => setCidade("todas")} />
                      </Badge>
                    )}
                    {tipo !== "todos" && (
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0 gap-1.5 px-3 py-1.5 rounded-full">
                        <Home className="h-3 w-3" />
                        {tipo}
                        <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => setTipo("todos")} />
                      </Badge>
                    )}
                    {quartos !== "todos" && (
                      <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0 gap-1.5 px-3 py-1.5 rounded-full">
                        <Bed className="h-3 w-3" />
                        {quartos === "4" ? "4+ quartos" : `${quartos} quarto${quartos === "1" ? "" : "s"}`}
                        <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => setQuartos("todos")} />
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-white/70 dark:bg-zinc-900/70 rounded-3xl overflow-hidden">
                        <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800" />
                        <div className="p-5 space-y-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEmpreendimentos.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {paginatedEmpreendimentos.map((empreendimento, index) => (
                      <div key={empreendimento.id} className="animate-fadeInUp" style={{ animationDelay: `${(index % 12) * 50}ms` }}>
                        <EmpreendimentoCard empreendimento={empreendimento} />
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={() => setItemsToShow(prev => prev + 12)}
                        className="px-8 py-4 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/25 hover:scale-[1.02] transition-transform"
                      >
                        <Sparkles className="inline h-5 w-5 mr-2" />
                        Ver mais empreendimentos
                        <Badge className="ml-2 bg-white/20 text-white border-0">
                          {filteredEmpreendimentos.length - itemsToShow}
                        </Badge>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Nenhum empreendimento encontrado
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Tente ajustar os filtros de busca
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="favoritos" className="mt-6">
              <div className="text-center py-16">
                <Heart className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Nenhum favorito ainda
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Marque imóveis como favoritos para acessá-los rapidamente
                </p>
              </div>
            </TabsContent>

            <TabsContent value="clientes" className="mt-6">
              <div className="text-center py-16">
                <Star className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Imóveis dos Clientes
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Veja os imóveis de interesse dos seus clientes
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}
