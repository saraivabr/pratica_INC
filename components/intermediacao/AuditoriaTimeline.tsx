"use client"

import { useMemo, useCallback, useRef, useEffect } from "react"
import {
  format,
  isToday,
  isYesterday,
  parseISO,
  isSameDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  PlusCircle,
  Pencil,
  Trash2,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogAuditoria, OperacaoAuditoria, EntidadeAuditoria } from "./types"

interface AuditoriaTimelineProps {
  logs: LogAuditoria[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  onLogClick?: (log: LogAuditoria) => void
}

const operacaoConfig: Record<
  OperacaoAuditoria,
  { icon: typeof PlusCircle; color: string; bgColor: string; label: string }
> = {
  create: {
    icon: PlusCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500",
    label: "criou",
  },
  update: {
    icon: Pencil,
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    label: "atualizou",
  },
  delete: {
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-500",
    label: "removeu",
  },
}

const entidadeLabels: Record<EntidadeAuditoria, string> = {
  vendas: "venda",
  beneficiarios: "beneficiario",
  parcelas: "parcela",
  pagamentos: "pagamento",
  comissoes: "comissao",
  distribuicoes: "distribuicao",
}

function formatarDataGrupo(date: Date): string {
  if (isToday(date)) {
    return `Hoje, ${format(date, "d 'de' MMMM", { locale: ptBR })}`
  }
  if (isYesterday(date)) {
    return `Ontem, ${format(date, "d 'de' MMMM", { locale: ptBR })}`
  }
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
}

function formatarResumoAlteracao(log: LogAuditoria): string | null {
  if (log.operacao === "update" && log.camposAlterados?.length) {
    const campo = log.camposAlterados[0]
    const antes = log.dadosAnteriores?.[campo]
    const depois = log.dadosNovos?.[campo]
    if (antes !== undefined && depois !== undefined) {
      return `${campo}: ${String(antes)} -> ${String(depois)}`
    }
  }
  return null
}

interface LogsAgrupados {
  data: string
  logs: LogAuditoria[]
}

function agruparLogsPorData(logs: LogAuditoria[]): LogsAgrupados[] {
  const grupos: Map<string, LogAuditoria[]> = new Map()

  for (const log of logs) {
    const timestamp =
      typeof log.timestamp === "string" ? parseISO(log.timestamp) : log.timestamp
    const dataKey = format(timestamp, "yyyy-MM-dd")

    if (!grupos.has(dataKey)) {
      grupos.set(dataKey, [])
    }
    grupos.get(dataKey)!.push(log)
  }

  return Array.from(grupos.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([data, logs]) => ({
      data,
      logs: logs.sort((a, b) => {
        const timestampA =
          typeof a.timestamp === "string" ? parseISO(a.timestamp) : a.timestamp
        const timestampB =
          typeof b.timestamp === "string" ? parseISO(b.timestamp) : b.timestamp
        return timestampB.getTime() - timestampA.getTime()
      }),
    }))
}

function TimelineItemSkeleton() {
  return (
    <div className="flex gap-4 py-3">
      <div className="flex flex-col items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-full w-0.5 mt-2" />
      </div>
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

function TimelineItem({
  log,
  isLast,
  onClick,
}: {
  log: LogAuditoria
  isLast: boolean
  onClick?: () => void
}) {
  const config = operacaoConfig[log.operacao]
  const Icon = config.icon
  const timestamp =
    typeof log.timestamp === "string" ? parseISO(log.timestamp) : log.timestamp
  const resumo = formatarResumoAlteracao(log)
  const entidadeLabel = entidadeLabels[log.entidade] || log.entidade

  return (
    <div
      className={cn(
        "group relative flex gap-4 py-3 px-4 rounded-lg transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            config.bgColor
          )}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border mt-2" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">
                {format(timestamp, "HH:mm")}
              </span>
              <span className="text-sm text-foreground">
                <span className="font-medium">{log.usuarioNome}</span>{" "}
                <span className={config.color}>{config.label}</span>{" "}
                <span>{entidadeLabel}</span>{" "}
                {log.registroCodigo && (
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    #{log.registroCodigo}
                  </span>
                )}
              </span>
            </div>

            {resumo && (
              <p className="mt-1 text-sm text-muted-foreground truncate">
                {resumo}
              </p>
            )}

            {log.justificativa && (
              <p className="mt-1 text-sm text-muted-foreground italic">
                &quot;{log.justificativa}&quot;
              </p>
            )}
          </div>

          {onClick && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AuditoriaTimeline({
  logs,
  loading = false,
  onLoadMore,
  hasMore = false,
  onLogClick,
}: AuditoriaTimelineProps) {
  const logsAgrupados = useMemo(() => agruparLogsPorData(logs), [logs])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [onLoadMore, hasMore, loading])

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="rounded-lg border bg-card">
          <TimelineItemSkeleton />
          <TimelineItemSkeleton />
          <TimelineItemSkeleton />
        </div>
      </div>
    )
  }

  if (!loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <PlusCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Nao ha logs de auditoria para os filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-6 pr-4">
        {logsAgrupados.map(({ data, logs: logsDoGrupo }) => {
          const dataObj = parseISO(data)
          return (
            <div key={data}>
              <h3 className="text-sm font-semibold text-foreground mb-3 capitalize sticky top-0 bg-background py-2 z-10">
                {formatarDataGrupo(dataObj)}
              </h3>
              <div className="rounded-lg border bg-card">
                {logsDoGrupo.map((log, index) => (
                  <TimelineItem
                    key={log.id}
                    log={log}
                    isLast={index === logsDoGrupo.length - 1}
                    onClick={onLogClick ? () => onLogClick(log) : undefined}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Load more trigger */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-4"
          >
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando mais...</span>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
              >
                Carregar mais
              </Button>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
