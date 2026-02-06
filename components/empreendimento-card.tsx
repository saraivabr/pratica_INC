"use client"

import Link from "next/link"
import Image from "next/image"
import { ImageIcon, Bed, Car, Ruler, Grid3X3, Table, Calculator } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Empreendimento, formatCurrency } from "@/lib/data"

interface EmpreendimentoCardProps {
  empreendimento: Empreendimento
}

function getStatusBadge(empreendimento: Empreendimento) {
  const entrega = empreendimento.previsaoEntrega?.toLowerCase() || ""

  if (entrega.includes("pronto") || entrega.includes("imediato") || entrega.includes("entregue")) {
    return { label: "Pronto para Morar", className: "bg-emerald-500 text-white border-transparent" }
  }

  if (entrega.includes("lançamento") || entrega.includes("breve")) {
    return { label: "Lançamento", className: "bg-blue-500 text-white border-transparent" }
  }

  return { label: "Em construção", className: "bg-amber-500 text-white border-transparent" }
}

export function EmpreendimentoCard({ empreendimento }: EmpreendimentoCardProps) {
  // Usar unidadesDisponiveis se disponivel, senao calcular a partir das unidades
  const extendedEmp = empreendimento as Empreendimento & { unidadesDisponiveis?: number }
  const unidadesDisponiveis = extendedEmp.unidadesDisponiveis ??
    (empreendimento.unidades || []).filter(u => u.status === "disponivel").length
  const totalUnidades = empreendimento.unidades?.length || 0

  const statusBadge = getStatusBadge(empreendimento)
  const hasImage = Boolean(empreendimento.imagemPrincipal)
  
  // Calculate ranges for the card (Orulo style info)
  const units = empreendimento.unidades || []

  // Filtrar unidades que têm metragem válida
  const unitsWithArea = units.filter(u => u.metragem && !isNaN(u.metragem) && u.metragem > 0)
  const areaMin = unitsWithArea.length > 0 ? Math.min(...unitsWithArea.map(u => u.metragem)) : (empreendimento as any).areaMin || 0
  const areaMax = unitsWithArea.length > 0 ? Math.max(...unitsWithArea.map(u => u.metragem)) : (empreendimento as any).areaMax || 0

  // Filtrar unidades que têm quartos válidos
  const unitsWithQuartos = units.filter(u => u.quartos && !isNaN(u.quartos) && u.quartos > 0)
  const quartosMin = unitsWithQuartos.length > 0 ? Math.min(...unitsWithQuartos.map(u => u.quartos)) : (empreendimento as any).quartosMin || 0
  const quartosMax = unitsWithQuartos.length > 0 ? Math.max(...unitsWithQuartos.map(u => u.quartos)) : (empreendimento as any).quartosMax || 0

  return (
    <Link href={`/empreendimentos/${empreendimento.id}`}>
      <Card className="group h-full flex flex-col overflow-hidden border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">

        {/* Image Section */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {hasImage ? (
            <Image
              src={empreendimento.imagemPrincipal as string}
              alt={empreendimento.nome}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
            <Badge className={`${statusBadge.className} text-[9px] sm:text-[10px] uppercase font-bold shadow-sm px-1.5 py-0.5 sm:px-2 sm:py-1`}>
                {statusBadge.label}
            </Badge>
          </div>

          {/* Price Overlay (Bottom Left) */}
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10">
             <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg shadow-sm border border-white/10">
                 <div className="text-[8px] sm:text-[10px] text-white/80 font-medium uppercase tracking-wider">A partir de</div>
                 <div className="text-sm sm:text-base font-bold leading-none">
                    {empreendimento.precoMinimo && empreendimento.precoMinimo > 0
                      ? formatCurrency(empreendimento.precoMinimo)
                      : "Sob consulta"}
                 </div>
             </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div>
                <h3 className="font-bold text-sm sm:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
                {empreendimento.nome}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                {empreendimento.bairro}, {empreendimento.cidade}
                </p>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 py-1.5 sm:py-2 border-t border-border/50">
                <div className="flex flex-col items-center justify-center text-center p-1 sm:p-1.5 rounded-md bg-muted/30">
                    <Ruler className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mb-0.5 sm:mb-1" />
                    <span className="text-[10px] sm:text-xs font-semibold">
                        {areaMin > 0 ? (areaMin === areaMax ? `${areaMin}` : `${areaMin}-${areaMax}`) : "—"} m²
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center p-1 sm:p-1.5 rounded-md bg-muted/30">
                    <Bed className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mb-0.5 sm:mb-1" />
                    <span className="text-[10px] sm:text-xs font-semibold">
                        {quartosMin > 0 ? (quartosMin === quartosMax ? `${quartosMin}` : `${quartosMin}-${quartosMax}`) : "—"} <span className="hidden sm:inline">Dorms</span><span className="sm:hidden">q</span>
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center p-1 sm:p-1.5 rounded-md bg-muted/30">
                     <span className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase mb-0 sm:mb-0.5">Disp.</span>
                     <span className="text-[10px] sm:text-xs font-bold text-emerald-600">
                        {unidadesDisponiveis > 0 ? unidadesDisponiveis : "—"}
                     </span>
                </div>
            </div>

            {/* Footer / Delivery + Quick Actions */}
            <div className="mt-auto pt-1 sm:pt-2 flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span className="truncate">Entrega: {empreendimento.previsaoEntrega || "Sob consulta"}</span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {[
                    { icon: Grid3X3, tab: "espelho", title: "Espelho" },
                    { icon: Table, tab: "lista", title: "Tabela" },
                    { icon: Calculator, tab: "simulacao", title: "Simular" },
                  ].map(({ icon: Icon, tab, title }) => (
                    <Link
                      key={tab}
                      href={`/empreendimentos/${empreendimento.id}?tab=${tab}`}
                      onClick={(e) => e.stopPropagation()}
                      title={title}
                      className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
            </div>
        </div>

      </Card>
    </Link>
  )
}