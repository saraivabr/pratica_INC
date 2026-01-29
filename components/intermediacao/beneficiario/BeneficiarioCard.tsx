"use client"

import { Building2, Eye, Pencil, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Beneficiario, CargoBeneficiario } from "../types"
import { formatarMoeda, mascararDocumento } from "./utils"

interface BeneficiarioCardProps {
  beneficiario: Beneficiario
  onView: () => void
  onEdit: () => void
}

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

export function BeneficiarioCard({
  beneficiario,
  onView,
  onEdit,
}: BeneficiarioCardProps) {
  const isPJ = beneficiario.tipoPessoa === "PJ"
  const isAtivo = beneficiario.status === "ativo"
  const temValorAReceber = beneficiario.valorAReceber > 0

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      {/* Badge de status no canto superior direito */}
      <div className="absolute right-3 top-3">
        <Badge
          variant={isAtivo ? "default" : "secondary"}
          className={cn(
            isAtivo
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : "bg-gray-100 text-gray-500"
          )}
        >
          {isAtivo ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Icone PF ou PJ */}
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              isPJ ? "bg-blue-100 text-blue-600" : "bg-primary/10 text-primary"
            )}
          >
            {isPJ ? (
              <Building2 className="h-6 w-6" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0 flex-1 pr-16">
            {/* Nome */}
            <h3 className="truncate font-semibold text-foreground">
              {beneficiario.nome}
            </h3>

            {/* Cargo */}
            <p className="text-sm text-muted-foreground">
              {cargoLabels[beneficiario.cargo] || beneficiario.cargo}
            </p>

            {/* Documento mascarado */}
            <p className="mt-1 text-xs text-muted-foreground">
              {isPJ ? "CNPJ" : "CPF"}:{" "}
              {mascararDocumento(beneficiario.documento)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <Separator className="mb-3" />

        {/* Valores financeiros */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">A receber</p>
            <p
              className={cn(
                "font-semibold",
                temValorAReceber ? "text-red-600" : "text-foreground"
              )}
            >
              {formatarMoeda(beneficiario.valorAReceber)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="font-semibold text-amber-600">
              {formatarMoeda(beneficiario.valorPendente)}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-3">
        <div className="flex w-full justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onView}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onEdit}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Editar
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
