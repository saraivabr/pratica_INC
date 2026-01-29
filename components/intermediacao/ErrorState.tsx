"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, RefreshCw, XCircle, AlertTriangle } from "lucide-react"

type ErrorType = "error" | "warning" | "info"

interface ErrorStateProps {
  titulo?: string
  mensagem: string
  tipo?: ErrorType
  onRetry?: () => void
  className?: string
  showDetails?: boolean
  detalhes?: string
}

const errorConfig: Record<
  ErrorType,
  {
    icon: typeof AlertCircle
    bgColor: string
    iconColor: string
    borderColor: string
  }
> = {
  error: {
    icon: XCircle,
    bgColor: "bg-destructive/5",
    iconColor: "text-destructive",
    borderColor: "border-destructive/50",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-500/5",
    iconColor: "text-amber-500",
    borderColor: "border-amber-500/50",
  },
  info: {
    icon: AlertCircle,
    bgColor: "bg-blue-500/5",
    iconColor: "text-blue-500",
    borderColor: "border-blue-500/50",
  },
}

export function ErrorState({
  titulo = "Algo deu errado",
  mensagem,
  tipo = "error",
  onRetry,
  className,
  showDetails = false,
  detalhes,
}: ErrorStateProps) {
  const config = errorConfig[tipo]
  const Icon = config.icon

  return (
    <Card className={cn(config.borderColor, config.bgColor, className)}>
      <CardContent className="pt-8 pb-8">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Icone */}
          <div
            className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center",
              tipo === "error" && "bg-destructive/10",
              tipo === "warning" && "bg-amber-500/10",
              tipo === "info" && "bg-blue-500/10"
            )}
          >
            <Icon className={cn("h-7 w-7", config.iconColor)} />
          </div>

          {/* Texto */}
          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-semibold">{titulo}</h3>
            <p className="text-sm text-muted-foreground">{mensagem}</p>

            {/* Detalhes expandiveis */}
            {showDetails && detalhes && (
              <details className="mt-3 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Ver detalhes do erro
                </summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto max-w-full max-h-32">
                  {detalhes}
                </pre>
              </details>
            )}
          </div>

          {/* Botao de retry */}
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2 mt-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Erro inline para uso em listas ou secoes
 */
export function InlineErrorState({
  mensagem,
  onRetry,
  className,
}: {
  mensagem: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border border-destructive/50 bg-destructive/5",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm text-destructive">{mensagem}</p>
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
