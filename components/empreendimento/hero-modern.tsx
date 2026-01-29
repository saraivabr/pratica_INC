"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Share2, FileText, ImageIcon, MapPin, Calendar, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/data"

interface HeroModernProps {
  empreendimento: any
  stats: any
}

export function HeroModern({ empreendimento, stats }: HeroModernProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="relative w-full h-[280px] sm:h-[400px] md:h-[500px] rounded-2xl sm:rounded-3xl overflow-hidden group shadow-xl sm:shadow-2xl">
      {/* Background Image with Parallax-like feel */}
      <div 
        className={`absolute inset-0 transition-transform duration-1000 ${isHovered ? 'scale-105' : 'scale-100'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={empreendimento.imagemPrincipal || "/placeholder.jpg"}
          alt={empreendimento.nome}
          fill
          className="object-cover"
          priority
        />
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Floating Header Actions - Hidden on mobile, shown on larger screens */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex gap-2 sm:gap-3 z-20">
        <Button variant="secondary" size="sm" className="hidden sm:flex backdrop-blur-md bg-white/20 text-white border-white/20 hover:bg-white/30 text-xs sm:text-sm">
           <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden md:inline">Compartilhar</span>
        </Button>
        <Button variant="secondary" size="sm" className="hidden md:flex backdrop-blur-md bg-white/20 text-white border-white/20 hover:bg-white/30">
           <FileText className="w-4 h-4 mr-2" /> Tabela PDF
        </Button>
        <Button variant="secondary" size="sm" className="hidden lg:flex backdrop-blur-md bg-white/20 text-white border-white/20 hover:bg-white/30">
           <ImageIcon className="w-4 h-4 mr-2" /> Galeria (27)
        </Button>
        {/* Mobile: only share icon */}
        <Button variant="secondary" size="icon" className="sm:hidden backdrop-blur-md bg-white/20 text-white border-white/20 hover:bg-white/30 h-8 w-8">
           <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content (Bottom Left) */}
      <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-8 w-full md:w-2/3 z-20">
         <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
             <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs uppercase tracking-wider font-bold">
                {empreendimento.status || "Em Construção"}
             </Badge>
             {stats.priceMin > 0 && stats.areaMin > 0 && (
                 <Badge variant="outline" className="hidden sm:flex text-white border-white/40 bg-black/30 backdrop-blur-md text-xs">
                    R$ {formatCurrency(stats.priceMin / stats.areaMin)} / m²
                 </Badge>
             )}
         </div>

         <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 sm:mb-2 tracking-tight leading-tight line-clamp-2">
            {empreendimento.nome}
         </h1>

         <div className="flex items-center text-gray-300 text-sm sm:text-base md:text-lg font-medium mb-3 sm:mb-6">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{empreendimento.bairro}, {empreendimento.cidade}</span>
         </div>

         {/* Quick Stats Grid (HUD style) - Responsive */}
         <div className="hidden sm:flex gap-4 md:gap-8 border-t border-white/20 pt-3 sm:pt-6">
             <div>
                <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">Entrega</p>
                <div className="flex items-center text-white font-bold text-sm sm:text-base">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-emerald-400" />
                    {empreendimento.previsaoEntrega || "Sob Consulta"}
                </div>
             </div>
             <div className="hidden md:block">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Valorização</p>
                <div className="flex items-center text-white font-bold">
                    <TrendingUp className="w-4 h-4 mr-2 text-emerald-400" />
                    Alta Procura
                </div>
             </div>
             <div>
                <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">Unidades</p>
                <div className="flex items-center text-white font-bold text-sm sm:text-base">
                    {stats.disponiveis} disp. / {stats.total} total
                </div>
             </div>
         </div>

         {/* Mobile Stats - Compact */}
         <div className="flex sm:hidden gap-3 text-[11px] text-white/80">
            <span>{empreendimento.previsaoEntrega || "Sob Consulta"}</span>
            <span>|</span>
            <span>{stats.disponiveis}/{stats.total} disp.</span>
         </div>
      </div>
    </div>
  )
}
