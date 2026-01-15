"use client"

import { useState, useMemo } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { EmpreendimentoCard } from "@/components/catalogo/empreendimento-card"
import { FilterBar, Filters } from "@/components/catalogo/filter-bar"
import { useEmpreendimentos } from "@/hooks/use-empreendimentos"
import { cn } from "@/lib/utils"

function CatalogoSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="luxury-card">
          <div className="skeleton-luxury h-56 w-full" />
          <div className="p-5 space-y-4">
            <div className="skeleton-luxury h-6 w-3/4 rounded-lg" />
            <div className="skeleton-luxury h-4 w-1/2 rounded-lg" />
            <div className="flex gap-2">
              <div className="skeleton-luxury h-8 w-20 rounded-lg" />
              <div className="skeleton-luxury h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CatalogoPage() {
  const { empreendimentos, isLoading } = useEmpreendimentos()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: [],
    bairro: [],
  })

  const availableBairros = useMemo(() => {
    const bairros = empreendimentos.map((emp) => emp.localizacao.bairro)
    return [...new Set(bairros)].sort()
  }, [empreendimentos])

  const filteredEmpreendimentos = useMemo(() => {
    return empreendimentos.filter((emp) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = emp.nome.toLowerCase().includes(query)
        const matchesBairro = emp.localizacao.bairro.toLowerCase().includes(query)
        if (!matchesName && !matchesBairro) return false
      }
      if (filters.status.length > 0 && !filters.status.includes(emp.status)) {
        return false
      }
      if (filters.bairro.length > 0 && !filters.bairro.includes(emp.localizacao.bairro)) {
        return false
      }
      return true
    })
  }, [empreendimentos, searchQuery, filters])

  const activeFiltersCount = filters.status.length + filters.bairro.length

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Header Premium */}
      <header className="sticky top-0 z-40 glass border-b border-[#E5E2DC] shadow-sm">
        <div className="px-5 pt-6 pb-4">
          {/* Title Section */}
          <div className="flex items-end justify-between mb-6">
            <div className="animate-slide-in-left">
              <p className="text-[#C9A962] text-xs font-semibold tracking-[0.15em] uppercase mb-1">
                Portfolio
              </p>
              <h1 className="font-display text-3xl font-semibold text-[#1B4332]">
                Empreendimentos
              </h1>
              {/* Decorative underline */}
              <div className="h-0.5 w-12 bg-gradient-to-r from-[#C9A962] to-transparent mt-2" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "relative p-3 rounded-xl transition-all duration-300 ripple animate-slide-in-right",
                showFilters || activeFiltersCount > 0
                  ? "bg-[#1B4332] text-white shadow-lg"
                  : "bg-[#F0EDE8] text-[#5C5C5C] hover:bg-[#E5E2DC] hover:shadow-md"
              )}
            >
              <SlidersHorizontal className={cn(
                "w-5 h-5 transition-transform duration-300",
                showFilters && "rotate-90"
              )} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C9A962] text-[#1B4332] text-xs font-bold rounded-full flex items-center justify-center animate-scale-in shadow-md">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative animate-fade-in stagger-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8A8A8A] transition-colors" />
            <input
              type="search"
              placeholder="Buscar por nome ou bairro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-[#F0EDE8] border-0 rounded-xl text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:bg-white transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 animate-fade-in">
              <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
                availableBairros={availableBairros}
              />
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="px-5 py-6">
        {isLoading ? (
          <CatalogoSkeleton />
        ) : filteredEmpreendimentos.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-[#C9A962]" />
            </div>
            <p className="font-display text-2xl text-[#5C5C5C] mb-2">
              Nenhum resultado
            </p>
            <p className="text-[#8A8A8A] text-sm">
              Tente ajustar seus filtros
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {filteredEmpreendimentos.map((emp, index) => (
                <div
                  key={emp.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.08}s`, opacity: 0 }}
                >
                  <EmpreendimentoCard empreendimento={emp} />
                </div>
              ))}
            </div>

            <p className="text-center text-[#8A8A8A] text-sm mt-8 font-medium animate-fade-in">
              {filteredEmpreendimentos.length} empreendimento{filteredEmpreendimentos.length !== 1 && "s"}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
