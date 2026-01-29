"use client"

import { useMemo, useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { VendaFormData, Beneficiario } from "./VendaWizard"

// Mock de beneficiarios - em producao, vira da API
const beneficiariosDisponiveis = [
  { id: "1", nome: "Joao Silva", cargo: "Corretor" },
  { id: "2", nome: "Maria Gerente", cargo: "Gerente de Vendas" },
  { id: "3", nome: "Carlos Supervisor", cargo: "Supervisor" },
  { id: "4", nome: "Ana Corretora", cargo: "Corretora" },
  { id: "5", nome: "Pedro Assistente", cargo: "Assistente Comercial" },
]

interface VendaStep2Props {
  form: UseFormReturn<VendaFormData>
}

export function VendaStep2Distribuicao({ form }: VendaStep2Props) {
  const { watch, setValue } = form
  const [openBeneficiario, setOpenBeneficiario] = useState(false)
  const [selectedBeneficiarioId, setSelectedBeneficiarioId] = useState<string>("")
  const [percentualInput, setPercentualInput] = useState<string>("")

  const valorTotal = watch("valor_total")
  const percentualIntermediacao = watch("percentual_intermediacao")
  const watchedBeneficiarios = watch("beneficiarios")
  const beneficiarios = useMemo(
    () => watchedBeneficiarios || [],
    [watchedBeneficiarios]
  )

  // Calcular valor total da comissao
  const valorComissao = useMemo(() => {
    return (valorTotal * percentualIntermediacao) / 100
  }, [valorTotal, percentualIntermediacao])

  // Calcular soma dos percentuais distribuidos
  const somaPercentuais = useMemo(() => {
    return beneficiarios.reduce((acc, b) => acc + b.percentual, 0)
  }, [beneficiarios])

  // Status da distribuicao
  const statusDistribuicao = useMemo(() => {
    if (somaPercentuais < 100) return "incomplete"
    if (somaPercentuais > 100) return "exceeded"
    return "complete"
  }, [somaPercentuais])

  // Beneficiario selecionado
  const selectedBeneficiario = beneficiariosDisponiveis.find(
    (b) => b.id === selectedBeneficiarioId
  )

  // Verificar se beneficiario ja foi adicionado
  const beneficiarioJaAdicionado = (id: string) => {
    return beneficiarios.some((b) => b.beneficiario_id === id)
  }

  // Calcular valor do beneficiario baseado no percentual
  const calcularValor = (percentual: number) => {
    return (valorComissao * percentual) / 100
  }

  // Adicionar beneficiario
  const handleAdicionarBeneficiario = () => {
    if (!selectedBeneficiarioId || !percentualInput) return

    const percentual = parseFloat(percentualInput)
    if (isNaN(percentual) || percentual <= 0 || percentual > 100) return

    const beneficiario = beneficiariosDisponiveis.find(
      (b) => b.id === selectedBeneficiarioId
    )
    if (!beneficiario) return

    const novoBeneficiario: Beneficiario = {
      beneficiario_id: beneficiario.id,
      nome: beneficiario.nome,
      cargo: beneficiario.cargo,
      percentual: percentual,
      valor: calcularValor(percentual),
    }

    setValue("beneficiarios", [...beneficiarios, novoBeneficiario], {
      shouldValidate: true,
    })

    // Limpar selecao
    setSelectedBeneficiarioId("")
    setPercentualInput("")
    setOpenBeneficiario(false)
  }

  // Remover beneficiario
  const handleRemoverBeneficiario = (beneficiarioId: string) => {
    setValue(
      "beneficiarios",
      beneficiarios.filter((b) => b.beneficiario_id !== beneficiarioId),
      { shouldValidate: true }
    )
  }

  // Distribuir igualmente
  const handleDistribuirIgualmente = () => {
    if (beneficiarios.length === 0) return

    const percentualIgual = Math.floor((100 / beneficiarios.length) * 100) / 100
    const resto = 100 - percentualIgual * beneficiarios.length

    const beneficiariosAtualizados = beneficiarios.map((b, index) => {
      const percentual =
        index === beneficiarios.length - 1
          ? percentualIgual + resto
          : percentualIgual
      return {
        ...b,
        percentual,
        valor: calcularValor(percentual),
      }
    })

    setValue("beneficiarios", beneficiariosAtualizados, { shouldValidate: true })
  }

  // Atualizar percentual de um beneficiario
  const handleAtualizarPercentual = (
    beneficiarioId: string,
    novoPercentual: string
  ) => {
    const percentual = parseFloat(novoPercentual)
    if (isNaN(percentual)) return

    const beneficiariosAtualizados = beneficiarios.map((b) => {
      if (b.beneficiario_id === beneficiarioId) {
        return {
          ...b,
          percentual: Math.max(0, Math.min(100, percentual)),
          valor: calcularValor(Math.max(0, Math.min(100, percentual))),
        }
      }
      return b
    })

    setValue("beneficiarios", beneficiariosAtualizados, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      {/* Resumo da Comissao */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Valor Total da Comissao
              </p>
              <p className="text-3xl font-bold text-primary">
                {valorComissao.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Formula</p>
              <p className="text-sm font-medium">
                {valorTotal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                x {percentualIntermediacao}% ={" "}
                {valorComissao.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status da Distribuicao */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Distribuicao dos Percentuais</span>
          <span
            className={cn(
              "text-sm font-semibold",
              statusDistribuicao === "complete" && "text-emerald-600",
              statusDistribuicao === "incomplete" && "text-amber-600",
              statusDistribuicao === "exceeded" && "text-destructive"
            )}
          >
            {somaPercentuais.toFixed(2)}% / 100%
          </span>
        </div>

        <Progress
          value={Math.min(somaPercentuais, 100)}
          className={cn(
            "h-3",
            statusDistribuicao === "complete" &&
              "[&>div]:bg-emerald-500",
            statusDistribuicao === "incomplete" &&
              "[&>div]:bg-amber-500",
            statusDistribuicao === "exceeded" &&
              "[&>div]:bg-destructive"
          )}
        />

        {statusDistribuicao === "incomplete" && somaPercentuais > 0 && (
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">
              Distribuicao Incompleta
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Ainda restam {(100 - somaPercentuais).toFixed(2)}% para distribuir.
            </AlertDescription>
          </Alert>
        )}

        {statusDistribuicao === "exceeded" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Distribuicao Excedida</AlertTitle>
            <AlertDescription>
              A soma dos percentuais excede 100% em{" "}
              {(somaPercentuais - 100).toFixed(2)}%. Ajuste os valores.
            </AlertDescription>
          </Alert>
        )}

        {statusDistribuicao === "complete" && (
          <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-800 dark:text-emerald-400">
              Distribuicao Completa
            </AlertTitle>
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              100% da comissao foi distribuida entre os beneficiarios.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Lista de Beneficiarios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Beneficiarios ({beneficiarios.length})
          </CardTitle>
          {beneficiarios.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDistribuirIgualmente}
            >
              Distribuir Igualmente
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de beneficiarios adicionados */}
          {beneficiarios.length > 0 ? (
            <div className="space-y-3">
              {beneficiarios.map((beneficiario) => (
                <div
                  key={beneficiario.beneficiario_id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{beneficiario.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {beneficiario.cargo}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={beneficiario.percentual}
                          onChange={(e) =>
                            handleAtualizarPercentual(
                              beneficiario.beneficiario_id,
                              e.target.value
                            )
                          }
                          className="pr-6 text-right"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="w-32 text-right">
                      <p className="font-semibold text-emerald-600">
                        {beneficiario.valor.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        handleRemoverBeneficiario(beneficiario.beneficiario_id)
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum beneficiario adicionado</p>
              <p className="text-sm">
                Adicione beneficiarios para distribuir a comissao
              </p>
            </div>
          )}

          {/* Adicionar novo beneficiario */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-3 block">
              Adicionar Beneficiario
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Popover
                open={openBeneficiario}
                onOpenChange={setOpenBeneficiario}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBeneficiario}
                    className="flex-1 justify-between"
                  >
                    {selectedBeneficiario?.nome || "Selecione o beneficiario"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar beneficiario..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2">
                          <p className="text-sm text-muted-foreground mb-2">
                            Nenhum beneficiario encontrado.
                          </p>
                          <Button variant="link" size="sm" className="h-auto p-0">
                            <UserPlus className="w-4 h-4 mr-1" />
                            Criar novo beneficiario
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {beneficiariosDisponiveis.map((b) => {
                          const jaAdicionado = beneficiarioJaAdicionado(b.id)
                          return (
                            <CommandItem
                              key={b.id}
                              value={b.nome}
                              disabled={jaAdicionado}
                              onSelect={() => {
                                if (!jaAdicionado) {
                                  setSelectedBeneficiarioId(b.id)
                                  setOpenBeneficiario(false)
                                }
                              }}
                              className={cn(jaAdicionado && "opacity-50")}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedBeneficiarioId === b.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <p>{b.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {b.cargo}
                                </p>
                              </div>
                              {jaAdicionado && (
                                <span className="text-xs text-muted-foreground">
                                  Ja adicionado
                                </span>
                              )}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="relative w-full sm:w-32">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={percentualInput}
                  onChange={(e) => setPercentualInput(e.target.value)}
                  className="pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>

              <Button
                onClick={handleAdicionarBeneficiario}
                disabled={!selectedBeneficiarioId || !percentualInput}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Link para criar novo beneficiario */}
            <Button
              variant="link"
              size="sm"
              className="mt-2 h-auto p-0 text-primary"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Criar novo beneficiario
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
