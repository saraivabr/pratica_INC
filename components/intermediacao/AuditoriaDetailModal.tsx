"use client"

import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  PlusCircle,
  Pencil,
  Trash2,
  X,
  User,
  Clock,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AuditoriaDiff } from "./AuditoriaDiff"
import type { LogAuditoria, OperacaoAuditoria, EntidadeAuditoria } from "./types"

interface AuditoriaDetailModalProps {
  log: LogAuditoria | null
  open: boolean
  onClose: () => void
  onIrParaRegistro?: (entidade: EntidadeAuditoria, registroId: string) => void
}

const operacaoConfig: Record<
  OperacaoAuditoria,
  { icon: typeof PlusCircle; color: string; bgColor: string; label: string }
> = {
  create: {
    icon: PlusCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Criacao",
  },
  update: {
    icon: Pencil,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Atualizacao",
  },
  delete: {
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
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

function InfoItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof User
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

export function AuditoriaDetailModal({
  log,
  open,
  onClose,
  onIrParaRegistro,
}: AuditoriaDetailModalProps) {
  if (!log) return null

  const config = operacaoConfig[log.operacao]
  const Icon = config.icon
  const timestamp =
    typeof log.timestamp === "string" ? parseISO(log.timestamp) : log.timestamp
  const entidadeLabel = entidadeLabels[log.entidade] || log.entidade

  const temDiff =
    log.operacao === "update" &&
    log.dadosAnteriores &&
    log.dadosNovos &&
    log.camposAlterados &&
    log.camposAlterados.length > 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                config.bgColor
              )}
            >
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {config.label} de {entidadeLabel}
                {log.registroCodigo && (
                  <Badge variant="outline" className="font-mono">
                    #{log.registroCodigo}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Detalhes completos da operacao de auditoria
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Informacoes principais */}
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={Clock}
                label="Data e Hora"
                value={format(timestamp, "dd/MM/yyyy 'as' HH:mm:ss", {
                  locale: ptBR,
                })}
              />
              <InfoItem
                icon={User}
                label="Usuario"
                value={
                  <span>
                    {log.usuarioNome}
                    {log.usuarioEmail && (
                      <span className="text-muted-foreground text-xs block">
                        {log.usuarioEmail}
                      </span>
                    )}
                  </span>
                }
              />
              {log.ip && (
                <InfoItem icon={Globe} label="Endereco IP" value={log.ip} />
              )}
              <InfoItem
                icon={FileText}
                label="ID do Registro"
                value={
                  <span className="font-mono text-xs">{log.registroId}</span>
                }
              />
            </div>

            {/* Justificativa */}
            {log.justificativa && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Justificativa</h4>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-foreground italic">
                      &quot;{log.justificativa}&quot;
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Diff visual */}
            {temDiff && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Alteracoes</h4>
                  <AuditoriaDiff
                    before={log.dadosAnteriores as Record<string, unknown>}
                    after={log.dadosNovos as Record<string, unknown>}
                    fieldsChanged={log.camposAlterados!}
                  />
                </div>
              </>
            )}

            {/* Dados de criacao */}
            {log.operacao === "create" && log.dadosNovos && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Dados Criados</h4>
                  <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-900/10">
                    <div className="p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(log.dadosNovos, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Dados de remocao */}
            {log.operacao === "delete" && log.dadosAnteriores && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Dados Removidos</h4>
                  <div className="rounded-lg border bg-red-50/50 dark:bg-red-900/10">
                    <div className="p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(log.dadosAnteriores, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Informacoes Adicionais
                  </h4>
                  <div className="rounded-lg border bg-muted/30">
                    <div className="p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {onIrParaRegistro && log.operacao !== "delete" && (
            <Button
              onClick={() => onIrParaRegistro(log.entidade, log.registroId)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para Registro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
