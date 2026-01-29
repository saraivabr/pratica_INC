"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Calculator,
  TrendingUp,
  Info,
  Shield,
  FileText,
  Building2,
  DollarSign,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface CaixaSimulacao {
  valorImovel: number
  valorEntrada: number
  valorFGTS: number
  valorFinanciado: number
  percentualFinanciado: number
  prazoMeses: number
  taxaNominalAnual: number
  cetAnual: number
  price: {
    primeiraParcela: {
      parcelaTotal: number
      parcelaBase: number
      amortizacao: number
      juros: number
      mipMensal: number
      dfiMensal: number
      tarifaAdministracao: number
    }
    totalPago: number
    totalJuros: number
    totalMIP: number
    totalDFI: number
    totalTarifas: number
  }
  custosIniciais: {
    tarifaCadastro: number
    avaliacaoImovel: number
    registroContrato: number
    itbi: number
    total: number
  }
  viabilidade: {
    rendaMinimaPrice: number
    aprovaAutomatica: boolean
    observacoes: string[]
  }
  tipoFinanciamento: string
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

function formatarMoedaSimples(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

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
        <div className="flex-1">
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

export function FinancialCalculatorCaixa() {
  const [valorImovel, setValorImovel] = useState(300000)
  const [valorEntrada, setValorEntrada] = useState(60000)
  const [valorFGTS, setValorFGTS] = useState(0)
  const [prazoMeses, setPrazoMeses] = useState(360)
  const [usarMCMV, setUsarMCMV] = useState(false)
  const [usarFGTS, setUsarFGTS] = useState(false)
  const [simulacao, setSimulacao] = useState<CaixaSimulacao | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const percentualEntrada = useMemo(() => {
    if (valorImovel === 0) return 0
    return Math.round(((valorEntrada + valorFGTS) / valorImovel) * 100)
  }, [valorEntrada, valorFGTS, valorImovel])

  const prazoAnos = Math.floor(prazoMeses / 12)
  const prazoMesesRestantes = prazoMeses % 12

  useEffect(() => {
    const simular = async () => {
      if (valorImovel === 0) {
        setSimulacao(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/simular-caixa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valorImovel,
            valorEntrada,
            prazoMeses,
            usarMCMV,
            valorFGTS: usarFGTS ? valorFGTS : 0,
            cidade: 'outros',
          }),
        })

        const result = await response.json()

        if (result.success) {
          setSimulacao(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Erro ao calcular simulação')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(simular, 500)
    return () => clearTimeout(debounce)
  }, [valorImovel, valorEntrada, valorFGTS, prazoMeses, usarMCMV, usarFGTS])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent pb-4">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Simulador Caixa Econômica Federal
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cálculo preciso com todos os seguros, tarifas e CET oficial
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

          <CurrencyInput
            id="valor-entrada"
            label="Entrada (Dinheiro)"
            value={valorEntrada}
            onChange={setValorEntrada}
          />

          {/* Toggle FGTS */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
            <div className="flex-1">
              <Label htmlFor="usar-fgts" className="font-semibold">
                Usar FGTS como parte da entrada
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Pode aumentar sua capacidade de financiamento
              </p>
            </div>
            <Switch
              id="usar-fgts"
              checked={usarFGTS}
              onCheckedChange={setUsarFGTS}
            />
          </div>

          {usarFGTS && (
            <CurrencyInput
              id="valor-fgts"
              label="Valor do FGTS"
              value={valorFGTS}
              onChange={setValorFGTS}
            />
          )}

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

          {/* Toggle MCMV */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
            <div className="flex-1">
              <Label htmlFor="usar-mcmv" className="font-semibold">
                Usar Minha Casa Minha Vida
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Taxa subsidiada de 5% a.a. (verifique elegibilidade)
              </p>
            </div>
            <Switch
              id="usar-mcmv"
              checked={usarMCMV}
              onCheckedChange={setUsarMCMV}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-8 w-8 animate-spin mx-auto mb-2" />
            Calculando...
          </div>
        )}

        {simulacao && !loading && (
          <>
            {/* Badge do tipo de financiamento */}
            <div className="flex items-center justify-between">
              <Badge variant={usarMCMV ? "default" : "outline"} className="text-sm">
                {simulacao.tipoFinanciamento}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {percentualEntrada}% de entrada
              </span>
            </div>

            {/* Parcela Principal */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Parcela Mensal (1ª)</p>
              <p className="text-4xl font-bold text-primary mb-4">
                {formatarMoedaSimples(simulacao.price.primeiraParcela.parcelaTotal)}
              </p>
              
              {/* Breakdown da parcela */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amortização + Juros</span>
                  <span className="font-medium">{formatarMoeda(simulacao.price.primeiraParcela.parcelaBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Seguros (MIP + DFI)
                  </span>
                  <span className="font-medium">
                    {formatarMoeda(simulacao.price.primeiraParcela.mipMensal + simulacao.price.primeiraParcela.dfiMensal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa Administrativa</span>
                  <span className="font-medium">{formatarMoeda(simulacao.price.primeiraParcela.tarifaAdministracao)}</span>
                </div>
              </div>
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="CET Anual"
                value={`${(simulacao.cetAnual ?? 0).toFixed(2)}%`}
                subtitle={`Taxa nominal: ${(simulacao.taxaNominalAnual ?? 0).toFixed(2)}%`}
                icon={TrendingUp}
                variant="primary"
                tooltip="Custo Efetivo Total incluindo todos os encargos"
              />
              <MetricCard
                label="Renda Mínima"
                value={formatarMoedaSimples(simulacao.viabilidade.rendaMinimaPrice)}
                subtitle="Regra dos 30%"
                icon={DollarSign}
                variant={simulacao.viabilidade.aprovaAutomatica ? "success" : "warning"}
                tooltip="Renda familiar necessária (parcela não pode exceder 30% da renda)"
              />
            </div>

            {/* Totais */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Total a Pagar"
                value={formatarMoedaSimples(simulacao.price.totalPago)}
                icon={FileText}
              />
              <MetricCard
                label="Total em Juros"
                value={formatarMoedaSimples(simulacao.price.totalJuros)}
                subtitle={`${((simulacao.price.totalJuros / (simulacao.valorFinanciado || 1)) * 100).toFixed(0)}% do financiado`}
                icon={TrendingUp}
                variant="warning"
              />
            </div>

            {/* Custos Iniciais */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Custos Iniciais (Antes da 1ª Parcela)</h4>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarifa de Cadastro</span>
                  <span>{formatarMoeda(simulacao.custosIniciais.tarifaCadastro)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avaliação do Imóvel</span>
                  <span>{formatarMoeda(simulacao.custosIniciais.avaliacaoImovel)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registro de Contrato</span>
                  <span>{formatarMoeda(simulacao.custosIniciais.registroContrato)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ITBI</span>
                  <span>{formatarMoeda(simulacao.custosIniciais.itbi)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>TOTAL INICIAL</span>
                  <span>{formatarMoeda(simulacao.custosIniciais.total)}</span>
                </div>
              </div>
            </div>

            {/* Observações de Viabilidade */}
            {simulacao.viabilidade.observacoes.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-semibold mb-2 text-amber-700">⚠️ Observações</p>
                <ul className="space-y-1 text-sm text-amber-700">
                  {simulacao.viabilidade.observacoes.map((obs, idx) => (
                    <li key={idx}>• {obs}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Destaque do benefício MCMV */}
            {usarMCMV && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm font-semibold mb-1 text-emerald-700">✅ Economia com MCMV</p>
                <p className="text-sm text-emerald-700">
                  Você está economizando com a taxa subsidiada de 5% a.a. ao invés de 10,49% do SBPE!
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
