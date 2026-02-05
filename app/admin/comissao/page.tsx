"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Plus,
  Trash2,
  Calculator,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  AlertCircle,
  Check,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { arredondarValor, formatarMoeda } from "@/lib/comissao/calculations"

// ============================================================================
// TYPES
// ============================================================================

type TipoParcela = "ato" | "mensal" | "bimestral" | "trimestral" | "semestral" | "anual" | "financiamento" | "intercalada" | "chaves" | "personalizado"

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
}

interface CelulaRateio {
  valor: number
  pago: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIPO_PARCELA_LABELS: Record<TipoParcela, string> = {
  ato: "Ato",
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

function formatInputCurrency(value: number): string {
  if (value === 0) return ""
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
}: {
  title: string
  icon: React.ElementType
  number: number
  children: React.ReactNode
  defaultOpen?: boolean
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
        {open ? (
          <ChevronUp className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        )}
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
// MAIN PAGE COMPONENT
// ============================================================================

export default function ComissaoCalculadoraPage() {
  // ── Section 1: Dados do Imovel e Cliente ──
  const [empreendimento, setEmpreendimento] = useState("")
  const [unidade, setUnidade] = useState("")
  const [clienteNome, setClienteNome] = useState("")
  const [clienteCpf, setClienteCpf] = useState("")
  const [valorImovel, setValorImovel] = useState(0)
  const [percentualComissao, setPercentualComissao] = useState(5)

  // ── Section 2: Proposta do Cliente (Series de Parcelas) ──
  const [series, setSeries] = useState<SerieParcela[]>([])

  // ── Section 3: Autonomos ──
  const [autonomos, setAutonomos] = useState<Autonomo[]>([])

  // ── Section 4: Rateio (grid auto x datas) ──
  const [rateioGrid, setRateioGrid] = useState<Record<string, Record<string, CelulaRateio>>>({})
  const [rateioCalculado, setRateioCalculado] = useState(false)

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

  // ── Series helpers ──
  const addSerie = useCallback(() => {
    setSeries(prev => [
      ...prev,
      {
        id: generateId(),
        tipo: "mensal",
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        percentualDoImovel: 0,
      },
    ])
  }, [])

  const removeSerie = useCallback((id: string) => {
    setSeries(prev => prev.filter(s => s.id !== id))
  }, [])

  const updateSerie = useCallback(
    (id: string, field: keyof SerieParcela, value: number | string) => {
      setSeries(prev =>
        prev.map(s => {
          if (s.id !== id) return s
          const updated = { ...s, [field]: value }

          // Recalculate dependent fields
          if (field === "quantidade" || field === "valorUnitario") {
            updated.valorTotal = arredondarValor(updated.quantidade * updated.valorUnitario)
            updated.percentualDoImovel = valorImovel > 0
              ? arredondarValor((updated.valorTotal / valorImovel) * 100)
              : 0
          }
          if (field === "valorTotal") {
            updated.valorUnitario = updated.quantidade > 0
              ? arredondarValor((value as number) / updated.quantidade)
              : 0
            updated.percentualDoImovel = valorImovel > 0
              ? arredondarValor(((value as number) / valorImovel) * 100)
              : 0
          }
          if (field === "percentualDoImovel") {
            updated.valorTotal = valorImovel > 0
              ? arredondarValor(valorImovel * ((value as number) / 100))
              : 0
            updated.valorUnitario = updated.quantidade > 0
              ? arredondarValor(updated.valorTotal / updated.quantidade)
              : 0
          }
          return updated
        })
      )
    },
    [valorImovel]
  )

  // ── Autonomos helpers ──
  const addAutonomo = useCallback(() => {
    const nextPrioridade = autonomos.length + 1
    setAutonomos(prev => [
      ...prev,
      {
        id: generateId(),
        nome: "",
        cargo: "Corretor",
        percentual: 0,
        valorBruto: 0,
        prioridade: nextPrioridade,
      },
    ])
    setRateioCalculado(false)
  }, [autonomos.length])

  const removeAutonomo = useCallback((id: string) => {
    setAutonomos(prev => {
      const filtered = prev.filter(a => a.id !== id)
      return filtered.map((a, i) => ({ ...a, prioridade: i + 1 }))
    })
    setRateioCalculado(false)
  }, [])

  const updateAutonomo = useCallback(
    (id: string, field: keyof Autonomo, value: string | number) => {
      setAutonomos(prev =>
        prev.map(a => {
          if (a.id !== id) return a
          const updated = { ...a, [field]: value }

          if (field === "percentual") {
            updated.valorBruto = valorComissao > 0
              ? arredondarValor(valorComissao * ((value as number) / 100))
              : 0
          }
          if (field === "valorBruto") {
            updated.percentual = valorComissao > 0
              ? arredondarValor(((value as number) / valorComissao) * 100)
              : 0
          }
          return updated
        })
      )
      setRateioCalculado(false)
    },
    [valorComissao]
  )

  const moveAutonomo = useCallback((id: string, direction: "up" | "down") => {
    setAutonomos(prev => {
      const idx = prev.findIndex(a => a.id === id)
      if (idx < 0) return prev
      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const arr = [...prev]
      const temp = arr[idx]
      arr[idx] = arr[newIdx]
      arr[newIdx] = temp
      return arr.map((a, i) => ({ ...a, prioridade: i + 1 }))
    })
    setRateioCalculado(false)
  }, [])

  // ── Rateio calculation (priority-based) ──
  const calcularRateio = useCallback(() => {
    if (series.length === 0 || autonomos.length === 0) return

    // Expand series into individual parcelas (dates)
    const parcelas: { label: string; valor: number; serieId: string }[] = []
    series.forEach(s => {
      for (let i = 0; i < s.quantidade; i++) {
        const label = s.quantidade === 1
          ? TIPO_PARCELA_LABELS[s.tipo]
          : `${TIPO_PARCELA_LABELS[s.tipo]} ${i + 1}`
        parcelas.push({ label, valor: s.valorUnitario, serieId: s.id })
      }
    })

    // Sort autonomos by priority (lower = higher priority)
    const sorted = [...autonomos].sort((a, b) => a.prioridade - b.prioridade)

    // Build rateio grid: for each parcela, distribute by priority
    const grid: Record<string, Record<string, CelulaRateio>> = {}
    const autoRestante: Record<string, number> = {}
    sorted.forEach(a => {
      grid[a.id] = {}
      autoRestante[a.id] = a.valorBruto
    })

    // For each parcela, assign values by priority until parcela budget is exhausted
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

  // Expanded parcela labels for rateio grid
  const parcelaLabels = useMemo(() => {
    const labels: string[] = []
    series.forEach(s => {
      for (let i = 0; i < s.quantidade; i++) {
        labels.push(
          s.quantidade === 1
            ? TIPO_PARCELA_LABELS[s.tipo]
            : `${TIPO_PARCELA_LABELS[s.tipo]} ${i + 1}`
        )
      }
    })
    return labels
  }, [series])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AppShell title="Calculo de Comissionamento">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* ── Section 1: Dados do Imovel ── */}
        <Section title="Dados do Imovel e Cliente" icon={FileText} number={1}>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="empreendimento">Empreendimento</Label>
              <Input
                id="empreendimento"
                placeholder="Nome do empreendimento"
                value={empreendimento}
                onChange={e => setEmpreendimento(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                placeholder="Ex: Bloco A - 101"
                value={unidade}
                onChange={e => setUnidade(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteNome">Nome do Cliente</Label>
              <Input
                id="clienteNome"
                placeholder="Nome completo"
                value={clienteNome}
                onChange={e => setClienteNome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteCpf">CPF do Cliente</Label>
              <Input
                id="clienteCpf"
                placeholder="000.000.000-00"
                value={clienteCpf}
                onChange={e => setClienteCpf(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valorImovel">Valor do Imovel (R$)</Label>
              <Input
                id="valorImovel"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={formatInputCurrency(valorImovel)}
                onChange={e => setValorImovel(parseCurrencyInput(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="percentualComissao">% Comissao</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="percentualComissao"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="flex-1"
                  value={percentualComissao || ""}
                  onChange={e => setPercentualComissao(parseFloat(e.target.value) || 0)}
                />
                <Badge variant="secondary" className="shrink-0 text-sm px-3 py-1.5">
                  {formatarMoeda(valorComissao)}
                </Badge>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Section 2: Proposta do Cliente ── */}
        <Section title="Proposta do Cliente" icon={DollarSign} number={2}>
          <div className="pt-4 space-y-3">
            {series.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                Nenhuma serie de parcelas adicionada. Clique no botao abaixo para adicionar.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden sm:grid grid-cols-[140px_70px_1fr_1fr_80px_40px] gap-2 px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span>Tipo</span>
                  <span>Qtd</span>
                  <span>Valor Unit.</span>
                  <span>Valor Total</span>
                  <span>% Imovel</span>
                  <span></span>
                </div>
                {series.map(s => (
                  <div
                    key={s.id}
                    className="grid grid-cols-1 sm:grid-cols-[140px_70px_1fr_1fr_80px_40px] gap-2 items-center bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-2"
                  >
                    <Select
                      value={s.tipo}
                      onValueChange={v => updateSerie(s.id, "tipo", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_PARCELA_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min="1"
                      className="h-9"
                      value={s.quantidade || ""}
                      onChange={e => updateSerie(s.id, "quantidade", parseInt(e.target.value) || 1)}
                    />

                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-9"
                      value={formatInputCurrency(s.valorUnitario)}
                      onChange={e => updateSerie(s.id, "valorUnitario", parseCurrencyInput(e.target.value))}
                    />

                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-9"
                      value={formatInputCurrency(s.valorTotal)}
                      onChange={e => updateSerie(s.id, "valorTotal", parseCurrencyInput(e.target.value))}
                    />

                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="h-9"
                      value={s.percentualDoImovel || ""}
                      onChange={e => updateSerie(s.id, "percentualDoImovel", parseFloat(e.target.value) || 0)}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-zinc-400 hover:text-red-500"
                      onClick={() => removeSerie(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                  <Badge
                    variant={Math.abs(totalPercentualProposta - 100) < 0.1 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {totalPercentualProposta.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>

            {series.length > 0 && Math.abs(totalPercentualProposta - 100) >= 0.1 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  A soma dos percentuais e <strong>{totalPercentualProposta.toFixed(1)}%</strong>. Idealmente deveria ser 100% do valor do imovel.
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 3: Autonomos (Comissoes) ── */}
        <Section title="Comissoes dos Autonomos" icon={Users} number={3}>
          <div className="pt-4 space-y-3">
            {autonomos.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                Nenhum autonomo adicionado. Clique no botao abaixo para adicionar.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden sm:grid grid-cols-[40px_1fr_140px_80px_1fr_80px_60px] gap-2 px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span>#</span>
                  <span>Nome</span>
                  <span>Cargo</span>
                  <span>%</span>
                  <span>Valor Bruto</span>
                  <span>Prio.</span>
                  <span></span>
                </div>
                {autonomos.map(a => (
                  <div
                    key={a.id}
                    className="grid grid-cols-1 sm:grid-cols-[40px_1fr_140px_80px_1fr_80px_60px] gap-2 items-center bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-2"
                  >
                    <span className="text-sm font-bold text-zinc-400 text-center">{a.prioridade}</span>

                    <Input
                      placeholder="Nome"
                      className="h-9"
                      value={a.nome}
                      onChange={e => updateAutonomo(a.id, "nome", e.target.value)}
                    />

                    <Select
                      value={a.cargo}
                      onValueChange={v => updateAutonomo(a.id, "cargo", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARGOS_PADRAO.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="h-9"
                      value={a.percentual || ""}
                      onChange={e => updateAutonomo(a.id, "percentual", parseFloat(e.target.value) || 0)}
                    />

                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-9"
                      value={formatInputCurrency(a.valorBruto)}
                      onChange={e => updateAutonomo(a.id, "valorBruto", parseCurrencyInput(e.target.value))}
                    />

                    <div className="flex items-center gap-0.5 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={a.prioridade === 1}
                        onClick={() => moveAutonomo(a.id, "up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={a.prioridade === autonomos.length}
                        onClick={() => moveAutonomo(a.id, "down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-zinc-400 hover:text-red-500"
                      onClick={() => removeAutonomo(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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
                  <Badge
                    variant={Math.abs(totalPercentualAutonomos - 100) < 0.1 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {totalPercentualAutonomos.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>

            {autonomos.length > 0 && totalPercentualAutonomos > 100.1 && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  A soma dos percentuais ({totalPercentualAutonomos.toFixed(1)}%) ultrapassa 100% da comissao.
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 4: Controle de Pagamentos (Rateio) ── */}
        <Section title="Controle de Pagamentos (Rateio)" icon={BarChart3} number={4} defaultOpen={false}>
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Distribuicao dos pagamentos por prioridade. Autonomos com prioridade menor recebem primeiro.
              </p>
              <Button
                size="sm"
                onClick={calcularRateio}
                disabled={series.length === 0 || autonomos.length === 0}
              >
                <Calculator className="h-4 w-4 mr-1.5" />
                Calcular Rateio
              </Button>
            </div>

            {rateioCalculado && parcelaLabels.length > 0 && autonomos.length > 0 ? (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="text-left py-2 pr-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider sticky left-0 bg-white dark:bg-zinc-900 z-10">
                        Autonomo
                      </th>
                      {parcelaLabels.map((label, i) => (
                        <th key={i} className="text-right py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider whitespace-nowrap">
                          {label}
                        </th>
                      ))}
                      <th className="text-right py-2 pl-3 font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {autonomos
                      .sort((a, b) => a.prioridade - b.prioridade)
                      .map(auto => {
                        const row = rateioGrid[auto.id] || {}
                        const totalRow = Object.values(row).reduce((acc, c) => acc + c.valor, 0)
                        return (
                          <tr key={auto.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                            <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap sticky left-0 bg-white dark:bg-zinc-900 z-10">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                                  {auto.prioridade}
                                </span>
                                <span className="truncate max-w-[120px]">{auto.nome || "Sem nome"}</span>
                              </div>
                            </td>
                            {parcelaLabels.map((_, pIdx) => {
                              const cell = row[`p_${pIdx}`]
                              const val = cell?.valor || 0
                              return (
                                <td key={pIdx} className={cn(
                                  "text-right py-2 px-2 tabular-nums whitespace-nowrap",
                                  val > 0
                                    ? "text-zinc-900 dark:text-zinc-100"
                                    : "text-zinc-300 dark:text-zinc-600"
                                )}>
                                  {val > 0 ? formatarMoeda(val) : "-"}
                                </td>
                              )
                            })}
                            <td className="text-right py-2 pl-3 font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {formatarMoeda(arredondarValor(totalRow))}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
                      <td className="py-2 pr-3 font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase sticky left-0 bg-white dark:bg-zinc-900 z-10">
                        Total
                      </td>
                      {parcelaLabels.map((_, pIdx) => {
                        const colTotal = autonomos.reduce((acc, auto) => {
                          const cell = rateioGrid[auto.id]?.[`p_${pIdx}`]
                          return acc + (cell?.valor || 0)
                        }, 0)
                        return (
                          <td key={pIdx} className="text-right py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums whitespace-nowrap">
                            {formatarMoeda(arredondarValor(colTotal))}
                          </td>
                        )
                      })}
                      <td className="text-right py-2 pl-3 font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatarMoeda(arredondarValor(
                          autonomos.reduce((acc, auto) => {
                            const row = rateioGrid[auto.id] || {}
                            return acc + Object.values(row).reduce((a, c) => a + c.valor, 0)
                          }, 0)
                        ))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                {series.length === 0 || autonomos.length === 0
                  ? "Adicione series de parcelas e autonomos primeiro, depois calcule o rateio."
                  : "Clique em \"Calcular Rateio\" para gerar a distribuicao."
                }
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 5: Resumo Financeiro ── */}
        <Section title="Resumo Financeiro" icon={Calculator} number={5}>
          <div className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 space-y-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Valor do Imovel</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatarMoeda(valorImovel)}</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 space-y-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Comissao ({percentualComissao}%)</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatarMoeda(valorComissao)}</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 space-y-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Total Proposta</p>
                <p className={cn(
                  "text-xl font-bold tabular-nums",
                  Math.abs(totalPercentualProposta - 100) < 0.1
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}>
                  {formatarMoeda(totalProposta)}
                </p>
                <p className="text-xs text-zinc-400">{totalPercentualProposta.toFixed(1)}% do imovel</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 space-y-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Total Comissoes</p>
                <p className={cn(
                  "text-xl font-bold tabular-nums",
                  totalPercentualAutonomos <= 100.1
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {formatarMoeda(totalValorAutonomos)}
                </p>
                <p className="text-xs text-zinc-400">{totalPercentualAutonomos.toFixed(1)}% da comissao</p>
              </div>
            </div>

            <div className="mt-4 bg-zinc-900 dark:bg-white rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Contrato Liquido</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Proposta - Comissoes</p>
              </div>
              <p className="text-2xl font-bold text-white dark:text-zinc-900 tabular-nums">
                {formatarMoeda(contratoLiquido)}
              </p>
            </div>

            {/* Status indicators */}
            <div className="mt-4 flex flex-wrap gap-3">
              <StatusPill
                ok={valorImovel > 0}
                label="Valor do imovel"
              />
              <StatusPill
                ok={series.length > 0 && Math.abs(totalPercentualProposta - 100) < 0.5}
                label="Proposta completa"
              />
              <StatusPill
                ok={autonomos.length > 0 && totalPercentualAutonomos <= 100.1}
                label="Comissoes validas"
              />
              <StatusPill
                ok={rateioCalculado}
                label="Rateio calculado"
              />
            </div>
          </div>
        </Section>
      </div>
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
      ok
        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
    )}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {label}
    </div>
  )
}
