"use client"

import { Building2, Bed, Car, Ruler, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/data"
import { Separator } from "@/components/ui/separator"

interface StatsHeaderProps {
    stats: {
        areaMin: number
        areaMax: number
        quartosMin: number
        quartosMax: number
        vagasMin: number
        vagasMax: number
        priceMin: number
    }
}

export function StatsHeader({ stats }: StatsHeaderProps) {
    const hasData = stats.areaMin > 0

    if (!hasData) return null

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50 mb-6">
             <div className="flex flex-col items-center justify-center space-y-1 text-center">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Ruler className="w-3.5 h-3.5" /> Área
                </span>
                <span className="font-bold text-foreground">
                    {stats.areaMin === stats.areaMax ? stats.areaMin : `${stats.areaMin} a ${stats.areaMax}`} m²
                </span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1 text-center border-l border-border/50">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Bed className="w-3.5 h-3.5" /> Dormitórios
                </span>
                <span className="font-bold text-foreground">
                    {stats.quartosMin === stats.quartosMax ? stats.quartosMin : `${stats.quartosMin} a ${stats.quartosMax}`}
                </span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1 text-center border-l border-border/50">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Car className="w-3.5 h-3.5" /> Vagas
                </span>
                <span className="font-bold text-foreground">
                    {stats.vagasMin === stats.vagasMax ? stats.vagasMin : `${stats.vagasMin} a ${stats.vagasMax}`}
                </span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1 text-center border-l border-border/50 col-span-2 md:col-span-1 border-t md:border-t-0 pt-3 md:pt-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <DollarSign className="w-3.5 h-3.5" /> A partir de
                </span>
                <span className="font-bold text-primary text-lg">
                    {formatCurrency(stats.priceMin)}
                </span>
            </div>
        </div>
    )
}
