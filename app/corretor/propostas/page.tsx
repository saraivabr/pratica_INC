"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  FileText,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Building2,
  User,
  DollarSign,
  Upload,
  Check,
  X,
  Trash2,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileUp,
  AlertCircle,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────
interface Proposta {
  id: string
  codigo: string
  empreendimento_nome: string
  unidade_codigo: string
  unidade_bloco: string
  cliente_nome: string
  valor_total: number
  status: string
  created_at: string
  enviada_em: string | null
  aprovado_em: string | null
  corretor_nome: string
  total_parcelas: number
  total_documentos: number
}

interface Parcela {
  tipo: string
  descricao: string
  valor: number
  data_vencimento: string
  quantidade: number
  valor_parcela: number
  ordem: number
}

interface Empreendimento {
  id: number
  nome: string
  cidade: string
  uf: string
}

interface Unidade {
  id: number
  codigo: string
  bloco: string
  andar: string
  valor_tabela: number | null
  empreendimento_id: number
  empreendimento_nome: string
  status: string
}

interface PropostaDetalhe extends Proposta {
  empreendimento_id: string
  unidade_id: string
  unidade_andar: string
  valor_tabela: number | null
  valor_ato: number
  cliente_cpf: string
  cliente_telefone: string
  cliente_email: string
  observacoes: string
  motivo_recusa: string | null
  aprovador_nome: string | null
  parcelas: Array<Parcela & { id: string }>
  documentos: Array<{
    id: string
    categoria: string
    nome_original: string
    mime_type: string
    tamanho: number
    created_at: string
  }>
}

