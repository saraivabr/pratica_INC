"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bed, Car, Ruler, ChevronRight } from "lucide-react"
import { formatCurrency, type Unidade } from "@/lib/data"

interface TypologyListProps {
  unidades: Unidade[]
  onSimular: (valor: number, unitId?: string) => void
}

interface TypologyGroup {
  id: string
  label: string
  areaMin: number
  areaMax: number
  quartos: number
  vagas: number
  priceMin: number
  count: number
}

export function TypologyList({ unidades, onSimular }: TypologyListProps) {
  const typologies = useMemo(() => {
    const groups: Record<string, TypologyGroup> = {}

    unidades.forEach(unit => {
      // Create a grouping key based on Type + Rooms + Parking
      // This matches Orulo's way of grouping by "Plantas" basically
      const key = `${unit.tipo}-${unit.quartos}-${unit.vagas}`
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          label: unit.tipo === 'studio' ? 'Studio' : unit.quartos > 0 ? `${unit.quartos} Dorms` : unit.tipo,
          areaMin: unit.metragem,
          areaMax: unit.metragem,
          quartos: unit.quartos,
          vagas: unit.vagas,
          priceMin: unit.valor,
          count: 0,
        }
      }

      const group = groups[key]
      group.areaMin = Math.min(group.areaMin, unit.metragem)
      group.areaMax = Math.max(group.areaMax, unit.metragem)
      group.priceMin = Math.min(group.priceMin, unit.valor)
      group.count++
    })

    return Object.values(groups).sort((a, b) => a.quartos - b.quartos || a.priceMin - b.priceMin)
  }, [unidades])

  if (typologies.length === 0) return null

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Tipologias Disponíveis
            <Badge variant="secondary" className="text-xs font-normal">
                {typologies.length} tipos
            </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs">
              <TableHead className="pl-6">Tipo</TableHead>
              <TableHead className="text-center">Área</TableHead>
              <TableHead className="text-center">Dorms</TableHead>
              <TableHead className="text-center">Vagas</TableHead>
              <TableHead className="text-right pr-6">A partir de</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {typologies.map((type) => (
              <TableRow 
                key={type.id} 
                className="cursor-pointer group hover:bg-muted/50 transition-colors"
                onClick={() => onSimular(type.priceMin)}
              >
                <TableCell className="font-medium pl-6">
                  <div className="flex flex-col">
                    <span className="capitalize text-sm">{type.label}</span>
                    <span className="text-[10px] text-muted-foreground">{type.count} unid.</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                  {type.areaMin === type.areaMax ? type.areaMin : `${type.areaMin}-${type.areaMax}`} m²
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                    {type.quartos}
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                    {type.vagas}
                </TableCell>
                <TableCell className="text-right font-bold text-primary text-sm pr-6">
                    {formatCurrency(type.priceMin)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
