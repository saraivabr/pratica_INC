"use client"

import Link from "next/link"
import Image from "next/image"
import { ImageIcon, Bed, Car, Ruler, Grid3X3, TableProperties, PiggyBank, Home, FolderOpen } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Empreendimento, formatCurrency } from "@/lib/data"

interface EmpreendimentoCardProps {
  empreendimento: Empreendimento
  variant?: "grid" | "compact" | "list"
  mobileVariant?: "grid" | "compact" | "list"
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

function useCardData(empreendimento: Empreendimento) {
  const extendedEmp = empreendimento as Empreendimento & { unidadesDisponiveis?: number }
  const unidadesDisponiveis = extendedEmp.unidadesDisponiveis ??
    (empreendimento.unidades || []).filter(u => u.status === "disponivel").length

  const units = empreendimento.unidades || []

  const unitsWithArea = units.filter(u => u.metragem && !isNaN(u.metragem) && u.metragem > 0)
  const areaMin = unitsWithArea.length > 0 ? Math.min(...unitsWithArea.map(u => u.metragem)) : (empreendimento as any).areaMin || 0
  const areaMax = unitsWithArea.length > 0 ? Math.max(...unitsWithArea.map(u => u.metragem)) : (empreendimento as any).areaMax || 0

  const unitsWithQuartos = units.filter(u => u.quartos && !isNaN(u.quartos) && u.quartos > 0)
  const quartosMin = unitsWithQuartos.length > 0 ? Math.min(...unitsWithQuartos.map(u => u.quartos)) : (empreendimento as any).quartosMin || 0
  const quartosMax = unitsWithQuartos.length > 0 ? Math.max(...unitsWithQuartos.map(u => u.quartos)) : (empreendimento as any).quartosMax || 0

  const areaText = areaMin > 0 ? (areaMin === areaMax ? `${areaMin}` : `${areaMin}-${areaMax}`) : "—"
  const quartosText = quartosMin > 0 ? (quartosMin === quartosMax ? `${quartosMin}` : `${quartosMin}-${quartosMax}`) : "—"

  return { unidadesDisponiveis, areaMin, areaMax, areaText, quartosMin, quartosMax, quartosText }
}

const COMPACT_ACTIONS = [
  { icon: Grid3X3, tab: "espelho", label: "Espelho", color: "text-violet-600 dark:text-violet-400", bg: "hover:bg-violet-50 dark:hover:bg-violet-950/30" },
  { icon: TableProperties, tab: "lista", label: "Preços", color: "text-emerald-600 dark:text-emerald-400", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30" },
  { icon: PiggyBank, tab: "simulacao", label: "Simular", color: "text-blue-600 dark:text-blue-400", bg: "hover:bg-blue-50 dark:hover:bg-blue-950/30" },
]

function GridCard({ empreendimento }: { empreendimento: Empreendimento }) {
  const { unidadesDisponiveis, areaMin, areaMax, areaText, quartosMin, quartosMax, quartosText } = useCardData(empreendimento)
  const statusBadge = getStatusBadge(empreendimento)
  const hasImage = Boolean(empreendimento.imagemPrincipal)

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
                        {areaText} m²
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center p-1 sm:p-1.5 rounded-md bg-muted/30">
                    <Bed className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mb-0.5 sm:mb-1" />
                    <span className="text-[10px] sm:text-xs font-semibold">
                        {quartosText} <span className="hidden sm:inline">Dorms</span><span className="sm:hidden">q</span>
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center p-1 sm:p-1.5 rounded-md bg-muted/30">
                     <span className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase mb-0 sm:mb-0.5">Disp.</span>
                     <span className="text-[10px] sm:text-xs font-bold text-emerald-600">
                        {unidadesDisponiveis > 0 ? unidadesDisponiveis : "—"}
                     </span>
                </div>
            </div>

            {/* Quick Actions — all available views */}
            <div className="mt-auto pt-2 sm:pt-3 grid grid-cols-5 gap-1 sm:gap-1.5 border-t border-border/50">
              {[
                { icon: Home, tab: "visao-geral", label: "Início", color: "text-zinc-600 dark:text-zinc-400", bg: "hover:bg-zinc-100 dark:hover:bg-zinc-800/40" },
                { icon: Grid3X3, tab: "espelho", label: "Espelho", color: "text-violet-600 dark:text-violet-400", bg: "hover:bg-violet-50 dark:hover:bg-violet-950/30" },
                { icon: TableProperties, tab: "lista", label: "Preços", color: "text-emerald-600 dark:text-emerald-400", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30" },
                { icon: PiggyBank, tab: "simulacao", label: "Simular", color: "text-blue-600 dark:text-blue-400", bg: "hover:bg-blue-50 dark:hover:bg-blue-950/30" },
                { icon: FolderOpen, tab: "materiais", label: "Materiais", color: "text-amber-600 dark:text-amber-400", bg: "hover:bg-amber-50 dark:hover:bg-amber-950/30" },
              ].map(({ icon: Icon, tab, label, color, bg }) => (
                <Link
                  key={tab}
                  href={`/empreendimentos/${empreendimento.id}?tab=${tab}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 sm:py-2 rounded-lg ${bg} transition-colors`}
                >
                  <Icon className={`h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 ${color}`} />
                  <span className={`text-[9px] sm:text-[11px] font-semibold leading-tight ${color}`}>{label}</span>
                </Link>
              ))}
            </div>
        </div>

      </Card>
    </Link>
  )
}

function CompactCard({ empreendimento }: { empreendimento: Empreendimento }) {
  const { unidadesDisponiveis, areaText, quartosText } = useCardData(empreendimento)
  const statusBadge = getStatusBadge(empreendimento)
  const hasImage = Boolean(empreendimento.imagemPrincipal)

  return (
    <Link href={`/empreendimentos/${empreendimento.id}`}>
      <Card className="group h-full flex flex-col overflow-hidden border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 bg-card">

        {/* Image — shorter aspect ratio */}
        <div className="relative aspect-[3/2] w-full overflow-hidden">
          {hasImage ? (
            <Image
              src={empreendimento.imagemPrincipal as string}
              alt={empreendimento.nome}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-1.5 right-1.5 z-10">
            <Badge className={`${statusBadge.className} text-[8px] uppercase font-bold shadow-sm px-1.5 py-0.5`}>
              {statusBadge.label}
            </Badge>
          </div>

          {/* Price Overlay */}
          <div className="absolute bottom-1.5 left-1.5 z-10">
            <div className="bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md shadow-sm border border-white/10">
              <div className="text-[7px] text-white/80 font-medium uppercase tracking-wider">A partir de</div>
              <div className="text-xs font-bold leading-none">
                {empreendimento.precoMinimo && empreendimento.precoMinimo > 0
                  ? formatCurrency(empreendimento.precoMinimo)
                  : "Sob consulta"}
              </div>
            </div>
          </div>
        </div>

        {/* Content — compact */}
        <div className="flex flex-col flex-1 p-2.5 space-y-1.5">
          <div>
            <h3 className="font-bold text-xs leading-tight group-hover:text-primary transition-colors line-clamp-1">
              {empreendimento.nome}
            </h3>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {empreendimento.bairro}, {empreendimento.cidade}
            </p>
          </div>

          {/* Specs inline */}
          <div className="text-[10px] text-muted-foreground font-medium border-t border-border/50 pt-1.5">
            {areaText}m² · {quartosText}q · <span className="text-emerald-600 font-semibold">{unidadesDisponiveis > 0 ? unidadesDisponiveis : "—"} disp.</span>
          </div>

          {/* 3 actions only */}
          <div className="mt-auto pt-1.5 grid grid-cols-3 gap-1 border-t border-border/50">
            {COMPACT_ACTIONS.map(({ icon: Icon, tab, label, color, bg }) => (
              <Link
                key={tab}
                href={`/empreendimentos/${empreendimento.id}?tab=${tab}`}
                onClick={(e) => e.stopPropagation()}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg ${bg} transition-colors`}
              >
                <Icon className={`h-3 w-3 ${color}`} />
                <span className={`text-[8px] font-semibold leading-tight ${color}`}>{label}</span>
              </Link>
            ))}
          </div>
        </div>

      </Card>
    </Link>
  )
}

function ListCard({ empreendimento }: { empreendimento: Empreendimento }) {
  const { unidadesDisponiveis, areaText, quartosText } = useCardData(empreendimento)
  const statusBadge = getStatusBadge(empreendimento)
  const hasImage = Boolean(empreendimento.imagemPrincipal)

  return (
    <Link href={`/empreendimentos/${empreendimento.id}`}>
      <Card className="group flex flex-row overflow-hidden border-border/50 shadow-sm hover:shadow-lg transition-all duration-200 bg-card">

        {/* Thumbnail */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden">
          {hasImage ? (
            <Image
              src={empreendimento.imagemPrincipal as string}
              alt={empreendimento.nome}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          {/* Status badge small */}
          <div className="absolute top-1 right-1 z-10">
            <Badge className={`${statusBadge.className} text-[7px] uppercase font-bold px-1 py-0`}>
              {statusBadge.label}
            </Badge>
          </div>
        </div>

        {/* Center: info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center px-3 py-2">
          <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-1">
            {empreendimento.nome}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {empreendimento.bairro}, {empreendimento.cidade}
          </p>
          <div className="text-[11px] text-muted-foreground font-medium mt-1">
            {areaText}m² · {quartosText}q · <span className="text-emerald-600 font-semibold">{unidadesDisponiveis > 0 ? unidadesDisponiveis : "—"} disp.</span>
          </div>
        </div>

        {/* Right: price + icon actions */}
        <div className="flex flex-col items-end justify-center pr-3 py-2 gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-[9px] text-muted-foreground font-medium uppercase">A partir de</div>
            <div className="text-sm font-bold text-foreground leading-tight">
              {empreendimento.precoMinimo && empreendimento.precoMinimo > 0
                ? formatCurrency(empreendimento.precoMinimo)
                : "Consulte"}
            </div>
          </div>
          <div className="flex gap-1">
            {COMPACT_ACTIONS.map(({ icon: Icon, tab, color, bg }) => (
              <Link
                key={tab}
                href={`/empreendimentos/${empreendimento.id}?tab=${tab}`}
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 rounded-md ${bg} transition-colors`}
                title={tab}
              >
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </Link>
            ))}
          </div>
        </div>

      </Card>
    </Link>
  )
}

function MobileListCard({ empreendimento }: { empreendimento: Empreendimento }) {
  const { unidadesDisponiveis, areaText, quartosText } = useCardData(empreendimento)
  const statusBadge = getStatusBadge(empreendimento)
  const hasImage = Boolean(empreendimento.imagemPrincipal)

  return (
    <Link href={`/empreendimentos/${empreendimento.id}`}>
      <Card className="group flex flex-row overflow-hidden border-border/50 shadow-sm hover:shadow-lg transition-all duration-200 bg-card">

        {/* Thumbnail */}
        <div className="relative w-28 flex-shrink-0 overflow-hidden">
          {hasImage ? (
            <Image
              src={empreendimento.imagemPrincipal as string}
              alt={empreendimento.nome}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          {/* Status badge */}
          <div className="absolute top-1.5 left-1.5 z-10">
            <Badge className={`${statusBadge.className} text-[8px] uppercase font-bold px-1.5 py-0.5 shadow-sm`}>
              {statusBadge.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between p-3 gap-1.5">
          {/* Top: name + location */}
          <div>
            <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-1">
              {empreendimento.nome}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {empreendimento.bairro}, {empreendimento.cidade}
            </p>
          </div>

          {/* Middle: price + specs */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase">A partir de</div>
              <div className="text-sm font-bold text-foreground leading-tight">
                {empreendimento.precoMinimo && empreendimento.precoMinimo > 0
                  ? formatCurrency(empreendimento.precoMinimo)
                  : "Sob consulta"}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium text-right">
              {areaText}m² · {quartosText}q · <span className="text-emerald-600 font-semibold">{unidadesDisponiveis > 0 ? unidadesDisponiveis : "—"} disp.</span>
            </div>
          </div>

          {/* Bottom: quick actions */}
          <div className="flex gap-1 pt-1 border-t border-border/50">
            {[
              { icon: Grid3X3, tab: "espelho", label: "Espelho", color: "text-violet-600 dark:text-violet-400", bg: "hover:bg-violet-50 dark:hover:bg-violet-950/30" },
              { icon: TableProperties, tab: "lista", label: "Preços", color: "text-emerald-600 dark:text-emerald-400", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30" },
              { icon: PiggyBank, tab: "simulacao", label: "Simular", color: "text-blue-600 dark:text-blue-400", bg: "hover:bg-blue-50 dark:hover:bg-blue-950/30" },
              { icon: FolderOpen, tab: "materiais", label: "Materiais", color: "text-amber-600 dark:text-amber-400", bg: "hover:bg-amber-50 dark:hover:bg-amber-950/30" },
            ].map(({ icon: Icon, tab, label, color, bg }) => (
              <Link
                key={tab}
                href={`/empreendimentos/${empreendimento.id}?tab=${tab}`}
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center gap-1 px-2 py-1 rounded-md ${bg} transition-colors`}
              >
                <Icon className={`h-3 w-3 ${color}`} />
                <span className={`text-[10px] font-semibold ${color}`}>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export function EmpreendimentoCard({ empreendimento, variant = "grid", mobileVariant }: EmpreendimentoCardProps) {
  if (mobileVariant) {
    return (
      <>
        {/* Mobile: show mobileVariant */}
        <div className="sm:hidden">
          {mobileVariant === "list" ? <MobileListCard empreendimento={empreendimento} /> :
           mobileVariant === "compact" ? <CompactCard empreendimento={empreendimento} /> :
           <GridCard empreendimento={empreendimento} />}
        </div>
        {/* Desktop: show normal variant */}
        <div className="hidden sm:block">
          {variant === "compact" ? <CompactCard empreendimento={empreendimento} /> :
           variant === "list" ? <ListCard empreendimento={empreendimento} /> :
           <GridCard empreendimento={empreendimento} />}
        </div>
      </>
    )
  }

  if (variant === "compact") return <CompactCard empreendimento={empreendimento} />
  if (variant === "list") return <ListCard empreendimento={empreendimento} />
  return <GridCard empreendimento={empreendimento} />
}
