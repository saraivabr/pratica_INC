"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  ShieldAlert,
  User,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type TipoPessoa = "fisica" | "juridica"
type Cargo = "corretor" | "gerente" | "proprietario" | "imobiliaria" | "outro"
type TipoConta = "corrente" | "poupanca"

interface FormData {
  tipo_pessoa: TipoPessoa
  nome: string
  documento: string
  cargo: Cargo
  email: string
  telefone: string
  // Dados bancarios
  banco: string
  agencia: string
  conta: string
  tipo_conta: TipoConta
  chave_pix: string
  // Observacoes
  observacoes: string
}

// Validacao de CPF
function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, "")
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cpf.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cpf.charAt(10))) return false

  return true
}

// Validacao de CNPJ
function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/\D/g, "")
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false

  let length = cnpj.length - 2
  let numbers = cnpj.substring(0, length)
  const digits = cnpj.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  length = length + 1
  numbers = cnpj.substring(0, length)
  sum = 0
  pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false

  return true
}

// Formatacao de CPF
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

// Formatacao de CNPJ
function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

// Formatacao de telefone
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
}

// Lista de bancos
const bancos = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Economica" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itau" },
  { codigo: "422", nome: "Safra" },
  { codigo: "745", nome: "Citibank" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "077", nome: "Inter" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "290", nome: "PagSeguro" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "outros", nome: "Outro" },
]

