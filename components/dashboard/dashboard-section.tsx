"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardSectionProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  priority?: "high" | "normal" | "low"
}

/**
 * Componente de seção do dashboard com hierarquia visual clara
 * 
 * Organiza conteúdo em seções bem definidas com:
 * - Título e descrição claros
 * - Ícone visual (opcional)
 * - Ação no canto (opcional, ex: botão "Ver mais")
 * - Prioridade visual (alta/normal/baixa)
 */
export function DashboardSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  priority = "normal",
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        "space-y-4",
        priority === "high" && "relative",
        className
      )}
    >
      {/* Header da seção */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon
                className={cn(
                  "h-5 w-5",
                  priority === "high" && "text-primary",
                  priority === "normal" && "text-muted-foreground",
                  priority === "low" && "text-muted-foreground/70"
                )}
              />
            )}
            <h2
              className={cn(
                "font-semibold tracking-tight",
                priority === "high" && "text-2xl",
                priority === "normal" && "text-xl",
                priority === "low" && "text-lg text-muted-foreground"
              )}
            >
              {title}
            </h2>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Conteúdo da seção */}
      <div>{children}</div>

      {/* Indicador visual de prioridade alta */}
      {priority === "high" && (
        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary rounded-full" />
      )}
    </section>
  )
}

/**
 * Componente para separar seções visualmente
 */
export function DashboardDivider({ className }: { className?: string }) {
  return <div className={cn("border-t border-border my-8", className)} />
}

/**
 * Container principal do dashboard com espaçamento consistente
 */
export function DashboardContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("container px-4 py-6 space-y-8 animate-page-in", className)}>
      {children}
    </div>
  )
}