// ─── Helpers ─────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR")
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rascunho: { label: "Rascunho", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: FileText },
  enviada: { label: "Enviada", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Send },
  aprovada: { label: "Aprovada", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  recusada: { label: "Recusada", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: XCircle },
  cancelada: { label: "Cancelada", color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500", icon: X },
}

const TIPO_PARCELA_LABELS: Record<string, string> = {
  ato: "Ato / Sinal",
  mensal: "Mensais",
  intermediaria: "Intermediária",
  entrega: "Entrega",
  balao: "Balão",
  fgts: "FGTS",
  subsidio: "Subsídio",
}

const CATEGORIA_DOC_LABELS: Record<string, string> = {
  rg: "RG",
  cpf: "CPF",
  comprovante_renda: "Comprovante de Renda",
  contrato: "Contrato",
  simulacao: "Simulação",
  outro: "Outro",
}

// ─── Main Page ───────────────────────────────────────────
export default function CorretorPropostasPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-propostas")

  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("todas")
  const [showWizard, setShowWizard] = useState(false)
  const [selectedProposta, setSelectedProposta] = useState<PropostaDetalhe | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const isAdmin = user?.role === "admin" || user?.role === "gerente"

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  const fetchPropostas = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "todas") {
        params.append("status", statusFilter)
      }
      const res = await fetch(`/api/propostas?${params}`)
      const json = await res.json()
      if (json.success) {
        setPropostas(json.data)
      }
    } catch (err) {
      console.error("Erro ao carregar propostas:", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (isAuthenticated) fetchPropostas()
  }, [isAuthenticated, fetchPropostas])

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/propostas/${id}`)
      const json = await res.json()
      if (json.success) {
        setSelectedProposta(json.data)
        setShowDetail(true)
      }
    } catch (err) {
      console.error("Erro ao carregar detalhe:", err)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AppShell title="Propostas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Propostas</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isAdmin ? "Gerencie e aprove propostas da equipe" : "Monte e envie propostas comerciais"}
            </p>
          </div>
          <Button
            onClick={() => setShowWizard(true)}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        </div>

        {/* Filters */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-zinc-100 dark:bg-zinc-800">
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="rascunho">Rascunhos</TabsTrigger>
            <TabsTrigger value="enviada">Enviadas</TabsTrigger>
            <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
            <TabsTrigger value="recusada">Recusadas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : propostas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nenhuma proposta</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                {statusFilter !== "todas"
                  ? `Nenhuma proposta com status "${STATUS_CONFIG[statusFilter]?.label || statusFilter}"`
                  : "Crie sua primeira proposta para começar"}
              </p>
              {statusFilter === "todas" && (
                <Button onClick={() => setShowWizard(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Proposta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {propostas.map((p) => {
              const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.rascunho
              const StatusIcon = st.icon
              return (
                <Card
                  key={p.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openDetail(p.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-zinc-400">{p.codigo}</span>
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", st.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {st.label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {p.empreendimento_nome}
                          {p.unidade_codigo && (
                            <span className="text-zinc-500 font-normal"> - {p.unidade_bloco ? `${p.unidade_bloco}/` : ""}{p.unidade_codigo}</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {p.cliente_nome}
                          </span>
                          {isAdmin && p.corretor_nome && (
                            <span className="text-xs text-zinc-400">por {p.corretor_nome}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(p.valor_total)}</p>
                          <p className="text-xs text-zinc-400">{formatDate(p.created_at)}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600 hidden sm:block" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Wizard Dialog */}
      {showWizard && (
        <PropostaWizard
          open={showWizard}
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false)
            fetchPropostas()
          }}
        />
      )}

      {/* Detail Dialog */}
      {showDetail && selectedProposta && (
        <PropostaDetail
          open={showDetail}
          proposta={selectedProposta}
          isAdmin={isAdmin}
          onClose={() => {
            setShowDetail(false)
            setSelectedProposta(null)
          }}
          onUpdate={() => {
            setShowDetail(false)
            setSelectedProposta(null)
            fetchPropostas()
          }}
        />
      )}
    </AppShell>
  )
}

// ─── Wizard Component ────────────────────────────────────
function PropostaWizard({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Empreendimento
  const [empBusca, setEmpBusca] = useState("")
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [empLoading, setEmpLoading] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Empreendimento | null>(null)

  // Step 2: Unidade
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [uniLoading, setUniLoading] = useState(false)
  const [selectedUni, setSelectedUni] = useState<Unidade | null>(null)

  // Step 3: Cliente
  const [clienteNome, setClienteNome] = useState("")
  const [clienteCpf, setClienteCpf] = useState("")
  const [clienteTelefone, setClienteTelefone] = useState("")
  const [clienteEmail, setClienteEmail] = useState("")

  // Step 4: Parcelas
  const [valorTotal, setValorTotal] = useState("")
  const [parcelas, setParcelas] = useState<Parcela[]>([])

  // Step 5: Observações
  const [observacoes, setObservacoes] = useState("")

  // Buscar empreendimentos
  useEffect(() => {
    if (step !== 1) return
    const timer = setTimeout(async () => {
      try {
        setEmpLoading(true)
        const params = new URLSearchParams()
        if (empBusca) params.set("busca", empBusca)
        params.set("limit", "20")
        const res = await fetch(`/api/comissao/buscar/empreendimentos?${params}`)
        const json = await res.json()
        if (json.success) setEmpreendimentos(json.data)
      } catch (err) {
        console.error(err)
      } finally {
        setEmpLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [empBusca, step])

  // Buscar unidades
  useEffect(() => {
    if (!selectedEmp || step !== 2) return
    const load = async () => {
      try {
        setUniLoading(true)
        const res = await fetch(`/api/comissao/buscar/unidades/${selectedEmp.id}`)
        const json = await res.json()
        if (json.success) setUnidades(json.data)
      } catch (err) {
        console.error(err)
      } finally {
        setUniLoading(false)
      }
    }
    load()
  }, [selectedEmp, step])

  // Set valor_tabela when unit selected
  useEffect(() => {
    if (selectedUni?.valor_tabela && !valorTotal) {
      setValorTotal(String(selectedUni.valor_tabela))
    }
  }, [selectedUni, valorTotal])

  const addParcela = () => {
    setParcelas([
      ...parcelas,
      {
        tipo: "mensal",
        descricao: "",
        valor: 0,
        data_vencimento: "",
        quantidade: 1,
        valor_parcela: 0,
        ordem: parcelas.length,
      },
    ])
  }

  const updateParcela = (index: number, field: string, value: any) => {
    const updated = [...parcelas]
    ;(updated[index] as any)[field] = value

    // Auto-calc valor_parcela for mensais
    if (field === "valor" || field === "quantidade") {
      const p = updated[index]
      if (p.quantidade > 1 && p.valor > 0) {
        p.valor_parcela = Math.round((p.valor / p.quantidade) * 100) / 100
      }
    }
    setParcelas(updated)
  }

  const removeParcela = (index: number) => {
    setParcelas(parcelas.filter((_, i) => i !== index))
  }

  const totalParcelas = parcelas.reduce((sum, p) => sum + (Number(p.valor) || 0), 0)

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedEmp
      case 2: return !!selectedUni
      case 3: return clienteNome.trim().length > 0
      case 4: return parcelas.length > 0 && Number(valorTotal) > 0
      case 5: return true
      default: return false
    }
  }

  const handleSave = async (enviar: boolean) => {
    if (!selectedEmp || !selectedUni) return
    try {
      setSaving(true)
      const body = {
        empreendimento_id: String(selectedEmp.id),
        empreendimento_nome: selectedEmp.nome,
        unidade_id: String(selectedUni.id),
        unidade_codigo: selectedUni.codigo,
        unidade_bloco: selectedUni.bloco,
        unidade_andar: selectedUni.andar,
        valor_tabela: selectedUni.valor_tabela,
        cliente_nome: clienteNome.trim(),
        cliente_cpf: clienteCpf.trim() || null,
        cliente_telefone: clienteTelefone.trim() || null,
        cliente_email: clienteEmail.trim() || null,
        valor_total: Number(valorTotal),
        valor_ato: parcelas.find(p => p.tipo === "ato")?.valor || 0,
        observacoes: observacoes.trim() || null,
        parcelas: parcelas.map((p, i) => ({
          ...p,
          valor: Number(p.valor),
          quantidade: Number(p.quantidade) || 1,
          valor_parcela: Number(p.valor_parcela) || null,
          data_vencimento: p.data_vencimento || null,
          ordem: i,
        })),
      }

      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        alert(json.error || "Erro ao criar proposta")
        return
      }

      // Se enviar para aprovação
      if (enviar && json.data?.id) {
        const envRes = await fetch(`/api/propostas/${json.data.id}/enviar`, { method: "POST" })
        const envJson = await envRes.json()
        if (!envJson.success) {
          alert(envJson.error || "Proposta criada, mas erro ao enviar. Tente novamente.")
        }
      }

      onSuccess()
    } catch (err: any) {
      alert(err.message || "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const STEPS = [
    { num: 1, label: "Empreendimento", icon: Building2 },
    { num: 2, label: "Unidade", icon: Building2 },
    { num: 3, label: "Cliente", icon: User },
    { num: 4, label: "Pagamento", icon: DollarSign },
    { num: 5, label: "Revisão", icon: Check },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Proposta</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.num} className="flex items-center flex-1">
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors w-full justify-center",
                    step === s.num
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : s.num < step
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  )}
                >
                  {s.num < step ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {s.num < 5 && <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600 shrink-0 mx-0.5" />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Empreendimento */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Buscar empreendimento..."
                value={empBusca}
                onChange={(e) => setEmpBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {empLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : empreendimentos.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Nenhum empreendimento encontrado</p>
              ) : (
                empreendimentos.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmp(emp)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all",
                      selectedEmp?.id === emp.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    )}
                  >
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{emp.nome}</p>
                    <p className="text-xs text-zinc-500">{emp.cidade}{emp.uf ? ` - ${emp.uf}` : ""}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Unidade */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Empreendimento: <strong className="text-zinc-900 dark:text-zinc-100">{selectedEmp?.nome}</strong>
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {uniLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : unidades.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Nenhuma unidade encontrada</p>
              ) : (
                unidades.map((uni) => (
                  <button
                    key={uni.id}
                    onClick={() => setSelectedUni(uni)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all",
                      selectedUni?.id === uni.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {uni.bloco ? `${uni.bloco} / ` : ""}{uni.codigo}
                        </p>
                        {uni.andar && <p className="text-xs text-zinc-500">{uni.andar}º andar</p>}
                      </div>
                      <div className="text-right">
                        {uni.valor_tabela && (
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(uni.valor_tabela)}</p>
                        )}
                        {uni.status && (
                          <Badge variant="secondary" className="text-[10px]">{uni.status}</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 3: Cliente */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Nome do cliente *</Label>
              <Input
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CPF</Label>
                <Input
                  value={clienteCpf}
                  onChange={(e) => setClienteCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                value={clienteEmail}
                onChange={(e) => setClienteEmail(e.target.value)}
                placeholder="cliente@email.com"
                type="email"
              />
            </div>
          </div>
        )}

        {/* Step 4: Pagamento */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label>Valor total da proposta *</Label>
              <Input
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
              />
              {selectedUni?.valor_tabela && (
                <p className="text-xs text-zinc-400 mt-1">Valor tabela: {formatCurrency(selectedUni.valor_tabela)}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Parcelas</h3>
              <Button onClick={addParcela} variant="outline" size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {parcelas.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">Adicione parcelas ao fluxo de pagamento</p>
            ) : (
              <div className="space-y-3">
                {parcelas.map((p, i) => (
                  <div key={i} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Select
                          value={p.tipo}
                          onValueChange={(v) => updateParcela(i, "tipo", v)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIPO_PARCELA_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={p.descricao}
                          onChange={(e) => updateParcela(i, "descricao", e.target.value)}
                          placeholder="Descrição"
                          className="flex-1"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParcela(i)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-[11px]">Valor total (R$)</Label>
                        <Input
                          value={p.valor || ""}
                          onChange={(e) => updateParcela(i, "valor", e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder="0.00"
                          type="text"
                          inputMode="decimal"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Qtd parcelas</Label>
                        <Input
                          value={p.quantidade || ""}
                          onChange={(e) => updateParcela(i, "quantidade", parseInt(e.target.value) || 1)}
                          type="number"
                          min={1}
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Valor mensal</Label>
                        <Input
                          value={p.valor_parcela ? p.valor_parcela.toFixed(2) : ""}
                          readOnly
                          className="bg-zinc-50 dark:bg-zinc-800"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Vencimento</Label>
                        <Input
                          value={p.data_vencimento}
                          onChange={(e) => updateParcela(i, "data_vencimento", e.target.value)}
                          type="date"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total das parcelas</span>
                  <span className={cn(
                    "font-bold",
                    Math.abs(totalParcelas - Number(valorTotal)) < 0.01
                      ? "text-emerald-600"
                      : "text-amber-600"
                  )}>
                    {formatCurrency(totalParcelas)}
                    {Number(valorTotal) > 0 && Math.abs(totalParcelas - Number(valorTotal)) >= 0.01 && (
                      <span className="text-xs font-normal ml-2">
                        (diferença: {formatCurrency(Number(valorTotal) - totalParcelas)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-zinc-400 text-xs">Empreendimento</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{selectedEmp?.nome}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">Unidade</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedUni?.bloco ? `${selectedUni.bloco}/` : ""}{selectedUni?.codigo}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">Cliente</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{clienteNome}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">Valor Total</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(Number(valorTotal))}</p>
                </div>
              </div>

              {parcelas.length > 0 && (
                <>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
                    <p className="text-xs font-semibold text-zinc-500 mb-2">Fluxo de Pagamento</p>
                    {parcelas.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {TIPO_PARCELA_LABELS[p.tipo] || p.tipo}
                          {p.quantidade > 1 && ` (${p.quantidade}x)`}
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(Number(p.valor))}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações ou condições especiais..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            disabled={saving}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          <div className="flex gap-2">
            {step === 5 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                  Salvar Rascunho
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving || parcelas.length === 0}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Enviar para Aprovação
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail Component ────────────────────────────────────
function PropostaDetail({
  open,
  proposta,
  isAdmin,
  onClose,
  onUpdate,
}: {
  open: boolean
  proposta: PropostaDetalhe
  isAdmin: boolean
  onClose: () => void
  onUpdate: () => void
}) {
  const [actionLoading, setActionLoading] = useState("")
  const [motivoRecusa, setMotivoRecusa] = useState("")
  const [showRecusa, setShowRecusa] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docCategoria, setDocCategoria] = useState("outro")

  const st = STATUS_CONFIG[proposta.status] || STATUS_CONFIG.rascunho
  const StatusIcon = st.icon

  const handleEnviar = async () => {
    if (!confirm("Enviar proposta para aprovação?")) return
    try {
      setActionLoading("enviar")
      const res = await fetch(`/api/propostas/${proposta.id}/enviar`, { method: "POST" })
      const json = await res.json()
      if (!json.success) return alert(json.error)
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading("")
    }
  }

  const handleAprovar = async () => {
    if (!confirm("Aprovar esta proposta?")) return
    try {
      setActionLoading("aprovar")
      const res = await fetch(`/api/propostas/${proposta.id}/aprovar`, { method: "POST" })
      const json = await res.json()
      if (!json.success) return alert(json.error)
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading("")
    }
  }

  const handleRecusar = async () => {
    if (!motivoRecusa.trim()) return alert("Informe o motivo da recusa")
    try {
      setActionLoading("recusar")
      const res = await fetch(`/api/propostas/${proposta.id}/recusar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo_recusa: motivoRecusa.trim() }),
      })
      const json = await res.json()
      if (!json.success) return alert(json.error)
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading("")
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadLoading(true)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("categoria", docCategoria)
      const res = await fetch(`/api/propostas/${proposta.id}/documentos`, {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!json.success) return alert(json.error)
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploadLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Remover este documento?")) return
    try {
      const res = await fetch(`/api/propostas/${proposta.id}/documentos/${docId}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) return alert(json.error)
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-zinc-400">{proposta.codigo}</span>
            <Badge variant="secondary" className={cn("text-xs px-2 py-0.5", st.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {st.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recusa */}
          {proposta.status === "recusada" && proposta.motivo_recusa && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Motivo da recusa
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{proposta.motivo_recusa}</p>
              {proposta.aprovador_nome && (
                <p className="text-xs text-red-400 mt-1">por {proposta.aprovador_nome}</p>
              )}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Empreendimento</p>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{proposta.empreendimento_nome}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Unidade</p>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {proposta.unidade_bloco ? `${proposta.unidade_bloco}/` : ""}{proposta.unidade_codigo}
                {proposta.unidade_andar && ` - ${proposta.unidade_andar}º andar`}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Cliente</p>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{proposta.cliente_nome}</p>
              {proposta.cliente_cpf && <p className="text-xs text-zinc-500">{proposta.cliente_cpf}</p>}
              {proposta.cliente_telefone && <p className="text-xs text-zinc-500">{proposta.cliente_telefone}</p>}
              {proposta.cliente_email && <p className="text-xs text-zinc-500">{proposta.cliente_email}</p>}
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Valores</p>
              <p className="font-bold text-emerald-600 text-lg">{formatCurrency(proposta.valor_total)}</p>
              {proposta.valor_tabela && proposta.valor_tabela !== proposta.valor_total && (
                <p className="text-xs text-zinc-400">Tabela: {formatCurrency(proposta.valor_tabela)}</p>
              )}
            </div>
          </div>

          {/* Parcelas */}
          {proposta.parcelas.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Fluxo de Pagamento</h3>
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                {proposta.parcelas.map((p, i) => (
                  <div key={p.id || i} className={cn(
                    "flex items-center justify-between px-4 py-2.5 text-sm",
                    i > 0 && "border-t border-zinc-100 dark:border-zinc-800"
                  )}>
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {TIPO_PARCELA_LABELS[p.tipo] || p.tipo}
                      </span>
                      {p.descricao && <span className="text-zinc-400 ml-2">- {p.descricao}</span>}
                      {p.quantidade > 1 && (
                        <span className="text-zinc-400 ml-1">({p.quantidade}x de {formatCurrency(p.valor_parcela || 0)})</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(p.valor)}</p>
                      {p.data_vencimento && <p className="text-xs text-zinc-400">{formatDate(p.data_vencimento)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Documentos</h3>
              {(proposta.status === "rascunho" || proposta.status === "enviada") && (
                <div className="flex items-center gap-2">
                  <Select value={docCategoria} onValueChange={setDocCategoria}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIA_DOC_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleUpload}
                  />
                </div>
              )}
            </div>

            {proposta.documentos.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">Nenhum documento anexado</p>
            ) : (
              <div className="space-y-2">
                {proposta.documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <FileUp className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{doc.nome_original}</p>
                      <p className="text-xs text-zinc-400">
                        {CATEGORIA_DOC_LABELS[doc.categoria] || doc.categoria} - {formatFileSize(doc.tamanho)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(`/api/propostas/${proposta.id}/documentos/${doc.id}`, "_blank")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {(proposta.status === "rascunho" || proposta.status === "enviada") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteDoc(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          {proposta.observacoes && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Observações</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{proposta.observacoes}</p>
            </div>
          )}

          {/* Recusa form */}
          {showRecusa && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
              <Label className="text-red-700 dark:text-red-300">Motivo da recusa *</Label>
              <Textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Explique o motivo da recusa..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRecusa(false)}>Cancelar</Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRecusar}
                  disabled={actionLoading === "recusar" || !motivoRecusa.trim()}
                >
                  {actionLoading === "recusar" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Confirmar Recusa
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            {proposta.status === "rascunho" && (
              <Button
                onClick={handleEnviar}
                disabled={actionLoading === "enviar"}
                className="gap-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {actionLoading === "enviar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar para Aprovação
              </Button>
            )}

            {isAdmin && proposta.status === "enviada" && !showRecusa && (
              <>
                <Button
                  onClick={handleAprovar}
                  disabled={actionLoading === "aprovar"}
                  className="gap-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                >
                  {actionLoading === "aprovar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Aprovar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRecusa(true)}
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <XCircle className="h-4 w-4" />
                  Recusar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
