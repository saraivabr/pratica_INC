"use client"

import { useMemo, useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Calendar, Check, ChevronsUpDown, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DayPicker } from "react-day-picker"
import type { VendaFormData } from "./VendaWizard"

// Mock de empreendimentos - em producao, vira da API
const empreendimentos = [
  { id: "1", nome: "Torre Alpha" },
  { id: "2", nome: "Residencial Beta" },
  { id: "3", nome: "Condominio Gamma" },
  { id: "4", nome: "Edificio Delta" },
  { id: "5", nome: "Village Epsilon" },
]

interface VendaStep1Props {
  form: UseFormReturn<VendaFormData>
}

// Funcoes de mascara
function formatCurrency(value: string): string {
  const numbers = value.replace(/\D/g, "")
  const amount = parseInt(numbers || "0", 10) / 100
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function parseCurrency(value: string): number {
  const numbers = value.replace(/\D/g, "")
  return parseInt(numbers || "0", 10) / 100
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11)
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11)
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
}

function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, "")
  if (numbers.length !== 11) return false
  if (/^(\d)\1{10}$/.test(numbers)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(numbers[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(numbers[10])) return false

  return true
}

export function VendaStep1DadosVenda({ form }: VendaStep1Props) {
  const {
    register,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = form

  // Inicializar valores de display com valores do formulario
  const initialValues = getValues()
  const [openEmpreendimento, setOpenEmpreendimento] = useState(false)
  const [openDate, setOpenDate] = useState(false)
  const [valorDisplay, setValorDisplay] = useState(() =>
    initialValues.valor_total
      ? formatCurrency(String(initialValues.valor_total * 100))
      : ""
  )
  const [cpfDisplay, setCpfDisplay] = useState(() =>
    initialValues.cliente_cpf ? formatCPF(initialValues.cliente_cpf) : ""
  )
  const [telefoneDisplay, setTelefoneDisplay] = useState(() =>
    initialValues.cliente_telefone
      ? formatPhone(initialValues.cliente_telefone)
      : ""
  )
  const [cpfError, setCpfError] = useState<string | null>(null)

  const valorTotal = watch("valor_total")
  const percentualIntermediacao = watch("percentual_intermediacao")
  const empreendimentoId = watch("empreendimento_id")
  const dataVenda = watch("data_venda")

  // Calcular comissao em tempo real
  const comissaoCalculada = useMemo(() => {
    const valor = valorTotal || 0
    const percentual = percentualIntermediacao || 0
    return (valor * percentual) / 100
  }, [valorTotal, percentualIntermediacao])

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value)
    setValorDisplay(formatted)
    setValue("valor_total", parseCurrency(e.target.value), {
      shouldValidate: true,
    })
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    setCpfDisplay(formatted)
    const numbers = e.target.value.replace(/\D/g, "")
    setValue("cliente_cpf", numbers, { shouldValidate: true })

    if (numbers.length === 11) {
      if (!validateCPF(numbers)) {
        setCpfError("CPF invalido")
      } else {
        setCpfError(null)
      }
    } else {
      setCpfError(null)
    }
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setTelefoneDisplay(formatted)
    const numbers = e.target.value.replace(/\D/g, "")
    setValue("cliente_telefone", numbers, { shouldValidate: true })
  }

  const selectedEmpreendimento = empreendimentos.find(
    (e) => e.id === empreendimentoId
  )

  return (
    <div className="space-y-6">
      {/* Dados da Venda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da Venda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valor Total */}
            <div className="space-y-2">
              <Label htmlFor="valor_total">
                Valor Total <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valor_total"
                placeholder="R$ 0,00"
                value={valorDisplay}
                onChange={handleValorChange}
                className={cn(errors.valor_total && "border-destructive")}
              />
              {errors.valor_total && (
                <p className="text-xs text-destructive">
                  {errors.valor_total.message}
                </p>
              )}
            </div>

            {/* Unidade */}
            <div className="space-y-2">
              <Label htmlFor="unidade">
                Unidade <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unidade"
                placeholder="Ex: Apto 1201, Lote 15, Sala 302"
                {...register("unidade")}
                className={cn(errors.unidade && "border-destructive")}
              />
              {errors.unidade && (
                <p className="text-xs text-destructive">
                  {errors.unidade.message}
                </p>
              )}
            </div>

            {/* Empreendimento */}
            <div className="space-y-2">
              <Label>
                Empreendimento <span className="text-destructive">*</span>
              </Label>
              <Popover
                open={openEmpreendimento}
                onOpenChange={setOpenEmpreendimento}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openEmpreendimento}
                    className={cn(
                      "w-full justify-between",
                      !empreendimentoId && "text-muted-foreground",
                      errors.empreendimento_id && "border-destructive"
                    )}
                  >
                    {selectedEmpreendimento?.nome || "Selecione o empreendimento"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar empreendimento..." />
                    <CommandList>
                      <CommandEmpty>Nenhum empreendimento encontrado.</CommandEmpty>
                      <CommandGroup>
                        {empreendimentos.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={emp.nome}
                            onSelect={() => {
                              setValue("empreendimento_id", emp.id, {
                                shouldValidate: true,
                              })
                              setValue("empreendimento_nome", emp.nome)
                              setOpenEmpreendimento(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                empreendimentoId === emp.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {emp.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.empreendimento_id && (
                <p className="text-xs text-destructive">
                  {errors.empreendimento_id.message}
                </p>
              )}
            </div>

            {/* Data da Venda */}
            <div className="space-y-2">
              <Label>
                Data da Venda <span className="text-destructive">*</span>
              </Label>
              <Popover open={openDate} onOpenChange={setOpenDate}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataVenda && "text-muted-foreground",
                      errors.data_venda && "border-destructive"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dataVenda
                      ? format(new Date(dataVenda), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DayPicker
                    mode="single"
                    selected={dataVenda ? new Date(dataVenda) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("data_venda", date.toISOString(), {
                          shouldValidate: true,
                        })
                      }
                      setOpenDate(false)
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {errors.data_venda && (
                <p className="text-xs text-destructive">
                  {errors.data_venda.message}
                </p>
              )}
            </div>

            {/* Percentual de Intermediacao */}
            <div className="space-y-2">
              <Label htmlFor="percentual_intermediacao">
                Percentual de Intermediacao{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="percentual_intermediacao"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="5"
                  {...register("percentual_intermediacao", {
                    valueAsNumber: true,
                  })}
                  className={cn(
                    "pr-8",
                    errors.percentual_intermediacao && "border-destructive"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              {errors.percentual_intermediacao && (
                <p className="text-xs text-destructive">
                  {errors.percentual_intermediacao.message}
                </p>
              )}
            </div>

            {/* Descricao */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descricao">Descricao (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Observacoes sobre a venda..."
                rows={3}
                {...register("descricao")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cliente_nome"
                placeholder="Nome do cliente"
                {...register("cliente_nome")}
                className={cn(errors.cliente_nome && "border-destructive")}
              />
              {errors.cliente_nome && (
                <p className="text-xs text-destructive">
                  {errors.cliente_nome.message}
                </p>
              )}
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <Label htmlFor="cliente_cpf">
                CPF <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cliente_cpf"
                placeholder="000.000.000-00"
                value={cpfDisplay}
                onChange={handleCPFChange}
                className={cn(
                  (errors.cliente_cpf || cpfError) && "border-destructive"
                )}
              />
              {(errors.cliente_cpf || cpfError) && (
                <p className="text-xs text-destructive">
                  {errors.cliente_cpf?.message || cpfError}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="cliente_email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cliente_email"
                type="email"
                placeholder="cliente@email.com"
                {...register("cliente_email")}
                className={cn(errors.cliente_email && "border-destructive")}
              />
              {errors.cliente_email && (
                <p className="text-xs text-destructive">
                  {errors.cliente_email.message}
                </p>
              )}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="cliente_telefone">
                Telefone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cliente_telefone"
                placeholder="(00) 00000-0000"
                value={telefoneDisplay}
                onChange={handleTelefoneChange}
                className={cn(errors.cliente_telefone && "border-destructive")}
              />
              {errors.cliente_telefone && (
                <p className="text-xs text-destructive">
                  {errors.cliente_telefone.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview da Comissao */}
      {valorTotal > 0 && percentualIntermediacao > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Valor da Comissao Calculada
                </p>
                <p className="text-2xl font-bold text-primary">
                  {comissaoCalculada.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {valorTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}{" "}
                  x {percentualIntermediacao}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
