"use client"

import { useState, useMemo } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  PlusCircle,
  Pencil,
  Trash2,
  History,
  GitCompare,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AuditoriaDiff } from "./AuditoriaDiff"
import type { LogAuditoria, OperacaoAuditoria, EntidadeAuditoria } from "./types"

interface RegistroHistoricoProps {
  tabela: EntidadeAuditoria
  registroId: string
  logs?: LogAuditoria[]
  loading?: boolean
  onLoadLogs?: () => void
}

const operacaoConfig: Record<
  OperacaoAuditoria,
  { icon: typeof PlusCircle; color: string; bgColor: string; label: string }
> = {
  create: {
    icon: PlusCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500",
    label: "Criacao",
  },
  update: {
    icon: Pencil,
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    label: "Atualizacao",
  },
  delete: {
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-500",
    label: "Remocao",
  },
}

const entidadeLabels: Record<EntidadeAuditoria, string> = {
  vendas: "Venda",
  beneficiarios: "Beneficiario",
  parcelas: "Parcela",
  pagamentos: "Pagamento",
  comissoes: "Comissao",
  distribuicoes: "Distribuicao",
}

interface VersaoComparacao {
  versao1Index: number
  versao2Index: number
}

function HistoricoItemSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-full w-0.5 mt-2" />
      </div>
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

