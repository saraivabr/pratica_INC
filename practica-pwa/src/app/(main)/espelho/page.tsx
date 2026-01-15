"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ChevronDown, FileText, X, Check, Calendar, Wallet, Home, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { stationParkUnidades, stationParkInfo, criarPlanoFromUnidade, UnidadeStationPark } from "@/data/station-park"
import { PlanoPagamentoTable } from "@/components/reserva/plano-pagamento"
import { ClienteForm } from "@/components/reserva/cliente-form"
import { Cliente, PlanoPagamento, PreReserva } from "@/types/pagamento"

type ModalStep = "detalhes" | "cliente" | "confirmacao"

export default function EspelhoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeStationPark | null>(null)
  const [modalStep, setModalStep] = useState<ModalStep>("detalhes")
  const [loading, setLoading] = useState(false)
  const [preReserva, setPreReserva] = useState<PreReserva | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)

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
  const unidadesPorAndar: Record<number, UnidadeStationPark[]> = {}
  stationParkUnidades.forEach(u => {
    const andar = parseInt(u.unidade.slice(0, -2)) || parseInt(u.unidade.slice(0, -1))
    if (!unidadesPorAndar[andar]) unidadesPorAndar[andar] = []
    unidadesPorAndar[andar].push(u)
  })

  const andares = Object.keys(unidadesPorAndar).map(Number).sort((a, b) => b - a)

  const stats = {
    total: stationParkUnidades.length,
    disponiveis: stationParkUnidades.filter(u => u.status === "disponivel").length,
    vgv: stationParkUnidades.reduce((sum, u) => sum + u.valorTotal, 0)
  }

  const handleUnidadeClick = (unidade: UnidadeStationPark) => {
    setSelectedUnidade(unidade)
    setModalStep("detalhes")
    setPreReserva(null)
    setCliente(null)
  }

  const handleCloseModal = () => {
    setSelectedUnidade(null)
    setModalStep("detalhes")
  }

  const handleClienteSubmit = async (dadosCliente: Cliente) => {
    if (!selectedUnidade || !session?.user) return

    setLoading(true)
    setCliente(dadosCliente)

    const plano = criarPlanoFromUnidade(selectedUnidade)

    try {
      const response = await fetch("/api/pre-reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretorId: session.user.id,
          corretorNome: session.user.name,
          empreendimentoId: stationParkInfo.id,
          empreendimentoNome: stationParkInfo.nome,
          unidade: selectedUnidade.unidade,
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
    } catch (error) {
      console.error("Erro:", error)
      alert("Erro ao criar pré-reserva. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const planoAtual = selectedUnidade ? criarPlanoFromUnidade(selectedUnidade) : null

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
                {stationParkInfo.nome}
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
            <p className="text-[11px] text-[#86868b] font-medium mb-1">{stationParkInfo.tabelaVigente}</p>
            <p className="text-[15px] font-semibold text-[#1d1d1f]">{stationParkInfo.nome}</p>
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
                    .sort((a, b) => a.unidade.localeCompare(b.unidade))
                    .map(unidade => {
                      const statusColor = {
                        disponivel: "bg-[#34c759] hover:bg-[#2db550]",
                        reservado: "bg-[#ff9500]",
                        vendido: "bg-[#ff3b30]"
                      }[unidade.status]

                      return (
                        <button
                          key={unidade.id}
                          onClick={() => handleUnidadeClick(unidade)}
                          disabled={unidade.status !== "disponivel"}
                          className={cn(
                            "min-w-[70px] h-12 rounded-xl text-white font-medium transition-all",
                            statusColor,
                            unidade.status === "disponivel" && "active:scale-95",
                            unidade.status !== "disponivel" && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <span className="text-[13px] font-semibold">{unidade.unidade}</span>
                          <span className="text-[10px] block opacity-80">{unidade.dormitorios}D</span>
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
          {stationParkUnidades
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
                      Unidade {unidade.unidade}
                    </p>
                    <p className="text-[12px] text-[#86868b]">
                      {unidade.area}m² | {unidade.tipologia}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[17px] font-bold text-[#0071e3]">
                      {formatCurrency(unidade.valorTotal)}
                    </p>
                    <p className="text-[11px] text-[#86868b]">
                      ATO {formatCurrency(unidade.plano.ato.valor)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
        </div>
      </main>

      {/* Modal/Sheet Bottom */}
      {selectedUnidade && (
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
                    {modalStep === "confirmacao" ? "Pré-Reserva Confirmada" : `Unidade ${selectedUnidade.unidade}`}
                  </h2>
                  <p className="text-[13px] text-[#86868b]">
                    {modalStep === "detalhes" && `${selectedUnidade.area}m² | ${selectedUnidade.tipologia}`}
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

                  {/* Botão Pré-Reservar */}
                  <button
                    onClick={() => setModalStep("cliente")}
                    className="w-full h-14 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Pré-Reservar Esta Unidade
                  </button>
                </>
              )}

              {/* Step: Cliente */}
              {modalStep === "cliente" && planoAtual && (
                <>
                  {/* Resumo Compacto */}
                  <div className="bg-[#f5f5f7] rounded-xl p-4 mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">
                        Unidade {selectedUnidade.unidade}
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
                  <ClienteForm onSubmit={handleClienteSubmit} loading={loading} />

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
              {modalStep === "confirmacao" && preReserva && planoAtual && (
                <>
                  {/* Success Banner */}
                  <div className="bg-[#34c759]/10 rounded-2xl p-5 mb-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#34c759] flex items-center justify-center flex-shrink-0">
                      <Check className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Pré-Reserva Criada!</h3>
                      <p className="text-[13px] text-[#86868b]">
                        {stationParkInfo.nome} - Unidade {selectedUnidade.unidade}
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
                        const msg = `*PRÉ-RESERVA CONFIRMADA*\n\n*${stationParkInfo.nome}*\nUnidade: ${selectedUnidade.unidade}\n${selectedUnidade.area}m² | ${selectedUnidade.tipologia}\n\n*Cliente:* ${cliente?.nome}\n\n*PLANO DE PAGAMENTO:*\n- ATO: ${formatCurrency(selectedUnidade.plano.ato.valor)}\n- Mensais: ${selectedUnidade.plano.mensais.quantidade}x ${formatCurrency(selectedUnidade.plano.mensais.valor)}\n- Financiamento: ${formatCurrency(selectedUnidade.plano.financiamento.valor)}\n\n*Total: ${formatCurrency(selectedUnidade.valorTotal)}*\n\nCorretor: ${session?.user?.name}`
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
