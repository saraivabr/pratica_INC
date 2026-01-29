"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin, Building2, Calendar, Home, CheckCircle2, Clock, XCircle, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency, getTipoLabel } from "@/lib/data";

interface UnidadeStats {
  total: number;
  disponiveis: number;
  vendidos: number;
  reservados: number;
}

interface HeroSectionProps {
  empreendimento: {
    nome: string;
    cidade?: string;
    bairro?: string;
    construtora?: string;
    previsaoEntrega?: string;
    tipo?: string;
    precoMinimo?: number;
    imagemPrincipal?: string;
    imagens?: string[];
  };
  stats: UnidadeStats;
}

export function HeroSection({ empreendimento, stats }: HeroSectionProps) {
  const allImages = [empreendimento.imagemPrincipal, ...(empreendimento.imagens || [])].filter(Boolean) as string[];
  const [currentImage, setCurrentImage] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const hasPrice = typeof empreendimento.precoMinimo === "number" && empreendimento.precoMinimo > 0;

  const nextImage = useCallback(() => {
    if (allImages.length === 0) return;
    setCurrentImage((prev) => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length === 0) return;
    setCurrentImage((prev) => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }

    setTouchStart(null);
  };

  return (
    <section className="relative -mx-4 md:mx-0 md:rounded-xl overflow-hidden">
      {/* Image Gallery */}
      <div
        className="relative aspect-[4/3] md:aspect-[16/9] w-full bg-muted"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {allImages[currentImage] ? (
          <Image
            src={allImages[currentImage]}
            alt={empreendimento.nome}
            fill
            className="object-cover transition-opacity duration-300"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Navigation Arrows - Desktop only */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white hover:bg-white/30 transition-colors"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextImage}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white hover:bg-white/30 transition-colors"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {allImages.length > 1 && (
          <div className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentImage
                    ? "bg-white w-6"
                    : "bg-white/50 w-1.5 hover:bg-white/75"
                )}
                aria-label={`Ver imagem ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {empreendimento.tipo && (
              <Badge className="bg-primary/90 text-primary-foreground border-0">
                {getTipoLabel(empreendimento.tipo)}
              </Badge>
            )}
            {stats.disponiveis > 0 && (
              <Badge className="bg-emerald-500/90 text-white border-0">
                {stats.disponiveis} disponíveis
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-lg">
            {empreendimento.nome}
          </h1>

          {/* Location */}
          {(empreendimento.bairro || empreendimento.cidade) && (
            <p className="flex items-center gap-1.5 text-white/90 text-sm md:text-base">
              <MapPin className="w-4 h-4 shrink-0" />
              {[empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-card border-b">
        <div className="grid grid-cols-4 divide-x">
          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Home className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-lg md:text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-lg md:text-xl font-bold text-emerald-600">{stats.disponiveis}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Disponíveis</p>
          </div>
          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg md:text-xl font-bold text-amber-600">{stats.reservados}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Reservados</p>
          </div>
          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-lg md:text-xl font-bold text-red-600">{stats.vendidos}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Vendidos</p>
          </div>
        </div>

        {/* Progress Bar - Visual da ocupação */}
        {stats.total > 0 && (
          <div className="px-4 pb-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${(stats.disponiveis / stats.total) * 100}%` }}
              />
              <div
                className="bg-amber-500 transition-all duration-500"
                style={{ width: `${(stats.reservados / stats.total) * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${(stats.vendidos / stats.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              {Math.round((stats.vendidos / stats.total) * 100)}% vendido
            </p>
          </div>
        )}
      </div>

      {/* Quick Info Bar */}
      <div className="bg-muted/50 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="text-xl md:text-2xl font-bold text-primary">
              {hasPrice ? formatCurrency(empreendimento.precoMinimo) : "Consulte valores"}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {empreendimento.construtora && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {empreendimento.construtora}
              </span>
            )}
            {empreendimento.previsaoEntrega && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {empreendimento.previsaoEntrega}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
