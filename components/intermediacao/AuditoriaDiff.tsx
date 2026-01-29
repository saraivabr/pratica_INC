"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatarMoeda } from "@/lib/intermediacao/formatters"

interface AuditoriaDiffProps {
  before: Record<string, unknown>
  after: Record<string, unknown>
  fieldsChanged: string[]
}

// Mapeamento de campos para labels legíveis
const fieldLabels: Record<string, string> = {
  status: "Status",
  valor: "Valor",
  valorTotal: "Valor Total",
  valorVenda: "Valor da Venda",
  percentual: "Percentual",
  dataVencimento: "Data de Vencimento",
  dataPagamento: "Data de Pagamento",
  dataVenda: "Data da Venda",
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  cargo: "Cargo",
  observacoes: "Observacoes",
  justificativa: "Justificativa",
  metodoPagamento: "Metodo de Pagamento",
  comprovante: "Comprovante",
  banco: "Banco",
  agencia: "Agencia",
  conta: "Conta",
  pix: "Chave PIX",
  documento: "Documento",
  cpf: "CPF",
  cnpj: "CNPJ",
  endereco: "Endereco",
  numero: "Numero",
  numeroParcela: "Numero da Parcela",
  totalParcelas: "Total de Parcelas",
  empreendimento: "Empreendimento",
  unidade: "Unidade",
  codigo: "Codigo",
}

// Campos que sao valores monetarios
const currencyFields = [
  "valor",
  "valorTotal",
  "valorVenda",
  "valorPago",
  "valorPendente",
  "valorAReceber",
]

// Campos que sao percentuais
const percentFields = ["percentual", "percentualComissao"]

// Campos que sao datas
const dateFields = [
  "dataVencimento",
  "dataPagamento",
  "dataVenda",
  "createdAt",
  "updatedAt",
]

function formatarValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "-"
  }

  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Nao"
  }

  if (currencyFields.includes(campo) && typeof valor === "number") {
    return formatarMoeda(valor)
  }

  if (percentFields.includes(campo) && typeof valor === "number") {
    return `${valor.toFixed(2)}%`
  }

  if (dateFields.includes(campo)) {
    try {
      const date = typeof valor === "string" ? new Date(valor) : valor as Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString("pt-BR")
      }
    } catch {
      return String(valor)
    }
  }

  if (typeof valor === "object") {
    return JSON.stringify(valor)
  }

  return String(valor)
}

function getFieldLabel(field: string): string {
  return fieldLabels[field] || field.charAt(0).toUpperCase() + field.slice(1)
}

export function AuditoriaDiff({
  before,
  after,
  fieldsChanged,
}: AuditoriaDiffProps) {
  const diffItems = useMemo(() => {
    return fieldsChanged.map((field) => ({
      field,
      label: getFieldLabel(field),
      before: formatarValor(field, before[field]),
      after: formatarValor(field, after[field]),
      hasChange: before[field] !== after[field],
    }))
  }, [before, after, fieldsChanged])

  if (diffItems.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nenhuma alteracao identificada.
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[30%]">Campo</TableHead>
            <TableHead className="w-[35%]">Antes</TableHead>
            <TableHead className="w-[35%]">Depois</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {diffItems.map(({ field, label, before: beforeVal, after: afterVal, hasChange }) => (
            <TableRow
              key={field}
              className={cn(hasChange && "bg-amber-50/50 dark:bg-amber-900/10")}
            >
              <TableCell className="font-medium text-sm">{label}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "text-sm",
                    hasChange && "line-through text-muted-foreground"
                  )}
                >
                  {beforeVal}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "text-sm",
                    hasChange && "font-semibold text-foreground"
                  )}
                >
                  {afterVal}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Versao compacta para uso em listas
export function AuditoriaDiffCompact({
  before,
  after,
  fieldsChanged,
  maxFields = 3,
}: AuditoriaDiffProps & { maxFields?: number }) {
  const diffItems = useMemo(() => {
    return fieldsChanged.slice(0, maxFields).map((field) => ({
      field,
      label: getFieldLabel(field),
      before: formatarValor(field, before[field]),
      after: formatarValor(field, after[field]),
    }))
  }, [before, after, fieldsChanged, maxFields])

  const remainingCount = fieldsChanged.length - maxFields

  return (
    <div className="space-y-1">
      {diffItems.map(({ field, label, before: beforeVal, after: afterVal }) => (
        <div key={field} className="text-xs">
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span className="line-through text-muted-foreground/70">
            {beforeVal}
          </span>{" "}
          <span className="text-foreground font-medium">{afterVal}</span>
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="text-xs text-muted-foreground">
          +{remainingCount} campo{remainingCount > 1 ? "s" : ""} alterado
          {remainingCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
