"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, SlidersHorizontal, X, Grid3X3, List, ArrowRight } from "lucide-react"
import { EmpreendimentoCard } from "@/components/catalogo/empreendimento-card"
import { FilterBar, Filters } from "@/components/catalogo/filter-bar"
import { useEmpreendimentos } from "@/hooks/use-empreendimentos"
import { useAppMode } from "@/hooks/useAppMode"
import { OrganicBackground } from "@/components/svg/SvgBackgrounds"
import { formatarPreco } from "@/lib/utils"

function CatalogoSkeletonPresentation() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-3xl overflow-hidden"
          style={{
            boxShadow: '0 2px 20px rgba(0,0,0,0.04)',
            animationDelay: `${i * 100}ms`
          }}
        >
          <div className="h-56 bg-gradient-to-br from-stone-100 to-stone-50 animate-pulse" />
          <div className="p-6 space-y-4">
            <div className="h-6 bg-stone-100 rounded-full w-2/3 animate-pulse" />
            <div className="h-4 bg-stone-50 rounded-full w-1/2 animate-pulse" />
            <div className="flex gap-4 pt-4">
              <div className="h-14 bg-stone-50 rounded-2xl flex-1 animate-pulse" />
              <div className="h-14 bg-stone-50 rounded-2xl flex-1 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CatalogoSkeletonWork() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-20 bg-white rounded-xl animate-pulse"
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            animationDelay: `${i * 50}ms`
          }}
        />
      ))}
    </div>
  )
}

