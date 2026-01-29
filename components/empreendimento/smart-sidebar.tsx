"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calculator, MessageCircle, Download, Wallet, Building, HelpCircle } from "lucide-react"
import { formatCurrency } from "@/lib/data"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SmartSidebarProps {
  priceMin: number
  selectedType?: any
  onSimular: () => void
}

export function SmartSidebar({ priceMin, selectedType, onSimular }: SmartSidebarProps) {
  // Determine the price to show: Selected Typology > Base Price
  const displayPrice = selectedType ? selectedType.priceMin : priceMin
  const label = selectedType ? `A partir de (${selectedType.label})` : "Valor a partir de"

  // Simple auto-calc values for the "Preview"
  // Assuming 20% down payment standard
  const entrada = displayPrice * 0.20
  // Simple estimation: (Price - Entry) / 360 months (30 years) * interest factor (approx 1.05 for UI demo)
  // This is just visual feedback, the real calc is in the full simulator
  const financiamento = displayPrice - entrada
  const parcelaEstimada = (financiamento * 0.01) // Rule of thumb: 1% of financed amount per month roughly covers amortization + interest in initial phase

  return (
    <motion.div 
        className="sticky top-24 space-y-4"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-2xl overflow-hidden bg-white/95 backdrop-blur-xl ring-1 ring-gray-200">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
        
        <CardHeader className="pb-2 pt-6">
          <div className="flex justify-between items-start">
            <div className="w-full">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {label}
                    </p>
                    {selectedType && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            {selectedType.area}m²
                        </span>
                    )}
                </div>
                <AnimatePresence mode="wait">
                    <motion.h3 
                        key={displayPrice}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="text-3xl font-black text-gray-900 tracking-tight mt-2"
                    >
                        {formatCurrency(displayPrice)}
                    </motion.h3>
                </AnimatePresence>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
            {/* Live Calculation Preview */}
            <div className="bg-gray-50/80 rounded-xl p-4 space-y-3 border border-gray-100">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-gray-600 gap-2">
                        <div className="p-1.5 bg-emerald-100 rounded-md">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <span className="font-medium">Entrada (20%)</span>
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrency(entrada)}</span>
                </div>
                
                <Separator className="bg-gray-200/50" />
                
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-gray-600 gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                            <Building className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-medium">Parcela Estimada</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="w-3 h-3 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">Estimativa simples baseada em juros de mercado. Use o simulador para precisão.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    <span className="font-bold text-gray-900">~ {formatCurrency(parcelaEstimada)}</span>
                </div>
            </div>

            <Button 
                className="w-full h-12 text-base font-bold shadow-lg shadow-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={onSimular}
            >
                <Calculator className="w-5 h-5 mr-2" />
                Simular Financiamento
            </Button>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-10 text-xs font-semibold border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5 mr-2" />
                    WhatsApp
                </Button>
                <Button variant="outline" className="h-10 text-xs font-semibold border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Tabela
                </Button>
            </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 p-3 text-[10px] text-center text-gray-400 leading-tight border-t border-gray-100">
            Valores de referência "A partir de". A disponibilidade e preço podem variar conforme unidade e andar.
        </CardFooter>
      </Card>
      
      {/* Last Update Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 bg-white/50 p-2 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
         <span>Última atualização: Hoje às 09:30</span>
      </div>
    </motion.div>
  )
}