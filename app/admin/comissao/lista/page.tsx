"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calculator,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type {
  ComissaoVenda,
  ComissaoVendaStatus,
  FiltroComissaoVendas,
  WebropayStatus,
} from "@/lib/comissao/types"
import {
  COMISSAO_VENDA_STATUS_LABELS,
  WEBROPAY_STATUS_LABELS,
} from "@/lib/comissao/types"

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number) => {
  if (!value || !isFinite(value) || isNaN(value)) return "R$ 0,00"
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-"
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("pt-BR")
}

const formatPercent = (value: number) => {
  if (!value) return "0%"
  return `${(value * 100).toFixed(2)}%`
}

const STATUS_CONFIG: Record<ComissaoVendaStatus, { bg: string; text: string; dot: string }> = {
  ativa: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  calculada: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  enviada: { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  cancelada: { bg: "bg-gray-50 dark:bg-gray-900", text: "text-gray-500 dark:text-gray-400", dot: "bg-gray-400" },
}

const WEBROPAY_CONFIG: Record<string, { bg: string; text: string }> = {
  pendente: { bg: "bg-yellow-50 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300" },
  enviada: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300" },
  liberada: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300" },
  distratada: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300" },
  bloqueada: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300" },
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: ComissaoVendaStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ativa
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.bg, cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {COMISSAO_VENDA_STATUS_LABELS[status] || status}
    </span>
  )
}

function WebropayBadge({ status }: { status: WebropayStatus }) {
  const cfg = WEBROPAY_CONFIG[status] || WEBROPAY_CONFIG.pendente
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", cfg.bg, cfg.text)}>
      {WEBROPAY_STATUS_LABELS[status] || status}
    </span>
  )
}

// ============================================================================
// FILTER CHIP
// ============================================================================

function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]",
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20"
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// VENDAS TABLE
// ============================================================================

interface VendaComExtra extends ComissaoVenda {
  total_corretores?: number
  total_parcelas?: number
}

