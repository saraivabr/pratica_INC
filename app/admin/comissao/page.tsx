"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import {
  Plus,
  Trash2,
  Calculator,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  AlertCircle,
  Check,
  Copy,
  RotateCcw,
  Printer,
  Save,
  FileDown,
  Search,
  Loader2,
  GripVertical,
  Zap,
  Send,
  Ban,
  Unlock,
  Lock,
  ExternalLink,
  Building2,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  useSensors,
  useSensor,
  PointerSensor,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { arredondarValor, formatarMoeda } from "@/lib/comissao/calculations"
import { TEMPLATES_PARCELAS, type TemplateParcelaItem, type WebropayStatus, WEBROPAY_STATUS_LABELS } from "@/lib/comissao/types"
import {
  BENEFICIARIOS_PADRAO_PRT,
  CARGOS_PRT,
  formatarDocumento,
} from "@/lib/comissao/beneficiarios-padrao"
import { comissaoApi } from "@/lib/comissao/api"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

type TipoParcela = "ato" | "mensal" | "bimestral" | "trimestral" | "semestral" | "anual" | "financiamento" | "intercalada" | "chaves" | "entrada" | "personalizado"

interface SerieParcela {
  id: string
  tipo: TipoParcela
  quantidade: number
  valorUnitario: number
  valorTotal: number
  percentualDoImovel: number
}

interface Autonomo {
  id: string
  nome: string
  cargo: string
  percentual: number
  valorBruto: number
  prioridade: number
  documento: string
}

interface CelulaRateio {
  valor: number
  pago: boolean
}

interface EmpreendimentoBusca {
  id: string
  nome: string
  cidade?: string
  uf?: string
}

interface UnidadeBusca {
  id: string
  codigo?: string
  bloco?: string
  andar?: string
  area?: number
  tipologia?: string
  valor_tabela?: number
  empreendimento_nome: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIPO_PARCELA_LABELS: Record<TipoParcela, string> = {
  ato: "Ato",
  entrada: "Entrada",
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  financiamento: "Financiamento",
  intercalada: "Intercalada",
  chaves: "Chaves",
  personalizado: "Personalizado",
}

const CARGOS_PADRAO = [
  "Gerente de Produto",
  "Gerente Pratica",
  "Coordenador 1",
  "Coordenador 2",
  "Secretaria",
  "Tributos",
  "Imobiliaria",
  "Corretor",
]

const STORAGE_KEY = "pratica_comissao_simulacao"

// ============================================================================
// HELPERS
// ============================================================================

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function formatDisplayCurrency(value: number): string {
  if (value === 0) return ""
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCpfMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatDocMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  if (digits.length <= 11) return formatCpfMask(digits)
  // CNPJ
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function formatCepMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

// ============================================================================
// CURRENCY INPUT
// ============================================================================

function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
}: {
  value: number
  onChange: (v: number) => void
  className?: string
  placeholder?: string
}) {
  const [raw, setRaw] = useState<string | null>(null)
  const isEditing = raw !== null

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={className}
      value={isEditing ? raw : formatDisplayCurrency(value)}
      onChange={e => {
        const v = e.target.value
        setRaw(v)
        onChange(parseCurrencyInput(v))
      }}
      onFocus={e => {
        setRaw(value === 0 ? "" : String(value).replace(".", ","))
        requestAnimationFrame(() => e.target.select())
      }}
      onBlur={() => setRaw(null)}
    />
  )
}

// ============================================================================
// AUTOCOMPLETE INPUT
// ============================================================================

