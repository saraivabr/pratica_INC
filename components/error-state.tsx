"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  message?: string
  error?: Error | string
  onRetry?: () => void
  fullScreen?: boolean
  className?: string
  showDetails?: boolean
}

export function ErrorState({
  title = "Algo deu errado",
  message = "Ocorreu um erro ao carregar os dados. Por favor, tente novamente.",
  error,
  onRetry,
  fullScreen = false,
  className,
  showDetails = false,
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error

  const content = (
    <Card className={cn("border-destructive/50 bg-destructive/5", className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
            {showDetails && errorMessage && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Detalhes do erro
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-w-full">
                  {errorMessage}
                </pre>
              </details>
            )}
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full">{content}</div>
      </div>
    )
  }

  return content
}

/**
 * Componente de erro inline para uso em listas ou seções
 */
export function InlineError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/50 bg-destructive/5">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm" className="gap-2">
          <RefreshCw className="h-3 w-3" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

/**
 * Componente de aviso (warning) para mensagens não-críticas
 */
export function WarningState({
  title,
  message,
  className,
}: {
  title?: string
  message: string
  className?: string
}) {
  return (
    <Card className={cn("border-amber-500/50 bg-amber-500/5", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            {title && <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">{title}</p>}
            <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