export default function CatalogoPage() {
  const { empreendimentos, isLoading } = useEmpreendimentos()
  const { mode } = useAppMode()
  const isPresentation = mode === "presentation"

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
    <div className={`min-h-screen transition-colors duration-500 ${
      isPresentation ? "bg-[#FDFCFA]" : "bg-white"
    }`}>
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Organic background in presentation mode */}
      {isPresentation && (
        <div className="fixed inset-0 -z-10 opacity-30">
          <OrganicBackground className="pointer-events-none opacity-20" />
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-colors duration-500 ${
        isPresentation
          ? "bg-[#FDFCFA]/90 border-stone-200/50"
          : "bg-white/80 border-stone-100/50"
      }`}>
        <div className="px-6 pt-16 pb-5">
          {/* Title Section */}
          <div className="flex items-end justify-between mb-6">
            <div>
              {/* Gold accent line */}
              <div className="w-8 h-0.5 bg-gradient-to-r from-amber-600 to-amber-400 mb-3 rounded-full" />
              <h1
                className="text-[32px] font-semibold text-stone-900 tracking-tight leading-none"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {isPresentation ? "Portfólio" : "Catálogo"}
              </h1>
              <p className="text-[14px] text-stone-500 mt-1.5 tracking-wide">
                {isPresentation ? "Empreendimentos selecionados" : `${filteredEmpreendimentos.length} imóvel(is)`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isPresentation && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`relative p-3 rounded-2xl transition-all duration-300 ${
                    showFilters || activeFiltersCount > 0
                      ? "bg-stone-900 text-white shadow-lg shadow-stone-900/20"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" strokeWidth={1.5} />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 transition-colors group-focus-within:text-amber-600" />
            <input
              type="search"
              placeholder={isPresentation ? "Buscar empreendimentos..." : "Nome, bairro..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-14 pl-14 pr-12 bg-white border rounded-2xl text-[16px] text-stone-800 placeholder-stone-400 focus:outline-none transition-all duration-300 ${
                isPresentation
                  ? "border-stone-200 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 shadow-sm"
                  : "border-stone-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 shadow-none"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600"
                title="Limpar busca"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Filters Badge Indicator - Work Mode */}
          {!isPresentation && activeFiltersCount > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-stone-500 font-medium">Filtros ativos:</span>
              <div className="flex gap-2 flex-wrap">
                {filters.status.map((status) => (
                  <span
                    key={status}
                    className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-medium rounded-full flex items-center gap-1.5"
                  >
                    {status}
                    <button
                      onClick={() => setFilters({
                        ...filters,
                        status: filters.status.filter((s) => s !== status)
                      })}
                      className="hover:text-amber-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {filters.bairro.map((bairro) => (
                  <span
                    key={bairro}
                    className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-medium rounded-full flex items-center gap-1.5"
                  >
                    {bairro}
                    <button
                      onClick={() => setFilters({
                        ...filters,
                        bairro: filters.bairro.filter((b) => b !== bairro)
                      })}
                      className="hover:text-amber-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters - Presentation Mode */}
          {isPresentation && showFilters && (
            <div className="mt-5 pt-5 border-t border-stone-100 animate-slideDown">
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
      <main className={`transition-all duration-500 ${
        isPresentation ? "px-6 py-6 pb-32" : "px-4 py-4 pb-24 max-w-4xl mx-auto"
      }`}>
        {isLoading ? (
          isPresentation ? <CatalogoSkeletonPresentation /> : <CatalogoSkeletonWork />
        ) : filteredEmpreendimentos.length === 0 ? (
          <div className={`text-center transition-all duration-300 ${isPresentation ? "py-24" : "py-16"}`}>
            <div className={`mx-auto mb-6 rounded-3xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center shadow-inner ${
              isPresentation ? "w-20 h-20" : "w-16 h-16"
            }`}>
              <Search className={`text-stone-300 ${isPresentation ? "w-8 h-8" : "w-6 h-6"}`} strokeWidth={1.5} />
            </div>
            <p
              className={`font-medium text-stone-800 mb-2 ${isPresentation ? "text-[22px]" : "text-[18px]"}`}
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Nenhum resultado encontrado
            </p>
            <p className="text-[14px] text-stone-500 max-w-[280px] mx-auto mb-4">
              {isPresentation
                ? "Tente ajustar seus filtros ou buscar por outro termo"
                : "Nenhum imóvel corresponde aos critérios selecionados"}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => setFilters({ status: [], bairro: [] })}
                className="px-4 py-2 bg-amber-500 text-white text-[13px] font-medium rounded-full hover:bg-amber-600 transition-colors shadow-sm hover:shadow-md"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results count - Presentation mode */}
            {isPresentation && (
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-stone-200 to-transparent" />
                <span className="text-[12px] text-stone-400 tracking-widest uppercase font-medium">
                  {filteredEmpreendimentos.length} {filteredEmpreendimentos.length === 1 ? 'empreendimento' : 'empreendimentos'}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-stone-200 to-transparent" />
              </div>
            )}

            {/* Cards Grid - Presentation Mode */}
            {isPresentation ? (
              <div className="space-y-6">
                {filteredEmpreendimentos.map((emp, index) => (
                  <div
                    key={emp.id}
                    className="animate-slideUp"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <EmpreendimentoCard
                      empreendimento={emp}
                      featured={index === 0}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* List - Work Mode */
              <div className="space-y-2">
                {filteredEmpreendimentos.map((emp, index) => {
                  const status = emp.status === "lancamento" ? "Lançamento" : emp.status === "em_construcao" ? "Em Obras" : emp.status === "entregue" ? "Pronto" : "Disponível";
                  const preco = emp.tipologias?.[0]?.preco_base;
                  const menorArea = emp.tipologias?.[0]?.area_m2;
                  const maiorArea = emp.tipologias?.[emp.tipologias.length - 1]?.area_m2;

                  return (
                    <Link
                      key={emp.id}
                      href={`/catalogo/${emp.id}`}
                      className="block group"
                    >
                      <div
                        className="h-20 bg-white rounded-lg border border-stone-100 p-4 flex items-center justify-between hover:bg-stone-50 hover:border-amber-300 transition-all duration-300 cursor-pointer animate-slideUp"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <h3 className="text-[14px] font-medium text-stone-900 truncate">
                                {emp.nome}
                              </h3>
                              <p className="text-[12px] text-stone-500 truncate">
                                {emp.localizacao?.bairro || "São Paulo"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 ml-4">
                          <span className="text-[12px] font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {status}
                          </span>
                          <span className="text-[13px] font-medium text-stone-700 whitespace-nowrap">
                            R$ {formatarPreco(preco)}
                          </span>
                          <span className="text-[12px] text-stone-500 whitespace-nowrap">
                            {menorArea === maiorArea ? `${menorArea}m²` : `${menorArea}-${maiorArea}m²`}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 transition-colors ml-2 flex-shrink-0" strokeWidth={1.5} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Bottom flourish - Presentation mode */}
            {isPresentation && (
              <div className="flex items-center justify-center mt-10 gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <div className="w-1 h-1 rounded-full bg-amber-400" />
              </div>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-slideDown {
          animation: slideDown 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}