function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  fetchUrl,
  renderItem,
  getId,
  getLabel,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (item: any) => void
  placeholder: string
  fetchUrl: (query: string) => string
  renderItem: (item: any) => React.ReactNode
  getId: (item: any) => string
  getLabel: (item: any) => string
}) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(fetchUrl(query))
        const json = await res.json()
        if (json.success && json.data) {
          setResults(json.data)
          setOpen(json.data.length > 0)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }, 300)
  }, [fetchUrl])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <Input
          placeholder={placeholder}
          className="pl-8"
          value={value}
          onChange={e => {
            onChange(e.target.value)
            search(e.target.value)
          }}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(item => (
            <button
              key={getId(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => {
                onSelect(item)
                onChange(getLabel(item))
                setOpen(false)
              }}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SECTION WRAPPER
// ============================================================================

function Section({
  title,
  icon: Icon,
  number,
  children,
  defaultOpen = true,
  actions,
}: {
  title: string
  icon: React.ElementType
  number: number
  children: React.ReactNode
  defaultOpen?: boolean
  actions?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold">
            {number}
          </div>
          <Icon className="h-5 w-5 text-zinc-500" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {actions && open && <div onClick={e => e.stopPropagation()}>{actions}</div>}
          {open ? <ChevronUp className="h-5 w-5 text-zinc-400" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
        </div>
      </button>
      {open && (
        <CardContent className="px-5 pb-5 pt-0 border-t border-zinc-200/60 dark:border-zinc-800/60">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

// ============================================================================
// SORTABLE AUTONOMO ROW
// ============================================================================

function SortableAutonomoRow({
  autonomo,
  totalAutonomos,
  valorComissao,
  onUpdate,
  onRemove,
}: {
  autonomo: Autonomo
  totalAutonomos: number
  valorComissao: number
  onUpdate: (id: string, field: keyof Autonomo, value: string | number) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: autonomo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-[28px_1fr_140px_140px_80px_1fr_40px] gap-2 items-center bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 flex items-center justify-center">
          <GripVertical className="h-4 w-4" />
        </button>

        <Input placeholder="Nome" className="h-9" value={autonomo.nome} onChange={e => onUpdate(autonomo.id, "nome", e.target.value)} />

        <Select value={autonomo.cargo} onValueChange={v => onUpdate(autonomo.id, "cargo", v)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CARGOS_PADRAO.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>

        <Input
          placeholder="CPF/CNPJ" className={cn("h-9 text-xs", !autonomo.documento && "border-amber-300 dark:border-amber-600")}
          value={autonomo.documento || ""} onChange={e => onUpdate(autonomo.id, "documento", formatDocMask(e.target.value))} maxLength={18}
        />

        <Input
          type="number" step="0.1" min="0" max="100" className="h-9"
          value={autonomo.percentual || ""} onChange={e => onUpdate(autonomo.id, "percentual", parseFloat(e.target.value) || 0)}
        />

        <CurrencyInput className="h-9" value={autonomo.valorBruto} onChange={v => onUpdate(autonomo.id, "valorBruto", v)} />

        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-red-500" onClick={() => onRemove(autonomo.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile */}
      <div className="sm:hidden bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-400">
              <GripVertical className="h-4 w-4" />
            </button>
            <Badge variant="secondary" className="text-xs">#{autonomo.prioridade}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => onRemove(autonomo.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Input placeholder="Nome" className="h-9" value={autonomo.nome} onChange={e => onUpdate(autonomo.id, "nome", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={autonomo.cargo} onValueChange={v => onUpdate(autonomo.id, "cargo", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CARGOS_PADRAO.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input
            placeholder="CPF/CNPJ" className={cn("h-9 text-xs", !autonomo.documento && "border-amber-300")}
            value={autonomo.documento || ""} onChange={e => onUpdate(autonomo.id, "documento", formatDocMask(e.target.value))} maxLength={18}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Input
              type="number" step="0.1" min="0" max="100" className="h-9 pr-6"
              value={autonomo.percentual || ""} onChange={e => onUpdate(autonomo.id, "percentual", parseFloat(e.target.value) || 0)}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
          </div>
          <CurrencyInput value={autonomo.valorBruto} onChange={v => onUpdate(autonomo.id, "valorBruto", v)} />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COLLAPSIBLE WEBROPAY ADDRESS
// ============================================================================

function CollapsibleWebropay({
  clienteEmail, setClienteEmail,
  clienteTelefone, setClienteTelefone,
  clienteLogradouro, setClienteLogradouro,
  clienteNumero, setClienteNumero,
  clienteComplemento, setClienteComplemento,
  clienteBairro, setClienteBairro,
  clienteCidade, setClienteCidade,
  clienteUf, setClienteUf,
  clienteCep, setClienteCep,
  isComplete,
}: {
  clienteEmail: string; setClienteEmail: (v: string) => void
  clienteTelefone: string; setClienteTelefone: (v: string) => void
  clienteLogradouro: string; setClienteLogradouro: (v: string) => void
  clienteNumero: string; setClienteNumero: (v: string) => void
  clienteComplemento: string; setClienteComplemento: (v: string) => void
  clienteBairro: string; setClienteBairro: (v: string) => void
  clienteCidade: string; setClienteCidade: (v: string) => void
  clienteUf: string; setClienteUf: (v: string) => void
  clienteCep: string; setClienteCep: (v: string) => void
  isComplete: boolean
}) {
  const [open, setOpen] = useState(false)

  const filledCount = [clienteEmail, clienteTelefone, clienteLogradouro, clienteNumero, clienteBairro, clienteCidade, clienteUf, clienteCep].filter(Boolean).length
  const totalRequired = 8

  return (
    <div className="mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={cn("h-4 w-4 text-zinc-400 transition-transform", open && "rotate-90")} />
          <Building2 className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
            Dados do comprador (pagadoria)
          </span>
          {!open && filledCount > 0 && filledCount < totalRequired && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-600 dark:text-amber-400">
              {filledCount}/{totalRequired}
            </Badge>
          )}
          {!open && isComplete && (
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600 dark:border-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3 mr-0.5" /> Completo
            </Badge>
          )}
          {!open && filledCount === 0 && (
            <Badge variant="outline" className="text-[10px] text-zinc-400">Opcional</Badge>
          )}
        </div>
      </button>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Email do Cliente</Label>
            <Input placeholder="email@exemplo.com" className="h-9" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Telefone</Label>
            <Input placeholder="(11) 99999-9999" className="h-9" value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Logradouro</Label>
            <Input placeholder="Rua, Av..." className="h-9" value={clienteLogradouro} onChange={e => setClienteLogradouro(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Numero</Label>
            <Input placeholder="123" className="h-9" value={clienteNumero} onChange={e => setClienteNumero(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Complemento</Label>
            <Input placeholder="Apto, Bloco..." className="h-9" value={clienteComplemento} onChange={e => setClienteComplemento(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bairro</Label>
            <Input placeholder="Bairro" className="h-9" value={clienteBairro} onChange={e => setClienteBairro(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cidade</Label>
            <Input placeholder="Cidade" className="h-9" value={clienteCidade} onChange={e => setClienteCidade(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">UF</Label>
            <Input placeholder="SP" maxLength={2} className="h-9 uppercase" value={clienteUf} onChange={e => setClienteUf(e.target.value.toUpperCase().slice(0, 2))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CEP</Label>
            <Input placeholder="00000-000" className="h-9" value={clienteCep} onChange={e => setClienteCep(formatCepMask(e.target.value))} maxLength={9} />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ComissaoCalculadoraPage() {
  // ── Section 1: Dados do Imovel e Cliente ──
  const [empreendimento, setEmpreendimento] = useState("")
  const [empreendimentoId, setEmpreendimentoId] = useState<string | null>(null)
  const [unidade, setUnidade] = useState("")
  const [clienteNome, setClienteNome] = useState("")
  const [clienteCpf, setClienteCpf] = useState("")
  const [valorImovel, setValorImovel] = useState(0)
  const [percentualComissao, setPercentualComissao] = useState(5)

  // ── Section 1 extras: Cliente address ──
  const [clienteEmail, setClienteEmail] = useState("")
  const [clienteTelefone, setClienteTelefone] = useState("")
  const [clienteLogradouro, setClienteLogradouro] = useState("")
  const [clienteNumero, setClienteNumero] = useState("")
  const [clienteComplemento, setClienteComplemento] = useState("")
  const [clienteBairro, setClienteBairro] = useState("")
  const [clienteCidade, setClienteCidade] = useState("")
  const [clienteUf, setClienteUf] = useState("")
  const [clienteCep, setClienteCep] = useState("")

  // ── Database persistence ──
  const [vendaId, setVendaId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [webropayStatus, setWebropayStatus] = useState<WebropayStatus | null>(null)
  const [webropayLoading, setWebropayLoading] = useState(false)
  const [distratoMotivo, setDistratoMotivo] = useState("")

  // ── Section 2: Proposta do Cliente ──
  const [series, setSeries] = useState<SerieParcela[]>([])

  // ── Section 3: Autonomos ──
  const [autonomos, setAutonomos] = useState<Autonomo[]>([])

  // ── Section 4: Rateio ──
  const [rateioGrid, setRateioGrid] = useState<Record<string, Record<string, CelulaRateio>>>({})
  const [rateioCalculado, setRateioCalculado] = useState(false)

  // ── localStorage persistence ──
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.empreendimento) setEmpreendimento(data.empreendimento)
        if (data.unidade) setUnidade(data.unidade)
        if (data.clienteNome) setClienteNome(data.clienteNome)
        if (data.clienteCpf) setClienteCpf(data.clienteCpf)
        if (data.valorImovel) setValorImovel(data.valorImovel)
        if (data.percentualComissao) setPercentualComissao(data.percentualComissao)
        if (data.series) setSeries(data.series)
        if (data.autonomos) setAutonomos(data.autonomos)
        if (data.clienteEmail) setClienteEmail(data.clienteEmail)
        if (data.clienteTelefone) setClienteTelefone(data.clienteTelefone)
        if (data.clienteLogradouro) setClienteLogradouro(data.clienteLogradouro)
        if (data.clienteNumero) setClienteNumero(data.clienteNumero)
        if (data.clienteComplemento) setClienteComplemento(data.clienteComplemento)
        if (data.clienteBairro) setClienteBairro(data.clienteBairro)
        if (data.clienteCidade) setClienteCidade(data.clienteCidade)
        if (data.clienteUf) setClienteUf(data.clienteUf)
        if (data.clienteCep) setClienteCep(data.clienteCep)
        if (data.vendaId) setVendaId(data.vendaId)
        if (data.webropayStatus) setWebropayStatus(data.webropayStatus)
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  // Save to localStorage on changes
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        empreendimento, unidade, clienteNome, clienteCpf,
        valorImovel, percentualComissao, series, autonomos,
        clienteEmail, clienteTelefone, clienteLogradouro, clienteNumero,
        clienteComplemento, clienteBairro, clienteCidade, clienteUf, clienteCep,
        vendaId, webropayStatus,
      }))
    } catch { /* ignore */ }
  }, [loaded, empreendimento, unidade, clienteNome, clienteCpf, valorImovel, percentualComissao, series, autonomos, clienteEmail, clienteTelefone, clienteLogradouro, clienteNumero, clienteComplemento, clienteBairro, clienteCidade, clienteUf, clienteCep, vendaId, webropayStatus])

  // ── DnD sensors ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── Calculated values ──
  const valorComissao = useMemo(
    () => arredondarValor(valorImovel * (percentualComissao / 100)),
    [valorImovel, percentualComissao]
  )

  const totalProposta = useMemo(
    () => arredondarValor(series.reduce((acc, s) => acc + s.valorTotal, 0)),
    [series]
  )

  const totalPercentualProposta = useMemo(
    () => arredondarValor(series.reduce((acc, s) => acc + s.percentualDoImovel, 0)),
    [series]
  )

  const totalPercentualAutonomos = useMemo(
    () => arredondarValor(autonomos.reduce((acc, a) => acc + a.percentual, 0)),
    [autonomos]
  )

  const totalValorAutonomos = useMemo(
    () => arredondarValor(autonomos.reduce((acc, a) => acc + a.valorBruto, 0)),
    [autonomos]
  )

  const contratoLiquido = useMemo(
    () => arredondarValor(totalProposta - totalValorAutonomos),
    [totalProposta, totalValorAutonomos]
  )

  // ── Parcela labels for rateio ──
  const parcelaLabels = useMemo(() => {
    const labels: string[] = []
    series.forEach(s => {
      for (let i = 0; i < s.quantidade; i++) {
        labels.push(s.quantidade === 1 ? TIPO_PARCELA_LABELS[s.tipo] : `${TIPO_PARCELA_LABELS[s.tipo]} ${i + 1}`)
      }
    })
    return labels
  }, [series])

  // ── Reset all ──
  const resetAll = useCallback(() => {
    setEmpreendimento("")
    setEmpreendimentoId(null)
    setUnidade("")
    setClienteNome("")
    setClienteCpf("")
    setValorImovel(0)
    setPercentualComissao(5)
    setSeries([])
    setAutonomos([])
    setRateioGrid({})
    setRateioCalculado(false)
    setClienteEmail("")
    setClienteTelefone("")
    setClienteLogradouro("")
    setClienteNumero("")
    setClienteComplemento("")
    setClienteBairro("")
    setClienteCidade("")
    setClienteUf("")
    setClienteCep("")
    setVendaId(null)
    setWebropayStatus(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // ── Series helpers ──
  const addSerie = useCallback(() => {
    setSeries(prev => [...prev, { id: generateId(), tipo: "mensal", quantidade: 1, valorUnitario: 0, valorTotal: 0, percentualDoImovel: 0 }])
  }, [])

  const removeSerie = useCallback((id: string) => {
    setSeries(prev => prev.filter(s => s.id !== id))
  }, [])

  const duplicateSerie = useCallback((id: string) => {
    setSeries(prev => {
      const src = prev.find(s => s.id === id)
      if (!src) return prev
      const idx = prev.indexOf(src)
      const clone = { ...src, id: generateId() }
      const arr = [...prev]
      arr.splice(idx + 1, 0, clone)
      return arr
    })
  }, [])

  const updateSerie = useCallback(
    (id: string, field: keyof SerieParcela, value: number | string) => {
      setSeries(prev =>
        prev.map(s => {
          if (s.id !== id) return s
          const updated = { ...s, [field]: value }
          if (field === "quantidade" || field === "valorUnitario") {
            updated.valorTotal = arredondarValor(updated.quantidade * updated.valorUnitario)
            updated.percentualDoImovel = valorImovel > 0 ? arredondarValor((updated.valorTotal / valorImovel) * 100) : 0
          }
          if (field === "valorTotal") {
            updated.valorUnitario = updated.quantidade > 0 ? arredondarValor((value as number) / updated.quantidade) : 0
            updated.percentualDoImovel = valorImovel > 0 ? arredondarValor(((value as number) / valorImovel) * 100) : 0
          }
          if (field === "percentualDoImovel") {
            updated.valorTotal = valorImovel > 0 ? arredondarValor(valorImovel * ((value as number) / 100)) : 0
            updated.valorUnitario = updated.quantidade > 0 ? arredondarValor(updated.valorTotal / updated.quantidade) : 0
          }
          return updated
        })
      )
    },
    [valorImovel]
  )

  // ── Load template ──
  const loadTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES_PARCELAS.find(t => t.id === templateId)
    if (!template) return

    const newSeries: SerieParcela[] = template.parcelas.map((p: TemplateParcelaItem) => {
      const qty = p.quantidade || 1
      const pct = p.percentualTotal || p.percentual || 0
      const totalVal = valorImovel > 0 ? arredondarValor(valorImovel * (pct / 100)) : 0
      const unitVal = qty > 0 ? arredondarValor(totalVal / qty) : 0

      return {
        id: generateId(),
        tipo: p.tipo as TipoParcela,
        quantidade: qty,
        valorUnitario: unitVal,
        valorTotal: totalVal,
        percentualDoImovel: pct,
      }
    })

    setSeries(newSeries)
  }, [valorImovel])

  // ── Autonomos helpers ──
  const addAutonomo = useCallback(() => {
    setAutonomos(prev => [...prev, { id: generateId(), nome: "", cargo: "Corretor", percentual: 0, valorBruto: 0, prioridade: prev.length + 1, documento: "" }])
    setRateioCalculado(false)
  }, [])

  const removeAutonomo = useCallback((id: string) => {
    setAutonomos(prev => prev.filter(a => a.id !== id).map((a, i) => ({ ...a, prioridade: i + 1 })))
    setRateioCalculado(false)
  }, [])

  const updateAutonomo = useCallback(
    (id: string, field: keyof Autonomo, value: string | number) => {
      setAutonomos(prev =>
        prev.map(a => {
          if (a.id !== id) return a
          const updated = { ...a, [field]: value }
          if (field === "percentual") {
            updated.valorBruto = valorComissao > 0 ? arredondarValor(valorComissao * ((value as number) / 100)) : 0
          }
          if (field === "valorBruto") {
            updated.percentual = valorComissao > 0 ? arredondarValor(((value as number) / valorComissao) * 100) : 0
          }
          return updated
        })
      )
      setRateioCalculado(false)
    },
    [valorComissao]
  )

  // ── Load default team ──
  const loadDefaultTeam = useCallback(() => {
    const newAutonomos: Autonomo[] = BENEFICIARIOS_PADRAO_PRT.map((b, i) => {
      const pctOfComissao = valorComissao > 0 ? arredondarValor((valorImovel * b.percentual_vgv / valorComissao) * 100) : 0
      return {
        id: generateId(),
        nome: b.nome || "",
        cargo: CARGOS_PRT[b.cargo]?.label || b.cargo,
        percentual: pctOfComissao,
        valorBruto: arredondarValor(valorImovel * b.percentual_vgv),
        prioridade: i + 1,
        documento: b.documento || "",
      }
    })
    setAutonomos(newAutonomos)
    setRateioCalculado(false)
  }, [valorImovel, valorComissao])

  // ── DnD handler ──
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setAutonomos(prev => {
      const oldIdx = prev.findIndex(a => a.id === active.id)
      const newIdx = prev.findIndex(a => a.id === over.id)
      return arrayMove(prev, oldIdx, newIdx).map((a, i) => ({ ...a, prioridade: i + 1 }))
    })
    setRateioCalculado(false)
  }, [])

  // ── Auto rateio when data changes ──
  useEffect(() => {
    if (series.length === 0 || autonomos.length === 0) {
      if (rateioCalculado) setRateioCalculado(false)
      return
    }
    // Auto-calculate
    const parcelas: { label: string; valor: number }[] = []
    series.forEach(s => {
      for (let i = 0; i < s.quantidade; i++) {
        parcelas.push({ label: s.quantidade === 1 ? TIPO_PARCELA_LABELS[s.tipo] : `${TIPO_PARCELA_LABELS[s.tipo]} ${i + 1}`, valor: s.valorUnitario })
      }
    })

    const sorted = [...autonomos].sort((a, b) => a.prioridade - b.prioridade)
    const grid: Record<string, Record<string, CelulaRateio>> = {}
    const autoRestante: Record<string, number> = {}
    sorted.forEach(a => { grid[a.id] = {}; autoRestante[a.id] = a.valorBruto })

    parcelas.forEach((parcela, pIdx) => {
      const key = `p_${pIdx}`
      let remaining = parcela.valor
      for (const auto of sorted) {
        if (remaining <= 0 || autoRestante[auto.id] <= 0) {
          grid[auto.id][key] = { valor: 0, pago: false }
          continue
        }
        const assign = Math.min(remaining, autoRestante[auto.id])
        grid[auto.id][key] = { valor: arredondarValor(assign), pago: false }
        remaining = arredondarValor(remaining - assign)
        autoRestante[auto.id] = arredondarValor(autoRestante[auto.id] - assign)
      }
    })

    setRateioGrid(grid)
    setRateioCalculado(true)
  }, [series, autonomos])

  // ── Print ──
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // ── Webropay data completeness check ──
  const webropayDadosCompletos = useMemo(() => {
    if (!clienteNome || !clienteCpf || !clienteEmail) return false
    if (!clienteLogradouro || !clienteNumero || !clienteBairro || !clienteCidade || !clienteUf || !clienteCep) return false
    const allDocsOk = autonomos.every(a => a.documento && a.documento.replace(/\D/g, "").length >= 11)
    return allDocsOk && autonomos.length > 0 && series.length > 0
  }, [clienteNome, clienteCpf, clienteEmail, clienteLogradouro, clienteNumero, clienteBairro, clienteCidade, clienteUf, clienteCep, autonomos, series])

  // ── Save to database ──
  const handleSave = useCallback(async () => {
    if (!empreendimento || !valorImovel || series.length === 0 || autonomos.length === 0) {
      toast.error("Preencha os dados do imóvel, parcelas e autônomos antes de salvar")
      return
    }

    setSaving(true)
    try {
      const vendaData = {
        venda: {
          valor_venda: valorImovel,
          percentual_comissao: percentualComissao / 100,
          empreendimento,
          unidade,
          cliente_nome: clienteNome || undefined,
          cliente_cpf: clienteCpf?.replace(/\D/g, "") || undefined,
          data_venda: new Date().toISOString().split("T")[0],
          observacoes: undefined,
          referencia: undefined,
        },
        corretores: autonomos.map((a, i) => ({
          nome: a.nome,
          cpf: a.documento?.replace(/\D/g, "") || undefined,
          percentual_participacao: a.percentual / 100,
          valor_comissao: a.valorBruto,
          prioridade: i + 1,
        })),
        parcelas: series.flatMap(s => {
          const items = []
          for (let i = 0; i < s.quantidade; i++) {
            items.push({
              numero: items.length + 1,
              descricao: s.quantidade === 1 ? TIPO_PARCELA_LABELS[s.tipo] : `${TIPO_PARCELA_LABELS[s.tipo]} ${i + 1}`,
              valor_parcela: s.valorUnitario,
              percentual_comissao: s.percentualDoImovel / s.quantidade,
              data_prevista: new Date(Date.now() + (items.length + 1) * 30 * 86400000).toISOString().split("T")[0],
            })
          }
          return items
        }),
      }

      const result = await comissaoApi.vendas.createCompleta(vendaData)
      const newId = (result as any).id || (result as any).data?.id

      if (newId) {
        setVendaId(newId)

        // Save address fields to venda
        try {
          await fetch(`/api/comissao/vendas/${newId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cliente_email: clienteEmail,
              cliente_telefone: clienteTelefone,
              cliente_logradouro: clienteLogradouro,
              cliente_numero: clienteNumero,
              cliente_complemento: clienteComplemento,
              cliente_bairro: clienteBairro,
              cliente_cidade: clienteCidade,
              cliente_uf: clienteUf,
              cliente_cep: clienteCep?.replace(/\D/g, ""),
            }),
          })
        } catch { /* address save is optional */ }

        // Trigger calculation
        try {
          await comissaoApi.matriz.calcular(newId)
        } catch { /* calc is optional */ }
      }

      toast.success("Comissão salva com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar comissão")
    } finally {
      setSaving(false)
    }
  }, [empreendimento, valorImovel, percentualComissao, unidade, clienteNome, clienteCpf, autonomos, series, clienteEmail, clienteTelefone, clienteLogradouro, clienteNumero, clienteComplemento, clienteBairro, clienteCidade, clienteUf, clienteCep])

  // ── Webropay handlers ──
  const handleEnviarWebropay = useCallback(async () => {
    if (!vendaId) {
      toast.error("Salve a comissão antes de enviar para a Webropay")
      return
    }
    setWebropayLoading(true)
    try {
      await comissaoApi.webropay.enviar(vendaId)
      setWebropayStatus("enviada")
      toast.success("Venda enviada para Webropay com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar para Webropay")
    } finally {
      setWebropayLoading(false)
    }
  }, [vendaId])

  const handleLiberarWebropay = useCallback(async () => {
    if (!vendaId) return
    setWebropayLoading(true)
    try {
      await comissaoApi.webropay.liberar(vendaId)
      setWebropayStatus("liberada")
      toast.success("Pagamento liberado com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro ao liberar pagamento")
    } finally {
      setWebropayLoading(false)
    }
  }, [vendaId])

  const handleDistratarWebropay = useCallback(async () => {
    if (!vendaId || !distratoMotivo.trim()) {
      toast.error("Informe o motivo do distrato")
      return
    }
    setWebropayLoading(true)
    try {
      await comissaoApi.webropay.distratar(vendaId, distratoMotivo.trim())
      setWebropayStatus("distratada")
      setDistratoMotivo("")
      toast.success("Venda distratada com sucesso")
    } catch (err: any) {
      toast.error(err.message || "Erro ao distratar")
    } finally {
      setWebropayLoading(false)
    }
  }, [vendaId, distratoMotivo])

  const handleBloquearWebropay = useCallback(async () => {
    if (!vendaId) return
    setWebropayLoading(true)
    try {
      await comissaoApi.webropay.bloquear(vendaId)
      setWebropayStatus("bloqueada")
      toast.success("Venda bloqueada com sucesso")
    } catch (err: any) {
      toast.error(err.message || "Erro ao bloquear")
    } finally {
      setWebropayLoading(false)
    }
  }, [vendaId])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AppShell title="Calculo de Comissionamento">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Nova Simulacao</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Nova simulacao?</AlertDialogTitle>
                  <AlertDialogDescription>Todos os dados atuais serao apagados. Deseja continuar?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAll}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !empreendimento || valorImovel <= 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : vendaId ? <Check className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              <span className="hidden sm:inline">{vendaId ? "Salva" : "Salvar"}</span>
            </Button>
          </div>
        </div>

        {/* ── Section 1: Dados do Imovel ── */}
        <Section title="Dados do Imovel e Cliente" icon={FileText} number={1}>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Empreendimento</Label>
              <AutocompleteInput
                value={empreendimento}
                onChange={setEmpreendimento}
                placeholder="Buscar empreendimento..."
                fetchUrl={(q) => `/api/comissao/buscar/empreendimentos?busca=${encodeURIComponent(q)}`}
                onSelect={(item: EmpreendimentoBusca) => {
                  setEmpreendimentoId(item.id)
                  setEmpreendimento(item.nome)
                }}
                getId={(item: EmpreendimentoBusca) => item.id}
                getLabel={(item: EmpreendimentoBusca) => item.nome}
                renderItem={(item: EmpreendimentoBusca) => (
                  <div>
                    <p className="font-medium">{item.nome}</p>
                    {item.cidade && <p className="text-xs text-zinc-500">{item.cidade}{item.uf ? ` - ${item.uf}` : ""}</p>}
                  </div>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              {empreendimentoId ? (
                <AutocompleteInput
                  value={unidade}
                  onChange={setUnidade}
                  placeholder="Buscar unidade..."
                  fetchUrl={(q) => `/api/comissao/buscar/unidades/${empreendimentoId}?busca=${encodeURIComponent(q)}`}
                  onSelect={(item: UnidadeBusca) => {
                    const label = [item.bloco, item.codigo].filter(Boolean).join(" - ")
                    setUnidade(label || item.id)
                    if (item.valor_tabela && item.valor_tabela > 0) setValorImovel(item.valor_tabela)
                  }}
                  getId={(item: UnidadeBusca) => item.id}
                  getLabel={(item: UnidadeBusca) => [item.bloco, item.codigo].filter(Boolean).join(" - ") || item.id}
                  renderItem={(item: UnidadeBusca) => (
                    <div className="flex items-center justify-between">
                      <span>{[item.bloco, item.codigo].filter(Boolean).join(" - ")}{item.tipologia ? ` (${item.tipologia})` : ""}</span>
                      {item.valor_tabela && <span className="text-xs text-zinc-500">{formatarMoeda(item.valor_tabela)}</span>}
                    </div>
                  )}
                />
              ) : (
                <Input placeholder="Selecione o empreendimento primeiro" value={unidade} onChange={e => setUnidade(e.target.value)} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Cliente</Label>
              <Input placeholder="Nome completo" value={clienteNome} onChange={e => setClienteNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CPF do Cliente</Label>
              <Input
                placeholder="000.000.000-00"
                value={clienteCpf}
                onChange={e => setClienteCpf(formatCpfMask(e.target.value))}
                maxLength={14}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor do Imovel (R$)</Label>
              <CurrencyInput value={valorImovel} onChange={setValorImovel} />
            </div>
            <div className="space-y-1.5">
              <Label>% Comissao</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="0.1" min="0" max="100" className="flex-1"
                  value={percentualComissao || ""} onChange={e => setPercentualComissao(parseFloat(e.target.value) || 0)}
                />
                <Badge variant="secondary" className="shrink-0 text-sm px-3 py-1.5">{formatarMoeda(valorComissao)}</Badge>
              </div>
            </div>
          </div>

          {/* Dados adicionais do cliente (Webropay) - collapsible */}
          <CollapsibleWebropay
            clienteEmail={clienteEmail} setClienteEmail={setClienteEmail}
            clienteTelefone={clienteTelefone} setClienteTelefone={setClienteTelefone}
            clienteLogradouro={clienteLogradouro} setClienteLogradouro={setClienteLogradouro}
            clienteNumero={clienteNumero} setClienteNumero={setClienteNumero}
            clienteComplemento={clienteComplemento} setClienteComplemento={setClienteComplemento}
            clienteBairro={clienteBairro} setClienteBairro={setClienteBairro}
            clienteCidade={clienteCidade} setClienteCidade={setClienteCidade}
            clienteUf={clienteUf} setClienteUf={setClienteUf}
            clienteCep={clienteCep} setClienteCep={setClienteCep}
            isComplete={webropayDadosCompletos}
          />
        </Section>

        {/* ── Section 2: Proposta do Cliente ── */}
        <Section
          title="Proposta do Cliente"
          icon={DollarSign}
          number={2}
          actions={
            <Select onValueChange={loadTemplate}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Carregar template..." />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES_PARCELAS.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div>
                      <span className="font-medium">{t.nome}</span>
                      <span className="text-zinc-400 ml-1.5 text-[10px]">{t.descricao}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="pt-4 space-y-3">
            {series.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                Nenhuma serie adicionada. Use um template acima ou adicione manualmente.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Desktop header */}
                <div className="hidden sm:grid grid-cols-[140px_70px_1fr_1fr_80px_72px] gap-2 px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span>Tipo</span>
                  <span>Qtd</span>
                  <span>Valor Unit.</span>
                  <span>Valor Total</span>
                  <span>% Imovel</span>
                  <span></span>
                </div>
                {series.map(s => (
                  <div key={s.id}>
                    {/* Desktop */}
                    <div className="hidden sm:grid grid-cols-[140px_70px_1fr_1fr_80px_72px] gap-2 items-center bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-2">
                      <Select value={s.tipo} onValueChange={v => updateSerie(s.id, "tipo", v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_PARCELA_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="1" className="h-9" value={s.quantidade || ""} onChange={e => updateSerie(s.id, "quantidade", parseInt(e.target.value) || 1)} />
                      <CurrencyInput className="h-9" value={s.valorUnitario} onChange={v => updateSerie(s.id, "valorUnitario", v)} />
                      <CurrencyInput className="h-9" value={s.valorTotal} onChange={v => updateSerie(s.id, "valorTotal", v)} />
                      <Input type="number" step="0.01" min="0" max="100" className="h-9" value={s.percentualDoImovel || ""} onChange={e => updateSerie(s.id, "percentualDoImovel", parseFloat(e.target.value) || 0)} />
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-600" onClick={() => duplicateSerie(s.id)} title="Duplicar">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-red-500" onClick={() => removeSerie(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="sm:hidden bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Select value={s.tipo} onValueChange={v => updateSerie(s.id, "tipo", v)}>
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIPO_PARCELA_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400" onClick={() => duplicateSerie(s.id)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => removeSerie(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase">Qtd</span>
                          <Input type="number" min="1" className="h-8 text-sm" value={s.quantidade || ""} onChange={e => updateSerie(s.id, "quantidade", parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase">Unit.</span>
                          <CurrencyInput className="h-8 text-sm" value={s.valorUnitario} onChange={v => updateSerie(s.id, "valorUnitario", v)} />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase">%</span>
                          <Input type="number" step="0.01" className="h-8 text-sm" value={s.percentualDoImovel || ""} onChange={e => updateSerie(s.id, "percentualDoImovel", parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Total: {formatarMoeda(s.valorTotal)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={addSerie}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar Serie
              </Button>
              {series.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-zinc-500">
                    Total: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatarMoeda(totalProposta)}</span>
                  </span>
                  <Badge variant={Math.abs(totalPercentualProposta - 100) < 0.1 ? "default" : "destructive"} className="text-xs">
                    {totalPercentualProposta.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>

            {series.length > 0 && Math.abs(totalPercentualProposta - 100) >= 0.1 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>A soma dos percentuais e <strong>{totalPercentualProposta.toFixed(1)}%</strong>. Idealmente deveria ser 100% do valor do imovel.</span>
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 3: Autonomos ── */}
        <Section
          title="Comissoes dos Autonomos"
          icon={Users}
          number={3}
          actions={
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={loadDefaultTeam}>
              <Zap className="h-3.5 w-3.5 mr-1" />
              Equipe Padrao
            </Button>
          }
        >
          <div className="pt-4 space-y-3">
            {autonomos.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                Nenhum autonomo adicionado. Use &quot;Equipe Padrao&quot; ou adicione manualmente.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Desktop header */}
                <div className="hidden sm:grid grid-cols-[28px_1fr_140px_140px_80px_1fr_40px] gap-2 px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span></span>
                  <span>Nome</span>
                  <span>Cargo</span>
                  <span>CPF/CNPJ</span>
                  <span>%</span>
                  <span>Valor Bruto</span>
                  <span></span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={autonomos.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    {autonomos.map(a => (
                      <SortableAutonomoRow
                        key={a.id}
                        autonomo={a}
                        totalAutonomos={autonomos.length}
                        valorComissao={valorComissao}
                        onUpdate={updateAutonomo}
                        onRemove={removeAutonomo}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={addAutonomo}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar Autonomo
              </Button>
              {autonomos.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-zinc-500">
                    Total: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatarMoeda(totalValorAutonomos)}</span>
                  </span>
                  <Badge variant={Math.abs(totalPercentualAutonomos - 100) < 0.1 ? "default" : "secondary"} className="text-xs">
                    {totalPercentualAutonomos.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>

            {autonomos.length > 0 && totalPercentualAutonomos > 100.1 && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>A soma dos percentuais ({totalPercentualAutonomos.toFixed(1)}%) ultrapassa 100% da comissao.</span>
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 4: Rateio ── */}
        <Section title="Controle de Pagamentos (Rateio)" icon={BarChart3} number={4} defaultOpen={false}>
          <div className="pt-4 space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Distribuicao automatica por prioridade. Arraste os autonomos acima para reordenar.
            </p>

            {rateioCalculado && parcelaLabels.length > 0 && autonomos.length > 0 ? (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="text-left py-2 pr-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider sticky left-0 bg-white dark:bg-zinc-900 z-10">Autonomo</th>
                      {parcelaLabels.map((label, i) => (
                        <th key={i} className="text-right py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider whitespace-nowrap">{label}</th>
                      ))}
                      <th className="text-right py-2 pl-3 font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autonomos.sort((a, b) => a.prioridade - b.prioridade).map(auto => {
                      const row = rateioGrid[auto.id] || {}
                      const totalRow = Object.values(row).reduce((acc, c) => acc + c.valor, 0)
                      return (
                        <tr key={auto.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                          <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap sticky left-0 bg-white dark:bg-zinc-900 z-10">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{auto.prioridade}</span>
                              <span className="truncate max-w-[120px]">{auto.nome || "Sem nome"}</span>
                            </div>
                          </td>
                          {parcelaLabels.map((_, pIdx) => {
                            const val = row[`p_${pIdx}`]?.valor || 0
                            return (
                              <td key={pIdx} className={cn("text-right py-2 px-2 tabular-nums whitespace-nowrap", val > 0 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-300 dark:text-zinc-600")}>
                                {val > 0 ? formatarMoeda(val) : "-"}
                              </td>
                            )
                          })}
                          <td className="text-right py-2 pl-3 font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatarMoeda(arredondarValor(totalRow))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
                      <td className="py-2 pr-3 font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase sticky left-0 bg-white dark:bg-zinc-900 z-10">Total</td>
                      {parcelaLabels.map((_, pIdx) => {
                        const colTotal = autonomos.reduce((acc, auto) => acc + (rateioGrid[auto.id]?.[`p_${pIdx}`]?.valor || 0), 0)
                        return (<td key={pIdx} className="text-right py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums whitespace-nowrap">{formatarMoeda(arredondarValor(colTotal))}</td>)
                      })}
                      <td className="text-right py-2 pl-3 font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatarMoeda(arredondarValor(autonomos.reduce((acc, auto) => {
                          const row = rateioGrid[auto.id] || {}
                          return acc + Object.values(row).reduce((a, c) => a + c.valor, 0)
                        }, 0)))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                Adicione series de parcelas e autonomos para ver o rateio automatico.
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 5: Resumo Financeiro ── */}
        <Section title="Resumo Financeiro" icon={Calculator} number={5}>
          <div className="pt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 sm:p-4 space-y-1">
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Valor do Imovel</p>
                <p className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatarMoeda(valorImovel)}</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 sm:p-4 space-y-1">
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Comissao ({percentualComissao}%)</p>
                <p className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatarMoeda(valorComissao)}</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 sm:p-4 space-y-1">
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Total Proposta</p>
                <p className={cn("text-base sm:text-xl font-bold tabular-nums", Math.abs(totalPercentualProposta - 100) < 0.1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  {formatarMoeda(totalProposta)}
                </p>
                <p className="text-[10px] sm:text-xs text-zinc-400">{totalPercentualProposta.toFixed(1)}% do imovel</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 sm:p-4 space-y-1">
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Total Comissoes</p>
                <p className={cn("text-base sm:text-xl font-bold tabular-nums", totalPercentualAutonomos <= 100.1 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {formatarMoeda(totalValorAutonomos)}
                </p>
                <p className="text-[10px] sm:text-xs text-zinc-400">{totalPercentualAutonomos.toFixed(1)}% da comissao</p>
              </div>
            </div>

            <div className="mt-4 bg-zinc-900 dark:bg-white rounded-xl p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Contrato Liquido</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Proposta - Comissoes</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white dark:text-zinc-900 tabular-nums">{formatarMoeda(contratoLiquido)}</p>
            </div>

            {/* Progress bar */}
            {(() => {
              const checks = [
                valorImovel > 0,
                series.length > 0 && Math.abs(totalPercentualProposta - 100) < 0.5,
                autonomos.length > 0 && totalPercentualAutonomos <= 100.1,
                rateioCalculado,
                webropayDadosCompletos,
              ]
              const done = checks.filter(Boolean).length
              const pct = Math.round((done / checks.length) * 100)
              return (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Preenchimento</span>
                    <span className={cn("font-bold", pct === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-300")}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500")} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Dados</p>
                <div className="flex flex-wrap gap-2">
                  <StatusPill ok={valorImovel > 0} label="Valor do imovel" />
                  <StatusPill ok={series.length > 0 && Math.abs(totalPercentualProposta - 100) < 0.5} label="Proposta completa" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Financeiro</p>
                <div className="flex flex-wrap gap-2">
                  <StatusPill ok={autonomos.length > 0 && totalPercentualAutonomos <= 100.1} label="Comissoes validas" />
                  <StatusPill ok={rateioCalculado} label="Rateio calculado" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Pagadoria</p>
                <div className="flex flex-wrap gap-2">
                  <StatusPill ok={webropayDadosCompletos} label="Dados Webropay completos" />
                  {webropayStatus && <StatusPill ok={webropayStatus === 'enviada' || webropayStatus === 'liberada'} label={`Pagadoria: ${WEBROPAY_STATUS_LABELS[webropayStatus]}`} />}
                </div>
              </div>
            </div>
          </div>
        </Section>
        {/* ── Section 6: Webropay ── */}
        <Section title="Envio para Pagadoria (Webropay)" icon={Send} number={6} defaultOpen={!!vendaId}>
          {!vendaId ? (
            <div className="pt-4 flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <Send className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Salve a comissao para desbloquear</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Apos salvar, voce podera enviar para a pagadoria Webropay</p>
            </div>
          ) : (
            <div className="pt-4 space-y-4">
              {/* Status stepper */}
              <div className="flex items-center gap-2">
                {(["enviada", "liberada"] as const).map((step, i) => {
                  const isActive = webropayStatus === step
                  const isPast = webropayStatus === "liberada" && step === "enviada"
                  return (
                    <div key={step} className="flex items-center gap-2">
                      {i > 0 && <div className={cn("h-0.5 w-8", isPast || isActive ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700")} />}
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                        isActive ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : isPast ? "border-emerald-200 bg-emerald-50/50 text-emerald-500 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-500"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                      )}>
                        {isPast ? <Check className="h-3 w-3" /> : isActive ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current inline-block" />}
                        {step === "enviada" ? "Enviada" : "Liberada"}
                      </div>
                    </div>
                  )
                })}
                {webropayStatus === "distratada" && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ml-2">Distratada</Badge>
                )}
                {webropayStatus === "bloqueada" && (
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 ml-2">Bloqueada</Badge>
                )}
                {!webropayStatus && (
                  <Badge variant="secondary">Pendente de envio</Badge>
                )}
                <span className="text-xs text-zinc-400 ml-auto">ID: {vendaId}</span>
              </div>

              {/* Validation warnings */}
              {!webropayDadosCompletos && !webropayStatus && (
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Dados incompletos para envio</p>
                    <ul className="mt-1 text-xs space-y-0.5">
                      {!clienteEmail && <li>- Email do cliente obrigatório</li>}
                      {!clienteLogradouro && <li>- Endereço do cliente obrigatório</li>}
                      {autonomos.some(a => !a.documento || a.documento.replace(/\D/g, "").length < 11) && <li>- Todos os autônomos devem ter CPF/CNPJ</li>}
                    </ul>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Enviar */}
                {(!webropayStatus || webropayStatus === "bloqueada") && (
                  <Button
                    size="sm"
                    onClick={handleEnviarWebropay}
                    disabled={webropayLoading || !webropayDadosCompletos}
                  >
                    {webropayLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                    Enviar para Webropay
                  </Button>
                )}

                {/* Liberar */}
                {webropayStatus === "enviada" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-emerald-600" disabled={webropayLoading}>
                        <Unlock className="h-4 w-4 mr-1.5" />
                        Liberar Pagamento
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Liberar pagamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso liberará os boletos para pagamento dos corretores. Esta ação não pode ser desfeita facilmente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLiberarWebropay}>Confirmar Liberação</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Bloquear */}
                {webropayStatus === "enviada" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-orange-600" disabled={webropayLoading}>
                        <Lock className="h-4 w-4 mr-1.5" />
                        Bloquear
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Bloquear venda?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso bloqueará todos os pagamentos desta venda na Webropay.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBloquearWebropay}>Confirmar Bloqueio</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Distratar */}
                {(webropayStatus === "enviada" || webropayStatus === "liberada") && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-red-600" disabled={webropayLoading}>
                        <Ban className="h-4 w-4 mr-1.5" />
                        Distratar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Distratar venda?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Informe o motivo do distrato. A venda será cancelada na Webropay.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="px-6 pb-2">
                        <Textarea
                          placeholder="Motivo do distrato..."
                          value={distratoMotivo}
                          onChange={e => setDistratoMotivo(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDistratoMotivo("")}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDistratarWebropay}
                          disabled={!distratoMotivo.trim()}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Confirmar Distrato
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Loading indicator */}
              {webropayLoading && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          nav, header, .fixed, button, [data-radix-popper-content-wrapper] { display: none !important; }
          main { padding: 0 !important; }
          .md\\:pl-\\[260px\\], .md\\:pl-\\[68px\\] { padding-left: 0 !important; }
          * { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </AppShell>
  )
}

// ============================================================================
// STATUS PILL
// ============================================================================

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
      ok ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
    )}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {label}
    </div>
  )
}
