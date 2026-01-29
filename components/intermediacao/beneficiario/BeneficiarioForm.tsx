"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  Beneficiario,
  BeneficiarioFormData,
  CargoBeneficiario,
  TipoConta,
  TipoPessoa,
} from "../types"
import { BANCOS_BRASIL, CARGOS_BENEFICIARIO } from "../types"
import { BeneficiarioValidacaoDocumento } from "./BeneficiarioValidacaoDocumento"
import { formatarTelefone } from "./utils"

interface BeneficiarioFormProps {
  initialData?: Beneficiario
  onSubmit: (data: BeneficiarioFormData) => void
  onCancel: () => void
  isLoading?: boolean
  checkDocumentDuplicate?: (documento: string) => Promise<boolean>
}

// Schema de validacao
const beneficiarioSchema = z.object({
  tipoPessoa: z.enum(["PF", "PJ"]),
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  documento: z.string().min(11, "Documento invalido"),
  cargo: z.enum([
    "corretor",
    "gerente",
    "diretor",
    "coordenador",
    "proprietario",
    "imobiliaria",
    "parceiro",
    "outro",
  ]),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipoConta: z.enum(["corrente", "poupanca"]).optional(),
  chavePix: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(["ativo", "inativo"]),
})

type FormValues = z.infer<typeof beneficiarioSchema>

export function BeneficiarioForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  checkDocumentDuplicate,
}: BeneficiarioFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(beneficiarioSchema),
    defaultValues: {
      tipoPessoa: initialData?.tipoPessoa || "PF",
      nome: initialData?.nome || "",
      documento: initialData?.documento || "",
      cargo: initialData?.cargo || "corretor",
      email: initialData?.email || "",
      telefone: initialData?.telefone || "",
      banco: initialData?.dadosBancarios?.banco || initialData?.banco || "",
      agencia: initialData?.dadosBancarios?.agencia || initialData?.agencia || "",
      conta: initialData?.dadosBancarios?.conta || initialData?.conta || "",
      tipoConta: initialData?.dadosBancarios?.tipoConta || "corrente",
      chavePix:
        initialData?.dadosBancarios?.chavePix || initialData?.pix || "",
      observacoes: initialData?.observacoes || "",
      status: initialData?.status || "ativo",
    },
  })

  const tipoPessoa = watch("tipoPessoa")
  const documento = watch("documento")

  // Quando muda para PJ, define cargo como imobiliaria automaticamente
  useEffect(() => {
    if (tipoPessoa === "PJ") {
      setValue("cargo", "imobiliaria")
    }
  }, [tipoPessoa, setValue])

  const handleFormSubmit = (data: FormValues) => {
    onSubmit(data as BeneficiarioFormData)
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarTelefone(e.target.value)
    setValue("telefone", formatted)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Tipo de Pessoa */}
      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              {...register("tipoPessoa")}
              value="PF"
              className="h-4 w-4 text-primary"
            />
            <span className={cn(tipoPessoa === "PF" && "font-medium")}>
              Pessoa Fisica
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              {...register("tipoPessoa")}
              value="PJ"
              className="h-4 w-4 text-primary"
            />
            <span className={cn(tipoPessoa === "PJ" && "font-medium")}>
              Pessoa Juridica
            </span>
          </label>
        </div>
      </div>

      {/* Nome/Razao Social */}
      <div className="space-y-2">
        <Label htmlFor="nome">
          {tipoPessoa === "PF" ? "Nome completo" : "Razao Social"} *
        </Label>
        <Input
          id="nome"
          {...register("nome")}
          placeholder={
            tipoPessoa === "PF"
              ? "Digite o nome completo"
              : "Digite a razao social"
          }
          className={cn(errors.nome && "border-destructive")}
        />
        {errors.nome && (
          <p className="text-xs text-destructive">{errors.nome.message}</p>
        )}
      </div>

      {/* Documento (CPF/CNPJ) */}
      <div className="space-y-2">
        <Label>{tipoPessoa === "PF" ? "CPF" : "CNPJ"} *</Label>
        <BeneficiarioValidacaoDocumento
          value={documento}
          onChange={(val) => setValue("documento", val)}
          checkDuplicate={checkDocumentDuplicate}
        />
        {errors.documento && (
          <p className="text-xs text-destructive">{errors.documento.message}</p>
        )}
      </div>

      {/* Cargo */}
      <div className="space-y-2">
        <Label>Cargo *</Label>
        {tipoPessoa === "PJ" ? (
          <Input value="Imobiliaria" disabled className="bg-muted" />
        ) : (
          <Select
            value={watch("cargo")}
            onValueChange={(value) => setValue("cargo", value as CargoBeneficiario)}
          >
            <SelectTrigger className={cn(errors.cargo && "border-destructive")}>
              <SelectValue placeholder="Selecione o cargo" />
            </SelectTrigger>
            <SelectContent>
              {CARGOS_BENEFICIARIO.filter((c) => c.value !== "imobiliaria").map(
                (cargo) => (
                  <SelectItem key={cargo.value} value={cargo.value}>
                    {cargo.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Email e Telefone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="email@exemplo.com"
            className={cn(errors.email && "border-destructive")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={watch("telefone") || ""}
            onChange={handleTelefoneChange}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        </div>
      </div>

      {/* Separator para dados bancarios */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm font-medium text-muted-foreground">
            Dados Bancarios (opcional)
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Banco */}
        <div className="space-y-2">
          <Label>Banco</Label>
          <Select
            value={watch("banco") || ""}
            onValueChange={(value) => setValue("banco", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {BANCOS_BRASIL.map((banco) => (
                <SelectItem key={banco.codigo} value={banco.nome}>
                  {banco.codigo} - {banco.nome}
                </SelectItem>
              ))}
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agencia e Conta */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agencia">Agencia</Label>
            <Input
              id="agencia"
              {...register("agencia")}
              placeholder="0000"
              maxLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conta">Conta</Label>
            <Input
              id="conta"
              {...register("conta")}
              placeholder="00000000-0"
              maxLength={15}
            />
          </div>
        </div>

        {/* Tipo de Conta */}
        <div className="space-y-2">
          <Label>Tipo de Conta</Label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                {...register("tipoConta")}
                value="corrente"
                className="h-4 w-4 text-primary"
              />
              <span
                className={cn(watch("tipoConta") === "corrente" && "font-medium")}
              >
                Conta Corrente
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                {...register("tipoConta")}
                value="poupanca"
                className="h-4 w-4 text-primary"
              />
              <span
                className={cn(watch("tipoConta") === "poupanca" && "font-medium")}
              >
                Poupanca
              </span>
            </label>
          </div>
        </div>

        {/* Chave PIX */}
        <div className="space-y-2">
          <Label htmlFor="chavePix">Chave PIX</Label>
          <Input
            id="chavePix"
            {...register("chavePix")}
            placeholder="CPF, CNPJ, email, telefone ou chave aleatoria"
          />
        </div>
      </div>

      {/* Observacoes */}
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observacoes</Label>
        <Textarea
          id="observacoes"
          {...register("observacoes")}
          placeholder="Observacoes adicionais sobre o beneficiario..."
          rows={3}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={watch("status")}
          onValueChange={(value) => setValue("status", value as "ativo" | "inativo")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Botoes */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Salvar alteracoes" : "Cadastrar"}
        </Button>
      </div>
    </form>
  )
}
