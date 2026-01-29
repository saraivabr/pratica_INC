"use client"

import { use, useState, useMemo, useEffect } from "react"
import { notFound, useSearchParams, useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { AppShell } from "@/components/app-shell"
import { type CondicaoPagamento, type Unidade } from "@/lib/data"
import { useEmpreendimento, useUnidades, useSeries } from "@/lib/hooks"
import { usePageTracking } from "@/lib/auth-context"
import { EmpreendimentoSkeleton } from "@/components/empreendimento-skeleton"
import { EmpreendimentoContent } from "@/components/empreendimento"

interface EmpreendimentoPageProps {
  params: Promise<{ id: string }>
}

export default function EmpreendimentoPage({ params }: EmpreendimentoPageProps) {
  const { id } = use(params)
  const { empreendimento, loading } = useEmpreendimento(id)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  usePageTracking(`empreendimento-${id}`)
  const { unidades, loading: loadingUnidades, error: errorUnidades, refetch: refetchUnidades } = useUnidades(id)
  const { series } = useSeries(id)
  
  // Tab state synced with URL
  const [activeTab, setActiveTab] = useState("visao-geral")

  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab) {
      // Map old tab names to new ones if necessary
      const mapTabs: Record<string, string> = {
        "sobre": "visao-geral",
        "espelho": "espelho",
        "unidades": "lista",
        "simular": "simulacao"
      }
      const target = mapTabs[tab] || tab
      // Avoid sync setState warning
      requestAnimationFrame(() => setActiveTab(target))
    }
  }, [searchParams])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams?.toString())
    params.set("tab", tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [simulacaoData, setSimulacaoData] = useState<{
    valorImovel: number;
    entrada: number;
    percentualEntrada: number;
    valorFinanciado: number;
    prazoMeses: number;
    taxaAnual: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
  } | undefined>(undefined)

  const [selectedUnit, setSelectedUnit] = useState<{
    numero: string;
    tipo: string;
  } | undefined>(undefined)

  // Computar unidades reais primeiro para usar em handleSimular
  const unidadesReais: Unidade[] = useMemo(() => {
    if (unidades.length > 0) return unidades
    return empreendimento?.unidades ?? []
  }, [unidades, empreendimento?.unidades])

  const handleSimular = (valor: number, unitId?: string) => {
    // Se tiver unitId, encontrar a unidade
    if (unitId) {
      const unit = unidadesReais.find(u => u.id === unitId)
      if (unit) {
        setSelectedUnit({
          numero: `${unit.andar || ''}${unit.final || ''}`.trim() || unit.id,
          tipo: unit.tipo,
        })
      }
    }

    handleTabChange("simulacao")
    setTimeout(() => {
      const element = document.getElementById("calculadora-financeira")
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }, 100)
  }

  if (loading) {
    return <EmpreendimentoSkeleton />
  }

  if (!empreendimento) {
    notFound()
  }

  const precoMinimo = empreendimento.precoMinimo ?? 0
  const precoMaximo = empreendimento.precoMaximo ?? 0
  const hasPrice = precoMinimo > 0

  // Mapear séries reais para o formato de condições de pagamento
  const condicoesExibicao: CondicaoPagamento[] = series.length > 0 && hasPrice
    ? series.map((s: any) => {
      const percentualEntrada = Number(s.percentual_entrada) || 20;
      const qtdParcelas = Number(s.qtd_parcelas_mensais) || 12;

      const valorEntrada = precoMinimo * (percentualEntrada / 100);
      const valorFinanciar = precoMinimo - valorEntrada;
      const valorParcela = valorFinanciar / qtdParcelas;

      return {
        id: String(s.id || s.idoperacao),
        nome: s.nome || s.descricao || `Plano em ${qtdParcelas}x`,
        entrada: percentualEntrada,
        parcelas: qtdParcelas,
        valorParcela: valorParcela,
        financiamento: 100 - percentualEntrada
      };
    })
    : empreendimento.condicoes ?? []

  // Calcular estatísticas das unidades
  const unidadeStats = {
    total: unidadesReais.length,
    disponiveis: unidadesReais.filter((u) => u.status === "disponivel").length,
    vendidos: unidadesReais.filter((u) => u.status === "vendido").length,
    reservados: unidadesReais.filter((u) => u.status === "reservado").length,
  }

  if (errorUnidades) {
    return (
      <AppShell showBackButton backHref="/empreendimentos">
        <div className="p-8 flex justify-center">
           <Card className="border-destructive/50 bg-destructive/5 max-w-md w-full">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <p className="text-sm text-destructive font-medium">
                    {errorUnidades instanceof Error ? errorUnidades.message : String(errorUnidades)}
                  </p>
                  <button
                    onClick={() => refetchUnidades()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              </CardContent>
            </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell showBackButton backHref="/empreendimentos">
      <div className="animate-page-in">
         <EmpreendimentoContent 
            empreendimento={empreendimento}
            unidades={unidadesReais}
            series={series}
            unidadeStats={unidadeStats}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onSimular={handleSimular}
            simulacaoData={simulacaoData}
            condicoesExibicao={condicoesExibicao}
            precoMinimo={precoMinimo}
            precoMaximo={precoMaximo}
         />
      </div>
    </AppShell>
  )
}
