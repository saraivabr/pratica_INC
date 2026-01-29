"use client"

import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, BedDouble, Car, Maximize, TrendingDown, TrendingUp, Filter, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type Unidade, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/data"

interface UnitsTableProps {
  unidades: Unidade[]
  onSelectUnit?: (unidade: Unidade) => void
  onSimular?: (valor: number, unitId?: string) => void
}

interface TipoGroup {
  tipo: string
  unidades: Unidade[]
  precoMin: number
  precoMax: number
  metragensMin: number
  metragensMax: number
  quartos: number
  disponiveis: number
}

export function UnitsTable({ unidades, onSelectUnit, onSimular }: UnitsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [expandedTipos, setExpandedTipos] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"preco" | "andar" | "metragem">("andar")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Agrupar unidades por tipo
  const tiposAgrupados = useMemo(() => {
    const grupos: Record<string, TipoGroup> = {}

    unidades.forEach(u => {
      const tipo = u.tipo || "Outros"
      if (!grupos[tipo]) {
        grupos[tipo] = {
          tipo,
          unidades: [],
          precoMin: Infinity,
          precoMax: 0,
          metragensMin: Infinity,
          metragensMax: 0,
          quartos: u.quartos,
          disponiveis: 0
        }
      }
      grupos[tipo].unidades.push(u)
      grupos[tipo].precoMin = Math.min(grupos[tipo].precoMin, u.valor)
      grupos[tipo].precoMax = Math.max(grupos[tipo].precoMax, u.valor)
      grupos[tipo].metragensMin = Math.min(grupos[tipo].metragensMin, u.metragem)
      grupos[tipo].metragensMax = Math.max(grupos[tipo].metragensMax, u.metragem)
      if (u.status === "disponivel") grupos[tipo].disponiveis++
    })

    return Object.values(grupos).sort((a, b) => a.precoMin - b.precoMin)
  }, [unidades])

  // Filtrar unidades
  const filteredUnidades = statusFilter
    ? unidades.filter(u => u.status === statusFilter)
    : unidades

  // Ordenar unidades dentro de cada grupo
  const sortUnidades = (unidades: Unidade[]) => {
    return [...unidades].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "preco":
          comparison = a.valor - b.valor
          break
        case "andar":
          comparison = (a.andar ?? 0) - (b.andar ?? 0)
          break
        case "metragem":
          comparison = a.metragem - b.metragem
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
  }

  const toggleTipo = (tipo: string) => {
    const newExpanded = new Set(expandedTipos)
    if (newExpanded.has(tipo)) {
      newExpanded.delete(tipo)
    } else {
      newExpanded.add(tipo)
    }
    setExpandedTipos(newExpanded)
  }

  const expandAll = () => {
    setExpandedTipos(new Set(tiposAgrupados.map(g => g.tipo)))
  }

  const collapseAll = () => {
    setExpandedTipos(new Set())
  }

  // Contagens para os filtros
  const disponiveis = unidades.filter(u => u.status === "disponivel").length
  const reservadas = unidades.filter(u => u.status === "reservado").length
  const vendidas = unidades.filter(u => u.status === "vendido").length

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Filtros de Status - Responsivo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Filtrar:
          </span>
          <div className="hidden sm:flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs">
              Expandir todos
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
              Recolher
            </Button>
          </div>
        </div>

        {/* Filter buttons - scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className="h-8 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
          >
            Todos ({unidades.length})
          </Button>
          <Button
            variant={statusFilter === "disponivel" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === "disponivel" ? null : "disponivel")}
            className={cn("h-8 text-xs sm:text-sm whitespace-nowrap flex-shrink-0", statusFilter !== "disponivel" && "border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10")}
          >
            Disp. ({disponiveis})
          </Button>
          <Button
            variant={statusFilter === "reservado" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === "reservado" ? null : "reservado")}
            className={cn("h-8 text-xs sm:text-sm whitespace-nowrap flex-shrink-0", statusFilter !== "reservado" && "border-amber-500/50 text-amber-600 hover:bg-amber-500/10")}
          >
            Res. ({reservadas})
          </Button>
          <Button
            variant={statusFilter === "vendido" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === "vendido" ? null : "vendido")}
            className={cn("h-8 text-xs sm:text-sm whitespace-nowrap flex-shrink-0", statusFilter !== "vendido" && "border-slate-500/50 text-slate-600 hover:bg-slate-500/10")}
          >
            Vend. ({vendidas})
          </Button>
        </div>
      </div>

      {/* Ordenação - Compact on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
        <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground hidden sm:inline">Ordenar por:</span>
        <div className="flex gap-0.5 sm:gap-1">
          {[
            { key: "andar", label: "Andar" },
            { key: "preco", label: "Preço" },
            { key: "metragem", label: "Área" },
          ].map(option => (
            <Button
              key={option.key}
              variant={sortBy === option.key ? "secondary" : "ghost"}
              size="sm"
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs gap-0.5 sm:gap-1"
              onClick={() => {
                if (sortBy === option.key) {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                } else {
                  setSortBy(option.key as any)
                  setSortOrder("desc")
                }
              }}
            >
              {option.label}
              {sortBy === option.key && (
                sortOrder === "asc" ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards por Tipo */}
      <div className="space-y-3">
        {tiposAgrupados.map(grupo => {
          const isExpanded = expandedTipos.has(grupo.tipo)
          const unidadesDoTipo = statusFilter
            ? grupo.unidades.filter(u => u.status === statusFilter)
            : grupo.unidades
          const disponivelNoTipo = grupo.unidades.filter(u => u.status === "disponivel").length

          if (statusFilter && unidadesDoTipo.length === 0) return null

          return (
            <Card key={grupo.tipo} className="overflow-hidden">
              {/* Header do Grupo - Clicável */}
              <CardHeader
                className={cn(
                  "cursor-pointer transition-colors py-3 sm:py-4 px-3 sm:px-6",
                  "hover:bg-secondary/50",
                  isExpanded && "border-b bg-secondary/30"
                )}
                onClick={() => toggleTipo(grupo.tipo)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0 flex-1">
                    {/* Nome do Tipo */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg truncate">{grupo.tipo}</h3>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                        <span className="flex items-center gap-0.5 sm:gap-1">
                          <Maximize className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {grupo.metragensMin === grupo.metragensMax
                            ? `${grupo.metragensMin}m²`
                            : `${grupo.metragensMin}-${grupo.metragensMax}m²`}
                        </span>
                        <span className="flex items-center gap-0.5 sm:gap-1">
                          <BedDouble className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {grupo.quartos}q
                        </span>
                      </div>
                    </div>

                    {/* Badge de disponíveis */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "hidden sm:flex ml-0 sm:ml-2 text-xs",
                        disponivelNoTipo > 0
                          ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10"
                          : "border-slate-500/50 text-slate-500"
                      )}
                    >
                      {disponivelNoTipo} disp.
                    </Badge>
                  </div>

                  {/* Preço e Seta */}
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">A partir de</p>
                      <p className="text-base sm:text-xl font-bold text-primary">{formatCurrency(grupo.precoMin)}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Lista de Unidades (expandível) */}
              {isExpanded && (
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {sortUnidades(unidadesDoTipo).map(unidade => (
                      <div
                        key={unidade.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-4 transition-colors",
                          "hover:bg-secondary/30",
                          unidade.status !== "disponivel" && "opacity-60"
                        )}
                      >
                        {/* Info da Unidade */}
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Número da Unidade */}
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Unid.</span>
                            <span className="text-sm sm:text-lg font-bold text-primary">
                              {unidade.andar}{unidade.final}
                            </span>
                          </div>

                          {/* Detalhes */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                              <Badge className={cn(getStatusColor(unidade.status), "text-[10px] sm:text-xs")}>
                                {getStatusLabel(unidade.status)}
                              </Badge>
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                {unidade.andar}º andar
                              </span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Maximize className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {unidade.metragem}m²
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <BedDouble className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {unidade.quartos}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Car className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {unidade.vagas}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Preço e Ação */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-[60px] sm:pl-0">
                          <div className="text-left sm:text-right">
                            <p className="text-lg sm:text-xl font-bold text-primary">
                              {formatCurrency(unidade.valor)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {formatCurrency(unidade.valor / unidade.metragem)}/m²
                            </p>
                          </div>
                          {unidade.status === "disponivel" && onSimular && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSimular(unidade.valor, unidade.id)
                              }}
                              className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm"
                            >
                              Simular
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}

        {filteredUnidades.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">
                Nenhuma unidade encontrada
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Tente ajustar os filtros
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setStatusFilter(null)}
              >
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