export default function NovoBeneficiarioPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [formData, setFormData] = useState<FormData>({
    tipo_pessoa: "fisica",
    nome: "",
    documento: "",
    cargo: "corretor",
    email: "",
    telefone: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    chave_pix: "",
    observacoes: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Quando muda tipo pessoa, ajusta o cargo
  useEffect(() => {
    if (formData.tipo_pessoa === "juridica") {
      setFormData((prev) => ({ ...prev, cargo: "imobiliaria" }))
    }
  }, [formData.tipo_pessoa])

  const handleDocumentoChange = (value: string) => {
    const formatted =
      formData.tipo_pessoa === "fisica" ? formatCPF(value) : formatCNPJ(value)
    setFormData((prev) => ({ ...prev, documento: formatted }))

    // Validacao em tempo real
    const isValid =
      formData.tipo_pessoa === "fisica"
        ? validateCPF(formatted)
        : validateCNPJ(formatted)

    if (formatted.replace(/\D/g, "").length === (formData.tipo_pessoa === "fisica" ? 11 : 14)) {
      if (!isValid) {
        setErrors((prev) => ({
          ...prev,
          documento: formData.tipo_pessoa === "fisica" ? "CPF invalido" : "CNPJ invalido",
        }))
      } else {
        setErrors((prev) => {
          const { documento, ...rest } = prev
          return rest
        })
      }
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome e obrigatorio"
    }

    if (!formData.documento.trim()) {
      newErrors.documento = "Documento e obrigatorio"
    } else {
      const isValid =
        formData.tipo_pessoa === "fisica"
          ? validateCPF(formData.documento)
          : validateCNPJ(formData.documento)
      if (!isValid) {
        newErrors.documento =
          formData.tipo_pessoa === "fisica" ? "CPF invalido" : "CNPJ invalido"
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email e obrigatorio"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const res = await fetch("/api/intermediacao/beneficiarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          documento: formData.documento.replace(/\D/g, ""),
          telefone: formData.telefone.replace(/\D/g, ""),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/admin/intermediacao/beneficiarios/${data.beneficiario.id}`)
      } else {
        const data = await res.json()
        toast.error(data.error || "Erro ao salvar beneficiario")
      }
    } catch (error) {
      console.error("Error saving beneficiario:", error)
      toast.error("Erro ao salvar beneficiario")
    }
    setSaving(false)
  }

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Esta area e exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppShell title="Novo Beneficiario">
      <div className="container px-4 py-6 animate-page-in max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/intermediacao/beneficiarios")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Beneficiario</h1>
            <p className="text-muted-foreground">
              Cadastre um novo beneficiario no sistema
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tipo de Pessoa */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Pessoa</CardTitle>
              <CardDescription>
                Selecione se e pessoa fisica ou juridica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.tipo_pessoa === "fisica" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      tipo_pessoa: "fisica",
                      documento: "",
                      cargo: "corretor",
                    }))
                  }
                >
                  <User className="h-4 w-4" />
                  Pessoa Fisica
                </Button>
                <Button
                  type="button"
                  variant={formData.tipo_pessoa === "juridica" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      tipo_pessoa: "juridica",
                      documento: "",
                      cargo: "imobiliaria",
                    }))
                  }
                >
                  <Building2 className="h-4 w-4" />
                  Pessoa Juridica
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dados Pessoais/Empresariais */}
          <Card>
            <CardHeader>
              <CardTitle>
                {formData.tipo_pessoa === "fisica"
                  ? "Dados Pessoais"
                  : "Dados da Empresa"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nome / Razao Social */}
              <div className="space-y-2">
                <Label htmlFor="nome">
                  {formData.tipo_pessoa === "fisica" ? "Nome Completo" : "Razao Social"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder={
                    formData.tipo_pessoa === "fisica"
                      ? "Digite o nome completo"
                      : "Digite a razao social"
                  }
                  className={cn(errors.nome && "border-destructive")}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome}</p>
                )}
              </div>

              {/* CPF / CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="documento">
                  {formData.tipo_pessoa === "fisica" ? "CPF" : "CNPJ"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="documento"
                  value={formData.documento}
                  onChange={(e) => handleDocumentoChange(e.target.value)}
                  placeholder={
                    formData.tipo_pessoa === "fisica"
                      ? "000.000.000-00"
                      : "00.000.000/0000-00"
                  }
                  className={cn(errors.documento && "border-destructive")}
                />
                {errors.documento && (
                  <p className="text-sm text-destructive">{errors.documento}</p>
                )}
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <Label htmlFor="cargo">
                  Cargo <span className="text-destructive">*</span>
                </Label>
                {formData.tipo_pessoa === "fisica" ? (
                  <Select
                    value={formData.cargo}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, cargo: v as Cargo }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corretor">Corretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="proprietario">Proprietario</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value="Imobiliaria" disabled />
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@exemplo.com"
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      telefone: formatPhone(e.target.value),
                    }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados Bancarios */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancarios</CardTitle>
              <CardDescription>
                Informacoes para pagamento (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Banco */}
                <div className="space-y-2">
                  <Label htmlFor="banco">Banco</Label>
                  <Select
                    value={formData.banco}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, banco: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map((banco) => (
                        <SelectItem key={banco.codigo} value={banco.codigo}>
                          {banco.codigo !== "outros"
                            ? `${banco.codigo} - ${banco.nome}`
                            : banco.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Conta */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                  <Select
                    value={formData.tipo_conta}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, tipo_conta: v as TipoConta }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupanca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Agencia */}
                <div className="space-y-2">
                  <Label htmlFor="agencia">Agencia</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, agencia: e.target.value }))
                    }
                    placeholder="0000"
                  />
                </div>

                {/* Conta */}
                <div className="space-y-2">
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, conta: e.target.value }))
                    }
                    placeholder="00000-0"
                  />
                </div>
              </div>

              {/* Chave PIX */}
              <div className="space-y-2">
                <Label htmlFor="chave_pix">Chave PIX</Label>
                <Input
                  id="chave_pix"
                  value={formData.chave_pix}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, chave_pix: e.target.value }))
                  }
                  placeholder="CPF, CNPJ, email, telefone ou chave aleatoria"
                />
              </div>
            </CardContent>
          </Card>

          {/* Observacoes */}
          <Card>
            <CardHeader>
              <CardTitle>Observacoes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                placeholder="Observacoes adicionais sobre o beneficiario..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Acoes */}
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/intermediacao/beneficiarios")}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
