"use client"

import { useState, useMemo } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { EmpreendimentoCard } from "@/components/catalogo/empreendimento-card"
import { FilterBar, Filters } from "@/components/catalogo/filter-bar"
import { useEmpreendimentos } from "@/hooks/use-empreendimentos"

function CatalogoSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
          <div className="h-48 bg-[#f5f5f7] animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-[#f5f5f7] rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-[#f5f5f7] rounded-lg w-1/2 animate-pulse" />
            <div className="flex gap-3 pt-3">
              <div className="h-10 bg-[#f5f5f7] rounded-lg flex-1 animate-pulse" />
              <div className="h-10 bg-[#f5f5f7] rounded-lg flex-1 animate-pulse" />
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
    const bairros = empreendimentos.map((emp) => emp.localizacao?.bairro).filter(Boolean) as string[]
    return [...new Set(bairros)].sort()
  }, [empreendimentos])

  const filteredEmpreendimentos = useMemo(() => {
    return empreendimentos.filter((emp) => {
      const bairro = emp.localizacao?.bairro || ''
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = emp.nome.toLowerCase().includes(query)
        const matchesBairro = bairro.toLowerCase().includes(query)
        if (!matchesName && !matchesBairro) return false
      }
      if (filters.status.length > 0 && !filters.status.includes(emp.status)) {
        return false
      }
      if (filters.bairro.length > 0 && !filters.bairro.includes(bairro)) {
        return false
      }
      return true
    })
  }, [empreendimentos, searchQuery, filters])

  const activeFiltersCount = filters.status.length + filters.bairro.length

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="px-5 pt-14 pb-4">
          {/* Title Section */}
          <div className="flex items-end justify-between mb-5">
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                Empreendimentos
              </h1>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                Encontre o imóvel ideal
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-2.5 rounded-full transition-all duration-200 ${
                showFilters || activeFiltersCount > 0
                  ? "bg-[#1d1d1f] text-white"
                  : "bg-[#e8e8ed] text-[#86868b] hover:bg-[#d2d2d7]"
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0071e3] text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#86868b]" />
            <input
              type="search"
              placeholder="Buscar por nome ou bairro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-[#e8e8ed] border-0 rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:bg-white transition-all"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 animate-[fadeIn_0.2s_ease-out]">
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
      <main className="px-5 py-5 pb-28">
        {isLoading ? (
          <CatalogoSkeleton />
        ) : filteredEmpreendimentos.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#e8e8ed] flex items-center justify-center">
              <Search className="w-7 h-7 text-[#86868b]" />
            </div>
            <p className="text-[17px] font-medium text-[#1d1d1f] mb-1">
              Nenhum resultado
            </p>
            <p className="text-[13px] text-[#86868b]">
              Tente ajustar seus filtros de busca
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredEmpreendimentos.map((emp, index) => (
                <div
                  key={emp.id}
                  className="animate-[fadeIn_0.4s_ease-out_both]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <EmpreendimentoCard empreendimento={emp} />
                </div>
              ))}
            </div>

            <p className="text-center text-[12px] text-[#86868b] mt-6">
              {filteredEmpreendimentos.length} empreendimento{filteredEmpreendimentos.length !== 1 && "s"}
            </p>
          </>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
