"use client"

import { useEffect, useState } from "react"
import { FileText, Download, FileSpreadsheet, Image, BookOpen, ExternalLink, Loader2 } from "lucide-react"
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
  apresentacao: Image,
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
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MateriaisSection({ empreendimentoId }: MateriaisSectionProps) {
  const [materiais, setMateriais] = useState<EmpreendimentoMateriais | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setError("Erro ao carregar materiais")
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

  if (error || !materiais || materiais.materiais.length === 0) {
    return null // Não mostrar seção se não há materiais
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {materiais.materiais.map((material, index) => {
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
              <Card className="border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all duration-300 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn("p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110", colorClass)}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {material.tipoNome}
                      </h4>
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {material.nomeOriginal}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{formatFileSize(material.tamanho)}</span>
                        <span>PDF</span>
                        <span>{material.dataAtualizacao}</span>
                      </div>
                    </div>

                    {/* Download Icon */}
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                        <Download className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </a>
          )
        })}
      </div>

      {/* Dica */}
      <p className="text-xs text-gray-400 text-center mt-4">
        Clique em um material para abrir ou baixar o PDF
      </p>
    </div>
  )
}
