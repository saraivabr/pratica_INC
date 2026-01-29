"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  tipo: "tabela" | "cards" | "formulario" | "pagina"
  className?: string
  linhas?: number
  colunas?: number
}

export function LoadingState({
  tipo,
  className,
  linhas = 5,
  colunas = 4,
}: LoadingStateProps) {
  if (tipo === "tabela") {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Header da tabela */}
        <div className="flex gap-4 px-4 py-3 border-b">
          {Array.from({ length: colunas }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>

        {/* Linhas */}
        {Array.from({ length: linhas }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-3 border-b">
            {Array.from({ length: colunas }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  "h-4 flex-1",
                  colIndex === 0 && "max-w-[200px]"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (tipo === "cards") {
    return (
      <div
        className={cn(
          "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          className
        )}
      >
        {Array.from({ length: linhas }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (tipo === "formulario") {
    return (
      <div className={cn("space-y-6", className)}>
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    )
  }

  // tipo === "pagina"
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] gap-4",
        className
      )}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">
        Carregando...
      </p>
    </div>
  )
}

/**
 * Skeleton para estatisticas do dashboard
 */
export function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton para lista de itens
 */
export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border rounded-lg"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}
