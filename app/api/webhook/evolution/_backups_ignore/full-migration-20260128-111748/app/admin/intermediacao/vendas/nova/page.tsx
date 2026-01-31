"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  FileText,
  Loader2,
  Percent,
  Plus,
  Save,
  Trash2,
  User,
  Users,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Types
interface Beneficiario {
  id: string
  nome: string
  tipo: "corretor" | "imobiliaria" | "gerente" | "outro"
  percentual: number
  valor: number
}

interface Parcela {
  id: string
  numero: number
  valor: number
  data_vencimento: string
  beneficiario_id: string
  beneficiario_nome: string
}

interface VendaForm {
  // Step 1: Dados da Venda
  valor_total: string
  unidade: string
  empreendimento_id: string
  cliente_nome: string
  cliente_cpf: string
  cliente_email: string
  cliente_telefone: string
  data_venda: string
  percentual_intermediacao: string
  descricao: string
  // Step 2: Distribuicao
  beneficiarios: Beneficiario[]
  // Step 3: Parcelamento
  tipo_parcelamento: "automatico" | "manual"
  numero_parcelas: number
  data_primeira_parcela: string
  intervalo_dias: number
  parcelas: Parcela[]
}

// Types for API data
interface Empreendimento {
  id: string | number
  nome: string
}

interface BeneficiarioOption {
  id: string | number
  nome: string
  tipo: "corretor" | "imobiliaria" | "gerente" | "outro"
}

const steps = [
  { id: 1, title: "Dados da Venda", icon: FileText },
  { id: 2, title: "Distribuicao de Comissao", icon: Users },
  { id: 3, title: "Parcelamento", icon: Calendar },
  { id: 4, title: "Revisao e Confirmacao", icon: CheckCircle2 },
]

