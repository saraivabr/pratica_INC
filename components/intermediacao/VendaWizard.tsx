"use client"

import { useState, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VendaStepIndicator } from "./VendaStepIndicator"
import { VendaStep1DadosVenda } from "./VendaStep1DadosVenda"
import { VendaStep2Distribuicao } from "./VendaStep2Distribuicao"
import { VendaStep3Parcelamento } from "./VendaStep3Parcelamento"
import { VendaStep4Revisao } from "./VendaStep4Revisao"

// Tipos exportados para uso nos steps
export interface Beneficiario {
  beneficiario_id: string
  nome: string
  cargo: string
  percentual: number
  valor: number
}

export interface Parcela {
  id: string
  beneficiario_id: string
  numero: number
  valor: number
  data_vencimento: string
  status: "pendente" | "paga" | "atrasada"
}

export interface VendaFormData {
  // Dados da Venda
  valor_total: number
  unidade: string
  empreendimento_id: string
  empreendimento_nome: string
  data_venda: string
  percentual_intermediacao: number
  descricao: string

  // Dados do Cliente
  cliente_nome: string
  cliente_cpf: string
  cliente_email: string
  cliente_telefone: string

  // Distribuicao
  beneficiarios: Beneficiario[]

  // Parcelamento
  parcelas: Parcela[]
}

// Schema de validacao por step
const step1Schema = z.object({
  valor_total: z.number().positive("Valor deve ser maior que zero"),
  unidade: z.string().min(1, "Unidade e obrigatoria"),
  empreendimento_id: z.string().min(1, "Selecione um empreendimento"),
  empreendimento_nome: z.string(),
  data_venda: z.string().min(1, "Selecione a data da venda"),
  percentual_intermediacao: z
    .number()
    .min(0.01, "Percentual deve ser maior que 0")
    .max(100, "Percentual deve ser no maximo 100"),
  descricao: z.string().optional(),
  cliente_nome: z.string().min(1, "Nome do cliente e obrigatorio"),
  cliente_cpf: z
    .string()
    .length(11, "CPF deve ter 11 digitos")
    .regex(/^\d+$/, "CPF deve conter apenas numeros"),
  cliente_email: z.string().email("Email invalido"),
  cliente_telefone: z
    .string()
    .min(10, "Telefone deve ter pelo menos 10 digitos")
    .max(11, "Telefone deve ter no maximo 11 digitos"),
})

const step2Schema = z.object({
  beneficiarios: z
    .array(
      z.object({
        beneficiario_id: z.string(),
        nome: z.string(),
        cargo: z.string(),
        percentual: z.number(),
        valor: z.number(),
      })
    )
    .min(1, "Adicione pelo menos um beneficiario"),
})

const step3Schema = z.object({
  parcelas: z
    .array(
      z.object({
        id: z.string(),
        beneficiario_id: z.string(),
        numero: z.number(),
        valor: z.number(),
        data_vencimento: z.string(),
        status: z.enum(["pendente", "paga", "atrasada"]),
      })
    )
    .min(1, "Gere pelo menos uma parcela"),
})

// Schema completo
const vendaSchema = step1Schema.merge(step2Schema).merge(step3Schema)

// Props do componente
interface VendaWizardProps {
  onComplete: (data: VendaFormData) => void | Promise<void>
  onSaveRascunho?: (data: VendaFormData) => void | Promise<void>
  initialData?: Partial<VendaFormData>
  mode?: "create" | "edit"
}

// Dados iniciais padrao
const defaultData: VendaFormData = {
  valor_total: 0,
  unidade: "",
  empreendimento_id: "",
  empreendimento_nome: "",
  data_venda: "",
  percentual_intermediacao: 5,
  descricao: "",
  cliente_nome: "",
  cliente_cpf: "",
  cliente_email: "",
  cliente_telefone: "",
  beneficiarios: [],
  parcelas: [],
}

