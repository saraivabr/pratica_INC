"use client"

import { useEffect, useState } from "react"
import { FileText, Download, FileSpreadsheet, Image as ImageIcon, BookOpen, Loader2, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Material {
  tipo: "tabela" | "ficha_tecnica" | "book" | "apresentacao" | "outro"
  tipoNome: string
  nomeOriginal: string
  arquivo: string
  url: string
  tamanho: number
  dataAtualizacao: string
}

interface EmpreendimentoMateriais {
  id: number
  nome: string
  materiais: Material[]
}

interface MateriaisSectionProps {
  empreendimentoId: string
}

const iconMap = {
  tabela: FileSpreadsheet,
  ficha_tecnica: FileText,
  book: BookOpen,
  apresentacao: ImageIcon,
  outro: FileText,
}

const colorMap = {
  tabela: "bg-blue-100 text-blue-700",
  ficha_tecnica: "bg-purple-100 text-purple-700",
  book: "bg-emerald-100 text-emerald-700",
  apresentacao: "bg-orange-100 text-orange-700",
  outro: "bg-gray-100 text-gray-700",
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url) || url.includes('/images/')
}

export function MateriaisSection({ empreendimentoId }: MateriaisSectionProps) {
  const [materiais, setMateriais] = useState<EmpreendimentoMateriais | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  useEffect(() => {
    async function fetchMateriais() {
      try {
        setLoading(true)
        const res = await fetch(`/api/materiais?empreendimentoId=${empreendimentoId}`)
        const data = await res.json()
        if (data.success && data.data) {
          setMateriais(data.data)
        }
      } catch (err) {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchMateriais()
  }, [empreendimentoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!materiais || materiais.materiais.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Nenhum material disponível</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Materiais serão adicionados em breve</p>
        </CardContent>
      </Card>
    )
  }

  // Separate documents from floor plans (images)
  const documents = materiais.materiais.filter(m => !isImageUrl(m.url))
  const floorPlans = materiais.materiais.filter(m => isImageUrl(m.url))

  return (
    <div className="space-y-8">
      {/* Documents Section */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Documentos ({documents.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((material, index) => {
              const Icon = iconMap[material.tipo] || FileText
              const colorClass = colorMap[material.tipo] || colorMap.outro

              return (
                <a
                  key={index}
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <Card className="border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all duration-300">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110", colorClass)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 group-hover:text-emerald-600 transition-colors truncate">
                            {material.tipoNome}
                          </h4>
                          {(material.tamanho > 0 || material.dataAtualizacao) && (
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                              {material.tamanho > 0 && <span>{formatFileSize(material.tamanho)}</span>}
                              {material.dataAtualizacao && <span>{material.dataAtualizacao}</span>}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-600">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Floor Plans Gallery */}
      {floorPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Plantas ({floorPlans.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {floorPlans.map((plan, index) => (
              <button
                key={index}
                onClick={() => setLightboxIdx(index)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 hover:border-emerald-400 transition-all hover:shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan.url}
                  alt={plan.tipoNome}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{plan.tipoNome}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && floorPlans[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1) }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {lightboxIdx < floorPlans.length - 1 && (
            <button
              className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1) }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={floorPlans[lightboxIdx].url}
              alt={floorPlans[lightboxIdx].tipoNome}
              className="w-full h-full object-contain rounded-lg"
            />
            <p className="text-center text-white/80 text-sm mt-3">
              {floorPlans[lightboxIdx].tipoNome}
              <span className="text-white/50 ml-2">
                {lightboxIdx + 1} / {floorPlans.length}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
