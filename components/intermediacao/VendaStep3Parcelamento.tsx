"use client"

import { useMemo, useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DayPicker } from "react-day-picker"
import type { VendaFormData, Parcela } from "./VendaWizard"

interface VendaStep3Props {
  form: UseFormReturn<VendaFormData>
}

type ModoParcelamento = "automatico" | "manual"

export function VendaStep3Parcelamento({ form }: VendaStep3Props) {
  const { watch, setValue } = form

  const [modo, setModo] = useState<ModoParcelamento>("automatico")
  const [numeroParcelas, setNumeroParcelas] = useState<string>("3")
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState<Date>(
    addDays(new Date(), 30)
  )
  const [intervalo, setIntervalo] = useState<string>("30")
  const [openDate, setOpenDate] = useState(false)

  // Estado para adicionar parcela manual
  const [parcelaManualBeneficiario, setParcelaManualBeneficiario] = useState<string>("")
  const [parcelaManualValor, setParcelaManualValor] = useState<string>("")
  const [parcelaManualData, setParcelaManualData] = useState<Date | undefined>()
  const [openDateManual, setOpenDateManual] = useState(false)

  const watchedBeneficiarios = watch("beneficiarios")
  const watchedParcelas = watch("parcelas")
  const beneficiarios = useMemo(
    () => watchedBeneficiarios || [],
    [watchedBeneficiarios]
  )
  const parcelas = useMemo(() => watchedParcelas || [], [watchedParcelas])

  // Agrupar parcelas por beneficiario
  const parcelasPorBeneficiario = useMemo(() => {
    const agrupado: Record<string, Parcela[]> = {}
    beneficiarios.forEach((b) => {
      agrupado[b.beneficiario_id] = parcelas.filter(
        (p) => p.beneficiario_id === b.beneficiario_id
      )
    })
    return agrupado
  }, [beneficiarios, parcelas])

  // Calcular soma das parcelas por beneficiario
  const somaParcelasPorBeneficiario = useMemo(() => {
    const somas: Record<string, number> = {}
    beneficiarios.forEach((b) => {
      const parcelasBenef = parcelasPorBeneficiario[b.beneficiario_id] || []
      somas[b.beneficiario_id] = parcelasBenef.reduce(
        (acc, p) => acc + p.valor,
        0
      )
    })
    return somas
  }, [beneficiarios, parcelasPorBeneficiario])

  // Verificar se todos os beneficiarios estao com parcelamento correto
  const statusPorBeneficiario = useMemo(() => {
    const status: Record<string, "complete" | "incomplete" | "exceeded"> = {}
    beneficiarios.forEach((b) => {
      const soma = somaParcelasPorBeneficiario[b.beneficiario_id] || 0
      const valorEsperado = b.valor
      const diff = Math.abs(soma - valorEsperado)

      if (diff < 0.01) {
        status[b.beneficiario_id] = "complete"
      } else if (soma > valorEsperado) {
        status[b.beneficiario_id] = "exceeded"
      } else {
        status[b.beneficiario_id] = "incomplete"
      }
    })
    return status
  }, [beneficiarios, somaParcelasPorBeneficiario])

  // Gerar parcelas automaticamente
  const handleGerarParcelas = () => {
    const numParcelas = parseInt(numeroParcelas)
    const intervalosDias = parseInt(intervalo)

    const novasParcelas: Parcela[] = []
    let parcelaNumero = 1

    beneficiarios.forEach((beneficiario) => {
      const valorParcela = Math.floor((beneficiario.valor / numParcelas) * 100) / 100
      const resto = beneficiario.valor - valorParcela * numParcelas

      for (let i = 0; i < numParcelas; i++) {
        const valor =
          i === numParcelas - 1 ? valorParcela + resto : valorParcela
        const dataVencimento = addDays(dataPrimeiraParcela, i * intervalosDias)

        novasParcelas.push({
          id: `${beneficiario.beneficiario_id}-${i + 1}`,
          beneficiario_id: beneficiario.beneficiario_id,
          numero: i + 1,
          valor: Math.round(valor * 100) / 100,
          data_vencimento: dataVencimento.toISOString(),
          status: "pendente",
        })

        parcelaNumero++
      }
    })

    setValue("parcelas", novasParcelas, { shouldValidate: true })
  }

  // Adicionar parcela manual
  const handleAdicionarParcelaManual = () => {
    if (!parcelaManualBeneficiario || !parcelaManualValor || !parcelaManualData)
      return

    const valor = parseFloat(parcelaManualValor)
    if (isNaN(valor) || valor <= 0) return

    const parcelasBenef = parcelasPorBeneficiario[parcelaManualBeneficiario] || []
    const numeroParcela = parcelasBenef.length + 1

    const novaParcela: Parcela = {
      id: `${parcelaManualBeneficiario}-${Date.now()}`,
      beneficiario_id: parcelaManualBeneficiario,
      numero: numeroParcela,
      valor: valor,
      data_vencimento: parcelaManualData.toISOString(),
      status: "pendente",
    }

    setValue("parcelas", [...parcelas, novaParcela], { shouldValidate: true })

    // Limpar campos
    setParcelaManualBeneficiario("")
    setParcelaManualValor("")
    setParcelaManualData(undefined)
  }

  // Remover parcela
  const handleRemoverParcela = (parcelaId: string) => {
    setValue(
      "parcelas",
      parcelas.filter((p) => p.id !== parcelaId),
      { shouldValidate: true }
    )
  }

  // Atualizar valor de uma parcela
  const handleAtualizarValorParcela = (parcelaId: string, novoValor: string) => {
    const valor = parseFloat(novoValor)
    if (isNaN(valor)) return

    setValue(
      "parcelas",
      parcelas.map((p) =>
        p.id === parcelaId ? { ...p, valor: Math.max(0, valor) } : p
      ),
      { shouldValidate: true }
    )
  }

  // Atualizar data de uma parcela
  const handleAtualizarDataParcela = (parcelaId: string, novaData: Date) => {
    setValue(
      "parcelas",
      parcelas.map((p) =>
        p.id === parcelaId ? { ...p, data_vencimento: novaData.toISOString() } : p
      ),
      { shouldValidate: true }
    )
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Modo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button
              variant={modo === "automatico" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setModo("automatico")}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Automatico
            </Button>
            <Button
              variant={modo === "manual" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setModo("manual")}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Manual
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modo Automatico */}
      {modo === "automatico" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Parcelamento Automatico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Numero de Parcelas */}
              <div className="space-y-2">
                <Label>Numero de Parcelas</Label>
                <Select value={numeroParcelas} onValueChange={setNumeroParcelas}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 parcela</SelectItem>
                    <SelectItem value="2">2 parcelas</SelectItem>
                    <SelectItem value="3">3 parcelas</SelectItem>
                    <SelectItem value="4">4 parcelas</SelectItem>
                    <SelectItem value="6">6 parcelas</SelectItem>
                    <SelectItem value="12">12 parcelas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data da Primeira Parcela */}
              <div className="space-y-2">
                <Label>Data da Primeira Parcela</Label>
                <Popover open={openDate} onOpenChange={setOpenDate}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(dataPrimeiraParcela, "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={dataPrimeiraParcela}
                      onSelect={(date) => {
                        if (date) {
                          setDataPrimeiraParcela(date)
                        }
                        setOpenDate(false)
                      }}
                      locale={ptBR}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Intervalo */}
              <div className="space-y-2">
                <Label>Intervalo entre Parcelas</Label>
                <Select value={intervalo} onValueChange={setIntervalo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGerarParcelas}
              className="w-full"
              disabled={beneficiarios.length === 0}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Gerar Parcelas
            </Button>

            {beneficiarios.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhum beneficiario</AlertTitle>
                <AlertDescription>
                  Volte ao passo anterior e adicione beneficiarios para gerar as
                  parcelas.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modo Manual */}
      {modo === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Adicionar Parcela Manual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Beneficiario */}
              <div className="space-y-2">
                <Label>Beneficiario</Label>
                <Select
                  value={parcelaManualBeneficiario}
                  onValueChange={setParcelaManualBeneficiario}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {beneficiarios.map((b) => (
                      <SelectItem key={b.beneficiario_id} value={b.beneficiario_id}>
                        {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <Label>Valor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={parcelaManualValor}
                    onChange={(e) => setParcelaManualValor(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Popover open={openDateManual} onOpenChange={setOpenDateManual}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !parcelaManualData && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {parcelaManualData
                        ? format(parcelaManualData, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={parcelaManualData}
                      onSelect={(date) => {
                        setParcelaManualData(date)
                        setOpenDateManual(false)
                      }}
                      locale={ptBR}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Botao */}
              <div className="space-y-2">
                <Label className="invisible">Acao</Label>
                <Button
                  onClick={handleAdicionarParcelaManual}
                  disabled={
                    !parcelaManualBeneficiario ||
                    !parcelaManualValor ||
                    !parcelaManualData
                  }
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview das Parcelas por Beneficiario */}
      {beneficiarios.length > 0 && (
        <div className="space-y-4">
          {beneficiarios.map((beneficiario) => {
            const parcelasBenef =
              parcelasPorBeneficiario[beneficiario.beneficiario_id] || []
            const somaParcelas =
              somaParcelasPorBeneficiario[beneficiario.beneficiario_id] || 0
            const status = statusPorBeneficiario[beneficiario.beneficiario_id]
            const progressPercent = (somaParcelas / beneficiario.valor) * 100

            return (
              <Card key={beneficiario.beneficiario_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {beneficiario.nome}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {beneficiario.cargo} - Total:{" "}
                        {beneficiario.valor.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === "complete" && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                      {status === "incomplete" && (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                      {status === "exceeded" && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Parcelado:{" "}
                        {somaParcelas.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                      <span
                        className={cn(
                          status === "complete" && "text-emerald-600",
                          status === "incomplete" && "text-amber-600",
                          status === "exceeded" && "text-destructive"
                        )}
                      >
                        {progressPercent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(progressPercent, 100)}
                      className={cn(
                        "h-2",
                        status === "complete" && "[&>div]:bg-emerald-500",
                        status === "incomplete" && "[&>div]:bg-amber-500",
                        status === "exceeded" && "[&>div]:bg-destructive"
                      )}
                    />
                  </div>
                </CardHeader>

                <CardContent>
                  {parcelasBenef.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Parcela</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelasBenef
                          .sort(
                            (a, b) =>
                              new Date(a.data_vencimento).getTime() -
                              new Date(b.data_vencimento).getTime()
                          )
                          .map((parcela, index) => (
                            <TableRow key={parcela.id}>
                              <TableCell className="font-medium">
                                {index + 1}/{parcelasBenef.length}
                              </TableCell>
                              <TableCell>
                                <div className="relative w-32">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    R$
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={parcela.valor}
                                    onChange={(e) =>
                                      handleAtualizarValorParcela(
                                        parcela.id,
                                        e.target.value
                                      )
                                    }
                                    className="pl-9 h-8"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                    >
                                      <Calendar className="mr-2 h-3 w-3" />
                                      {format(
                                        new Date(parcela.data_vencimento),
                                        "dd/MM/yyyy",
                                        { locale: ptBR }
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <DayPicker
                                      mode="single"
                                      selected={new Date(parcela.data_vencimento)}
                                      onSelect={(date) => {
                                        if (date) {
                                          handleAtualizarDataParcela(
                                            parcela.id,
                                            date
                                          )
                                        }
                                      }}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoverParcela(parcela.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>Nenhuma parcela gerada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