export function VendaWizard({
  onComplete,
  onSaveRascunho,
  initialData,
  mode = "create",
}: VendaWizardProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingRascunho, setIsSavingRascunho] = useState(false)

  // Inicializar formulario
  const form = useForm<VendaFormData>({
    resolver: zodResolver(vendaSchema),
    defaultValues: { ...defaultData, ...initialData },
    mode: "onChange",
  })

  const { watch, trigger } = form
  const watchedBeneficiarios = watch("beneficiarios")
  const watchedParcelas = watch("parcelas")
  const beneficiarios = useMemo(
    () => watchedBeneficiarios || [],
    [watchedBeneficiarios]
  )
  const parcelas = useMemo(() => watchedParcelas || [], [watchedParcelas])

  // Calcular steps completos
  const completedSteps = useMemo(() => {
    const completed: number[] = []

    // Step 1: Dados basicos
    const valorTotal = watch("valor_total")
    const unidade = watch("unidade")
    const empreendimentoId = watch("empreendimento_id")
    const dataVenda = watch("data_venda")
    const percentual = watch("percentual_intermediacao")
    const clienteNome = watch("cliente_nome")
    const clienteCpf = watch("cliente_cpf")
    const clienteEmail = watch("cliente_email")
    const clienteTelefone = watch("cliente_telefone")

    if (
      valorTotal > 0 &&
      unidade &&
      empreendimentoId &&
      dataVenda &&
      percentual > 0 &&
      clienteNome &&
      clienteCpf?.length === 11 &&
      clienteEmail &&
      clienteTelefone?.length >= 10
    ) {
      completed.push(1)
    }

    // Step 2: Distribuicao
    if (beneficiarios.length > 0) {
      const somaPercentuais = beneficiarios.reduce(
        (acc, b) => acc + b.percentual,
        0
      )
      if (Math.abs(somaPercentuais - 100) < 0.01) {
        completed.push(2)
      }
    }

    // Step 3: Parcelamento
    if (parcelas.length > 0 && beneficiarios.length > 0) {
      const todosParcelados = beneficiarios.every((beneficiario) => {
        const parcelasBenef = parcelas.filter(
          (p) => p.beneficiario_id === beneficiario.beneficiario_id
        )
        const somaParcelas = parcelasBenef.reduce((acc, p) => acc + p.valor, 0)
        return Math.abs(somaParcelas - beneficiario.valor) < 0.01
      })
      if (todosParcelados) {
        completed.push(3)
      }
    }

    return completed
  }, [watch, beneficiarios, parcelas])

  // Validar step atual antes de avancar
  const validateStep = useCallback(async () => {
    switch (step) {
      case 1:
        return await trigger([
          "valor_total",
          "unidade",
          "empreendimento_id",
          "data_venda",
          "percentual_intermediacao",
          "cliente_nome",
          "cliente_cpf",
          "cliente_email",
          "cliente_telefone",
        ])
      case 2:
        return await trigger("beneficiarios")
      case 3:
        return await trigger("parcelas")
      default:
        return true
    }
  }, [step, trigger])

  // Avancar step
  const handleNext = useCallback(async () => {
    const isValid = await validateStep()
    if (isValid && step < 4) {
      setStep(step + 1)
    }
  }, [step, validateStep])

  // Voltar step
  const handlePrevious = useCallback(() => {
    if (step > 1) {
      setStep(step - 1)
    }
  }, [step])

  // Salvar rascunho
  const handleSaveRascunho = useCallback(async () => {
    if (!onSaveRascunho) return

    setIsSavingRascunho(true)
    try {
      const data = form.getValues()
      await onSaveRascunho(data)
    } finally {
      setIsSavingRascunho(false)
    }
  }, [form, onSaveRascunho])

  // Confirmar e processar
  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const data = form.getValues()
      await onComplete(data)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, onComplete])

  // Verificar se pode avancar
  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return completedSteps.includes(1)
      case 2:
        return completedSteps.includes(2)
      case 3:
        return completedSteps.includes(3)
      default:
        return true
    }
  }, [step, completedSteps])

  // Verificar se formulario esta completo
  const isFormComplete = useMemo(() => {
    return (
      completedSteps.includes(1) &&
      completedSteps.includes(2) &&
      completedSteps.includes(3)
    )
  }, [completedSteps])

  // Titulos dos steps
  const stepTitles = [
    "Dados da Venda",
    "Distribuicao de Comissao",
    "Parcelamento",
    "Revisao Final",
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {mode === "create" ? "Nova Venda" : "Editar Venda"}
          </h2>
          <span className="text-sm text-muted-foreground">
            Passo {step} de 4: {stepTitles[step - 1]}
          </span>
        </div>
        <VendaStepIndicator currentStep={step} completedSteps={completedSteps} />
      </CardHeader>

      <CardContent className="pb-6">
        {/* Step 1 - Dados da Venda */}
        <div className={cn(step !== 1 && "hidden")}>
          <VendaStep1DadosVenda form={form} />
        </div>

        {/* Step 2 - Distribuicao */}
        <div className={cn(step !== 2 && "hidden")}>
          <VendaStep2Distribuicao form={form} />
        </div>

        {/* Step 3 - Parcelamento */}
        <div className={cn(step !== 3 && "hidden")}>
          <VendaStep3Parcelamento form={form} />
        </div>

        {/* Step 4 - Revisao */}
        <div className={cn(step !== 4 && "hidden")}>
          <VendaStep4Revisao form={form} />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
        {/* Botao Anterior */}
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={step === 1 || isSubmitting}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        <div className="flex-1" />

        {/* Botao Salvar Rascunho */}
        {onSaveRascunho && (
          <Button
            variant="outline"
            onClick={handleSaveRascunho}
            disabled={isSavingRascunho || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSavingRascunho ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Rascunho
          </Button>
        )}

        {/* Botao Proximo / Confirmar */}
        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="w-full sm:w-auto"
          >
            Proximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="success"
                disabled={!isFormComplete || isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Confirmar e Processar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Venda</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja confirmar esta venda? Apos a confirmacao,
                  as parcelas serao geradas e os beneficiarios serao notificados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  )
}
