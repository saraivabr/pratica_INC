"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Circle,
  Download,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { MovimentacaoBeneficiario, TipoMovimentacao } from "../types"
import { formatarMoeda } from "./utils"

interface BeneficiarioExtratoProps {
  beneficiarioId: string
  periodo?: { inicio: Date; fim: Date }
  fetchMovimentacoes?: (
    id: string,
    periodo?: { inicio: Date; fim: Date },
    tipo?: TipoMovimentacao
  ) => Promise<MovimentacaoBeneficiario[]>
  movimentacoes?: MovimentacaoBeneficiario[] // Dados estaticos
  onExport?: (
    movimentacoes: MovimentacaoBeneficiario[],
    formato: "csv" | "pdf"
  ) => void
}

const tipoConfig: Record<
  TipoMovimentacao,
  {
    label: string
    cor: string
    icon: React.ReactNode
    badge: string
  }
> = {
  comissao_gerada: {
    label: "Comissao gerada",
    cor: "text-blue-600 bg-blue-50",
    icon: <Circle className="h-3 w-3 fill-blue-600 text-blue-600" />,
    badge: "bg-blue-100 text-blue-700",
  },
  parcela_paga: {
    label: "Parcela paga",
    cor: "text-emerald-600 bg-emerald-50",
    icon: <ArrowDownLeft className="h-3 w-3 text-emerald-600" />,
    badge: "bg-emerald-100 text-emerald-700",
  },
  parcela_vencida: {
    label: "Parcela vencida",
    cor: "text-red-600 bg-red-50",
    icon: <AlertCircle className="h-3 w-3 text-red-600" />,
    badge: "bg-red-100 text-red-700",
  },
  estorno: {
    label: "Estorno",
    cor: "text-amber-600 bg-amber-50",
    icon: <RefreshCw className="h-3 w-3 text-amber-600" />,
    badge: "bg-amber-100 text-amber-700",
  },
  ajuste: {
    label: "Ajuste",
    cor: "text-gray-600 bg-gray-50",
    icon: <ArrowUpRight className="h-3 w-3 text-gray-600" />,
    badge: "bg-gray-100 text-gray-700",
  },
}

const periodosPreset = [
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "90d", label: "Ultimos 90 dias" },
  { value: "12m", label: "Ultimos 12 meses" },
  { value: "all", label: "Todo o periodo" },
]

export function BeneficiarioExtrato({
  beneficiarioId,
  periodo,
  fetchMovimentacoes,
  movimentacoes: staticMovimentacoes,
  onExport,
}: BeneficiarioExtratoProps) {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoBeneficiario[]>(
    staticMovimentacoes || []
  )
  const [loading, setLoading] = useState(!staticMovimentacoes)
  const [error, setError] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimentacao | "all">("all")
  const [filtroPeriodo, setFiltroPeriodo] = useState("30d")

  // Carrega movimentacoes
  useEffect(() => {
    if (staticMovimentacoes) {
      setMovimentacoes(staticMovimentacoes)
      setLoading(false)
      return
    }

    if (!fetchMovimentacoes) {
      setLoading(false)
      return
    }

    const loadMovimentacoes = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchMovimentacoes(
          beneficiarioId,
          periodo,
          filtroTipo === "all" ? undefined : filtroTipo
        )
        setMovimentacoes(result)
      } catch (err) {
        console.error("Erro ao carregar movimentacoes:", err)
        setError("Erro ao carregar extrato")
      } finally {
        setLoading(false)
      }
    }

    loadMovimentacoes()
  }, [beneficiarioId, periodo, filtroTipo, fetchMovimentacoes, staticMovimentacoes])

  // Filtra movimentacoes
  const movimentacoesFiltradas = useMemo(() => {
    let filtered = [...movimentacoes]

    // Filtro por tipo
    if (filtroTipo !== "all") {
      filtered = filtered.filter((m) => m.tipo === filtroTipo)
    }

    // Filtro por periodo
    const agora = new Date()
    let dataLimite: Date | null = null

    switch (filtroPeriodo) {
      case "7d":
        dataLimite = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        dataLimite = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        dataLimite = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "12m":
        dataLimite = new Date(agora.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
    }

    if (dataLimite) {
      filtered = filtered.filter((m) => new Date(m.data) >= dataLimite!)
    }

    // Ordena por data (mais recente primeiro)
    return filtered.sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )
  }, [movimentacoes, filtroTipo, filtroPeriodo])

  // Calcula totais
  const totais = useMemo(() => {
    return movimentacoesFiltradas.reduce(
      (acc, m) => {
        if (m.tipo === "parcela_paga") {
          acc.entradas += m.valor
        } else if (m.tipo === "estorno") {
          acc.saidas += m.valor
        }
        return acc
      },
      { entradas: 0, saidas: 0 }
    )
  }, [movimentacoesFiltradas])

  const handleExport = (formato: "csv" | "pdf") => {
    if (onExport) {
      onExport(movimentacoesFiltradas, formato)
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Extrato de Movimentacoes
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por tipo */}
            <Select
              value={filtroTipo}
              onValueChange={(v) => setFiltroTipo(v as TipoMovimentacao | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(tipoConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por periodo */}
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                {periodosPreset.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botao de exportar */}
            {onExport && (
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : movimentacoesFiltradas.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhuma movimentacao encontrada no periodo selecionado
          </div>
        ) : (
          <>
            {/* Timeline de movimentacoes */}
            <div className="space-y-3">
              {movimentacoesFiltradas.map((movimentacao, index) => {
                const config = tipoConfig[movimentacao.tipo]
                const isPositive =
                  movimentacao.tipo === "parcela_paga" ||
                  movimentacao.tipo === "comissao_gerada"

                return (
                  <div
                    key={movimentacao.id}
                    className={cn(
                      "flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
                      index === 0 && "border-l-4 border-l-primary"
                    )}
                  >
                    {/* Data */}
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-sm font-semibold">
                        {format(new Date(movimentacao.data), "dd/MM", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(movimentacao.data), "yyyy")}
                      </p>
                    </div>

                    <Separator orientation="vertical" className="h-auto self-stretch" />

                    {/* Icone do tipo */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        config.cor
                      )}
                    >
                      {config.icon}
                    </div>

                    {/* Conteudo */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", config.badge)}>
                          {config.label}
                        </Badge>
                        {movimentacao.referencia && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {movimentacao.referencia}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {movimentacao.descricao}
                      </p>
                    </div>

                    {/* Valor */}
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-semibold",
                          isPositive ? "text-emerald-600" : "text-foreground"
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {formatarMoeda(movimentacao.valor)}
                      </p>
                      {movimentacao.saldoAcumulado !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Saldo: {formatarMoeda(movimentacao.saldoAcumulado)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totais */}
            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {movimentacoesFiltradas.length} movimentacao(oes)
                  </p>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Total de entradas
                    </p>
                    <p className="font-semibold text-emerald-600">
                      +{formatarMoeda(totais.entradas)}
                    </p>
                  </div>
                  {totais.saidas > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Total de saidas
                      </p>
                      <p className="font-semibold text-red-600">
                        -{formatarMoeda(totais.saidas)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
