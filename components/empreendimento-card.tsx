"use client"

import Link from "next/link"
import Image from "next/image"
import { ImageIcon, Bed, Ruler, Building, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { type Empreendimento, formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"

interface EmpreendimentoCardProps {
  empreendimento: Empreendimento
}

function getStatusConfig(empreendimento: Empreendimento) {
  const entrega = empreendimento.previsaoEntrega?.toLowerCase() || ""
  const fase = empreendimento.fase?.toLowerCase() || ""
  const statusText = `${entrega} ${fase}`.trim()

  if (statusText.includes("pronto") || statusText.includes("imediato") || statusText.includes("entregue")) {
    return { label: "Pronto", color: "bg-emerald-500", dot: "bg-emerald-400" }
  }
  if (statusText.includes("lançamento") || statusText.includes("breve")) {
    return { label: "Lançamento", color: "bg-blue-500", dot: "bg-blue-400" }
  }
  return { label: "Em obras", color: "bg-amber-500", dot: "bg-amber-400" }
}

export function EmpreendimentoCard({ empreendimento }: EmpreendimentoCardProps) {
  const status = getStatusConfig(empreendimento)
  const hasImage = Boolean(empreendimento.imagemPrincipal)

  const precoMinimo = empreendimento.precoMinimo
  const areaMin = empreendimento.areaMin
  const areaMax = empreendimento.areaMax
  const quartosMin = empreendimento.quartosMin
  const quartosMax = empreendimento.quartosMax
  const unidadesDisponiveis = empreendimento.unidadesDisponiveis ?? empreendimento.estoque

  // Format area range
  const areaText = areaMin && areaMin > 0
    ? (areaMax && areaMax > 0 && Math.round(areaMin) !== Math.round(areaMax)
      ? `${Math.round(areaMin)}-${Math.round(areaMax)}`
      : `${Math.round(areaMin)}`)
    : null

  // Format bedrooms range
  const quartosText = quartosMin && quartosMin > 0
    ? (quartosMax && quartosMax > 0 && quartosMin !== quartosMax
      ? `${quartosMin}-${quartosMax}`
      : `${quartosMin}`)
    : null

  return (
    <Link href={`/empreendimentos/${empreendimento.id}`} className="block h-full">
      <Card className="group h-full flex flex-col overflow-hidden border-0 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl">

        {/* Image Section */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {hasImage ? (
            <Image
              src={empreendimento.imagemPrincipal as string}
              alt={empreendimento.nome}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Status badge - top right */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm",
              status.color
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", status.dot)} />
              {status.label}
            </div>
          </div>

          {/* Stock badge - top left */}
          {unidadesDisponiveis != null && unidadesDisponiveis > 0 && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
              <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm text-[9px] sm:text-[10px] font-bold shadow-lg">
                <Building className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400">{unidadesDisponiveis}</span>
                <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">disp.</span>
              </div>
            </div>
          )}

          {/* Bottom overlay: name + location + price */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10">
            {/* Location */}
            {(empreendimento.bairro || empreendimento.cidade) && (
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-white/80 truncate">
                  {[empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {/* Name */}
            <h3 className="font-bold text-sm sm:text-lg text-white leading-tight line-clamp-1 mb-1.5 sm:mb-2">
              {empreendimento.nome}
            </h3>
            {/* Price */}
            <div className="flex items-baseline gap-1">
              {precoMinimo && precoMinimo > 0 ? (
                <>
                  <span className="text-[10px] sm:text-xs text-white/60">a partir de</span>
                  <span className="text-sm sm:text-lg font-bold text-emerald-400">
                    {formatCurrency(precoMinimo)}
                  </span>
                </>
              ) : (
                <span className="text-xs sm:text-sm text-white/50 italic">Consulte valores</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom stats bar */}
        <div className="grid grid-cols-2 bg-gradient-to-r from-[#1a2e1a] to-[#1e3620] divide-x divide-white/10">
          {/* Area */}
          <div className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2">
            <Ruler className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400/70" />
            <span className="text-[10px] sm:text-xs font-semibold text-white/90">
              {areaText ? `${areaText} m²` : "— m²"}
            </span>
          </div>
          {/* Bedrooms */}
          <div className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2">
            <Bed className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400/70" />
            <span className="text-[10px] sm:text-xs font-semibold text-white/90">
              {quartosText ? (
                <>{quartosText} <span className="hidden sm:inline">dorms</span><span className="sm:hidden">q</span></>
              ) : "—"}
            </span>
          </div>
        </div>

      </Card>
    </Link>
  )
}
