"use client"

import { useMemo } from "react"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Percent,
  User,
  Users,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { VendaFormData, Parcela } from "./VendaWizard"

interface VendaStep4Props {
  form: UseFormReturn<VendaFormData>
}

export function VendaStep4Revisao({ form }: VendaStep4Props) {
  const { watch } = form

  const valorTotal = watch("valor_total")
  const unidade = watch("unidade")
  const empreendimentoNome = watch("empreendimento_nome")
  const dataVenda = watch("data_venda")
  const percentualIntermediacao = watch("percentual_intermediacao")
  const descricao = watch("descricao")

  const clienteNome = watch("cliente_nome")
  const clienteCpf = watch("cliente_cpf")
  const clienteEmail = watch("cliente_email")
  const clienteTelefone = watch("cliente_telefone")

  const watchedBeneficiarios = watch("beneficiarios")
  const watchedParcelas = watch("parcelas")
  const beneficiarios = useMemo(
    () => watchedBeneficiarios || [],
    [watchedBeneficiarios]
  )
  const parcelas = useMemo(() => watchedParcelas || [], [watchedParcelas])

  // Calcular valor total da comissao
  const valorComissao = useMemo(() => {
    return (valorTotal * percentualIntermediacao) / 100
  }, [valorTotal, percentualIntermediacao])

  // Formatar CPF
  const cpfFormatado = useMemo(() => {
    if (!clienteCpf) return ""
    return clienteCpf
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }, [clienteCpf])

  // Formatar telefone
  const telefoneFormatado = useMemo(() => {
    if (!clienteTelefone) return ""
    const numbers = clienteTelefone.replace(/\D/g, "")
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
  }, [clienteTelefone])

  // Agrupar parcelas por beneficiario
  const parcelasPorBeneficiario = useMemo(() => {
    const agrupado: Record<string, Parcela[]> = {}
    beneficiarios.forEach((b) => {
      agrupado[b.beneficiario_id] = parcelas
        .filter((p) => p.beneficiario_id === b.beneficiario_id)
        .sort(
          (a, b) =>
            new Date(a.data_vencimento).getTime() -
            new Date(b.data_vencimento).getTime()
        )
    })
    return agrupado
  }, [beneficiarios, parcelas])

  return (
    <div className="space-y-6">
      {/* Dados da Venda */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Dados da Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="shrink-0">
                  Codigo
                </Badge>
                <span className="text-muted-foreground">(Sera gerado)</span>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="shrink-0">
                  Valor Total
                </Badge>
                <span className="font-semibold text-lg">
                  {valorTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Empreendimento</p>
                  <p className="font-medium">{empreendimentoNome || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Unidade</p>
                  <p className="font-medium">{unidade || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Data da Venda</p>
                  <p className="font-medium">
                    {dataVenda
                      ? format(new Date(dataVenda), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{clienteNome || "-"}</p>
                  <p className="text-sm text-muted-foreground">
                    CPF: {cpfFormatado || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Email: {clienteEmail || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Telefone: {telefoneFormatado || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {descricao && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Descricao</p>
                <p className="text-sm">{descricao}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comissao */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Comissao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 md:gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Percentual</p>
              <p className="text-2xl font-bold">{percentualIntermediacao}%</p>
            </div>
            <div className="text-2xl text-muted-foreground">=</div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold text-primary">
                {valorComissao.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribuicao */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Distribuicao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiario</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beneficiarios.map((beneficiario) => (
                <TableRow key={beneficiario.beneficiario_id}>
                  <TableCell className="font-medium">
                    {beneficiario.nome}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {beneficiario.cargo}
                  </TableCell>
                  <TableCell className="text-right">
                    {beneficiario.percentual.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {beneficiario.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                </TableRow>
              ))}
              {beneficiarios.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum beneficiario adicionado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Parcelamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Parcelamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {beneficiarios.map((beneficiario) => {
            const parcelasBenef =
              parcelasPorBeneficiario[beneficiario.beneficiario_id] || []

            return (
              <div key={beneficiario.beneficiario_id}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{beneficiario.nome}</h4>
                  <Badge variant="secondary">
                    {parcelasBenef.length}{" "}
                    {parcelasBenef.length === 1 ? "parcela" : "parcelas"}
                  </Badge>
                </div>

                {parcelasBenef.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Parcela</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">
                            Vencimento
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelasBenef.map((parcela, index) => (
                          <TableRow key={parcela.id}>
                            <TableCell className="font-medium">
                              {index + 1}/{parcelasBenef.length}
                            </TableCell>
                            <TableCell className="text-right">
                              {parcela.valor.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {format(
                                new Date(parcela.data_vencimento),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                    Nenhuma parcela gerada
                  </p>
                )}

                {beneficiarios.indexOf(beneficiario) <
                  beneficiarios.length - 1 && <Separator className="my-4" />}
              </div>
            )
          })}

          {beneficiarios.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum beneficiario para exibir parcelamento
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
