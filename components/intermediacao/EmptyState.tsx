"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PackageOpen } from "lucide-react"

interface EmptyStateProps {
  titulo: string
  descricao: string
  icone?: React.ReactNode
  acao?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  titulo,
  descricao,
  icone,
  acao,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="pt-10 pb-10">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Icone */}
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            {icone || <PackageOpen className="h-8 w-8" />}
          </div>

          {/* Texto */}
          <div className="space-y-2 max-w-sm">
            <h3 className="text-lg font-semibold">{titulo}</h3>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>

          {/* Acao */}
          {acao && (
            <Button onClick={acao.onClick} className="mt-2">
              {acao.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
