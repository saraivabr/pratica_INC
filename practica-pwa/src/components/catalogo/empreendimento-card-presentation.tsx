"use client"

import Link from "next/link"
import { Heart, MapPin, Zap, Maximize2, Building2, ChevronRight } from "lucide-react"
import { useFavorites } from "@/hooks/use-favorites"
import { formatarPreco } from "@/lib/utils"
import { Empreendimento } from "@/types/empreendimento"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface EmpreendimentoCardPresentationProps {
  empreendimento: Empreendimento
  featured?: boolean
}

// Dark mode radical color palette
const COLORS = {
  coral: "#FF6B6B",
  turquoise: "#4ECDC4",
  green: "#95E77D",
  yellow: "#FFD93D",
  purple: "#A29BFE",
  dark: "#0F1419",
  darkCard: "#1A1F2E",
  border: "#2D3748",
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  em_construcao: {
    label: "Em Obras",
    color: COLORS.yellow,
    icon: "🏗️"
  },
  lancamento: {
    label: "Lançamento",
    color: COLORS.coral,
    icon: "🚀"
  },
  em_lancamento: {
    label: "Lançamento",
    color: COLORS.coral,
    icon: "🚀"
  },
  entregue: {
    label: "Pronto",
    color: COLORS.green,
    icon: "✓"
  },
}

const defaultStatus = {
  label: "Disponível",
  color: COLORS.turquoise,
  icon: "•"
}

const defaultPlaceholder = "https://praticaincorporadora.com.br/assets/new-images/aura-guilhermina/praticaincorporadora-aura-guilhermina-hero.jpg"

