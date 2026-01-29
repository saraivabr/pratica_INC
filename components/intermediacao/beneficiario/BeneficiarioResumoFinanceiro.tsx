"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { SaldoBeneficiario } from "../types"
import { formatarMoeda } from "./utils"

interface BeneficiarioResumoFinanceiroProps {
  beneficiarioId: string
  periodo?: { inicio: Date; fim: Date }
  fetchSaldo?: (
    id: string,
    periodo?: { inicio: Date; fim: Date }
  ) => Promise<SaldoBeneficiario>
  saldo?: SaldoBeneficiario // Dados estaticos (alternativa ao fetch)
}

interface ResumoCardProps {
  titulo: string
  valor: number
  subtitulo: string
  icon: React.ReactNode
  cor: "red" | "amber" | "emerald" | "blue"
  loading?: boolean
}

function ResumoCard({
  titulo,
  valor,
  subtitulo,
  icon,
  cor,
  loading,
}: ResumoCardProps) {
  const cores = {
    red: {
      bg: "bg-red-50 dark:bg-red-950/20",
      icon: "text-red-600",
      valor: "text-red-600",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      icon: "text-amber-600",
      valor: "text-amber-600",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      icon: "text-emerald-600",
      valor: "text-emerald-600",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/20",
      icon: "text-blue-600",
      valor: "text-blue-600",
    },
  }

  const corConfig = cores[cor]

  return (
    <Card className={cn("relative overflow-hidden", corConfig.bg)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {titulo}
          </CardTitle>
          <div className={corConfig.icon}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="mb-1 h-8 w-24" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <p className={cn("text-2xl font-bold", corConfig.valor)}>
              {formatarMoeda(valor)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function BeneficiarioResumoFinanceiro({
  beneficiarioId,
  periodo,
  fetchSaldo,
  saldo: staticSaldo,
}: BeneficiarioResumoFinanceiroProps) {
  const [saldo, setSaldo] = useState<SaldoBeneficiario | null>(
    staticSaldo || null
  )
  const [loading, setLoading] = useState(!staticSaldo)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Se tem dados estaticos, usa eles
    if (staticSaldo) {
      setSaldo(staticSaldo)
      setLoading(false)
      return
    }

    // Se nao tem funcao de fetch, nao faz nada
    if (!fetchSaldo) {
      setLoading(false)
      return
    }

    const loadSaldo = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchSaldo(beneficiarioId, periodo)
        setSaldo(result)
      } catch (err) {
        console.error("Erro ao carregar saldo:", err)
        setError("Erro ao carregar dados financeiros")
      } finally {
        setLoading(false)
      }
    }

    loadSaldo()
  }, [beneficiarioId, periodo, fetchSaldo, staticSaldo])

  // Atualiza quando saldo estatico muda
  useEffect(() => {
    if (staticSaldo) {
      setSaldo(staticSaldo)
    }
  }, [staticSaldo])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  const totalGeral = saldo
    ? saldo.aReceber + saldo.pendente + saldo.pago
    : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ResumoCard
          titulo="A Receber"
          valor={saldo?.aReceber || 0}
          subtitulo="Vencidas"
          icon={<AlertTriangle className="h-5 w-5" />}
          cor="red"
          loading={loading}
        />
        <ResumoCard
          titulo="Pendente"
          valor={saldo?.pendente || 0}
          subtitulo="Futuras"
          icon={<Clock className="h-5 w-5" />}
          cor="amber"
          loading={loading}
        />
        <ResumoCard
          titulo="Pago"
          valor={saldo?.pago || 0}
          subtitulo="Historico"
          icon={<CheckCircle className="h-5 w-5" />}
          cor="emerald"
          loading={loading}
        />
      </div>

      {/* Card de total geral */}
      {!loading && saldo && totalGeral > 0 && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Comissoes
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatarMoeda(totalGeral)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {saldo.pago > 0 && (
                  <span className="text-emerald-600">
                    {((saldo.pago / totalGeral) * 100).toFixed(0)}% quitado
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