export default function NovaVendaPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [beneficiariosOptions, setBeneficiariosOptions] = useState<BeneficiarioOption[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [form, setForm] = useState<VendaForm>({
    valor_total: "",
    unidade: "",
    empreendimento_id: "",
    cliente_nome: "",
    cliente_cpf: "",
    cliente_email: "",
    cliente_telefone: "",
    data_venda: new Date().toISOString().split("T")[0],
    percentual_intermediacao: "5",
    descricao: "",
    beneficiarios: [],
    tipo_parcelamento: "automatico",
    numero_parcelas: 1,
    data_primeira_parcela: new Date().toISOString().split("T")[0],
    intervalo_dias: 30,
    parcelas: [],
  })

  // Load empreendimentos and beneficiarios from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true)
        const [empRes, benefRes] = await Promise.all([
          fetch("/api/empreendimentos?limit=100"),
          fetch("/api/intermediacao/beneficiarios?limit=100&ativo=true")
        ])

        if (empRes.ok) {
          const empData = await empRes.json()
          setEmpreendimentos(empData.data || empData || [])
        }

        if (benefRes.ok) {
          const benefData = await benefRes.json()
          setBeneficiariosOptions(benefData.data || benefData || [])
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast.error("Erro ao carregar dados de referência")
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  // Calculated values
  const valorTotal = parseFloat(form.valor_total.replace(/\D/g, "")) / 100 || 0
  const percentualIntermediacao = parseFloat(form.percentual_intermediacao) || 0
  const valorComissao = valorTotal * (percentualIntermediacao / 100)

  const somaBeneficiarios = form.beneficiarios.reduce((sum, b) => sum + b.percentual, 0)
  const somaBeneficiariosValid = Math.abs(somaBeneficiarios - 100) < 0.01

  const somaParcelas = form.parcelas.reduce((sum, p) => sum + p.valor, 0)
  const somaParcelasValid = Math.abs(somaParcelas - valorComissao) < 0.01

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    const floatValue = parseInt(numericValue) / 100
    if (isNaN(floatValue)) return ""
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(floatValue)
  }

  const handleCurrencyChange = (value: string, field: keyof VendaForm) => {
    const numericValue = value.replace(/\D/g, "")
    setForm({ ...form, [field]: numericValue })
  }

  // Step 1 validation
  const step1Valid = useMemo(() => {
    return (
      form.valor_total &&
      form.unidade &&
      form.empreendimento_id &&
      form.cliente_nome &&
      form.cliente_cpf &&
      form.data_venda &&
      form.percentual_intermediacao
    )
  }, [form])

  // Step 2 validation
  const step2Valid = useMemo(() => {
    return form.beneficiarios.length > 0 && somaBeneficiariosValid
  }, [form.beneficiarios, somaBeneficiariosValid])

  // Step 3 validation
  const step3Valid = useMemo(() => {
    return form.parcelas.length > 0 && somaParcelasValid
  }, [form.parcelas, somaParcelasValid])

  // Add beneficiario
  const addBeneficiario = (beneficiarioId: string) => {
    const beneficiario = beneficiariosOptions.find((b) => String(b.id) === beneficiarioId)
    if (!beneficiario) return

    const existing = form.beneficiarios.find((b) => b.id === beneficiarioId)
    if (existing) return

    const remainingPercentual = 100 - somaBeneficiarios
    const newBeneficiario: Beneficiario = {
      id: String(beneficiario.id),
      nome: beneficiario.nome,
      tipo: beneficiario.tipo,
      percentual: Math.min(remainingPercentual, 50),
      valor: valorComissao * (Math.min(remainingPercentual, 50) / 100),
    }

    setForm({
      ...form,
      beneficiarios: [...form.beneficiarios, newBeneficiario],
    })
  }

  const updateBeneficiarioPercentual = (id: string, percentual: number) => {
    const updated = form.beneficiarios.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          percentual,
          valor: valorComissao * (percentual / 100),
        }
      }
      return b
    })
    setForm({ ...form, beneficiarios: updated })
  }

  const removeBeneficiario = (id: string) => {
    setForm({
      ...form,
      beneficiarios: form.beneficiarios.filter((b) => b.id !== id),
    })
  }

  // Generate parcelas
  const generateParcelas = () => {
    if (form.tipo_parcelamento === "automatico") {
      const valorPorParcela = valorComissao / form.numero_parcelas
      const parcelas: Parcela[] = []

      form.beneficiarios.forEach((beneficiario) => {
        const valorBeneficiario = valorComissao * (beneficiario.percentual / 100)
        const valorParcelaBeneficiario = valorBeneficiario / form.numero_parcelas

        for (let i = 0; i < form.numero_parcelas; i++) {
          const dataVencimento = new Date(form.data_primeira_parcela)
          dataVencimento.setDate(dataVencimento.getDate() + i * form.intervalo_dias)

          parcelas.push({
            id: `${beneficiario.id}-${i + 1}`,
            numero: i + 1,
            valor: valorParcelaBeneficiario,
            data_vencimento: dataVencimento.toISOString().split("T")[0],
            beneficiario_id: beneficiario.id,
            beneficiario_nome: beneficiario.nome,
          })
        }
      })

      setForm({ ...form, parcelas })
    }
  }

  const addParcelaManual = () => {
    const newParcela: Parcela = {
      id: `manual-${Date.now()}`,
      numero: form.parcelas.length + 1,
      valor: 0,
      data_vencimento: form.data_primeira_parcela,
      beneficiario_id: form.beneficiarios[0]?.id || "",
      beneficiario_nome: form.beneficiarios[0]?.nome || "",
    }
    setForm({ ...form, parcelas: [...form.parcelas, newParcela] })
  }

  const updateParcela = (id: string, updates: Partial<Parcela>) => {
    const updated = form.parcelas.map((p) => {
      if (p.id === id) {
        const newParcela = { ...p, ...updates }
        if (updates.beneficiario_id) {
          const beneficiario = form.beneficiarios.find((b) => b.id === updates.beneficiario_id)
          newParcela.beneficiario_nome = beneficiario?.nome || ""
        }
        return newParcela
      }
      return p
    })
    setForm({ ...form, parcelas: updated })
  }

  const removeParcela = (id: string) => {
    setForm({
      ...form,
      parcelas: form.parcelas.filter((p) => p.id !== id),
    })
  }

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return step1Valid
      case 2:
        return step2Valid
      case 3:
        return step3Valid
      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentStep === 2 && form.parcelas.length === 0) {
      generateParcelas()
    }
    setCurrentStep(Math.min(currentStep + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1))
  }

  // Save
  const handleSave = async (asDraft: boolean) => {
    setSaving(true)
    try {
      const response = await fetch("/api/intermediacao/vendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          status: asDraft ? "rascunho" : "processando",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Erro ao salvar venda")
      }

      toast.success(asDraft ? "Rascunho salvo com sucesso" : "Venda cadastrada com sucesso")
      router.push("/admin/intermediacao/vendas")
    } catch (error) {
      console.error("Error saving venda:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao salvar venda. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  // Format CPF
  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
  }

  // Format phone
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
  }

  return (
    <AppShell title="Nova Venda" showBackButton backHref="/admin/intermediacao/vendas">
      <div className="container max-w-4xl px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/intermediacao/vendas")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nova Venda</h1>
            <p className="text-muted-foreground">
              Cadastre uma nova venda de intermediacao
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        currentStep > step.id
                          ? "bg-primary border-primary text-primary-foreground"
                          : currentStep === step.id
                          ? "border-primary text-primary"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs font-medium hidden sm:block",
                        currentStep >= step.id
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 w-12 md:w-24 mx-2",
                        currentStep > step.id ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Dados da Venda */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados da Venda
              </CardTitle>
              <CardDescription>
                Informe os dados basicos da venda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Valor e Empreendimento */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="valor_total"
                      placeholder="R$ 0,00"
                      value={formatCurrencyInput(form.valor_total)}
                      onChange={(e) => handleCurrencyChange(e.target.value, "valor_total")}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empreendimento">Empreendimento *</Label>
                  <Select
                    value={form.empreendimento_id}
                    onValueChange={(v) => setForm({ ...form, empreendimento_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o empreendimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {empreendimentos.map((emp) => (
                        <SelectItem key={String(emp.id)} value={String(emp.id)}>
                          {emp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Unidade e Data */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade *</Label>
                  <Input
                    id="unidade"
                    placeholder="Ex: Apt 101, Casa 15"
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_venda">Data da Venda *</Label>
                  <Input
                    id="data_venda"
                    type="date"
                    value={form.data_venda}
                    onChange={(e) => setForm({ ...form, data_venda: e.target.value })}
                  />
                </div>
              </div>

              {/* Percentual */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="percentual">Percentual de Intermediacao *</Label>
                  <div className="relative">
                    <Input
                      id="percentual"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.percentual_intermediacao}
                      onChange={(e) =>
                        setForm({ ...form, percentual_intermediacao: e.target.value })
                      }
                      className="pr-10"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valor da Comissao</Label>
                  <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(valorComissao)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({percentualIntermediacao}% de {formatCurrency(valorTotal)})
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dados do Cliente */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados do Cliente
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente_nome">Nome Completo *</Label>
                    <Input
                      id="cliente_nome"
                      placeholder="Nome do cliente"
                      value={form.cliente_nome}
                      onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente_cpf">CPF *</Label>
                    <Input
                      id="cliente_cpf"
                      placeholder="000.000.000-00"
                      value={formatCPF(form.cliente_cpf)}
                      onChange={(e) => setForm({ ...form, cliente_cpf: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente_email">Email</Label>
                    <Input
                      id="cliente_email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={form.cliente_email}
                      onChange={(e) => setForm({ ...form, cliente_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente_telefone">Telefone</Label>
                    <Input
                      id="cliente_telefone"
                      placeholder="(11) 99999-9999"
                      value={formatPhone(form.cliente_telefone)}
                      onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Descricao */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descricao (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Observacoes sobre a venda..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Distribuicao de Comissao */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Distribuicao de Comissao
              </CardTitle>
              <CardDescription>
                Defina como a comissao sera distribuida entre os beneficiarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Comissao Info */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor da Comissao</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(valorComissao)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Formula</p>
                    <p className="text-sm font-mono">
                      {formatCurrency(valorTotal)} x {percentualIntermediacao}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Beneficiario */}
              <div className="space-y-2">
                <Label>Adicionar Beneficiario</Label>
                <div className="flex gap-2">
                  <Select onValueChange={addBeneficiario}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um beneficiario" />
                    </SelectTrigger>
                    <SelectContent>
                      {beneficiariosOptions
                        .filter((b) => !form.beneficiarios.find((fb) => fb.id === String(b.id)))
                        .map((b) => (
                          <SelectItem key={String(b.id)} value={String(b.id)}>
                            {b.nome} ({b.tipo})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Beneficiarios List */}
              {form.beneficiarios.length > 0 && (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beneficiario</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="w-32">Percentual</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.beneficiarios.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{b.tipo}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={b.percentual}
                                onChange={(e) =>
                                  updateBeneficiarioPercentual(
                                    b.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 h-8"
                              />
                              <span className="text-muted-foreground">%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(valorComissao * (b.percentual / 100))}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeBeneficiario(b.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Progress indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Distribuicao</span>
                      <span
                        className={cn(
                          "font-medium",
                          somaBeneficiariosValid
                            ? "text-emerald-600"
                            : somaBeneficiarios > 100
                            ? "text-destructive"
                            : "text-amber-600"
                        )}
                      >
                        {somaBeneficiarios.toFixed(1)}% / 100%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(somaBeneficiarios, 100)}
                      className={cn(
                        somaBeneficiariosValid
                          ? "[&>div]:bg-emerald-500"
                          : somaBeneficiarios > 100
                          ? "[&>div]:bg-destructive"
                          : "[&>div]:bg-amber-500"
                      )}
                    />
                    {!somaBeneficiariosValid && (
                      <p className="text-xs text-amber-600">
                        A soma dos percentuais deve ser igual a 100%
                      </p>
                    )}
                  </div>
                </div>
              )}

              {form.beneficiarios.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum beneficiario adicionado</p>
                  <p className="text-sm">Selecione os beneficiarios da comissao acima</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Parcelamento */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Parcelamento
              </CardTitle>
              <CardDescription>
                Defina como as comissoes serao parceladas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipo de Parcelamento */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card
                  className={cn(
                    "cursor-pointer transition-colors",
                    form.tipo_parcelamento === "automatico"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setForm({ ...form, tipo_parcelamento: "automatico" })}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2",
                          form.tipo_parcelamento === "automatico"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )}
                      />
                      <div>
                        <p className="font-medium">Automatico</p>
                        <p className="text-sm text-muted-foreground">
                          Gera parcelas automaticamente
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={cn(
                    "cursor-pointer transition-colors",
                    form.tipo_parcelamento === "manual"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setForm({ ...form, tipo_parcelamento: "manual" })}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2",
                          form.tipo_parcelamento === "manual"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )}
                      />
                      <div>
                        <p className="font-medium">Manual</p>
                        <p className="text-sm text-muted-foreground">
                          Adicione parcelas individualmente
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Configuracao Automatica */}
              {form.tipo_parcelamento === "automatico" && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Numero de Parcelas</Label>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        value={form.numero_parcelas}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            numero_parcelas: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data da Primeira Parcela</Label>
                      <Input
                        type="date"
                        value={form.data_primeira_parcela}
                        onChange={(e) =>
                          setForm({ ...form, data_primeira_parcela: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intervalo (dias)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={form.intervalo_dias}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            intervalo_dias: parseInt(e.target.value) || 30,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button onClick={generateParcelas} variant="outline" className="w-full">
                    <Calculator className="h-4 w-4 mr-2" />
                    Gerar Parcelas
                  </Button>
                </div>
              )}

              {/* Parcelas Manual */}
              {form.tipo_parcelamento === "manual" && (
                <Button onClick={addParcelaManual} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Parcela
                </Button>
              )}

              {/* Parcelas Table */}
              {form.parcelas.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Preview das Parcelas</h3>
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Beneficiario</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          {form.tipo_parcelamento === "manual" && (
                            <TableHead className="w-12"></TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.parcelas.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>#{p.numero}</TableCell>
                            <TableCell>
                              {form.tipo_parcelamento === "manual" ? (
                                <Select
                                  value={p.beneficiario_id}
                                  onValueChange={(v) =>
                                    updateParcela(p.id, { beneficiario_id: v })
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {form.beneficiarios.map((b) => (
                                      <SelectItem key={b.id} value={b.id}>
                                        {b.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                p.beneficiario_nome
                              )}
                            </TableCell>
                            <TableCell>
                              {form.tipo_parcelamento === "manual" ? (
                                <Input
                                  type="date"
                                  value={p.data_vencimento}
                                  onChange={(e) =>
                                    updateParcela(p.id, { data_vencimento: e.target.value })
                                  }
                                  className="h-8 w-36"
                                />
                              ) : (
                                new Date(p.data_vencimento).toLocaleDateString("pt-BR")
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {form.tipo_parcelamento === "manual" ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={p.valor}
                                  onChange={(e) =>
                                    updateParcela(p.id, {
                                      valor: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="h-8 w-28 text-right"
                                />
                              ) : (
                                formatCurrency(p.valor)
                              )}
                            </TableCell>
                            {form.tipo_parcelamento === "manual" && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeParcela(p.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Validation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total das Parcelas</span>
                      <span
                        className={cn(
                          "font-medium",
                          somaParcelasValid ? "text-emerald-600" : "text-amber-600"
                        )}
                      >
                        {formatCurrency(somaParcelas)} / {formatCurrency(valorComissao)}
                      </span>
                    </div>
                    {!somaParcelasValid && (
                      <p className="text-xs text-amber-600">
                        A soma das parcelas deve ser igual ao valor da comissao
                      </p>
                    )}
                  </div>
                </div>
              )}

              {form.parcelas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma parcela gerada</p>
                  <p className="text-sm">
                    {form.tipo_parcelamento === "automatico"
                      ? "Configure e gere as parcelas automaticamente"
                      : "Adicione parcelas manualmente"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Revisao */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Resumo da Venda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados da Venda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Empreendimento</p>
                      <p className="font-medium">
                        {empreendimentos.find((e) => String(e.id) === form.empreendimento_id)?.nome}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unidade</p>
                      <p className="font-medium">{form.unidade}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data da Venda</p>
                      <p className="font-medium">
                        {new Date(form.data_venda).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-xl font-bold">{formatCurrency(valorTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Comissao ({percentualIntermediacao}%)</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatCurrency(valorComissao)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{form.cliente_nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{formatCPF(form.cliente_cpf)}</p>
                  </div>
                  {form.cliente_email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{form.cliente_email}</p>
                    </div>
                  )}
                  {form.cliente_telefone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{formatPhone(form.cliente_telefone)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Beneficiarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Distribuicao de Comissao
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beneficiario</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Percentual</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.beneficiarios.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{b.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{b.percentual}%</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(valorComissao * (b.percentual / 100))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Parcelas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Parcelas ({form.parcelas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Beneficiario</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.parcelas.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>#{p.numero}</TableCell>
                          <TableCell>{p.beneficiario_nome}</TableCell>
                          <TableCell>
                            {new Date(p.data_vencimento).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(p.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-2">
            {currentStep === 4 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar como Rascunho
                </Button>
                <Button onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar e Processar
                </Button>
              </>
            )}
            {currentStep < 4 && (
              <Button onClick={handleNext} disabled={!canGoNext()}>
                Proximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
