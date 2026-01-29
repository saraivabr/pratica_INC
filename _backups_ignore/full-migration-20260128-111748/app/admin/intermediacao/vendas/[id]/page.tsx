"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  DollarSign,
  Download,
  Edit,
  FileText,
  History,
  Loader2,
  Mail,
  MoreHorizontal,
  Percent,
  Phone,
  ShieldAlert,
  User,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

// Types
type VendaStatus = "rascunho" | "processando" | "concluida" | "paga"
type ParcelaStatus = "pendente" | "paga" | "atrasada"

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
  data_pagamento?: string
  status: ParcelaStatus
  beneficiario_id: string
  beneficiario_nome: string
}

interface AuditLog {
  id: string
  acao: string
  descricao: string
  usuario_nome: string
  data: string
}

interface Venda {
  id: string
  codigo: string
  cliente_nome: string
  cliente_cpf: string
  cliente_email?: string
  cliente_telefone?: string
  empreendimento_id: string
  empreendimento_nome: string
  unidade: string
  valor_total: number
  percentual_intermediacao: number
  valor_comissao: number
  status: VendaStatus
  data_venda: string
  descricao?: string
  created_at: string
  updated_at: string
  beneficiarios: Beneficiario[]
  parcelas: Parcela[]
  auditoria: AuditLog[]
}

const statusConfig: Record<VendaStatus, { label: string; color: string; icon: React.ElementType }> = {
  rascunho: { label: "Rascunho", color: "bg-zinc-500", icon: FileText },
  processando: { label: "Em Processamento", color: "bg-amber-500", icon: Clock },
  concluida: { label: "Concluida", color: "bg-emerald-500", icon: CheckCircle2 },
  paga: { label: "Paga", color: "bg-blue-500", icon: DollarSign },
}

const parcelaStatusConfig: Record<ParcelaStatus, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-500" },
  paga: { label: "Paga", color: "bg-emerald-500" },
  atrasada: { label: "Atrasada", color: "bg-red-500" },
}

