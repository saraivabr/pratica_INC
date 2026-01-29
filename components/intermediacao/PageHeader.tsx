"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href: string
}

interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  acoes?: React.ReactNode
  breadcrumb?: BreadcrumbItem[]
  className?: string
}

export function PageHeader({
  titulo,
  subtitulo,
  acoes,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 mb-6", className)}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav
          className="flex items-center gap-1.5 text-xs sm:text-sm"
          aria-label="Breadcrumb"
        >
          <Link
            href="/admin/intermediacao"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Intermediacao</span>
          </Link>

          {breadcrumb.map((item, index) => (
            <div key={item.href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              {index === breadcrumb.length - 1 ? (
                <span className="font-medium text-foreground truncate max-w-[150px] sm:max-w-[250px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-[150px]"
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {titulo}
          </h2>
          {subtitulo && (
            <p className="text-sm text-muted-foreground">{subtitulo}</p>
          )}
        </div>

        {/* Acoes */}
        {acoes && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {acoes}
          </div>
        )}
      </div>
    </div>
  )
}
