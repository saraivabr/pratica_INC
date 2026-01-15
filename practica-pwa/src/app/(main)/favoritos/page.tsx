"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Heart, MapPin, Building2, Maximize2, ArrowRight } from "lucide-react"
import { useEmpreendimentos } from "@/hooks/use-empreendimentos"
import { useFavoritesStore } from "@/store/favorites"
import { formatarPreco } from "@/lib/utils"
import { colors } from "@/lib/theme"
import { OrganicBackground } from "@/components/svg/SvgBackgrounds"
import { useFavorites } from "@/hooks/use-favorites"

function FavoritosSkeleton() {
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

function EmptyState() {
  return (
    <div className="text-center py-32">
      <div className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bgElevated }}>
        <Heart className="w-8 h-8" style={{ color: colors.textTertiary }} />
      </div>
      <p className="text-[20px] font-semibold mb-2" style={{ color: colors.text, fontFamily: "var(--font-serif)" }}>
        Sua coleção está vazia
      </p>
      <p className="text-[14px] max-w-xs mx-auto" style={{ color: colors.textTertiary }}>
        Explore o portfólio e toque no coração para salvar seus favoritos
      </p>
    </div>
  )
}

function getStatusLabel(status: string) {
  switch (status) {
    case "em_construcao": return "Em Obras"
    case "lancamento":
    case "em_lancamento": return "Lançamento"
    case "entregue": return "Pronto"
    default: return "Disponível"
  }
}

export default function FavoritosPage() {
  const { empreendimentos, isLoading } = useEmpreendimentos()
  const favorites = useFavoritesStore((state) => state.favorites)
  const { toggle, isFavorite } = useFavorites()

  const favoritedEmpreendimentos = useMemo(() => {
    return empreendimentos.filter((emp) => favorites.includes(emp.id))
  }, [empreendimentos, favorites])

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

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{
        backgroundColor: colors.bgElevated,
        borderColor: colors.surface
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight leading-none" style={{
              fontFamily: "var(--font-serif)",
              color: colors.text
            }}>
              Salvos
            </h1>
            <p className="text-[13px] mt-1" style={{ color: colors.textTertiary }}>
              {favoritedEmpreendimentos.length} favorito{favoritedEmpreendimentos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">
        {isLoading ? (
          <FavoritosSkeleton />
        ) : favoritedEmpreendimentos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 py-8 pb-32">
            {favoritedEmpreendimentos.map((emp, index) => {
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
                          backgroundColor: colors.text
                        }}
                      >
                        <Heart
                          className="w-5 h-5 transition-all"
                          fill={colors.primary}
                          stroke={colors.primary}
                          strokeWidth={0}
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
                        <div className="p-3 rounded-xl transition-colors duration-300" style={{ backgroundColor: colors.bgElevated }}>
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
