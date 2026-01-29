"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X, Grid3X3, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"


interface ImageGalleryProps {
  images: string[]
  title: string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const safeImages = images.filter(Boolean)
  const hasMultipleImages = safeImages.length > 1
  const displayImages = safeImages.slice(0, 5) // Mostra até 5 imagens no grid

  if (safeImages.length === 0) {
    return (
      <div className="w-full rounded-xl bg-muted flex items-center justify-center h-[240px] md:h-[450px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          <span>Sem imagens disponíveis</span>
        </div>
      </div>
    )
  }

  const openLightbox = (index: number) => {
    setCurrentImage(index)
    setIsOpen(true)
  }

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % safeImages.length)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + safeImages.length) % safeImages.length)
  }

  return (
    <>
      {/* Mobile Gallery (Carousel) */}
      <div className="md:hidden relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={safeImages[currentImage]}
          alt={`${title} - Imagem ${currentImage + 1}`}
          fill
          className="object-cover"
        />

        {hasMultipleImages && (
          <>
            <div className="absolute inset-0 flex items-center justify-between p-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                onClick={prevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                onClick={nextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm">
              {currentImage + 1} / {safeImages.length}
            </div>
          </>
        )}
      </div>

      {/* Desktop Gallery (Bento Grid) */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[450px] rounded-xl overflow-hidden relative">
        {/* Main Image (Large) */}
        <div
          className="col-span-2 row-span-2 relative cursor-pointer group overflow-hidden"
          onClick={() => openLightbox(0)}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
          <Image
            src={safeImages[0]}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
        </div>

        {/* Secondary Images */}
        {displayImages.slice(1).map((img, index) => (
          <div
            key={index}
            className="relative cursor-pointer group overflow-hidden bg-muted"
            onClick={() => openLightbox(index + 1)}
          >
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
            <Image
              src={img}
              alt={`${title} - ${index + 2}`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        ))}

        {/* Empty slots filler if less than 5 images */}
        {Array.from({ length: Math.max(0, 4 - (safeImages.length - 1)) }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-muted flex items-center justify-center text-muted-foreground/30">
            <ImageIcon className="h-8 w-8" />
          </div>
        ))}

        {/* "View All" Button Overlay */}
        <div className="absolute bottom-4 right-4 z-20">
          <Button
            variant="secondary"
            size="sm"
            className="shadow-lg border border-white/20 hover:scale-105 transition-transform font-medium"
            onClick={() => openLightbox(0)}
          >
            <Grid3X3 className="mr-2 h-4 w-4" />
            Ver todas as fotos
          </Button>
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0 bg-black text-white border-0 flex flex-col items-center justify-center outline-none">
          <DialogTitle className="sr-only">{title} - Galeria de Imagens</DialogTitle>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20 z-50 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="relative w-full h-full flex items-center justify-center group">
            {/* Nav Prev */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 h-12 w-12 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 hidden md:flex"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {/* Main Image */}
          <div className="relative w-full h-[85vh]">
            <Image
              src={safeImages[currentImage]}
              alt={`${title} - Visualização em tela cheia`}
              fill
              className="object-contain"
              quality={100}
            />
          </div>

            {/* Nav Next */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 h-12 w-12 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 hidden md:flex"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Caption / Counter */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium border border-white/10">
              {currentImage + 1} / {safeImages.length} • {title}
            </div>
          </div>

          {/* Thumbnails Strip (Desktop only, small) */}
          <div className="absolute bottom-4 left-0 right-0 h-16 flex justify-center gap-2 overflow-x-auto px-4 scrollbar-hide">
            {safeImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={cn(
                  "relative w-12 h-12 rounded-md overflow-hidden transition-all border-2",
                  currentImage === idx ? "border-white opacity-100 scale-110" : "border-transparent opacity-50 hover:opacity-80"
                )}
              >
                <Image src={img} alt={`Imagem ${idx + 1} do empreendimento`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
