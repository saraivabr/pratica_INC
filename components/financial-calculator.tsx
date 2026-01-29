"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  PiggyBank,
  Wallet,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Building2,
  Scale,
  Target,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  calcularFinanciamento,
  gerarTabelaPrice,
  gerarTabelaSac,
  calcularCapacidadeFinanciamento,
  formatarMoeda,
  formatarMoedaSimples,
  parseMoeda,
  type ResultadoFinanciamento,
  type ParcelaAmortizacao,
} from "@/lib/financial-calculations"

interface SimulacaoData {
  valorImovel: number
  entrada: number
  percentualEntrada: number
  valorFinanciado: number
  prazoMeses: number
  taxaAnual: number
  parcelaMensal: number
  totalPago: number
  totalJuros: number
}

interface FinancialCalculatorProps {
  valorInicial?: number
  series?: any[]
  onSimulacaoChange?: (data: SimulacaoData) => void
}

// Input formatado para moeda
function CurrencyInput({
  value,
  onChange,
  label,
  id,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  id: string
}) {
  const [displayValue, setDisplayValue] = useState(formatarMoedaSimples(value))

  useEffect(() => {
    setDisplayValue(formatarMoedaSimples(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "")
    const numValue = parseInt(raw) || 0
    setDisplayValue(formatarMoedaSimples(numValue))
    onChange(numValue)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          className="text-lg font-semibold pr-4"
        />
      </div>
    </div>
  )
}

// Componente para exibir uma métrica com ícone
function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  tooltip,
}: {
  label: string
  value: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: "default" | "success" | "warning" | "primary"
  tooltip?: string
}) {
  const variantStyles = {
    default: "bg-secondary/50",
    success: "bg-emerald-500/10 border border-emerald-500/20",
    warning: "bg-amber-500/10 border border-amber-500/20",
    primary: "bg-primary/10 border border-primary/20",
  }

  const textStyles = {
    default: "text-foreground",
    success: "text-emerald-600",
    warning: "text-amber-600",
    primary: "text-primary",
  }

  const content = (
    <div className={cn("p-4 rounded-xl", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
            {label}
          </p>
          <p className={cn("text-xl font-bold", textStyles[variant])}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-lg", variantStyles[variant])}>
            <Icon className={cn("h-5 w-5", textStyles[variant])} />
          </div>
        )}
      </div>
    </div>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

// Linha da tabela de amortização
function AmortizacaoRow({ parcela, isFirst, isLast }: {
  parcela: ParcelaAmortizacao
  isFirst?: boolean
  isLast?: boolean
}) {
  return (
    <div className={cn(
      "grid grid-cols-5 gap-2 py-2 text-sm",
      isFirst && "font-medium bg-primary/5 rounded-t-lg px-2 -mx-2",
      isLast && "font-medium bg-muted/50 rounded-b-lg px-2 -mx-2"
    )}>
      <div className="text-center">
        {isFirst ? "1ª" : isLast ? `${parcela.numero}ª` : `${parcela.numero}ª`}
      </div>
      <div className="text-right">{formatarMoeda(parcela.parcela)}</div>
      <div className="text-right text-muted-foreground">{formatarMoeda(parcela.amortizacao)}</div>
      <div className="text-right text-destructive/80">{formatarMoeda(parcela.juros)}</div>
      <div className="text-right">{formatarMoeda(parcela.saldoDevedor)}</div>
    </div>
  )
}

export function FinancialCalculator({
  valorInicial = 0,
  series = [],
  onSimulacaoChange,
}: FinancialCalculatorProps) {
  // Estados principais
  const [valorImovel, setValorImovel] = useState(valorInicial)
  const [percentualEntrada, setPercentualEntrada] = useState(20)
  const [prazoMeses, setPrazoMeses] = useState(360)
  const [taxaAnual, setTaxaAnual] = useState(10.5)
  const [sistemaAtivo, setSistemaAtivo] = useState<"price" | "sac">("price")
  const [mostrarTabela, setMostrarTabela] = useState(false)

  // Atualizar valor quando prop muda (apenas valorInicial na deps para evitar loop)
  useEffect(() => {
    setValorImovel(valorInicial)
  }, [valorInicial])

  // Calcular financiamento
  const resultado = useMemo(() => {
    return calcularFinanciamento(
      valorImovel,
      percentualEntrada,
      prazoMeses,
      taxaAnual
    )
  }, [valorImovel, percentualEntrada, prazoMeses, taxaAnual])

  // Tabela de amortização (apenas primeiras e últimas parcelas para performance)
  const tabelaAmortizacao = useMemo(() => {
    if (!mostrarTabela) return null

    const tabela = sistemaAtivo === "price"
      ? gerarTabelaPrice(resultado.valorFinanciado, resultado.taxaMensal, prazoMeses)
      : gerarTabelaSac(resultado.valorFinanciado, resultado.taxaMensal, prazoMeses)

    // Retorna primeiras 3 e últimas 3 parcelas
    const primeiras = tabela.parcelas.slice(0, 3)
    const ultimas = tabela.parcelas.slice(-3)

    return {
      primeiras,
      ultimas,
      total: tabela.parcelas.length,
      resumo: tabela.resumo,
    }
  }, [mostrarTabela, sistemaAtivo, resultado.valorFinanciado, resultado.taxaMensal, prazoMeses])

  // Notificar mudanças
  useEffect(() => {
    if (onSimulacaoChange && valorImovel > 0) {
      const parcela = sistemaAtivo === "price"
        ? resultado.price.parcelaMensal
        : resultado.sac.primeiraParcela

      onSimulacaoChange({
        valorImovel,
        entrada: resultado.valorEntrada,
        percentualEntrada,
        valorFinanciado: resultado.valorFinanciado,
        prazoMeses,
        taxaAnual,
        parcelaMensal: parcela,
        totalPago: sistemaAtivo === "price" ? resultado.price.totalPago : resultado.sac.totalPago,
        totalJuros: sistemaAtivo === "price" ? resultado.price.totalJuros : resultado.sac.totalJuros,
      })
    }
  }, [valorImovel, percentualEntrada, prazoMeses, taxaAnual, sistemaAtivo, resultado, onSimulacaoChange])

  // Anos para exibição
  const prazoAnos = Math.floor(prazoMeses / 12)
  const prazoMesesRestantes = prazoMeses % 12

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Simulador de Financiamento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calcule parcelas, compare sistemas e analise o custo real
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Inputs principais */}
        <div className="grid gap-6">
          <CurrencyInput
            id="valor-imovel"
            label="Valor do Imóvel"
            value={valorImovel}
            onChange={setValorImovel}
          />

          {/* Entrada */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Entrada
                <Badge variant="outline" className="font-mono">
                  {percentualEntrada}%
                </Badge>
              </Label>
              <span className="text-lg font-bold text-primary">
                {formatarMoedaSimples(resultado.valorEntrada)}
              </span>
            </div>
            <Slider
              value={[percentualEntrada]}
              onValueChange={([v]) => setPercentualEntrada(v)}
              min={10}
              max={90}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10%</span>
              <span>50%</span>
              <span>90%</span>
            </div>
          </div>

          {/* Prazo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Prazo do Financiamento</Label>
              <span className="text-sm font-medium">
                {prazoAnos} anos{prazoMesesRestantes > 0 && ` e ${prazoMesesRestantes} meses`}
                <span className="text-muted-foreground ml-1">({prazoMeses} meses)</span>
              </span>
            </div>
            <Slider
              value={[prazoMeses]}
              onValueChange={([v]) => setPrazoMeses(v)}
              min={60}
              max={420}
              step={12}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 anos</span>
              <span>20 anos</span>
              <span>35 anos</span>
            </div>
          </div>

          {/* Taxa de juros */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Taxa de Juros
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Taxa nominal anual. A taxa efetiva é {(resultado.analise?.taxaEfetivaAnual ?? 0).toFixed(2)}% a.a.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <span className="text-sm font-medium">
                {(taxaAnual ?? 0).toFixed(1)}% a.a.
                <span className="text-muted-foreground ml-1">
                  ({(resultado.taxaMensal ?? 0).toFixed(2)}% a.m.)
                </span>
              </span>
            </div>
            <Slider
              value={[taxaAnual]}
              onValueChange={([v]) => setTaxaAnual(v)}
              min={6}
              max={16}
              step={0.1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>6%</span>
              <span>11%</span>
              <span>16%</span>
            </div>
          </div>
        </div>

        {/* Resumo do financiamento */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Valor Financiado</span>
            <span className="text-2xl font-bold text-primary">
              {formatarMoedaSimples(resultado.valorFinanciado)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${100 - percentualEntrada}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Entrada: {formatarMoedaSimples(resultado.valorEntrada)}</span>
            <span>Financiado: {100 - percentualEntrada}%</span>
          </div>
        </div>

        {/* Seletor de Sistema */}
        <div className="space-y-4">
          <Label>Sistema de Amortização</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSistemaAtivo("price")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                sistemaAtivo === "price"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="font-semibold">PRICE</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatarMoedaSimples(resultado.price.parcelaMensal)}
              </p>
              <p className="text-xs text-muted-foreground">Parcela fixa</p>
            </button>

            <button
              onClick={() => setSistemaAtivo("sac")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                sistemaAtivo === "sac"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold">SAC</span>
              </div>
              <p className="text-2xl font-bold">
                {formatarMoedaSimples(resultado.sac.primeiraParcela)}
              </p>
              <p className="text-xs text-muted-foreground">
                Até {formatarMoedaSimples(resultado.sac.ultimaParcela)}
              </p>
            </button>
          </div>
        </div>

        {/* Detalhes do sistema selecionado */}
        <div className="grid grid-cols-2 gap-3">
          {sistemaAtivo === "price" ? (
            <>
              <MetricCard
                label="Total a Pagar"
                value={formatarMoedaSimples(resultado.price.totalPago)}
                icon={Wallet}
              />
              <MetricCard
                label="Total em Juros"
                value={formatarMoedaSimples(resultado.price.totalJuros)}
                subtitle={`${((resultado.price.totalJuros / (resultado.valorFinanciado || 1)) * 100).toFixed(0)}% do financiado`}
                icon={TrendingUp}
                variant="warning"
              />
            </>
          ) : (
            <>
              <MetricCard
                label="Total a Pagar"
                value={formatarMoedaSimples(resultado.sac.totalPago)}
                icon={Wallet}
              />
              <MetricCard
                label="Total em Juros"
                value={formatarMoedaSimples(resultado.sac.totalJuros)}
                subtitle={`${((resultado.sac.totalJuros / (resultado.valorFinanciado || 1)) * 100).toFixed(0)}% do financiado`}
                icon={TrendingUp}
                variant="warning"
              />
            </>
          )}
        </div>

        {/* Análise Financeira */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-primary" />
            Análise Financeira
          </h4>

          <div className="grid gap-3">
            <MetricCard
              label="Renda Necessária"
              value={formatarMoedaSimples(
                sistemaAtivo === "price"
                  ? resultado.analise.rendaNecessariaPrice
                  : resultado.analise.rendaNecessariaSac
              )}
              subtitle="Parcela não deve exceder 30% da renda"
              icon={PiggyBank}
              variant="primary"
              tooltip="Baseado na regra dos 30%: a parcela do financiamento não deve comprometer mais que 30% da renda familiar"
            />

            <MetricCard
              label="Economia SAC vs Price"
              value={formatarMoedaSimples(resultado.analise.economiaSSacVsPrice)}
              subtitle="Em juros pagos ao longo do financiamento"
              icon={PiggyBank}
              variant="success"
              tooltip="O sistema SAC paga menos juros porque amortiza mais no início, quando o saldo devedor é maior"
            />

            <MetricCard
              label="Valor Presente (VP)"
              value={formatarMoedaSimples(resultado.analise.valorPresenteParcelas)}
              subtitle="Custo real das parcelas a valor de hoje"
              icon={DollarSign}
              tooltip="O Valor Presente mostra quanto as parcelas futuras valem hoje, considerando o valor do dinheiro no tempo (taxa Selic ~10% a.a.)"
            />
          </div>
        </div>

        {/* Tabela de Amortização */}
        <div className="space-y-3">
          <button
            onClick={() => setMostrarTabela(!mostrarTabela)}
            className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Ver Tabela de Amortização</span>
            {mostrarTabela ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {mostrarTabela && tabelaAmortizacao && (
            <div className="p-4 rounded-xl bg-secondary/30 space-y-4 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  Sistema {sistemaAtivo.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {tabelaAmortizacao.total} parcelas
                </span>
              </div>

              {/* Header da tabela */}
              <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground uppercase tracking-wider border-b pb-2">
                <div className="text-center">Nº</div>
                <div className="text-right">Parcela</div>
                <div className="text-right">Amortiz.</div>
                <div className="text-right">Juros</div>
                <div className="text-right">Saldo</div>
              </div>

              {/* Primeiras parcelas */}
              {tabelaAmortizacao.primeiras.map((p, i) => (
                <AmortizacaoRow
                  key={p.numero}
                  parcela={p}
                  isFirst={i === 0}
                />
              ))}

              {/* Indicador de parcelas omitidas */}
              {tabelaAmortizacao.total > 6 && (
                <div className="text-center py-2 text-muted-foreground text-sm">
                  • • • {tabelaAmortizacao.total - 6} parcelas omitidas • • •
                </div>
              )}

              {/* Últimas parcelas */}
              {tabelaAmortizacao.ultimas.map((p, i) => (
                <AmortizacaoRow
                  key={p.numero}
                  parcela={p}
                  isLast={i === tabelaAmortizacao.ultimas.length - 1}
                />
              ))}

              {/* Resumo */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amortizado</span>
                  <span className="font-medium">{formatarMoeda(tabelaAmortizacao.resumo.totalAmortizado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total em Juros</span>
                  <span className="font-medium text-destructive">{formatarMoeda(tabelaAmortizacao.resumo.totalJuros)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t">
                  <span>Total Pago</span>
                  <span>{formatarMoeda(tabelaAmortizacao.resumo.totalPago + resultado.valorEntrada)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comparativo rápido */}
        <div className="p-4 rounded-xl border border-dashed space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Comparativo Rápido
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">À Vista</p>
              <p className="font-bold text-lg">{formatarMoedaSimples(valorImovel)}</p>
              <p className="text-xs text-emerald-600">Sem juros</p>
            </div>
            <div className="border-x">
              <p className="text-xs text-muted-foreground mb-1">Price</p>
              <p className="font-bold text-lg">{formatarMoedaSimples(resultado.price.totalPago)}</p>
              <p className="text-xs text-destructive">
                +{formatarMoedaSimples(resultado.price.totalJuros)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">SAC</p>
              <p className="font-bold text-lg">{formatarMoedaSimples(resultado.sac.totalPago)}</p>
              <p className="text-xs text-destructive">
                +{formatarMoedaSimples(resultado.sac.totalJuros)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
