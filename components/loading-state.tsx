"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

export function LoadingState({
  message = "Carregando...",
  fullScreen = false,
  className,
  size = "md",
}: LoadingStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {content}
      </div>
    )
  }

  return content
}

/**
 * Componente de skeleton para loading de cards
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-6", className)}>
      <div className="space-y-3">
        <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
        <div className="h-8 w-2/3 bg-muted animate-pulse rounded" />
        <div className="space-y-2">
          <div className="h-3 bg-muted animate-pulse rounded" />
          <div className="h-3 w-5/6 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}

/**
 * Componente de skeleton para loading de listas
 */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-border"
        >
          <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
