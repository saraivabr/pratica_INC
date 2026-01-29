"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldAlert,
  User,
  Wallet,
  X,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface Beneficiario {
  id: string
  tipo_pessoa: "fisica" | "juridica"
  nome: string
  documento: string
  cargo: string
  email: string
  telefone?: string
  is_active: boolean
  total_a_receber: number
  total_pendente: number
  total_pago: number
  // Dados bancarios
  banco?: string
  agencia?: string
  conta?: string
  tipo_conta?: string
  chave_pix?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

interface Parcela {
  id: string
  venda_codigo: string
  numero: number
  total: number
  valor: number
  data_vencimento: string
  data_pagamento?: string
  status: "pendente" | "pago" | "atrasado"
}

interface Extrato {
  id: string
  data: string
  descricao: string
  tipo: "credito" | "debito"
  valor: number
  saldo: number
}

interface VendaVinculada {
  id: string
  codigo: string
  empreendimento: string
  unidade: string
  cliente: string
  valor_total: number
  percentual_comissao: number
  valor_comissao: number
  status: string
  data_venda: string
}

// Funcoes utilitarias
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR")
}

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "")
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "")
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
}

const cargoLabels: Record<string, string> = {
  corretor: "Corretor",
  gerente: "Gerente",
  proprietario: "Proprietario",
  imobiliaria: "Imobiliaria",
  outro: "Outro",
}

const bancoLabels: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "104": "Caixa Economica",
  "237": "Bradesco",
  "341": "Itau",
  "422": "Safra",
  "745": "Citibank",
  "756": "Sicoob",
  "077": "Inter",
  "260": "Nubank",
  "290": "PagSeguro",
  "380": "PicPay",
  "323": "Mercado Pago",
}

