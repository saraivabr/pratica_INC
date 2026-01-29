"use client"

import { useMemo } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  PlusCircle,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LogAuditoria, OperacaoAuditoria, EntidadeAuditoria } from "./types"

interface AuditoriaTableProps {
  logs: LogAuditoria[]
  onRowClick?: (log: LogAuditoria) => void
  loading?: boolean
}

const operacaoConfig: Record<
  OperacaoAuditoria,
  { icon: typeof PlusCircle; variant: "default" | "secondary" | "destructive"; label: string }
> = {
  create: {
    icon: PlusCircle,
    variant: "default",
    label: "Criacao",
  },
  update: {
    icon: Pencil,
    variant: "secondary",
    label: "Atualizacao",
  },
  delete: {
    icon: Trash2,
    variant: "destructive",
    label: "Remocao",
  },
}

const entidadeConfig: Record<EntidadeAuditoria, { label: string; className: string }> = {
  vendas: { label: "Vendas", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  beneficiarios: { label: "Beneficiarios", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  parcelas: { label: "Parcelas", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  pagamentos: { label: "Pagamentos", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  comissoes: { label: "Comissoes", className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  distribuicoes: { label: "Distribuicoes", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
}

function formatarResumo(log: LogAuditoria): string {
  if (log.operacao === "create") {
    return "Registro criado"
  }

  if (log.operacao === "delete") {
    return "Registro removido"
  }

  if (log.camposAlterados && log.camposAlterados.length > 0) {
    const campos = log.camposAlterados.slice(0, 2).join(", ")
    const extras = log.camposAlterados.length - 2
    return extras > 0 ? `${campos} +${extras}` : campos
  }

  return "Dados atualizados"
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8" />
      </TableCell>
    </TableRow>
  )
}

export function AuditoriaTable({
  logs,
  onRowClick,
  loading = false,
}: AuditoriaTableProps) {
  if (loading && logs.length === 0) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Data/Hora</TableHead>
              <TableHead className="w-[150px]">Usuario</TableHead>
              <TableHead className="w-[100px]">Operacao</TableHead>
              <TableHead className="w-[120px]">Entidade</TableHead>
              <TableHead className="w-[120px]">Registro</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead className="w-[60px]">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!loading && logs.length === 0) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Data/Hora</TableHead>
              <TableHead className="w-[150px]">Usuario</TableHead>
              <TableHead className="w-[100px]">Operacao</TableHead>
              <TableHead className="w-[120px]">Entidade</TableHead>
              <TableHead className="w-[120px]">Registro</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead className="w-[60px]">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <div className="text-muted-foreground">
                  Nenhum registro de auditoria encontrado
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Data/Hora</TableHead>
            <TableHead className="w-[150px]">Usuario</TableHead>
            <TableHead className="w-[100px]">Operacao</TableHead>
            <TableHead className="w-[120px]">Entidade</TableHead>
            <TableHead className="w-[120px]">Registro</TableHead>
            <TableHead>Resumo</TableHead>
            <TableHead className="w-[60px]">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const timestamp =
              typeof log.timestamp === "string"
                ? parseISO(log.timestamp)
                : log.timestamp
            const opConfig = operacaoConfig[log.operacao]
            const entConfig = entidadeConfig[log.entidade] || {
              label: log.entidade,
              className: "bg-gray-100 text-gray-700",
            }
            const OpIcon = opConfig.icon

            return (
              <TableRow
                key={log.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  log.isCritico && "bg-red-50/50 dark:bg-red-900/10"
                )}
                onClick={() => onRowClick?.(log)}
              >
                <TableCell className="font-medium text-sm">
                  <div>{format(timestamp, "dd/MM/yyyy")}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(timestamp, "HH:mm:ss")}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium truncate max-w-[140px]">
                    {log.usuarioNome}
                  </div>
                  {log.usuarioEmail && (
                    <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {log.usuarioEmail}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={opConfig.variant} className="gap-1">
                    <OpIcon className="h-3 w-3" />
                    {opConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                      entConfig.className
                    )}
                  >
                    {entConfig.label}
                  </span>
                </TableCell>
                <TableCell>
                  {log.registroCodigo ? (
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      #{log.registroCodigo}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground truncate block max-w-[100px]">
                      {log.registroId.substring(0, 8)}...
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {formatarResumo(log)}
                  </div>
                  {log.justificativa && (
                    <div className="text-xs text-muted-foreground italic truncate max-w-[300px]">
                      &quot;{log.justificativa}&quot;
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onRowClick?.(log)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
