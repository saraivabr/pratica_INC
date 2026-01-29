"use client"

import { useState } from "react"
import { ArrowUpDown, Building2, Eye, Pencil, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Beneficiario, CargoBeneficiario } from "../types"
import { formatarMoeda, formatarMoedaCompacta, mascararDocumento } from "./utils"

interface BeneficiarioTableProps {
  beneficiarios: Beneficiario[]
  onRowClick: (id: string) => void
  onEdit?: (id: string) => void
  loading?: boolean
}

type SortField = "nome" | "cargo" | "valorAReceber" | "valorPendente" | "status"
type SortOrder = "asc" | "desc"

const cargoLabels: Record<CargoBeneficiario, string> = {
  corretor: "Corretor",
  gerente: "Gerente",
  diretor: "Diretor",
  coordenador: "Coordenador",
  proprietario: "Proprietario",
  imobiliaria: "Imobiliaria",
  parceiro: "Parceiro",
  outro: "Outro",
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-14 rounded-full" />
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function BeneficiarioTable({
  beneficiarios,
  onRowClick,
  onEdit,
  loading = false,
}: BeneficiarioTableProps) {
  const [sortField, setSortField] = useState<SortField>("nome")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedBeneficiarios = [...beneficiarios].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case "nome":
        comparison = a.nome.localeCompare(b.nome)
        break
      case "cargo":
        comparison = (cargoLabels[a.cargo] || "").localeCompare(
          cargoLabels[b.cargo] || ""
        )
        break
      case "valorAReceber":
        comparison = a.valorAReceber - b.valorAReceber
        break
      case "valorPendente":
        comparison = a.valorPendente - b.valorPendente
        break
      case "status":
        comparison = a.status.localeCompare(b.status)
        break
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField
    children: React.ReactNode
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown
        className={cn(
          "ml-1 h-3.5 w-3.5",
          sortField === field ? "text-foreground" : "text-muted-foreground"
        )}
      />
    </Button>
  )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader field="nome">Nome</SortableHeader>
            </TableHead>
            <TableHead className="w-16">Tipo</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>
              <SortableHeader field="cargo">Cargo</SortableHeader>
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader field="valorAReceber">A Receber</SortableHeader>
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader field="valorPendente">Pendente</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="status">Status</SortableHeader>
            </TableHead>
            <TableHead className="w-24">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton />
          ) : sortedBeneficiarios.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground"
              >
                Nenhum beneficiario encontrado
              </TableCell>
            </TableRow>
          ) : (
            sortedBeneficiarios.map((beneficiario) => {
              const isPJ = beneficiario.tipoPessoa === "PJ"
              const isAtivo = beneficiario.status === "ativo"

              return (
                <TableRow
                  key={beneficiario.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(beneficiario.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isPJ
                            ? "bg-blue-100 text-blue-600"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {isPJ ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <span className="font-medium">{beneficiario.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {isPJ ? "PJ" : "PF"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {mascararDocumento(beneficiario.documento)}
                  </TableCell>
                  <TableCell>
                    {cargoLabels[beneficiario.cargo] || beneficiario.cargo}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      beneficiario.valorAReceber > 0 && "text-red-600"
                    )}
                  >
                    {formatarMoedaCompacta(beneficiario.valorAReceber)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-amber-600">
                    {formatarMoedaCompacta(beneficiario.valorPendente)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={isAtivo ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        isAtivo
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {isAtivo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRowClick(beneficiario.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(beneficiario.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
