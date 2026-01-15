"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, X, Heart, MapPin, Building2, Maximize2, ArrowRight } from "lucide-react"
import { useEmpreendimentos } from "@/hooks/use-empreendimentos"
import { OrganicBackground } from "@/components/svg/SvgBackgrounds"
import { formatarPreco } from "@/lib/utils"
import { colors } from "@/lib/theme"
import { useFavorites } from "@/hooks/use-favorites"

interface Filters {
  status: string[]
  bairro: string[]
}

function CatalogoSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 py-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-2xl overflow-hidden">
          <div className="h-80 bg-gradient-to-br animate-pulse" style={{ backgroundColor: colors.bgElevated }} />
          <div className="p-4 space-y-3">
            <div className="h-4 rounded-full w-2/3 animate-pulse" style={{ backgroundColor: colors.bgElevated }} />
            <div className="h-4 rounded-full w-1/2 animate-pulse" style={{ backgroundColor: colors.bgElevated }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CatalogoPage() {
  const { empreendimentos, isLoading } = useEmpreendimentos()
  const { toggle, isFavorite } = useFavorites()

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "em_construcao": return "Em Obras"
      case "lancamento":
      case "em_lancamento": return "Lançamento"
      case "entregue": return "Pronto"
      default: return "Disponível"
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Organic background */}
      <div className="fixed inset-0 -z-10 opacity-20">
        <OrganicBackground className="pointer-events-none opacity-20" />
      </div>

      {/* Header - Minimalist Airbnb Style */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{
        backgroundColor: colors.bgElevated,
        borderColor: colors.surface
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight leading-none" style={{
                fontFamily: "var(--font-serif)",
                color: colors.text
              }}>
                Descobrir
              </h1>
              <p className="text-[13px] mt-1" style={{ color: colors.textTertiary }}>
                {filteredEmpreendimentos.length} empreendimento{filteredEmpreendimentos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group mb-4">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.textTertiary }} />
            <input
              type="search"
              placeholder="Buscar empreendimentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-14 pr-12 border rounded-xl text-[16px] focus:outline-none transition-all duration-300"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.surface,
                color: colors.text,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors"
                style={{ color: colors.textTertiary }}
                title="Limpar"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all"
              style={{
                backgroundColor: showFilters || activeFiltersCount > 0 ? colors.primary : colors.surface,
                color: colors.text
              }}
            >
              Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            {showFilters && (
              <div className="flex gap-2 animate-in fade-in">
                {availableBairros.map((bairro) => (
                  <button
                    key={bairro}
                    onClick={() => {
                      setFilters({
                        ...filters,
                        bairro: filters.bairro.includes(bairro)
                          ? filters.bairro.filter((b) => b !== bairro)
                          : [...filters.bairro, bairro]
                      })
                    }}
                    className="flex-shrink-0 px-3 py-2 rounded-full text-[12px] font-medium transition-all"
                    style={{
                      backgroundColor: filters.bairro.includes(bairro) ? colors.primary : colors.surface,
                      color: colors.text
                    }}
                  >
                    {bairro}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">
        {isLoading ? (
          <CatalogoSkeleton />
        ) : filteredEmpreendimentos.length === 0 ? (
          <div className="text-center py-32">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bgElevated }}>
              <Search className="w-8 h-8" style={{ color: colors.textTertiary }} />
            </div>
            <p className="text-[20px] font-semibold mb-2" style={{ color: colors.text, fontFamily: "var(--font-serif)" }}>
              Nenhum resultado
            </p>
            <p className="text-[14px] max-w-xs mx-auto" style={{ color: colors.textTertiary }}>
              Tente ajustar sua busca ou filtros
            </p>
          </div>
        ) : (
          <>
            {/* Airbnb-style Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 py-8 pb-32">
              {filteredEmpreendimentos.map((emp, index) => {
                const preco = emp.tipologias?.[0]?.preco_base
                const menorArea = emp.tipologias?.[0]?.area_m2
                const maiorArea = emp.tipologias?.[emp.tipologias.length - 1]?.area_m2
                const minDorms = emp.tipologias?.[0]?.dormitorios || 2
                const maxDorms = emp.tipologias?.[emp.tipologias.length - 1]?.dormitorios || 3
                const imageUrl = emp.imagemCapa || "https://praticaincorporadora.com.br/assets/new-images/aura-guilhermina/praticaincorporadora-aura-guilhermina-hero.jpg"
                const favorited = isFavorite(emp.id)

                return (
                  <Link
                    key={emp.id}
                    href={`/catalogo/${emp.id}`}
                    className="group block animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="rounded-2xl overflow-hidden transition-transform duration-300 hover:shadow-2xl" style={{
                      backgroundColor: colors.surface
                    }}>
                      {/* Image Container */}
                      <div className="relative overflow-hidden h-80 bg-center bg-cover" style={{ backgroundImage: `url(${imageUrl})` }}>
                        {/* Image fallback with gradient */}
                        {!imageUrl && (
                          <div className="absolute inset-0 bg-gradient-to-br" style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                          }} />
                        )}

                        {/* Gradient overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Status Badge - Top Left */}
                        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md uppercase tracking-wider" style={{
                          backgroundColor: `${colors.primary}cc`,
                          color: colors.text
                        }}>
                          {getStatusLabel(emp.status)}
                        </div>

                        {/* Favorite Button - Top Right */}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggle(emp.id)
                          }}
                          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md"
                          style={{
                            backgroundColor: favorited ? colors.text : "rgba(255,255,255,0.2)"
                          }}
                        >
                          <Heart
                            className="w-5 h-5 transition-all"
                            fill={favorited ? colors.primary : "none"}
                            stroke={favorited ? colors.primary : "white"}
                            strokeWidth={favorited ? 0 : 2}
                          />
                        </button>

                        {/* Price - Bottom Left */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-white/70 text-[11px] font-medium tracking-widest uppercase mb-1">
                                A partir de
                              </p>
                              <p className="text-white text-[28px] font-light leading-none" style={{ fontFamily: "var(--font-serif)" }}>
                                R$ {formatarPreco(preco)}
                              </p>
                            </div>

                            {/* Arrow indicator */}
                            <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-amber-500 transition-all duration-300" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                              <ArrowRight className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        {/* Title */}
                        <h3 className="text-[18px] font-semibold leading-tight mb-2 group-hover:text-primary transition-colors duration-300" style={{
                          fontFamily: "var(--font-serif)",
                          color: colors.text
                        }}>
                          {emp.nome}
                        </h3>

                        {/* Location */}
                        <div className="flex items-center gap-2 mb-4" style={{ color: colors.textTertiary }}>
                          <MapPin className="w-4 h-4" strokeWidth={1.5} />
                          <span className="text-[13px]">{emp.localizacao?.bairro || 'São Paulo'}</span>
                        </div>

                        {/* Specs */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl transition-colors duration-300 group-hover/spec:bg-opacity-80" style={{ backgroundColor: colors.bgElevated }}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: colors.primary }} />
                              <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.textTertiary }}>Área</span>
                            </div>
                            <p className="text-[14px] font-semibold" style={{ color: colors.text }}>
                              {menorArea === maiorArea ? `${menorArea}m²` : `${menorArea}-${maiorArea}m²`}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl transition-colors duration-300" style={{ backgroundColor: colors.bgElevated }}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: colors.secondary }} />
                              <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.textTertiary }}>Dorms</span>
                            </div>
                            <p className="text-[14px] font-semibold" style={{ color: colors.text }}>
                              {minDorms === maxDorms ? `${minDorms}` : `${minDorms}-${maxDorms}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}
