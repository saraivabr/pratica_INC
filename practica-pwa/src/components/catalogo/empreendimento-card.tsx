"use client"

import Link from "next/link"
import { Heart, MapPin, ArrowRight, Building2, Maximize2 } from "lucide-react"
import { useFavorites } from "@/hooks/use-favorites"
import { formatarPreco } from "@/lib/utils"
import { Empreendimento } from "@/types/empreendimento"
import { cn } from "@/lib/utils"

interface EmpreendimentoCardProps {
  empreendimento: Empreendimento
  featured?: boolean
}

const statusConfig: Record<string, { label: string; className: string }> = {
  em_construcao: {
    label: "Em Obras",
    className: "bg-amber-500/90 text-white backdrop-blur-sm"
  },
  lancamento: {
    label: "Lançamento",
    className: "bg-stone-900/90 text-white backdrop-blur-sm"
  },
  em_lancamento: {
    label: "Lançamento",
    className: "bg-stone-900/90 text-white backdrop-blur-sm"
  },
  entregue: {
    label: "Pronto para morar",
    className: "bg-emerald-600/90 text-white backdrop-blur-sm"
  },
}

const defaultStatus = {
  label: "Disponível",
  className: "bg-stone-600/90 text-white backdrop-blur-sm"
}

const defaultPlaceholder = "https://praticaincorporadora.com.br/assets/new-images/aura-guilhermina/praticaincorporadora-aura-guilhermina-hero.jpg"

export function EmpreendimentoCard({ empreendimento: emp, featured = false }: EmpreendimentoCardProps) {
  const { toggle, isFavorite } = useFavorites()
  const favorited = isFavorite(emp.id)
  const status = statusConfig[emp.status] || defaultStatus
  const preco = emp.tipologias?.[0]?.preco_base
  const imageUrl = emp.imagemCapa || defaultPlaceholder
  const menorArea = emp.tipologias?.[0]?.area_m2
  const maiorArea = emp.tipologias?.[emp.tipologias.length - 1]?.area_m2
  const minDorms = emp.tipologias?.[0]?.dormitorios || 2
  const maxDorms = emp.tipologias?.[emp.tipologias.length - 1]?.dormitorios || 3

  return (
    <Link href={`/catalogo/${emp.id}`} className="block group">
      <article
        className={cn(
          "bg-white rounded-3xl overflow-hidden transition-all duration-500",
          "hover:shadow-2xl hover:shadow-stone-900/10",
          featured ? "shadow-xl shadow-stone-900/5" : "shadow-lg shadow-stone-900/[0.03]"
        )}
      >
        {/* Image Container */}
        <div className={cn(
          "relative overflow-hidden bg-stone-100",
          featured ? "h-64" : "h-52"
        )}>
          <img
            src={imageUrl}
            alt={emp.nome}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />

          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Status Badge */}
          <div className={cn(
            "absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase",
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
              "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
              favorited
                ? "bg-white text-rose-500 shadow-lg"
                : "bg-white/20 backdrop-blur-md text-white hover:bg-white/30"
            )}
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-all duration-300",
                favorited && "fill-current scale-110"
              )}
              strokeWidth={favorited ? 0 : 2}
            />
          </button>

          {/* Price Section - Bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-[11px] font-medium tracking-widest uppercase mb-1">
                  A partir de
                </p>
                <p className="text-white text-[28px] font-light tracking-tight leading-none">
                  <span className="text-[18px] font-normal opacity-80">R$</span>{' '}
                  <span style={{ fontFamily: "var(--font-serif)" }}>
                    {formatarPreco(preco)}
                  </span>
                </p>
              </div>

              {/* Arrow indicator */}
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-amber-500 transition-all duration-300">
                <ArrowRight className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <h3
            className="text-[20px] font-semibold text-stone-900 leading-tight mb-2 group-hover:text-amber-700 transition-colors duration-300"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {emp.nome}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-2 text-stone-500 mb-5">
            <MapPin className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
            <span className="text-[13px]">{emp.localizacao?.bairro || 'São Paulo'}</span>
            {emp.localizacao?.proximidade_metro && (
              <>
                <span className="w-1 h-1 rounded-full bg-stone-300" />
                <span className="text-[13px] text-amber-600 font-medium">
                  Próximo ao metrô
                </span>
              </>
            )}
          </div>

          {/* Specs Row */}
          <div className="flex items-stretch gap-3">
            {/* Area */}
            <div className="flex-1 bg-stone-50 rounded-2xl p-3.5 group/spec hover:bg-amber-50 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <Maximize2 className="w-4 h-4 text-stone-400 group-hover/spec:text-amber-600 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] text-stone-400 uppercase tracking-wider font-medium">Área</span>
              </div>
              <p className="text-[15px] font-semibold text-stone-800">
                {menorArea === maiorArea ? `${menorArea}m²` : `${menorArea} - ${maiorArea}m²`}
              </p>
            </div>

            {/* Bedrooms */}
            <div className="flex-1 bg-stone-50 rounded-2xl p-3.5 group/spec hover:bg-amber-50 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <Building2 className="w-4 h-4 text-stone-400 group-hover/spec:text-amber-600 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] text-stone-400 uppercase tracking-wider font-medium">Quartos</span>
              </div>
              <p className="text-[15px] font-semibold text-stone-800">
                {minDorms === maxDorms ? `${minDorms} dorm` : `${minDorms} - ${maxDorms} dorms`}
              </p>
            </div>

            {/* Torres (optional) */}
            {emp.configuracao?.torres && (
              <div className="flex-1 bg-stone-50 rounded-2xl p-3.5 group/spec hover:bg-amber-50 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <Building2 className="w-4 h-4 text-stone-400 group-hover/spec:text-amber-600 transition-colors" strokeWidth={1.5} />
                  <span className="text-[11px] text-stone-400 uppercase tracking-wider font-medium">Torres</span>
                </div>
                <p className="text-[15px] font-semibold text-stone-800">
                  {emp.configuracao.torres}
                </p>
              </div>
            )}
          </div>

          {/* Bottom accent line */}
          <div className="mt-5 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-400 tracking-wide">Ver detalhes completos</span>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-amber-400 rounded-full group-hover:w-10 transition-all duration-300" />
                <ArrowRight className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
