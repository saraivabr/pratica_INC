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
  em_construcao: { label: "Em Obras", className: "bg-[#ff9500] text-white" },
  lancamento: { label: "Lançamento", className: "bg-[#1d1d1f] text-white" },
  entregue: { label: "Pronto", className: "bg-[#34c759] text-white" },
}

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
      <article className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
        {/* Image Container */}
        <div className="relative h-48 overflow-hidden bg-[#f5f5f7]">
          <img
            src={imageUrl}
            alt={emp.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Status Badge */}
          <div className={cn(
            "absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide",
            status.className
          )}>
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
              "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
              favorited
                ? "bg-white text-[#ff3b30]"
                : "bg-black/20 backdrop-blur-sm text-white hover:bg-black/30"
            )}
          >
            <Heart
              className={cn("w-[18px] h-[18px] transition-transform", favorited && "fill-current scale-110")}
            />
          </button>

          {/* Price Tag */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white/80 text-[11px] font-medium tracking-wide mb-0.5">
              A partir de
            </p>
            <p className="text-white text-[22px] font-semibold tracking-tight">
              R$ {formatarPreco(preco)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] leading-tight group-hover:text-[#0071e3] transition-colors">
              {emp.nome}
            </h3>
            <div className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0071e3] transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#86868b] group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-[#86868b] mb-4">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-[13px]">{emp.localizacao.bairro}</span>
            {emp.localizacao.proximidade_metro && (
              <>
                <span className="text-[#d2d2d7]">·</span>
                <span className="text-[13px] text-[#0071e3] font-medium">
                  {emp.localizacao.proximidade_metro.split(" ")[0]} metrô
                </span>
              </>
            )}
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 pt-3 border-t border-[#f5f5f7]">
            <div className="flex-1">
              <p className="text-[#86868b] text-[11px] font-medium mb-0.5">Área</p>
              <p className="text-[#1d1d1f] text-[13px] font-medium">
                {menorArea === maiorArea ? `${menorArea}m²` : `${menorArea} - ${maiorArea}m²`}
              </p>
            </div>
            <div className="w-px h-8 bg-[#f5f5f7]" />
            <div className="flex-1">
              <p className="text-[#86868b] text-[11px] font-medium mb-0.5">Quartos</p>
              <p className="text-[#1d1d1f] text-[13px] font-medium">
                {emp.tipologias?.[0]?.dormitorios || 2} - {emp.tipologias?.[emp.tipologias.length - 1]?.dormitorios || 3} dorms
              </p>
            </div>
            {emp.configuracao?.torres && (
              <>
                <div className="w-px h-8 bg-[#f5f5f7]" />
                <div className="flex-1">
                  <p className="text-[#86868b] text-[11px] font-medium mb-0.5">Torres</p>
                  <p className="text-[#1d1d1f] text-[13px] font-medium">{emp.configuracao.torres}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