export default function VendaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [venda, setVenda] = useState<Venda | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeParcelaTab, setActiveParcelaTab] = useState<string>("todas")

  const vendaId = params.id as string
  const isEditing = searchParams.get("edit") === "true"

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess && vendaId) {
      fetchVenda()
    }
  }, [hasAccess, vendaId])

  const fetchVenda = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/intermediacao/vendas/${vendaId}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao carregar venda")
      }

      const data = result.data

      // Map API response to component format
      const vendaData: Venda = {
        id: data.id,
        codigo: data.codigo,
        cliente_nome: data.cliente_nome,
        cliente_cpf: data.cliente_cpf || "",
        cliente_email: data.cliente_email,
        cliente_telefone: data.cliente_telefone,
        empreendimento_id: data.empreendimento_id || "",
        empreendimento_nome: data.empreendimento || "",
        unidade: data.unidade,
        valor_total: Number(data.valor_total),
        percentual_intermediacao: Number(data.percentual_intermediacao),
        valor_comissao: Number(data.valor_comissao),
        status: data.status === "em_processamento" ? "processando" : data.status,
        data_venda: data.data_venda,
        descricao: data.descricao,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Map distribuicoes to beneficiarios format
        beneficiarios: (data.distribuicoes || []).map((d: any) => ({
          id: d.beneficiario_id,
          nome: d.beneficiario_nome || "Desconhecido",
          tipo: d.beneficiario_tipo || "outro",
          percentual: Number(d.percentual),
          valor: Number(d.valor),
        })),
        // Map parcelas
        parcelas: (data.parcelas || []).map((p: any) => ({
          id: p.id,
          numero: p.numero,
          valor: Number(p.valor),
          data_vencimento: p.data_vencimento,
          data_pagamento: p.data_pagamento,
          status: p.status as ParcelaStatus,
          beneficiario_id: p.beneficiario_id,
          beneficiario_nome: p.beneficiario_nome || "Desconhecido",
        })),
        // Map auditoria
        auditoria: (data.auditoria || []).map((a: any) => ({
          id: a.id,
          acao: a.acao,
          descricao: formatAuditDescription(a),
          usuario_nome: a.usuario_nome || "Sistema",
          data: a.created_at,
        })),
      }

      setVenda(vendaData)
    } catch (error) {
      console.error("Error fetching venda:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao carregar venda")
      setVenda(null)
    }
    setLoading(false)
  }

  // Helper function to format audit description from API data
  const formatAuditDescription = (audit: any): string => {
    if (audit.dados_novos) {
      try {
        const dados = typeof audit.dados_novos === 'string'
          ? JSON.parse(audit.dados_novos)
          : audit.dados_novos
        if (dados.campos_alterados) {
          return `Campos alterados: ${dados.campos_alterados.join(", ")}`
        }
      } catch {
        // ignore parse errors
      }
    }
    // Fallback descriptions based on action type
    switch (audit.acao) {
      case "criacao":
        return "Venda criada"
      case "atualizacao":
        return "Venda atualizada"
      case "exclusao":
        return "Venda excluida"
      case "mudanca_status":
        return "Status alterado"
      case "pagamento":
        return "Pagamento registrado"
      default:
        return audit.acao
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR")
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR")
  }

  // Group parcelas by beneficiario
  const parcelasByBeneficiario = venda?.parcelas.reduce((acc, parcela) => {
    if (!acc[parcela.beneficiario_id]) {
      acc[parcela.beneficiario_id] = {
        beneficiario_nome: parcela.beneficiario_nome,
        parcelas: [],
      }
    }
    acc[parcela.beneficiario_id].parcelas.push(parcela)
    return acc
  }, {} as Record<string, { beneficiario_nome: string; parcelas: Parcela[] }>)

  // Stats
  const parcelasPagas = venda?.parcelas.filter((p) => p.status === "paga").length || 0
  const totalParcelas = venda?.parcelas.length || 0
  const valorPago = venda?.parcelas
    .filter((p) => p.status === "paga")
    .reduce((sum, p) => sum + p.valor, 0) || 0

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

  if (!venda) {
    return (
      <AppShell title="Venda nao encontrada">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Venda nao encontrada</h1>
            <p className="text-muted-foreground mb-6">
              A venda que voce esta procurando nao existe ou foi removida.
            </p>
            <Button onClick={() => router.push("/admin/intermediacao/vendas")}>
              Voltar para lista
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const statusInfo = statusConfig[venda.status]

  return (
    <AppShell title={`Venda ${venda.codigo}`} showBackButton backHref="/admin/intermediacao/vendas">
      <div className="container max-w-6xl px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/intermediacao/vendas")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{venda.codigo}</h1>
                <Badge
                  className={cn(
                    "gap-1",
                    statusInfo.color,
                    "text-white border-0"
                  )}
                >
                  <statusInfo.icon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {venda.empreendimento_nome} - {venda.unidade}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/intermediacao/vendas/${venda.id}?edit=true`)}
              disabled={venda.status === "paga"}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar PDF
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar por Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Excluir Venda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status da Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {Object.entries(statusConfig).map(([key, config], index) => {
                const statusOrder = ["rascunho", "processando", "concluida", "paga"]
                const currentIndex = statusOrder.indexOf(venda.status)
                const stepIndex = statusOrder.indexOf(key)
                const isCompleted = stepIndex <= currentIndex
                const isCurrent = key === venda.status

                return (
                  <div key={key} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                          isCompleted
                            ? `${config.color} border-transparent text-white`
                            : "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {isCompleted && stepIndex < currentIndex ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <config.icon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "mt-2 text-xs font-medium",
                          isCurrent ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    {index < Object.keys(statusConfig).length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 w-16 md:w-32 mx-2",
                          stepIndex < currentIndex ? config.color : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Dados da Venda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informacoes da Venda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Empreendimento</p>
                      <p className="font-medium">{venda.empreendimento_nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unidade</p>
                      <p className="font-medium">{venda.unidade}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data da Venda</p>
                      <p className="font-medium">{formatDate(venda.data_venda)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-xl font-bold">{formatCurrency(venda.valor_total)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Comissao ({venda.percentual_intermediacao}%)
                      </p>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatCurrency(venda.valor_comissao)}
                      </p>
                    </div>
                  </div>
                </div>
                {venda.descricao && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Descricao</p>
                      <p className="text-sm">{venda.descricao}</p>
                    </div>
                  </>
                )}
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
                    <p className="font-medium">{venda.cliente_nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{venda.cliente_cpf}</p>
                  </div>
                  {venda.cliente_email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${venda.cliente_email}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {venda.cliente_email}
                      </a>
                    </div>
                  )}
                  {venda.cliente_telefone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <a
                        href={`tel:${venda.cliente_telefone}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {venda.cliente_telefone}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Distribuicao de Comissao */}
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
                    {venda.beneficiarios.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{b.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{b.percentual}%</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(b.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Parcelas por Beneficiario */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Parcelas por Beneficiario
                </CardTitle>
                <CardDescription>
                  {parcelasPagas} de {totalParcelas} parcelas pagas ({formatCurrency(valorPago)} de{" "}
                  {formatCurrency(venda.valor_comissao)})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {parcelasByBeneficiario &&
                  Object.entries(parcelasByBeneficiario).map(([beneficiarioId, data]) => {
                    const beneficiario = venda.beneficiarios.find((b) => b.id === beneficiarioId)
                    const totalPago = data.parcelas
                      .filter((p) => p.status === "paga")
                      .reduce((sum, p) => sum + p.valor, 0)

                    return (
                      <div key={beneficiarioId} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{data.beneficiario_nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(totalPago)} de {formatCurrency(beneficiario?.valor || 0)} pago
                            </p>
                          </div>
                          <Badge variant="outline">{beneficiario?.tipo}</Badge>
                        </div>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Parcela</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.parcelas.map((p) => {
                                const statusInfo = parcelaStatusConfig[p.status]
                                return (
                                  <TableRow key={p.id}>
                                    <TableCell>#{p.numero}</TableCell>
                                    <TableCell>{formatDate(p.data_vencimento)}</TableCell>
                                    <TableCell>
                                      {p.data_pagamento ? formatDate(p.data_pagamento) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(p.valor)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={cn(
                                          statusInfo.color,
                                          "text-white border-0"
                                        )}
                                      >
                                        {statusInfo.label}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Audit */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <span className="font-bold">{formatCurrency(venda.valor_total)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Comissao</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(venda.valor_comissao)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Percentual</span>
                  <Badge variant="outline">{venda.percentual_intermediacao}%</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Pago</span>
                  <span className="font-medium text-blue-600">{formatCurrency(valorPago)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Pendente</span>
                  <span className="font-medium text-amber-600">
                    {formatCurrency(venda.valor_comissao - valorPago)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Parcelas</span>
                  <span className="font-medium">
                    {parcelasPagas}/{totalParcelas} pagas
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Beneficiarios</span>
                  <span className="font-medium">{venda.beneficiarios.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Historico de Auditoria */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {venda.auditoria.map((log, index) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        {index < venda.auditoria.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">{log.acao}</p>
                        <p className="text-xs text-muted-foreground">{log.descricao}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.usuario_nome} - {formatDateTime(log.data)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Informacoes do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Codigo</span>
                  <span className="font-mono">{venda.codigo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-xs">{venda.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{formatDateTime(venda.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Atualizado em</span>
                  <span>{formatDateTime(venda.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