function HistoricoItem({
  log,
  index,
  isLast,
  onExpandToggle,
  isExpanded,
  onSelectForComparison,
  selectedForComparison,
}: {
  log: LogAuditoria
  index: number
  isLast: boolean
  onExpandToggle: () => void
  isExpanded: boolean
  onSelectForComparison: (index: number) => void
  selectedForComparison: boolean
}) {
  const config = operacaoConfig[log.operacao]
  const Icon = config.icon
  const timestamp =
    typeof log.timestamp === "string" ? parseISO(log.timestamp) : log.timestamp

  const temDiff =
    log.operacao === "update" &&
    log.dadosAnteriores &&
    log.dadosNovos &&
    log.camposAlterados &&
    log.camposAlterados.length > 0

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-4 top-0 bottom-0 flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full z-10",
            config.bgColor
          )}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className="ml-14 pb-6">
        <Collapsible open={isExpanded} onOpenChange={onExpandToggle}>
          <div className="rounded-lg border bg-card">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        log.operacao === "delete" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {config.label}
                    </Badge>
                    <span className="text-sm font-medium">
                      {format(timestamp, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    por {log.usuarioNome}
                    {log.camposAlterados && log.camposAlterados.length > 0 && (
                      <span className="ml-2">
                        ({log.camposAlterados.length} campo
                        {log.camposAlterados.length > 1 ? "s" : ""} alterado
                        {log.camposAlterados.length > 1 ? "s" : ""})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedForComparison ? "default" : "ghost"}
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectForComparison(index)
                    }}
                    title="Selecionar para comparacao"
                  >
                    <GitCompare className="h-4 w-4" />
                  </Button>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t p-4">
                {temDiff ? (
                  <AuditoriaDiff
                    before={log.dadosAnteriores as Record<string, unknown>}
                    after={log.dadosNovos as Record<string, unknown>}
                    fieldsChanged={log.camposAlterados!}
                  />
                ) : log.operacao === "create" && log.dadosNovos ? (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Dados Iniciais</h4>
                    <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(log.dadosNovos, null, 2)}
                    </pre>
                  </div>
                ) : log.operacao === "delete" && log.dadosAnteriores ? (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Dados Removidos</h4>
                    <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(log.dadosAnteriores, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Detalhes nao disponiveis
                  </p>
                )}

                {log.justificativa && (
                  <div className="mt-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-md">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Justificativa
                    </p>
                    <p className="text-sm mt-1">&quot;{log.justificativa}&quot;</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  )
}

function CompararVersoesModal({
  open,
  onClose,
  logs,
  versao1Index,
  versao2Index,
}: {
  open: boolean
  onClose: () => void
  logs: LogAuditoria[]
  versao1Index: number
  versao2Index: number
}) {
  const log1 = logs[versao1Index]
  const log2 = logs[versao2Index]

  if (!log1 || !log2) return null

  const timestamp1 =
    typeof log1.timestamp === "string"
      ? parseISO(log1.timestamp)
      : log1.timestamp
  const timestamp2 =
    typeof log2.timestamp === "string"
      ? parseISO(log2.timestamp)
      : log2.timestamp

  // Pegar estado do registro em cada versao
  const estado1 = log1.dadosNovos || log1.dadosAnteriores || {}
  const estado2 = log2.dadosNovos || log2.dadosAnteriores || {}

  // Encontrar todos os campos que diferem
  const todosOsCampos = new Set([
    ...Object.keys(estado1),
    ...Object.keys(estado2),
  ])
  const camposDiferentes = Array.from(todosOsCampos).filter(
    (campo) => JSON.stringify(estado1[campo]) !== JSON.stringify(estado2[campo])
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparar Versoes
          </DialogTitle>
          <DialogDescription>
            Comparando alteracoes entre duas versoes do registro
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Versao Anterior</p>
            <p className="text-sm font-medium">
              {format(timestamp1, "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Versao Posterior</p>
            <p className="text-sm font-medium">
              {format(timestamp2, "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh]">
          {camposDiferentes.length > 0 ? (
            <AuditoriaDiff
              before={estado1 as Record<string, unknown>}
              after={estado2 as Record<string, unknown>}
              fieldsChanged={camposDiferentes}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma diferenca encontrada entre as versoes
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RegistroHistorico({
  tabela,
  registroId,
  logs = [],
  loading = false,
  onLoadLogs,
}: RegistroHistoricoProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [selectedForComparison, setSelectedForComparison] = useState<number[]>([])
  const [comparacaoAberta, setComparacaoAberta] = useState(false)

  // Ordenar logs por timestamp (mais antigo primeiro para timeline)
  const logsOrdenados = useMemo(() => {
    return [...logs].sort((a, b) => {
      const timestampA =
        typeof a.timestamp === "string" ? parseISO(a.timestamp) : a.timestamp
      const timestampB =
        typeof b.timestamp === "string" ? parseISO(b.timestamp) : b.timestamp
      return timestampA.getTime() - timestampB.getTime()
    })
  }, [logs])

  const handleExpandToggle = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const handleSelectForComparison = (index: number) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      }
      if (prev.length >= 2) {
        return [prev[1], index]
      }
      return [...prev, index]
    })
  }

  const handleCompare = () => {
    if (selectedForComparison.length === 2) {
      setComparacaoAberta(true)
    }
  }

  const entidadeLabel = entidadeLabels[tabela] || tabela

  if (loading && logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Historico do Registro</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <HistoricoItemSkeleton />
            <HistoricoItemSkeleton />
            <HistoricoItemSkeleton />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!loading && logs.length === 0 && onLoadLogs) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Historico do Registro</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Clique para carregar o historico completo deste registro
            </p>
            <Button onClick={onLoadLogs}>
              <History className="h-4 w-4 mr-2" />
              Carregar Historico
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">
                Historico: {entidadeLabel}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {logs.length} alteracao{logs.length !== 1 ? "oes" : ""}
              </Badge>
            </div>

            {selectedForComparison.length === 2 && (
              <Button size="sm" onClick={handleCompare}>
                <GitCompare className="h-4 w-4 mr-2" />
                Comparar Versoes
              </Button>
            )}
          </div>
          {selectedForComparison.length === 1 && (
            <p className="text-xs text-muted-foreground">
              Selecione outra versao para comparar
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="relative">
              {logsOrdenados.map((log, index) => (
                <HistoricoItem
                  key={log.id}
                  log={log}
                  index={index}
                  isLast={index === logsOrdenados.length - 1}
                  onExpandToggle={() => handleExpandToggle(index)}
                  isExpanded={expandedItems.has(index)}
                  onSelectForComparison={handleSelectForComparison}
                  selectedForComparison={selectedForComparison.includes(index)}
                />
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Carregando...
                </span>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <CompararVersoesModal
        open={comparacaoAberta}
        onClose={() => setComparacaoAberta(false)}
        logs={logsOrdenados}
        versao1Index={Math.min(...selectedForComparison)}
        versao2Index={Math.max(...selectedForComparison)}
      />
    </>
  )
}
