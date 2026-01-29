"use client"

import { useMemo } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  AlertTriangle,
  Trash2,
  Undo2,
  TrendingDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { formatarMoeda } from "@/lib/intermediacao/formatters"
import type { AuditoriaAlerta, LogAuditoria } from "./types"

interface AuditoriaAlertsProps {
  alertas?: AuditoriaAlerta[]
  logs?: LogAuditoria[]
  limite?: number
  loading?: boolean
  onAlertaClick?: (alerta: AuditoriaAlerta) => void
}

const tipoConfig: Record<
  AuditoriaAlerta["tipo"],
  { icon: typeof AlertTriangle; color: string; bgColor: string }
> = {
  delete: {
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  desfazer_pagamento: {
    icon: Undo2,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  alteracao_valor: {
    icon: TrendingDown,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  outro: {
    icon: AlertCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
}

const severidadeConfig: Record<
  AuditoriaAlerta["severidade"],
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  baixa: { variant: "outline", label: "Baixa" },
  media: { variant: "secondary", label: "Media" },
  alta: { variant: "default", label: "Alta" },
  critica: { variant: "destructive", label: "Critica" },
}

// Funcao para detectar alertas a partir de logs
function detectarAlertas(logs: LogAuditoria[], limite: number): AuditoriaAlerta[] {
  const alertas: AuditoriaAlerta[] = []

  for (const log of logs) {
    // Detectar deletes
    if (log.operacao === "delete") {
      alertas.push({
        id: `alert-${log.id}`,
        log,
        tipo: "delete",
        descricao: `${log.usuarioNome} removeu ${log.entidade} #${log.registroCodigo || log.registroId.substring(0, 8)}`,
        severidade: "alta",
        timestamp: log.timestamp,
      })
    }

    // Detectar desfazer pagamento (update em pagamento com status mudando para cancelado/estornado)
    if (
      log.operacao === "update" &&
      log.entidade === "pagamentos" &&
      log.dadosNovos?.status === "cancelado"
    ) {
      alertas.push({
        id: `alert-${log.id}`,
        log,
        tipo: "desfazer_pagamento",
        descricao: `${log.usuarioNome} cancelou pagamento #${log.registroCodigo || log.registroId.substring(0, 8)}`,
        severidade: "critica",
        timestamp: log.timestamp,
      })
    }

    // Detectar alteracao de valor > 10%
    if (
      log.operacao === "update" &&
      log.camposAlterados?.includes("valor") &&
      log.dadosAnteriores?.valor &&
      log.dadosNovos?.valor
    ) {
      const valorAnterior = log.dadosAnteriores.valor as number
      const valorNovo = log.dadosNovos.valor as number
      const diferencaPercentual = Math.abs(
        ((valorNovo - valorAnterior) / valorAnterior) * 100
      )

      if (diferencaPercentual > 10) {
        alertas.push({
          id: `alert-${log.id}`,
          log,
          tipo: "alteracao_valor",
          descricao: `${log.usuarioNome} alterou valor em ${diferencaPercentual.toFixed(1)}%`,
          severidade: diferencaPercentual > 30 ? "critica" : "alta",
          timestamp: log.timestamp,
        })
      }
    }
  }

  // Ordenar por timestamp (mais recente primeiro) e limitar
  return alertas
    .sort((a, b) => {
      const timestampA =
        typeof a.timestamp === "string" ? parseISO(a.timestamp) : a.timestamp
      const timestampB =
        typeof b.timestamp === "string" ? parseISO(b.timestamp) : b.timestamp
      return timestampB.getTime() - timestampA.getTime()
    })
    .slice(0, limite)
}

function AlertaSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg border">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  )
}

function AlertaItem({
  alerta,
  onClick,
}: {
  alerta: AuditoriaAlerta
  onClick?: () => void
}) {
  const config = tipoConfig[alerta.tipo]
  const severidade = severidadeConfig[alerta.severidade]
  const Icon = config.icon
  const timestamp =
    typeof alerta.timestamp === "string"
      ? parseISO(alerta.timestamp)
      : alerta.timestamp

  // Extrair valor se disponivel
  const valor =
    alerta.log.dadosNovos?.valor || alerta.log.dadosAnteriores?.valor

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg border transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
          config.bgColor
        )}
      >
        <Icon className={cn("h-5 w-5", config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{alerta.descricao}</p>
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>

        {alerta.log.justificativa && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            &quot;{alerta.log.justificativa}&quot;
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={severidade.variant} className="text-[10px] h-5">
            {severidade.label}
          </Badge>

          {typeof valor === "number" && (
            <span className="text-xs text-muted-foreground">
              Valor: {formatarMoeda(valor)}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            {format(timestamp, "dd/MM HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  )
}

export function AuditoriaAlerts({
  alertas,
  logs,
  limite = 10,
  loading = false,
  onAlertaClick,
}: AuditoriaAlertsProps) {
  // Usar alertas fornecidos ou detectar a partir dos logs
  const alertasExibir = useMemo(() => {
    if (alertas && alertas.length > 0) {
      return alertas.slice(0, limite)
    }
    if (logs && logs.length > 0) {
      return detectarAlertas(logs, limite)
    }
    return []
  }, [alertas, logs, limite])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Operacoes Criticas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AlertaSkeleton />
            <AlertaSkeleton />
            <AlertaSkeleton />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (alertasExibir.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Operacoes Criticas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma operacao critica recente
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O sistema esta funcionando normalmente
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Operacoes Criticas</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {alertasExibir.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {alertasExibir.map((alerta) => (
              <AlertaItem
                key={alerta.id}
                alerta={alerta}
                onClick={
                  onAlertaClick ? () => onAlertaClick(alerta) : undefined
                }
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
