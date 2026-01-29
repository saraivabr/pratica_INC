"use client"

import Link from "next/link"
import { Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface LessonItemProps {
  slug: string
  titulo: string
  resumo?: string
  duracao_minutos: number
  ordem: number
  completed: boolean
  categoriaSlug: string
  moduloSlug: string
  isNext?: boolean
}

export function LessonItem({
  slug,
  titulo,
  resumo,
  duracao_minutos,
  ordem,
  completed,
  categoriaSlug,
  moduloSlug,
  isNext,
}: LessonItemProps) {
  return (
    <Link
      href={`/academy/${categoriaSlug}/${moduloSlug}/${slug}`}
      className={cn(
        "group flex items-start gap-4 p-4 rounded-xl transition-all duration-200",
        "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
        isNext && "bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
      )}
    >
      {/* Status icon */}
      <div className="pt-0.5 shrink-0">
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : isNext ? (
          <PlayCircle className="h-5 w-5 text-blue-500" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300 dark:text-zinc-600" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">
            {String(ordem).padStart(2, "0")}
          </span>
          <h4
            className={cn(
              "font-medium truncate",
              completed
                ? "text-gray-500 dark:text-gray-400"
                : "text-gray-900 dark:text-white"
            )}
          >
            {titulo}
          </h4>
        </div>

        {resumo && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
            {resumo}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>{duracao_minutos} min de leitura</span>
        </div>
      </div>

      {/* Action hint */}
      <div
        className={cn(
          "shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
          "text-xs font-medium",
          isNext ? "text-blue-500" : "text-gray-500 dark:text-gray-400"
        )}
      >
        {isNext ? "Continuar" : completed ? "Revisar" : "Iniciar"}
      </div>
    </Link>
  )
}
