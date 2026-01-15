"use client"

import Link from "next/link"
import { Heart, MapPin, ArrowUpRight } from "lucide-react"
import { useFavorites } from "@/hooks/use-favorites"
import { formatarPreco } from "@/lib/utils"
import { Empreendimento } from "@/types/empreendimento"
import { cn } from "@/lib/utils"

interface EmpreendimentoCardProps {
  empreendimento: Empreendimento
}

const statusConfig = {
  em_construcao: { label: "Em Obras", className: "badge-construcao" },
  lancamento: { label: "Lancamento", className: "badge-lancamento" },
  entregue: { label: "Pronto", className: "badge-pronto" },
}

// Fallback placeholder se não houver imagem no banco de dados
const defaultPlaceholder = "https://praticaincorporadora.com.br/assets/new-images/aura-guilhermina/praticaincorporadora-aura-guilhermina-hero.jpg"

export function EmpreendimentoCard({ empreendimento: emp }: EmpreendimentoCardProps) {
  const { toggle, isFavorite } = useFavorites()
  const favorited = isFavorite(emp.id)
  const status = statusConfig[emp.status]
  const preco = emp.tipologias?.[0]?.preco_base
  const imageUrl = emp.imagemCapa || defaultPlaceholder
  const menorArea = emp.tipologias?.[0]?.area_m2
  const maiorArea = emp.tipologias?.[emp.tipologias.length - 1]?.area_m2

  return (
    <Link href={`/catalogo/${emp.id}`} className="block group">
      <article className="luxury-card overflow-hidden">
        {/* Image Container */}
        <div className="relative h-56 overflow-hidden bg-[#E5E2DC]">
          <img
            src={imageUrl}
            alt={emp.nome}
            className="w-full h-full object-cover img-zoom"
            loading="lazy"
          />

          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-500" />

          {/* Decorative Corner Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C9A962]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Status Badge */}
          <div className={cn("badge-premium absolute top-4 left-4 z-10", status.className)}>
            {status.label}
          </div>

          {/* Favorite Button with Ripple */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggle(emp.id)
            }}
            className={cn(
              "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 ripple",
              favorited
                ? "bg-white text-red-500 shadow-lg"
                : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-110"
            )}
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-all duration-300",
                favorited && "fill-current scale-110"
              )}
            />
          </button>

          {/* Price Tag with Enhanced Design */}
          <div className="absolute bottom-4 left-4 right-4 transform transition-transform duration-500 group-hover:translate-y-[-4px]">
            <div className="backdrop-blur-sm bg-black/20 rounded-xl p-3 border border-white/10">
              <p className="text-white/70 text-xs font-medium tracking-wider uppercase mb-1">
                A partir de
              </p>
              <p className="text-white text-2xl font-display font-semibold">
                R$ {formatarPreco(preco)}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 bg-white relative">
          {/* Decorative Top Border */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9A962]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Title Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-display text-xl font-semibold text-[#1A1A1A] leading-tight group-hover:text-[#1B4332] transition-colors duration-300">
              {emp.nome}
            </h3>
            <div className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1B4332] group-hover:shadow-lg transition-all duration-300">
              <ArrowUpRight className="w-4 h-4 text-[#5C5C5C] group-hover:text-white group-hover:scale-110 transition-all duration-300" />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-[#5C5C5C] mb-4">
            <MapPin className="w-4 h-4 text-[#C9A962] group-hover:scale-110 transition-transform duration-300" />
            <span className="text-sm">{emp.localizacao.bairro}</span>
            {emp.localizacao.proximidade_metro && (
              <>
                <span className="text-[#E5E2DC]">•</span>
                <span className="text-sm text-[#1B4332] font-medium">
                  {emp.localizacao.proximidade_metro.split(" ")[0]} metro
                </span>
              </>
            )}
          </div>

          {/* Specs */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#F0EDE8]">
            <div className="flex-1">
              <p className="text-[#8A8A8A] text-xs uppercase tracking-wider mb-1">Area</p>
              <p className="text-[#1A1A1A] font-medium">
                {menorArea === maiorArea ? `${menorArea}m²` : `${menorArea} - ${maiorArea}m²`}
              </p>
            </div>
            <div className="w-px h-10 bg-[#F0EDE8]" />
            <div className="flex-1">
              <p className="text-[#8A8A8A] text-xs uppercase tracking-wider mb-1">Dormitorios</p>
              <p className="text-[#1A1A1A] font-medium">
                {emp.tipologias?.[0]?.dormitorios || 2} - {emp.tipologias?.[emp.tipologias.length - 1]?.dormitorios || 3} dorms
              </p>
            </div>
            {emp.configuracao?.torres && (
              <>
                <div className="w-px h-10 bg-[#F0EDE8]" />
                <div className="flex-1">
                  <p className="text-[#8A8A8A] text-xs uppercase tracking-wider mb-1">Torres</p>
                  <p className="text-[#1A1A1A] font-medium">{emp.configuracao.torres}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