export function EmpreendimentoCardPresentation({
  empreendimento: emp,
  featured = false
}: EmpreendimentoCardPresentationProps) {
  const { toggle, isFavorite } = useFavorites()
  const favorited = isFavorite(emp.id)
  const statusInfo = statusConfig[emp.status] || defaultStatus
  const preco = emp.tipologias?.[0]?.preco_base
  const imageUrl = emp.imagemCapa || defaultPlaceholder
  const menorArea = emp.tipologias?.[0]?.area_m2
  const maiorArea = emp.tipologias?.[emp.tipologias.length - 1]?.area_m2
  const minDorms = emp.tipologias?.[0]?.dormitorios || 2
  const maxDorms = emp.tipologias?.[emp.tipologias.length - 1]?.dormitorios || 3

  const [isHovered, setIsHovered] = useState(false)
  const [heartAnimating, setHeartAnimating] = useState(false)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setHeartAnimating(true)
    toggle(emp.id)
    setTimeout(() => setHeartAnimating(false), 600)
  }

  return (
    <Link href={`/catalogo/${emp.id}`} className="block group">
      <article
        className="rounded-3xl overflow-hidden transition-all duration-500"
        style={{
          backgroundColor: COLORS.darkCard,
          border: `1px solid ${COLORS.border}`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container - Imersive */}
        <div
          className="relative overflow-hidden bg-gradient-to-b"
          style={{
            height: featured ? "360px" : "280px",
            backgroundImage: `linear-gradient(135deg, ${COLORS.purple}10, ${COLORS.turquoise}10)`,
          }}
        >
          <img
            src={imageUrl}
            alt={emp.nome}
            className={cn(
              "w-full h-full object-cover transition-transform duration-700 ease-out",
              isHovered && "scale-110"
            )}
            loading="lazy"
          />

          {/* Premium gradient overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              backgroundImage: `linear-gradient(135deg, ${COLORS.dark}0%, ${COLORS.dark}20%, ${COLORS.dark}50%, ${COLORS.dark}80%)`,
              opacity: isHovered ? 0.4 : 0.3,
            }}
          />

          {/* Top glow effect */}
          <div
            className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle, ${COLORS.coral}, transparent)`,
            }}
          />

          {/* Status Badge - Vibrant */}
          <div
            className="absolute top-4 left-4 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-md flex items-center gap-2 transition-all duration-300 hover:scale-110 transform"
            style={{
              backgroundColor: statusInfo.color + "20",
              border: `1.5px solid ${statusInfo.color}`,
              color: statusInfo.color,
              boxShadow: `0 0 20px ${statusInfo.color}40`,
            }}
          >
            <span className="text-sm">{statusInfo.icon}</span>
            {statusInfo.label}
          </div>

          {/* Favorite Button - Heart Pulse */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-4 right-4 transition-all duration-300 transform"
            style={{
              transform: heartAnimating ? "scale(1.2)" : "scale(1)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 flex items-center justify-center"
              style={{
                backgroundColor: favorited ? `${COLORS.coral}30` : `${COLORS.purple}20`,
                border: `1.5px solid ${favorited ? COLORS.coral : COLORS.purple}`,
                boxShadow: favorited ? `0 0 20px ${COLORS.coral}40` : `0 0 10px ${COLORS.purple}20`,
              }}
            >
              <Heart
                className={cn(
                  "w-6 h-6 transition-all duration-300",
                  favorited && "fill-current"
                )}
                strokeWidth={favorited ? 0 : 1.5}
                style={{
                  color: favorited ? COLORS.coral : COLORS.purple,
                  filter: favorited ? `drop-shadow(0 0 8px ${COLORS.coral})` : "none",
                }}
              />
            </div>
          </button>

          {/* Price Section - Bottom with gradient */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div
              className="absolute inset-0 rounded-t-3xl"
              style={{
                backgroundImage: `linear-gradient(to top, ${COLORS.dark}99, ${COLORS.dark}70, transparent)`,
              }}
            />
            <div className="relative flex items-end justify-between">
              <div>
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-2"
                  style={{ color: COLORS.turquoise }}
                >
                  A partir de
                </p>
                <p className="text-white text-2xl md:text-3xl font-black tracking-tight leading-none">
                  <span className="text-lg font-bold opacity-70">R$</span>
                  {' '}
                  <span style={{
                    fontFamily: "var(--font-serif)",
                    backgroundImage: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.coral})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    {formatarPreco(preco)}
                  </span>
                </p>
              </div>

              {/* CTA Arrow Indicator */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 transform group-hover:translate-x-1"
                style={{
                  backgroundColor: isHovered ? COLORS.coral : `${COLORS.turquoise}20`,
                  border: `1.5px solid ${isHovered ? COLORS.coral : COLORS.turquoise}`,
                  boxShadow: isHovered ? `0 0 25px ${COLORS.coral}50` : "none",
                }}
              >
                <ChevronRight
                  className="w-6 h-6 transition-all duration-300"
                  strokeWidth={2}
                  style={{
                    color: isHovered ? COLORS.dark : COLORS.turquoise,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div
          className="p-6 border-t"
          style={{
            borderColor: COLORS.border,
          }}
        >
          {/* Title - Serif elegance */}
          <h3
            className="text-xl md:text-2xl font-black mb-3 leading-tight transition-colors duration-300"
            style={{
              fontFamily: "var(--font-serif)",
              color: "white",
              backgroundImage: isHovered ? `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.turquoise})` : "none",
              WebkitBackgroundClip: isHovered ? "text" : "unset",
              WebkitTextFillColor: isHovered ? "transparent" : "unset",
              backgroundClip: isHovered ? "text" : "unset",
            }}
          >
            {emp.nome}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.coral }} strokeWidth={2} />
            <span className="text-sm text-white/70">{emp.localizacao?.bairro || 'São Paulo'}</span>
            {emp.localizacao?.proximidade_metro && (
              <>
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: COLORS.turquoise }} />
                <span className="text-xs font-bold tracking-wider" style={{ color: COLORS.green }}>
                  PRÓXIMO METRÔ
                </span>
              </>
            )}
          </div>

          {/* Specs Row - Small cards with vibrant colors */}
          <div className="flex items-stretch gap-3 mb-6">
            {/* Area Spec */}
            <div
              className="flex-1 rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer group/spec"
              style={{
                backgroundColor: `${COLORS.turquoise}15`,
                border: `1.5px solid ${COLORS.turquoise}40`,
                boxShadow: `inset 0 0 20px ${COLORS.turquoise}10`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.backgroundColor = `${COLORS.turquoise}25`
                el.style.boxShadow = `0 0 20px ${COLORS.turquoise}40, inset 0 0 20px ${COLORS.turquoise}20`
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.backgroundColor = `${COLORS.turquoise}15`
                el.style.boxShadow = `inset 0 0 20px ${COLORS.turquoise}10`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Maximize2 className="w-4 h-4" style={{ color: COLORS.turquoise }} strokeWidth={2} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.turquoise }}>
                  Área
                </span>
              </div>
              <p className="text-lg font-black text-white">
                {menorArea === maiorArea ? `${menorArea}m²` : `${menorArea}–${maiorArea}m²`}
              </p>
            </div>

            {/* Bedrooms Spec */}
            <div
              className="flex-1 rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer group/spec"
              style={{
                backgroundColor: `${COLORS.purple}15`,
                border: `1.5px solid ${COLORS.purple}40`,
                boxShadow: `inset 0 0 20px ${COLORS.purple}10`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.backgroundColor = `${COLORS.purple}25`
                el.style.boxShadow = `0 0 20px ${COLORS.purple}40, inset 0 0 20px ${COLORS.purple}20`
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.backgroundColor = `${COLORS.purple}15`
                el.style.boxShadow = `inset 0 0 20px ${COLORS.purple}10`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4" style={{ color: COLORS.purple }} strokeWidth={2} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.purple }}>
                  Quartos
                </span>
              </div>
              <p className="text-lg font-black text-white">
                {minDorms === maxDorms ? `${minDorms}` : `${minDorms}–${maxDorms}`}
              </p>
            </div>

            {/* Torres optional */}
            {emp.configuracao?.torres && (
              <div
                className="flex-1 rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer group/spec"
                style={{
                  backgroundColor: `${COLORS.green}15`,
                  border: `1.5px solid ${COLORS.green}40`,
                  boxShadow: `inset 0 0 20px ${COLORS.green}10`,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.backgroundColor = `${COLORS.green}25`
                  el.style.boxShadow = `0 0 20px ${COLORS.green}40, inset 0 0 20px ${COLORS.green}20`
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.backgroundColor = `${COLORS.green}15`
                  el.style.boxShadow = `inset 0 0 20px ${COLORS.green}10`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" style={{ color: COLORS.green }} strokeWidth={2} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.green }}>
                    Torres
                  </span>
                </div>
                <p className="text-lg font-black text-white">
                  {emp.configuracao.torres}
                </p>
              </div>
            )}
          </div>

          {/* Bottom accent line */}
          <div
            className="pt-4 border-t flex items-center justify-between group/footer"
            style={{
              borderColor: COLORS.border,
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest transition-colors duration-300"
              style={{
                color: isHovered ? COLORS.yellow : COLORS.turquoise,
              }}
            >
              Ver mais
            </span>
            <div className="flex items-center gap-2">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: isHovered ? "40px" : "24px",
                  backgroundColor: isHovered ? COLORS.coral : COLORS.turquoise,
                  boxShadow: isHovered ? `0 0 10px ${COLORS.coral}` : "none",
                }}
              />
              <ChevronRight
                className="w-4 h-4 transition-all duration-300"
                style={{
                  color: COLORS.coral,
                }}
                strokeWidth={2}
              />
            </div>
          </div>
        </div>

        {/* Animated border glow on hover */}
        <style jsx>{`
          @keyframes glowPulse {
            0%, 100% {
              box-shadow: 0 0 20px ${COLORS.purple}20, inset 0 0 20px ${COLORS.purple}10;
            }
            50% {
              box-shadow: 0 0 40px ${COLORS.coral}40, inset 0 0 20px ${COLORS.coral}20;
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
          }

          article:hover {
            animation: glowPulse 2s ease-in-out;
          }

          article {
            box-shadow: 0 0 30px ${COLORS.purple}10;
          }
        `}</style>
      </article>
    </Link>
  )
}
