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
        <div className="relative h-56 overflow-hidden">
          <img
            src={imageUrl}
            alt={emp.nome}
            className="w-full h-full object-cover img-zoom"
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Status Badge */}
          <div className={cn("badge-premium absolute top-4 left-4", status.className)}>
            {status.label}
          </div>

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggle(emp.id)
            }}
            className={cn(
              "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
              favorited
                ? "bg-white text-red-500"
                : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            )}
          >
            <Heart
              className={cn("w-5 h-5 transition-transform", favorited && "fill-current scale-110")}
            />
          </button>

          {/* Price Tag */}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white/70 text-xs font-medium tracking-wider uppercase mb-1">
              A partir de
            </p>
            <p className="text-white text-2xl font-display font-semibold">
              R$ {formatarPreco(preco)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-display text-xl font-semibold text-[#1A1A1A] leading-tight group-hover:text-[#1B4332] transition-colors">
              {emp.nome}
            </h3>
            <div className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1B4332] transition-colors">
              <ArrowUpRight className="w-4 h-4 text-[#5C5C5C] group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-[#5C5C5C] mb-4">
            <MapPin className="w-4 h-4 text-[#C9A962]" />
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
