"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ChevronDown, FileText, X, Check, Calendar, Wallet, Home, User, Share2, Copy, ArrowRight, CircleDollarSign, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PlanoPagamentoTable } from "@/components/reserva/plano-pagamento"
import { ClienteForm } from "@/components/reserva/cliente-form"
import { Cliente, PlanoPagamento, PreReserva } from "@/types/pagamento"

// Interface para unidade vinda do banco
interface UnidadeDB {
  id: string
  empreendimentoId: string
  empreendimentoNome: string
  numero: string
  unidade: string
  area: number
  area_m2: number
  dormitorios: number
  tipologia: string
  valorTotal: number
  status: string
  plano: {
    ato: { valor: number; vencimento: string }
    mensais: { quantidade: number; valor: number; primeiroVencimento: string }
    financiamento: { valor: number; vencimento: string }
  } | null
}

type ModalStep = "detalhes" | "fluxo" | "cliente" | "confirmacao"

export default function EspelhoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [unidades, setUnidades] = useState<UnidadeDB[]>([])
  const [empreendimentoNome, setEmpreendimentoNome] = useState("Station Park Apartamentos")
  const [loading, setLoading] = useState(true)
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeDB | null>(null)
  const [modalStep, setModalStep] = useState<ModalStep>("detalhes")
  const [submitting, setSubmitting] = useState(false)
  const [preReserva, setPreReserva] = useState<PreReserva | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)

  // Fetch unidades from API
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/unidades?empreendimentoId=station-park")
        if (res.ok) {
          const data = await res.json()
          setUnidades(data)
          if (data.length > 0) {
            setEmpreendimentoNome(data[0].empreendimentoNome)
          }
        }
      } catch (error) {
        console.error("Erro ao buscar unidades:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  // Agrupar unidades por andar
  const unidadesPorAndar: Record<number, UnidadeDB[]> = {}
  unidades.forEach(u => {
    const andar = parseInt(u.numero.slice(0, -2)) || parseInt(u.numero.slice(0, -1))
    if (!unidadesPorAndar[andar]) unidadesPorAndar[andar] = []
    unidadesPorAndar[andar].push(u)
  })

  const andares = Object.keys(unidadesPorAndar).map(Number).sort((a, b) => a - b)

  const stats = {
    total: unidades.length,
    disponiveis: unidades.filter(u => u.status === "disponivel").length,
    vgv: unidades.reduce((sum, u) => sum + u.valorTotal, 0)
  }

  const handleUnidadeClick = (unidade: UnidadeDB) => {
    setSelectedUnidade(unidade)
    setModalStep("detalhes")
    setPreReserva(null)
    setCliente(null)
  }

  const handleCloseModal = () => {
    setSelectedUnidade(null)
    setModalStep("detalhes")
  }

  // Criar plano de pagamento a partir da unidade
  const criarPlanoFromUnidade = (unidade: UnidadeDB): PlanoPagamento | null => {
    if (!unidade.plano) return null

    const valorTotal = unidade.valorTotal
    const valorAto = unidade.plano.ato.valor
    const valorMensal = unidade.plano.mensais.valor
    const qtdMensais = unidade.plano.mensais.quantidade
    const valorFinanciamento = unidade.plano.financiamento.valor

    return {
      valorTotal,
      percentualAto: (valorAto / valorTotal) * 100,
      percentualMensais: ((valorMensal * qtdMensais) / valorTotal) * 100,
      percentualFinanciamento: (valorFinanciamento / valorTotal) * 100,
      quantidadeMensais: qtdMensais,
      ato: {
        tipo: "ato",
        numero: 1,
        valor: valorAto,
        vencimento: unidade.plano.ato.vencimento,
        status: "pendente"
      },
      mensais: Array.from({ length: qtdMensais }, (_, i) => {
        const data = new Date(unidade.plano!.mensais.primeiroVencimento)
        data.setMonth(data.getMonth() + i)
        return {
          tipo: "mensal" as const,
          numero: i + 1,
          valor: valorMensal,
          vencimento: data.toISOString().split("T")[0],
          status: "pendente" as const
        }
      }),
      financiamento: {
        tipo: "financiamento",
        numero: 1,
        valor: valorFinanciamento,
        vencimento: unidade.plano.financiamento.vencimento,
        status: "pendente"
      }
    }
  }

  const handleClienteSubmit = async (dadosCliente: Cliente) => {
    if (!selectedUnidade || !session?.user) return

    setSubmitting(true)
    setCliente(dadosCliente)

    const plano = criarPlanoFromUnidade(selectedUnidade)

    try {
      const response = await fetch("/api/pre-reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretorId: session.user.id,
          corretorNome: session.user.name,
          empreendimentoId: "station-park",
          empreendimentoNome: empreendimentoNome,
          unidade: selectedUnidade.numero,
          tipologia: {
            area_m2: selectedUnidade.area,
            dormitorios: selectedUnidade.dormitorios,
            descricao: selectedUnidade.tipologia
          },
          cliente: dadosCliente,
          plano
        })
      })

      if (!response.ok) throw new Error("Erro ao criar pré-reserva")

      const data = await response.json()
      setPreReserva(data.preReserva)
      setModalStep("confirmacao")

      // Atualizar lista de unidades
      setUnidades(prev => prev.map(u =>
        u.id === selectedUnidade.id ? { ...u, status: "reservado" } : u
      ))
    } catch (error) {
      console.error("Erro:", error)
      alert("Erro ao criar pré-reserva. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const planoAtual = selectedUnidade ? criarPlanoFromUnidade(selectedUnidade) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
          <p className="text-[15px] text-[#86868b]">Carregando espelho...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="px-5 pt-14 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                Espelho de Vendas
              </h1>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                {empreendimentoNome}
              </p>
            </div>
            <button
              onClick={() => router.push("/pre-reservas")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3]/10 rounded-full hover:bg-[#0071e3]/20 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[#0071e3]" />
              <span className="text-[11px] font-semibold text-[#0071e3]">
                Pré-Reservas
              </span>
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-xl p-4 border border-[#e8e8ed]">
            <p className="text-[11px] text-[#86868b] font-medium mb-1">Tabela Vigente - JAN/2025</p>
            <p className="text-[15px] font-semibold text-[#1d1d1f]">{empreendimentoNome}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[12px] text-[#86868b]">
                <span className="text-[#34c759] font-semibold">{stats.disponiveis}</span> disponíveis
              </span>
              <span className="text-[12px] text-[#86868b]">
                VGV: <span className="text-[#0071e3] font-semibold">{formatCurrency(stats.vgv)}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 py-5 pb-28">
        {/* Legenda */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#34c759]" />
            <span className="text-[11px] text-[#86868b]">Disponível</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#ff9500]" />
            <span className="text-[11px] text-[#86868b]">Reservado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#ff3b30]" />
            <span className="text-[11px] text-[#86868b]">Vendido</span>
          </div>
        </div>

        {/* Grid de Unidades */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f5f5f7]">
            <p className="text-[13px] font-semibold text-[#1d1d1f]">Unidades Disponíveis</p>
            <p className="text-[11px] text-[#86868b]">Clique para ver detalhes e pré-reservar</p>
          </div>

          <div className="p-4 space-y-3">
            {andares.map(andar => (
              <div key={andar} className="flex items-center gap-2">
                <div className="w-10 text-right">
                  <span className="text-[11px] text-[#86868b] font-medium">{andar}º</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {unidadesPorAndar[andar]
                    .sort((a, b) => a.numero.localeCompare(b.numero))
                    .map(unidade => {
                      const statusColor = {
                        disponivel: "bg-[#34c759] hover:bg-[#2db550]",
                        reservado: "bg-[#ff9500]",
                        vendido: "bg-[#ff3b30]"
                      }[unidade.status] || "bg-[#34c759] hover:bg-[#2db550]"

                      return (
                        <button
                          key={unidade.id}
                          onClick={() => handleUnidadeClick(unidade)}
                          disabled={unidade.status !== "disponivel"}
                          className={cn(
                            "min-w-[72px] h-14 rounded-xl text-white font-medium transition-all px-2",
                            statusColor,
                            unidade.status === "disponivel" && "active:scale-95",
                            unidade.status !== "disponivel" && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <span className="text-[13px] font-semibold block">{unidade.numero}</span>
                          <span className="text-[9px] block opacity-90">{unidade.area}m²</span>
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista Detalhada */}
        <div className="mt-5 space-y-3">
          <p className="text-[13px] font-semibold text-[#1d1d1f] px-1">Lista de Unidades</p>
          {unidades
            .filter(u => u.status === "disponivel")
            .sort((a, b) => a.valorTotal - b.valorTotal)
            .map(unidade => (
              <button
                key={unidade.id}
                onClick={() => handleUnidadeClick(unidade)}
                className="w-full bg-white rounded-xl border border-[#e8e8ed] p-4 text-left transition-all hover:border-[#0071e3]/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1d1d1f]">
                      Unidade {unidade.numero}
                    </p>
                    <p className="text-[12px] text-[#86868b]">
                      {unidade.area}m² | {unidade.tipologia}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[17px] font-bold text-[#0071e3]">
                      {formatCurrency(unidade.valorTotal)}
                    </p>
                    {unidade.plano && (
                      <p className="text-[11px] text-[#86868b]">
                        ATO {formatCurrency(unidade.plano.ato.valor)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </main>

      {/* Modal/Sheet Bottom */}
      {selectedUnidade && selectedUnidade.plano && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Handle */}
            <div className="sticky top-0 bg-white pt-3 pb-2 px-5 border-b border-[#f5f5f7] z-10">
              <div className="w-10 h-1 bg-[#d2d2d7] rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
                    {modalStep === "confirmacao" ? "Pré-Reserva Confirmada" : `Unidade ${selectedUnidade.numero}`}
                  </h2>
                  <p className="text-[13px] text-[#86868b]">
                    {modalStep === "detalhes" && `${selectedUnidade.area}m² | ${selectedUnidade.tipologia}`}
                    {modalStep === "fluxo" && "Cronograma de pagamentos"}
                    {modalStep === "cliente" && "Dados do cliente"}
                    {modalStep === "confirmacao" && `ID: ${preReserva?.id.slice(0, 8).toUpperCase()}`}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-[#86868b]" />
                </button>
              </div>
            </div>

            <div className="p-5 pb-10">
              {/* Step: Detalhes */}
              {modalStep === "detalhes" && planoAtual && (
                <>
                  {/* Valor Total */}
                  <div className="bg-[#0071e3]/5 rounded-2xl p-5 mb-5">
                    <p className="text-[11px] text-[#0071e3] font-medium mb-1">VALOR TOTAL</p>
                    <p className="text-[32px] font-bold text-[#0071e3]">
                      {formatCurrency(selectedUnidade.valorTotal)}
                    </p>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-[#f5f5f7] rounded-xl p-4">
                      <Home className="w-5 h-5 text-[#86868b] mb-2" />
                      <p className="text-[11px] text-[#86868b] font-medium">Área</p>
                      <p className="text-[17px] font-semibold text-[#1d1d1f]">{selectedUnidade.area}m²</p>
                    </div>
                    <div className="bg-[#f5f5f7] rounded-xl p-4">
                      <Wallet className="w-5 h-5 text-[#86868b] mb-2" />
                      <p className="text-[11px] text-[#86868b] font-medium">Tipologia</p>
                      <p className="text-[17px] font-semibold text-[#1d1d1f]">{selectedUnidade.dormitorios} Dorm</p>
                    </div>
                  </div>

                  {/* Plano de Pagamento */}
                  <div className="mb-5">
                    <p className="text-[13px] font-semibold text-[#1d1d1f] mb-3">Plano de Pagamento</p>
                    <div className="space-y-2">
                      {/* ATO */}
                      <div className="bg-white border border-[#e8e8ed] rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-[#1d1d1f]">ATO (1x)</p>
                          <p className="text-[11px] text-[#86868b] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(selectedUnidade.plano.ato.vencimento)}
                          </p>
                        </div>
                        <p className="text-[17px] font-bold text-[#1d1d1f]">
                          {formatCurrency(selectedUnidade.plano.ato.valor)}
                        </p>
                      </div>

                      {/* MENSAIS */}
                      <div className="bg-white border border-[#e8e8ed] rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-[#1d1d1f]">
                            MENSAIS ({selectedUnidade.plano.mensais.quantidade}x)
                          </p>
                          <p className="text-[11px] text-[#86868b] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            A partir de {formatDate(selectedUnidade.plano.mensais.primeiroVencimento)}
                          </p>
                        </div>
                        <p className="text-[17px] font-bold text-[#1d1d1f]">
                          {formatCurrency(selectedUnidade.plano.mensais.valor)}
                        </p>
                      </div>

                      {/* FINANCIAMENTO */}
                      <div className="bg-white border border-[#e8e8ed] rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-[#1d1d1f]">FINANCIAMENTO (1x)</p>
                          <p className="text-[11px] text-[#86868b] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(selectedUnidade.plano.financiamento.vencimento)}
                          </p>
                        </div>
                        <p className="text-[17px] font-bold text-[#1d1d1f]">
                          {formatCurrency(selectedUnidade.plano.financiamento.valor)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setModalStep("fluxo")}
                      className="w-full h-14 bg-[#34c759] hover:bg-[#2db550] text-white text-[17px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CircleDollarSign className="w-5 h-5" />
                      Criar Fluxo de Pagamento
                    </button>

                    <button
                      onClick={() => setModalStep("cliente")}
                      className="w-full h-14 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Pré-Reservar Esta Unidade
                    </button>
                  </div>
                </>
              )}

              {/* Step: Fluxo de Pagamento */}
              {modalStep === "fluxo" && planoAtual && selectedUnidade.plano && (
                <>
                  {/* Header do Fluxo */}
                  <div className="bg-gradient-to-br from-[#34c759] to-[#30b350] rounded-2xl p-5 mb-5 text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <CircleDollarSign className="w-8 h-8" />
                      <div>
                        <p className="text-[11px] opacity-80 font-medium">FLUXO DE PAGAMENTO</p>
                        <p className="text-[20px] font-bold">{formatCurrency(selectedUnidade.valorTotal)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[13px] opacity-90">
                      <span>Unidade {selectedUnidade.numero}</span>
                      <span>{selectedUnidade.area}m² | {selectedUnidade.dormitorios} dorm</span>
                    </div>
                  </div>

                  {/* Timeline de Pagamentos */}
                  <div className="mb-5">
                    <p className="text-[13px] font-semibold text-[#1d1d1f] mb-4">Cronograma de Pagamentos</p>

                    <div className="relative">
                      {/* Linha vertical */}
                      <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-[#e8e8ed]" />

                      {/* ATO */}
                      <div className="relative flex gap-4 mb-4">
                        <div className="w-9 h-9 rounded-full bg-[#0071e3] flex items-center justify-center flex-shrink-0 z-10">
                          <span className="text-[11px] font-bold text-white">1</span>
                        </div>
                        <div className="flex-1 bg-white border border-[#e8e8ed] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-[#0071e3]">ATO (SINAL)</span>
                            <span className="text-[15px] font-bold text-[#1d1d1f]">{formatCurrency(selectedUnidade.plano.ato.valor)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[12px] text-[#86868b]">
                            <Calendar className="w-3 h-3" />
                            {formatDate(selectedUnidade.plano.ato.vencimento)}
                          </div>
                          <p className="text-[11px] text-[#86868b] mt-1">Na assinatura do contrato</p>
                        </div>
                      </div>

                      {/* MENSAIS */}
                      {Array.from({ length: selectedUnidade.plano.mensais.quantidade }).map((_, i) => {
                        const data = new Date(selectedUnidade.plano!.mensais.primeiroVencimento)
                        data.setMonth(data.getMonth() + i)
                        return (
                          <div key={i} className="relative flex gap-4 mb-4">
                            <div className="w-9 h-9 rounded-full bg-[#ff9500] flex items-center justify-center flex-shrink-0 z-10">
                              <span className="text-[11px] font-bold text-white">{i + 2}</span>
                            </div>
                            <div className="flex-1 bg-white border border-[#e8e8ed] rounded-xl p-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold text-[#ff9500]">MENSAL {i + 1}/{selectedUnidade.plano!.mensais.quantidade}</span>
                                <span className="text-[15px] font-bold text-[#1d1d1f]">{formatCurrency(selectedUnidade.plano!.mensais.valor)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[12px] text-[#86868b]">
                                <Calendar className="w-3 h-3" />
                                {formatDate(data.toISOString().split("T")[0])}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* FINANCIAMENTO */}
                      <div className="relative flex gap-4">
                        <div className="w-9 h-9 rounded-full bg-[#5856d6] flex items-center justify-center flex-shrink-0 z-10">
                          <span className="text-[11px] font-bold text-white">{selectedUnidade.plano.mensais.quantidade + 2}</span>
                        </div>
                        <div className="flex-1 bg-white border border-[#e8e8ed] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-[#5856d6]">FINANCIAMENTO</span>
                            <span className="text-[15px] font-bold text-[#1d1d1f]">{formatCurrency(selectedUnidade.plano.financiamento.valor)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[12px] text-[#86868b]">
                            <Calendar className="w-3 h-3" />
                            {formatDate(selectedUnidade.plano.financiamento.vencimento)}
                          </div>
                          <p className="text-[11px] text-[#86868b] mt-1">Saldo via banco (FGTS/Caixa/BB)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumo */}
                  <div className="bg-[#f5f5f7] rounded-xl p-4 mb-5">
                    <p className="text-[11px] font-semibold text-[#86868b] mb-2">RESUMO DO INVESTIMENTO</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#1d1d1f]">ATO (1x)</span>
                        <span className="font-semibold">{formatCurrency(selectedUnidade.plano.ato.valor)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#1d1d1f]">Mensais ({selectedUnidade.plano.mensais.quantidade}x)</span>
                        <span className="font-semibold">{formatCurrency(selectedUnidade.plano.mensais.valor * selectedUnidade.plano.mensais.quantidade)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#1d1d1f]">Financiamento (1x)</span>
                        <span className="font-semibold">{formatCurrency(selectedUnidade.plano.financiamento.valor)}</span>
                      </div>
                      <div className="border-t border-[#d2d2d7] pt-2 mt-2">
                        <div className="flex justify-between text-[15px]">
                          <span className="font-semibold text-[#1d1d1f]">TOTAL</span>
                          <span className="font-bold text-[#0071e3]">{formatCurrency(selectedUnidade.valorTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const mensaisText = Array.from({ length: selectedUnidade.plano!.mensais.quantidade }).map((_, i) => {
                          const data = new Date(selectedUnidade.plano!.mensais.primeiroVencimento)
                          data.setMonth(data.getMonth() + i)
                          return `${i + 1}ª Mensal: ${formatCurrency(selectedUnidade.plano!.mensais.valor)} - ${formatDate(data.toISOString().split("T")[0])}`
                        }).join("\n")

                        const msg = `*FLUXO DE PAGAMENTO*\n\n*${empreendimentoNome}*\nUnidade ${selectedUnidade.numero} | ${selectedUnidade.area}m² | ${selectedUnidade.dormitorios} dorm\n\n*VALOR TOTAL: ${formatCurrency(selectedUnidade.valorTotal)}*\n\n📅 *CRONOGRAMA:*\n\n*ATO (Sinal):*\n${formatCurrency(selectedUnidade.plano!.ato.valor)} - ${formatDate(selectedUnidade.plano!.ato.vencimento)}\n\n*MENSAIS:*\n${mensaisText}\n\n*FINANCIAMENTO:*\n${formatCurrency(selectedUnidade.plano!.financiamento.valor)} - ${formatDate(selectedUnidade.plano!.financiamento.vencimento)}\n\n_Corretor: ${session?.user?.name}_`
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
                      }}
                      className="w-full h-12 bg-[#25D366] hover:bg-[#20BD5A] text-white text-[15px] font-medium rounded-xl flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Compartilhar via WhatsApp
                    </button>

                    <button
                      onClick={() => {
                        const mensaisText = Array.from({ length: selectedUnidade.plano!.mensais.quantidade }).map((_, i) => {
                          const data = new Date(selectedUnidade.plano!.mensais.primeiroVencimento)
                          data.setMonth(data.getMonth() + i)
                          return `${i + 1}ª Mensal: ${formatCurrency(selectedUnidade.plano!.mensais.valor)} - ${formatDate(data.toISOString().split("T")[0])}`
                        }).join("\n")

                        const text = `FLUXO DE PAGAMENTO\n\n${empreendimentoNome}\nUnidade ${selectedUnidade.numero} | ${selectedUnidade.area}m² | ${selectedUnidade.dormitorios} dorm\n\nVALOR TOTAL: ${formatCurrency(selectedUnidade.valorTotal)}\n\nCRONOGRAMA:\n\nATO (Sinal):\n${formatCurrency(selectedUnidade.plano!.ato.valor)} - ${formatDate(selectedUnidade.plano!.ato.vencimento)}\n\nMENSAIS:\n${mensaisText}\n\nFINANCIAMENTO:\n${formatCurrency(selectedUnidade.plano!.financiamento.valor)} - ${formatDate(selectedUnidade.plano!.financiamento.vencimento)}\n\nCorretor: ${session?.user?.name}`
                        navigator.clipboard.writeText(text)
                        alert("Fluxo copiado para área de transferência!")
                      }}
                      className="w-full h-12 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[15px] font-medium rounded-xl flex items-center justify-center gap-2"
                    >
                      <Copy className="w-5 h-5" />
                      Copiar Fluxo
                    </button>

                    <button
                      onClick={() => setModalStep("cliente")}
                      className="w-full h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium rounded-xl flex items-center justify-center gap-2"
                    >
                      Continuar para Pré-Reserva
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => setModalStep("detalhes")}
                      className="w-full h-10 text-[#0071e3] text-[15px] font-medium"
                    >
                      Voltar
                    </button>
                  </div>
                </>
              )}

              {/* Step: Cliente */}
              {modalStep === "cliente" && planoAtual && selectedUnidade.plano && (
                <>
                  {/* Resumo Compacto */}
                  <div className="bg-[#f5f5f7] rounded-xl p-4 mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">
                        Unidade {selectedUnidade.numero}
                      </p>
                      <p className="text-[12px] text-[#86868b]">
                        {selectedUnidade.area}m² | {selectedUnidade.tipologia}
                      </p>
                    </div>
                    <p className="text-[17px] font-bold text-[#0071e3]">
                      {formatCurrency(selectedUnidade.valorTotal)}
                    </p>
                  </div>

                  {/* Plano Resumido */}
                  <div className="bg-white border border-[#e8e8ed] rounded-xl p-4 mb-5">
                    <p className="text-[11px] text-[#86868b] font-medium mb-2">PLANO DE PAGAMENTO</p>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[#1d1d1f]">ATO</span>
                      <span className="font-semibold">{formatCurrency(selectedUnidade.plano.ato.valor)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] mt-1">
                      <span className="text-[#1d1d1f]">{selectedUnidade.plano.mensais.quantidade}x Mensais</span>
                      <span className="font-semibold">{formatCurrency(selectedUnidade.plano.mensais.valor)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] mt-1">
                      <span className="text-[#1d1d1f]">Financiamento</span>
                      <span className="font-semibold">{formatCurrency(selectedUnidade.plano.financiamento.valor)}</span>
                    </div>
                  </div>

                  {/* Formulário */}
                  <ClienteForm onSubmit={handleClienteSubmit} loading={submitting} />

                  {/* Voltar */}
                  <button
                    onClick={() => setModalStep("detalhes")}
                    className="w-full h-12 bg-[#f5f5f7] text-[#1d1d1f] text-[15px] font-medium rounded-xl mt-3"
                  >
                    Voltar
                  </button>
                </>
              )}

              {/* Step: Confirmação */}
              {modalStep === "confirmacao" && preReserva && planoAtual && selectedUnidade.plano && (
                <>
                  {/* Success Banner */}
                  <div className="bg-[#34c759]/10 rounded-2xl p-5 mb-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#34c759] flex items-center justify-center flex-shrink-0">
                      <Check className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Pré-Reserva Criada!</h3>
                      <p className="text-[13px] text-[#86868b]">
                        {empreendimentoNome} - Unidade {selectedUnidade.numero}
                      </p>
                    </div>
                  </div>

                  {/* Cliente Info */}
                  <div className="bg-white border border-[#e8e8ed] rounded-xl p-4 mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-[#0071e3]" />
                      <p className="text-[13px] font-semibold text-[#1d1d1f]">Cliente</p>
                    </div>
                    <p className="text-[17px] font-semibold text-[#1d1d1f]">{cliente?.nome}</p>
                    <p className="text-[13px] text-[#86868b] mt-1">
                      CPF: {cliente?.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                    </p>
                    <p className="text-[13px] text-[#86868b]">
                      WhatsApp: {cliente?.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                    </p>
                  </div>

                  {/* Plano */}
                  <PlanoPagamentoTable plano={planoAtual} />

                  {/* Actions */}
                  <div className="mt-5 space-y-3">
                    <button
                      onClick={() => {
                        const msg = `*PRÉ-RESERVA CONFIRMADA*\n\n*${empreendimentoNome}*\nUnidade: ${selectedUnidade.numero}\n${selectedUnidade.area}m² | ${selectedUnidade.tipologia}\n\n*Cliente:* ${cliente?.nome}\n\n*PLANO DE PAGAMENTO:*\n- ATO: ${formatCurrency(selectedUnidade.plano!.ato.valor)}\n- Mensais: ${selectedUnidade.plano!.mensais.quantidade}x ${formatCurrency(selectedUnidade.plano!.mensais.valor)}\n- Financiamento: ${formatCurrency(selectedUnidade.plano!.financiamento.valor)}\n\n*Total: ${formatCurrency(selectedUnidade.valorTotal)}*\n\nCorretor: ${session?.user?.name}`
                        window.open(`https://wa.me/55${cliente?.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank")
                      }}
                      className="w-full h-12 bg-[#25D366] hover:bg-[#20BD5A] text-white text-[15px] font-medium rounded-xl flex items-center justify-center gap-2"
                    >
                      Enviar para Cliente via WhatsApp
                    </button>

                    <button
                      onClick={() => router.push(`/pre-reservas/${preReserva.id}`)}
                      className="w-full h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium rounded-xl"
                    >
                      Ver Detalhes da Pré-Reserva
                    </button>

                    <button
                      onClick={handleCloseModal}
                      className="w-full h-12 bg-[#f5f5f7] text-[#1d1d1f] text-[15px] font-medium rounded-xl"
                    >
                      Voltar ao Espelho
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
