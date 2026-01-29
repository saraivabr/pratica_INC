"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bed, Car, Ruler, ChevronRight, Check } from "lucide-react"
import { formatCurrency, type Unidade } from "@/lib/data"
import { cn } from "@/lib/utils"

interface InteractiveTypologyProps {
  unidades: Unidade[]
  onSelectType: (typeData: any) => void
}

export function InteractiveTypology({ unidades, onSelectType }: InteractiveTypologyProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Grouping logic (simplified from previous iteration)
  const typologies = unidades.reduce((acc: any[], unit) => {
    const key = `${unit.tipo}-${unit.quartos}-${unit.vagas}`
    const existing = acc.find(t => t.id === key)
    
    if (existing) {
        existing.units.push(unit)
        existing.priceMin = Math.min(existing.priceMin, unit.valor)
        existing.count++
    } else {
        acc.push({
            id: key,
            label: unit.tipo === 'studio' ? 'Studio' : `${unit.quartos} Dormitórios`,
            area: unit.metragem,
            quartos: unit.quartos,
            vagas: unit.vagas,
            priceMin: unit.valor,
            count: 1,
            units: [unit],
            type: unit.tipo
        })
    }
    return acc
  }, []).sort((a, b) => a.quartos - b.quartos || a.priceMin - b.priceMin)

  const handleSelect = (type: any) => {
      setSelectedId(type.id === selectedId ? null : type.id)
      onSelectType(type.id === selectedId ? null : type)
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {typologies.map((type) => {
        const isSelected = selectedId === type.id
        
        return (
          <motion.div
            key={type.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div 
                className={cn(
                    "group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer",
                    isSelected 
                        ? "bg-emerald-50/50 border-emerald-500 shadow-lg ring-1 ring-emerald-500" 
                        : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md"
                )}
                onClick={() => handleSelect(type)}
            >
                {/* Selection Indicator Line */}
                <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5 transition-colors",
                    isSelected ? "bg-emerald-500" : "bg-transparent group-hover:bg-emerald-200"
                )} />

                <div className="p-5 flex items-center justify-between">
                    {/* Left Info */}
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                {type.label}
                                {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                            </span>
                            <span className="text-sm text-gray-500">{type.count} unidades disponíveis</span>
                        </div>
                        
                        {/* Specs Pills */}
                        <div className="hidden sm:flex items-center gap-3">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-medium px-3 py-1.5 h-8">
                                <Ruler className="w-3.5 h-3.5 mr-1.5" />
                                {type.area} m²
                            </Badge>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-medium px-3 py-1.5 h-8">
                                <Car className="w-3.5 h-3.5 mr-1.5" />
                                {type.vagas}
                            </Badge>
                        </div>
                    </div>

                    {/* Right Price & Action */}
                    <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-0.5">A partir de</div>
                        <div className="text-xl font-bold text-emerald-700">
                            {formatCurrency(type.priceMin)}
                        </div>
                    </div>
                </div>

                {/* Expandable Details Area (Simulation Preview) */}
                <AnimatePresence>
                    {isSelected && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-emerald-50/30 border-t border-emerald-100 px-5 py-4"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-emerald-800 font-medium">
                                    Simulação Rápida (Entrada 20%):
                                </span>
                                <div className="flex gap-4">
                                    <span>
                                        Entrada: <span className="font-bold">{formatCurrency(type.priceMin * 0.2)}</span>
                                    </span>
                                    <span>
                                        Financiamento: <span className="font-bold">{formatCurrency(type.priceMin * 0.8)}</span>
                                    </span>
                                </div>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Ver Detalhes Completos <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