function VendasTable({
  vendas,
  loading,
  onView,
  onEdit,
  onDelete,
}: {
  vendas: VendaComExtra[]
  loading: boolean
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (vendas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Calculator className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma venda encontrada</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Crie uma nova venda ou ajuste os filtros</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Codigo</th>
            <th className="px-4 py-3 font-medium">Empreendimento</th>
            <th className="px-4 py-3 font-medium">Unidade</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium text-right">Valor Venda</th>
            <th className="px-4 py-3 font-medium text-right">Comissao</th>
            <th className="px-4 py-3 font-medium text-center">Status</th>
            <th className="px-4 py-3 font-medium text-center">Webropay</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium text-center w-10"></th>
          </tr>
        </thead>
        <tbody>
          {vendas.map((v) => (
            <tr
              key={v.id}
              className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onView(v.id)}
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs font-medium">{v.codigo}</span>
              </td>
              <td className="px-4 py-3">
                <span className="max-w-[200px] truncate block">{v.empreendimento || "-"}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{v.unidade || "-"}</td>
              <td className="px-4 py-3">
                <div>
                  <span className="block truncate max-w-[150px]">{v.cliente_nome || "-"}</span>
                  {v.cliente_cpf && (
                    <span className="text-xs text-muted-foreground">{v.cliente_cpf}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {formatCurrency(v.valor_venda)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="text-right">
                  <span className="font-medium tabular-nums">{formatCurrency(v.valor_comissao_total)}</span>
                  <span className="text-xs text-muted-foreground ml-1">({formatPercent(v.percentual_comissao)})</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={v.status} />
              </td>
              <td className="px-4 py-3 text-center">
                {(v as any).webropay_status ? (
                  <WebropayBadge status={(v as any).webropay_status} />
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                {formatDate(v.data_venda)}
              </td>
              <td className="px-4 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                <button
                  className="p-1 rounded hover:bg-muted"
                  onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
                {openMenuId === v.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-4 top-10 z-50 w-44 rounded-lg border bg-popover shadow-lg py-1">
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => { onView(v.id); setOpenMenuId(null) }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver detalhes
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => { onEdit(v.id); setOpenMenuId(null) }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      {v.status !== "cancelada" && (
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                          onClick={() => { onDelete(v.id); setOpenMenuId(null) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// MOBILE CARD (for small screens)
// ============================================================================

function VendaCard({
  venda,
  onView,
}: {
  venda: VendaComExtra
  onView: (id: number) => void
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView(venda.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-mono text-xs font-medium">{venda.codigo}</span>
            <p className="text-sm font-medium mt-0.5 truncate max-w-[200px]">
              {venda.empreendimento || "Sem empreendimento"}
            </p>
          </div>
          <StatusBadge status={venda.status} />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{venda.unidade || "-"}</span>
          <span>{formatDate(venda.data_venda)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Valor</span>
            <p className="font-medium tabular-nums">{formatCurrency(venda.valor_venda)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Comissao</span>
            <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(venda.valor_comissao_total)}
            </p>
          </div>
        </div>
        {venda.cliente_nome && (
          <p className="mt-2 text-xs text-muted-foreground truncate">
            Cliente: {venda.cliente_nome}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DETAIL MODAL
// ============================================================================

interface VendaDetalhe extends ComissaoVenda {
  corretores?: Array<{
    id: number
    nome: string
    cpf?: string
    percentual_participacao: number
    valor_comissao: number
    prioridade: number
  }>
  parcelas?: Array<{
    id: number
    numero: number
    descricao?: string
    valor_parcela: number
    percentual_comissao: number
    data_prevista: string
    data_recebimento?: string
    status: string
  }>
}

function DetalheModal({
  vendaId,
  open,
  onClose,
  onEdit,
}: {
  vendaId: number | null
  open: boolean
  onClose: () => void
  onEdit: (id: number) => void
}) {
  const [venda, setVenda] = useState<VendaDetalhe | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !vendaId) return
    setLoading(true)
    fetch(`/api/comissao/vendas/${vendaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setVenda(data.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, vendaId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-xl shadow-2xl border mx-4">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Detalhes da Venda</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : venda ? (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm text-muted-foreground">{venda.codigo}</span>
                <h3 className="text-lg font-medium mt-0.5">{venda.empreendimento || "Sem empreendimento"}</h3>
                <p className="text-sm text-muted-foreground">{venda.unidade || ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={venda.status} />
                {(venda as any).webropay_status && (
                  <WebropayBadge status={(venda as any).webropay_status} />
                )}
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Valor Venda</span>
                <p className="font-semibold tabular-nums">{formatCurrency(venda.valor_venda)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">% Comissao</span>
                <p className="font-semibold tabular-nums">{formatPercent(venda.percentual_comissao)}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <span className="text-xs text-muted-foreground">Comissao Total</span>
                <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(venda.valor_comissao_total)}
                </p>
              </div>
            </div>

            {/* Cliente */}
            {(venda.cliente_nome || venda.cliente_cpf) && (
              <div>
                <h4 className="text-sm font-medium mb-2">Cliente</h4>
                <div className="text-sm text-muted-foreground">
                  {venda.cliente_nome && <p>{venda.cliente_nome}</p>}
                  {venda.cliente_cpf && <p>CPF: {venda.cliente_cpf}</p>}
                </div>
              </div>
            )}

            {/* Corretores */}
            {venda.corretores && venda.corretores.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Equipe ({venda.corretores.length})</h4>
                <div className="space-y-2">
                  {venda.corretores.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                      <div>
                        <span className="font-medium">{c.nome}</span>
                        {c.cpf && <span className="text-muted-foreground ml-2 text-xs">{c.cpf}</span>}
                      </div>
                      <div className="text-right">
                        <span className="font-medium tabular-nums">{formatCurrency(c.valor_comissao)}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({(c.percentual_participacao * 100).toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parcelas */}
            {venda.parcelas && venda.parcelas.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Parcelas ({venda.parcelas.length})</h4>
                <div className="space-y-1.5">
                  {venda.parcelas.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6 text-center">{p.numero}</span>
                        <span>{p.descricao || `Parcela ${p.numero}`}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{formatDate(p.data_prevista)}</span>
                        <span className="font-medium tabular-nums w-28 text-right">{formatCurrency(p.valor_parcela)}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          p.status === "recebida" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : p.status === "cancelada" ? "bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                        )}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observacoes */}
            {venda.observacoes && (
              <div>
                <h4 className="text-sm font-medium mb-1">Observacoes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{venda.observacoes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              {venda.status !== "cancelada" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onEdit(venda.id); onClose() }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Erro ao carregar dados
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CONFIRM DELETE DIALOG
// ============================================================================

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-sm bg-background rounded-xl shadow-2xl border mx-4 p-6">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Nao
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Sim, cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ComissaoListaPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  usePageTracking("admin-comissao-lista")

  // Data
  const [vendas, setVendas] = useState<VendaComExtra[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState<ComissaoVendaStatus[]>([])
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  // Modal
  const [detalheOpen, setDetalheOpen] = useState(false)
  const [selectedVendaId, setSelectedVendaId] = useState<number | null>(null)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Stats
  const [stats, setStats] = useState<{ total: number; ativa: number; calculada: number; enviada: number; cancelada: number; valorTotal: number; comissaoTotal: number } | null>(null)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch vendas
  const fetchVendas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      statusFilter.forEach((s) => params.append("status", s))
      if (empreendimentoFilter) params.set("empreendimento", empreendimentoFilter)
      if (dataInicio) params.set("data_inicio", dataInicio)
      if (dataFim) params.set("data_fim", dataFim)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))

      const res = await fetch(`/api/comissao/vendas?${params.toString()}`)
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()

      if (data.success) {
        setVendas(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Erro ao buscar vendas:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, empreendimentoFilter, dataInicio, dataFim, page])

  // Fetch stats (once)
  useEffect(() => {
    if (!hasAccess) return
    fetch("/api/comissao/vendas?pageSize=1000")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const all = data.data as VendaComExtra[]
          setStats({
            total: data.total || all.length,
            ativa: all.filter((v) => v.status === "ativa").length,
            calculada: all.filter((v) => v.status === "calculada").length,
            enviada: all.filter((v) => v.status === "enviada").length,
            cancelada: all.filter((v) => v.status === "cancelada").length,
            valorTotal: all.reduce((s, v) => s + (Number(v.valor_venda) || 0), 0),
            comissaoTotal: all.reduce((s, v) => s + (Number(v.valor_comissao_total) || 0), 0),
          })
        }
      })
      .catch(console.error)
  }, [hasAccess])

  useEffect(() => {
    if (!hasAccess) return
    fetchVendas()
  }, [fetchVendas, hasAccess])

  // Handlers
  const toggleStatus = (s: ComissaoVendaStatus) => {
    setPage(1)
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const handleView = (id: number) => {
    setSelectedVendaId(id)
    setDetalheOpen(true)
  }

  const handleEdit = (id: number) => {
    // TODO: navigate to wizard with edit mode
    router.push(`/admin/comissao?edit=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/comissao/vendas/${deleteTarget}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setDeleteTarget(null)
        fetchVendas()
      }
    } catch (error) {
      console.error("Erro ao cancelar:", error)
    } finally {
      setDeleting(false)
    }
  }

  const clearFilters = () => {
    setStatusFilter([])
    setEmpreendimentoFilter("")
    setDataInicio("")
    setDataFim("")
    setPage(1)
  }

  const hasActiveFilters = statusFilter.length > 0 || empreendimentoFilter || dataInicio || dataFim

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (!hasAccess) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-muted-foreground">Acesso negado</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comissoes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} venda{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => router.push("/admin/comissao")} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Venda
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Vendas Ativas</span>
                <p className="text-2xl font-bold tabular-nums">{stats.ativa}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Enviadas Webropay</span>
                <p className="text-2xl font-bold tabular-nums">{stats.enviada}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Total Vendas</span>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(stats.valorTotal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Total Comissoes</span>
                <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(stats.comissaoTotal)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          {/* Status chips + filter toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="Todas" active={statusFilter.length === 0} onClick={clearFilters} count={stats?.total} />
            <FilterChip label="Ativas" active={statusFilter.includes("ativa")} onClick={() => toggleStatus("ativa")} count={stats?.ativa} />
            <FilterChip label="Calculadas" active={statusFilter.includes("calculada")} onClick={() => toggleStatus("calculada")} count={stats?.calculada} />
            <FilterChip label="Enviadas" active={statusFilter.includes("enviada")} onClick={() => toggleStatus("enviada")} count={stats?.enviada} />
            <FilterChip label="Canceladas" active={statusFilter.includes("cancelada")} onClick={() => toggleStatus("cancelada")} count={stats?.cancelada} />

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(hasActiveFilters && "border-primary text-primary")}
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filtros
                {hasActiveFilters && (
                  <span className="ml-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {[empreendimentoFilter, dataInicio, dataFim].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Empreendimento</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={empreendimentoFilter}
                        onChange={(e) => { setEmpreendimentoFilter(e.target.value); setPage(1) }}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data inicio</label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => { setDataInicio(e.target.value); setPage(1) }}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data fim</label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => { setDataFim(e.target.value); setPage(1) }}
                      className="h-9"
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" /> Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Table (desktop) */}
        <Card className="hidden md:block">
          <VendasTable
            vendas={vendas}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteTarget(id)}
          />
        </Card>

        {/* Cards (mobile) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : vendas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma venda encontrada</p>
            </div>
          ) : (
            vendas.map((v) => (
              <VendaCard key={v.id} venda={v} onView={handleView} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1
                  : page >= totalPages - 2 ? totalPages - 4 + i
                  : page - 2 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DetalheModal
        vendaId={selectedVendaId}
        open={detalheOpen}
        onClose={() => { setDetalheOpen(false); setSelectedVendaId(null) }}
        onEdit={handleEdit}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Cancelar venda?"
        message="Esta acao ira alterar o status da venda para cancelada. Deseja continuar?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </AppShell>
  )
}