export default function BeneficiarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [beneficiario, setBeneficiario] = useState<Beneficiario | null>(null)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [extrato, setExtrato] = useState<Extrato[]>([])
  const [vendas, setVendas] = useState<VendaVinculada[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true")
  const [editForm, setEditForm] = useState<Partial<Beneficiario>>({})
  const [activeTab, setActiveTab] = useState("parcelas")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess && id) {
      fetchBeneficiario()
    }
  }, [hasAccess, id])

  const fetchBeneficiario = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/intermediacao/beneficiarios/${id}`)
      if (res.ok) {
        const data = await res.json()
        setBeneficiario(data.beneficiario)
        setParcelas(data.parcelas || [])
        setExtrato(data.extrato || [])
        setVendas(data.vendas || [])
        setEditForm(data.beneficiario)
      } else if (res.status === 404) {
        router.push("/admin/intermediacao/beneficiarios")
      }
    } catch (error) {
      console.error("Error fetching beneficiario:", error)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!beneficiario) return

    setSaving(true)
    try {
      const res = await fetch(`/api/intermediacao/beneficiarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        const data = await res.json()
        setBeneficiario(data.beneficiario)
        setIsEditing(false)
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao salvar")
      }
    } catch (error) {
      console.error("Error saving beneficiario:", error)
      alert("Erro ao salvar")
    }
    setSaving(false)
  }

  const handleCancelEdit = () => {
    setEditForm(beneficiario || {})
    setIsEditing(false)
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

  if (authLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!beneficiario) {
    return (
      <AppShell title="Beneficiario nao encontrado">
        <div className="container px-4 py-12 animate-page-in text-center">
          <p className="text-muted-foreground mb-4">Beneficiario nao encontrado</p>
          <Button onClick={() => router.push("/admin/intermediacao/beneficiarios")}>
            Voltar para lista
          </Button>
        </div>
      </AppShell>
    )
  }

  const documento =
    beneficiario.tipo_pessoa === "fisica"
      ? formatCPF(beneficiario.documento)
      : formatCNPJ(beneficiario.documento)

  return (
    <AppShell title={beneficiario.nome}>
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/intermediacao/beneficiarios")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Avatar e Info */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center",
                  beneficiario.tipo_pessoa === "fisica"
                    ? "bg-primary/10"
                    : "bg-amber-500/10"
                )}
              >
                {beneficiario.tipo_pessoa === "fisica" ? (
                  <User className="h-7 w-7 text-primary" />
                ) : (
                  <Building2 className="h-7 w-7 text-amber-600" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{beneficiario.nome}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{cargoLabels[beneficiario.cargo] || beneficiario.cargo}</span>
                  <span>|</span>
                  <span className="font-mono">
                    {beneficiario.tipo_pessoa === "fisica" ? "CPF" : "CNPJ"}: {documento}
                  </span>
                  <span>|</span>
                  <Badge variant={beneficiario.is_active ? "default" : "secondary"}>
                    {beneficiario.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">A Receber</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(beneficiario.total_a_receber)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(beneficiario.total_pendente)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pago</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(beneficiario.total_pago)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Conteudo */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="parcelas" className="gap-2">
              <Calendar className="h-4 w-4" />
              Parcelas
            </TabsTrigger>
            <TabsTrigger value="extrato" className="gap-2">
              <Banknote className="h-4 w-4" />
              Extrato
            </TabsTrigger>
            <TabsTrigger value="vendas" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Vendas Vinculadas
            </TabsTrigger>
          </TabsList>

          {/* Tab Parcelas */}
          <TabsContent value="parcelas">
            <Card>
              <CardHeader>
                <CardTitle>Parcelas Pendentes</CardTitle>
                <CardDescription>
                  Parcelas vinculadas a este beneficiario
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {parcelas.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Nenhuma parcela encontrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Venda</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parcelas.map((parcela) => (
                        <TableRow key={parcela.id}>
                          <TableCell className="font-mono">
                            {parcela.venda_codigo}
                          </TableCell>
                          <TableCell>
                            {parcela.numero}/{parcela.total}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parcela.valor)}
                          </TableCell>
                          <TableCell>{formatDate(parcela.data_vencimento)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                parcela.status === "pago"
                                  ? "default"
                                  : parcela.status === "atrasado"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={cn(
                                parcela.status === "pago" && "bg-green-500",
                                parcela.status === "pendente" && "bg-amber-500"
                              )}
                            >
                              {parcela.status === "pago"
                                ? "Pago"
                                : parcela.status === "atrasado"
                                ? "Atrasado"
                                : "Pendente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Extrato */}
          <TabsContent value="extrato">
            <Card>
              <CardHeader>
                <CardTitle>Extrato</CardTitle>
                <CardDescription>Movimentacoes financeiras</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {extrato.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Nenhuma movimentacao encontrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descricao</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extrato.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.data)}</TableCell>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium",
                              item.tipo === "credito"
                                ? "text-green-600"
                                : "text-red-600"
                            )}
                          >
                            {item.tipo === "credito" ? "+" : "-"}
                            {formatCurrency(item.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.saldo)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Vendas Vinculadas */}
          <TabsContent value="vendas">
            <Card>
              <CardHeader>
                <CardTitle>Vendas Vinculadas</CardTitle>
                <CardDescription>
                  Vendas onde este beneficiario tem participacao
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {vendas.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Nenhuma venda vinculada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Empreendimento</TableHead>
                        <TableHead className="hidden md:table-cell">Cliente</TableHead>
                        <TableHead className="text-right">Comissao</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendas.map((venda) => (
                        <TableRow key={venda.id}>
                          <TableCell className="font-mono">{venda.codigo}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{venda.empreendimento}</p>
                              <p className="text-xs text-muted-foreground">
                                {venda.unidade}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {venda.cliente}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <p className="font-medium">
                                {formatCurrency(venda.valor_comissao)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {venda.percentual_comissao}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{venda.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(`/admin/intermediacao/vendas/${venda.id}`)
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dados Bancarios e Contato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dados Bancarios */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancarios</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Select
                        value={editForm.banco || ""}
                        onValueChange={(v) =>
                          setEditForm((prev) => ({ ...prev, banco: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(bancoLabels).map(([codigo, nome]) => (
                            <SelectItem key={codigo} value={codigo}>
                              {codigo} - {nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Conta</Label>
                      <Select
                        value={editForm.tipo_conta || "corrente"}
                        onValueChange={(v) =>
                          setEditForm((prev) => ({ ...prev, tipo_conta: v }))
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Agencia</Label>
                      <Input
                        value={editForm.agencia || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, agencia: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conta</Label>
                      <Input
                        value={editForm.conta || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, conta: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      value={editForm.chave_pix || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, chave_pix: e.target.value }))
                      }
                    />
                  </div>
                </div>
              ) : beneficiario.banco || beneficiario.chave_pix ? (
                <div className="space-y-2 text-sm">
                  {beneficiario.banco && (
                    <p>
                      <span className="text-muted-foreground">Banco:</span>{" "}
                      {bancoLabels[beneficiario.banco] || beneficiario.banco}
                    </p>
                  )}
                  {beneficiario.agencia && (
                    <p>
                      <span className="text-muted-foreground">Agencia:</span>{" "}
                      {beneficiario.agencia}
                    </p>
                  )}
                  {beneficiario.conta && (
                    <p>
                      <span className="text-muted-foreground">
                        Conta {beneficiario.tipo_conta === "poupanca" ? "Poupanca" : "Corrente"}:
                      </span>{" "}
                      {beneficiario.conta}
                    </p>
                  )}
                  {beneficiario.chave_pix && (
                    <p>
                      <span className="text-muted-foreground">PIX:</span>{" "}
                      {beneficiario.chave_pix}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhum dado bancario cadastrado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editForm.email || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={editForm.telefone ? formatPhone(editForm.telefone) : ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          telefone: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is-active"
                      checked={editForm.is_active}
                      onCheckedChange={(checked) =>
                        setEditForm((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                    <Label htmlFor="is-active">Beneficiario ativo</Label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${beneficiario.email}`}
                      className="hover:underline"
                    >
                      {beneficiario.email}
                    </a>
                  </div>
                  {beneficiario.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${beneficiario.telefone}`}
                        className="hover:underline"
                      >
                        {formatPhone(beneficiario.telefone)}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Observacoes */}
        {(isEditing || beneficiario.observacoes) && (
          <Card>
            <CardHeader>
              <CardTitle>Observacoes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.observacoes || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                  rows={4}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{beneficiario.observacoes}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
