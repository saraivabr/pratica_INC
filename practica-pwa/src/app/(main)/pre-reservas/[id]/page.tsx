"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, User, Phone, Mail, Share2, MoreHorizontal, Sparkles, Edit3, MessageCircle } from "lucide-react"
import { PreReserva, Parcela, PlanoPagamento } from "@/types/pagamento"
import { PlanoPagamentoTable } from "@/components/reserva/plano-pagamento"
import { StatusPreReserva } from "@/components/reserva/status-pagamento"
import { ChatPanel } from "@/components/ai/chat-panel"
import { FlowEditor } from "@/components/ai/flow-editor"

export default function PreReservaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const [preReserva, setPreReserva] = useState<PreReserva | null>(null)
  const [loading, setLoading] = useState(true)
  const [showActions, setShowActions] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showFlowEditor, setShowFlowEditor] = useState(false)

  useEffect(() => {
    fetchPreReserva()
  }, [params.id])

  const fetchPreReserva = async () => {
    try {
      const response = await fetch(`/api/pre-reservas/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setPreReserva(data.preReserva)
      }
    } catch (error) {
      console.error("Erro ao buscar pré-reserva:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleParcelaClick = async (
    parcela: Parcela,
    tipo: "ato" | "mensal" | "financiamento",
    index?: number
  ) => {
    if (!preReserva) return

    const novoStatus = parcela.status === "pago" ? "pendente" : "pago"
    const novoPlano = { ...preReserva.plano }

    if (tipo === "ato") {
      novoPlano.ato = { ...novoPlano.ato, status: novoStatus, dataPagamento: novoStatus === "pago" ? new Date().toISOString() : undefined }
    } else if (tipo === "mensal" && index !== undefined) {
      novoPlano.mensais = [...novoPlano.mensais]
      novoPlano.mensais[index] = { ...novoPlano.mensais[index], status: novoStatus, dataPagamento: novoStatus === "pago" ? new Date().toISOString() : undefined }
    } else if (tipo === "financiamento") {
      novoPlano.financiamento = { ...novoPlano.financiamento, status: novoStatus, dataPagamento: novoStatus === "pago" ? new Date().toISOString() : undefined }
    }

    try {
      const response = await fetch(`/api/pre-reservas/${preReserva.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: novoPlano })
      })

      if (response.ok) {
        const data = await response.json()
        setPreReserva(data.preReserva)
      }
    } catch (error) {
      console.error("Erro ao atualizar parcela:", error)
    }
  }

  const handleStatusChange = async (novoStatus: PreReserva["status"]) => {
    if (!preReserva) return

    try {
      const response = await fetch(`/api/pre-reservas/${preReserva.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus })
      })

      if (response.ok) {
        const data = await response.json()
        setPreReserva(data.preReserva)
        setShowActions(false)
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
    }
  }

  const handleFlowSave = async (novoPlano: {
    valorTotal: number
    ato: { percentual: number; valor: number; vencimento: string }
    mensais: { quantidade: number; percentual: number; valorTotal: number; valorParcela: number; primeiroVencimento: string }
    financiamento: { percentual: number; valor: number; vencimento: string }
  }) => {
    if (!preReserva) return

    // Convert to the expected PlanoPagamento format
    const planoAtualizado = {
      valorTotal: novoPlano.valorTotal,
      ato: {
        valor: novoPlano.ato.valor,
        vencimento: novoPlano.ato.vencimento,
        status: preReserva.plano.ato.status
      },
      mensais: Array.from({ length: novoPlano.mensais.quantidade }, (_, i) => {
        const existing = preReserva.plano.mensais[i]
        const dataVenc = new Date(novoPlano.mensais.primeiroVencimento)
        dataVenc.setMonth(dataVenc.getMonth() + i)
        return {
          valor: novoPlano.mensais.valorParcela,
          vencimento: dataVenc.toISOString().split('T')[0],
          status: existing?.status || "pendente" as const
        }
      }),
      financiamento: {
        valor: novoPlano.financiamento.valor,
        vencimento: novoPlano.financiamento.vencimento,
        status: preReserva.plano.financiamento.status
      }
    }

    try {
      const response = await fetch(`/api/pre-reservas/${preReserva.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: planoAtualizado })
      })

      if (response.ok) {
        const data = await response.json()
        setPreReserva(data.preReserva)
      }
    } catch (error) {
      console.error("Erro ao atualizar plano:", error)
    }
  }

  const handleShare = () => {
    if (!preReserva) return

    const formatCurrency = (v: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v)

    const message = `*PRÉ-RESERVA - ${preReserva.empreendimentoNome}*
Unidade: ${preReserva.unidade}
${preReserva.tipologia.area_m2}m² | ${preReserva.tipologia.dormitorios} dorm

*Cliente:* ${preReserva.cliente.nome}

*PLANO DE PAGAMENTO:*
- ATO: ${formatCurrency(preReserva.plano.ato.valor)} ${preReserva.plano.ato.status === "pago" ? "✅" : "⏳"}
${preReserva.plano.mensais.map((m, i) => `- Mensal ${i + 1}: ${formatCurrency(m.valor)} ${m.status === "pago" ? "✅" : "⏳"}`).join("\n")}
- Financiamento: ${formatCurrency(preReserva.plano.financiamento.valor)} ${preReserva.plano.financiamento.status === "pago" ? "✅" : "⏳"}

*Total: ${formatCurrency(preReserva.plano.valorTotal)}*`

    const url = `https://wa.me/55${preReserva.cliente.whatsapp}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0
    }).format(value)
  }

  // Convert plano to FlowEditor format
  const getFlowEditorPlano = () => {
    if (!preReserva) return null

    const plano = preReserva.plano
    const valorMensaisTotal = plano.mensais.reduce((acc, m) => acc + m.valor, 0)

    return {
      valorTotal: plano.valorTotal,
      ato: {
        percentual: Math.round((plano.ato.valor / plano.valorTotal) * 100),
        valor: plano.ato.valor,
        vencimento: plano.ato.vencimento
      },
      mensais: {
        quantidade: plano.mensais.length,
        percentual: Math.round((valorMensaisTotal / plano.valorTotal) * 100),
        valorTotal: valorMensaisTotal,
        valorParcela: plano.mensais[0]?.valor || 0,
        primeiroVencimento: plano.mensais[0]?.vencimento || ""
      },
      financiamento: {
        percentual: Math.round((plano.financiamento.valor / plano.valorTotal) * 100),
        valor: plano.financiamento.valor,
        vencimento: plano.financiamento.vencimento
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#0071e3]/30 border-t-[#0071e3] rounded-full animate-spin" />
      </div>
    )
  }

  if (!preReserva) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <p className="text-[#86868b]">Pré-reserva não encontrada</p>
      </div>
    )
  }

  const parcelasPagas = [
    preReserva.plano.ato,
    ...preReserva.plano.mensais,
    preReserva.plano.financiamento
  ].filter(p => p.status === "pago").length

  const totalParcelas = 2 + preReserva.plano.mensais.length

  const chatContext = {
    preReserva: {
      cliente: preReserva.cliente.nome,
      empreendimento: preReserva.empreendimentoNome,
      unidade: preReserva.unidade,
      valorTotal: preReserva.plano.valorTotal,
      status: preReserva.status
    }
  }

  const flowEditorPlano = getFlowEditorPlano()

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="px-5 pt-14 pb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/pre-reservas")}
              className="flex items-center gap-1 text-[#0071e3] text-[15px] font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Pré-Reservas
            </button>
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-10 h-10 rounded-full bg-white border border-[#e8e8ed] flex items-center justify-center"
            >
              <MoreHorizontal className="w-5 h-5 text-[#1d1d1f]" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                Pré-Reserva
              </h1>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                ID: {preReserva.id.slice(0, 12).toUpperCase()}
              </p>
            </div>
            <StatusPreReserva status={preReserva.status} />
          </div>

          {/* Actions Menu */}
          {showActions && (
            <div className="absolute right-5 top-24 bg-white rounded-xl border border-[#e8e8ed] shadow-lg overflow-hidden z-50">
              {preReserva.status !== "ativa" && (
                <button
                  onClick={() => handleStatusChange("ativa")}
                  className="w-full px-4 py-3 text-left text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] border-b border-[#f5f5f7]"
                >
                  Marcar como Ativa
                </button>
              )}
              {preReserva.status !== "concluida" && (
                <button
                  onClick={() => handleStatusChange("concluida")}
                  className="w-full px-4 py-3 text-left text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] border-b border-[#f5f5f7]"
                >
                  Marcar como Concluída
                </button>
              )}
              {preReserva.status !== "cancelada" && (
                <button
                  onClick={() => handleStatusChange("cancelada")}
                  className="w-full px-4 py-3 text-left text-[14px] text-[#ff3b30] hover:bg-[#f5f5f7]"
                >
                  Cancelar Pré-Reserva
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="px-5 py-5 pb-36">
        {/* Empreendimento */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-[#0071e3]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                {preReserva.empreendimentoNome}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[12px] bg-[#f5f5f7] px-2 py-1 rounded-md text-[#1d1d1f] font-medium">
                  Unidade {preReserva.unidade}
                </span>
                <span className="text-[12px] text-[#86868b]">
                  {preReserva.tipologia.area_m2}m² | {preReserva.tipologia.dormitorios} dorm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-[#0071e3]" />
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Cliente</h3>
          </div>
          <p className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            {preReserva.cliente.nome}
          </p>
          <div className="space-y-1">
            <p className="text-[13px] text-[#86868b] flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {preReserva.cliente.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
            </p>
            <p className="text-[13px] text-[#86868b] flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {preReserva.cliente.email}
            </p>
          </div>
        </div>

        {/* Progresso */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Progresso</h3>
            <span className="text-[13px] text-[#86868b]">
              {parcelasPagas}/{totalParcelas} parcelas
            </span>
          </div>
          <div className="w-full h-2 bg-[#e8e8ed] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#34c759] transition-all"
              style={{ width: `${(parcelasPagas / totalParcelas) * 100}%` }}
            />
          </div>
          <p className="text-[12px] text-[#86868b] mt-2">
            Clique nas parcelas abaixo para marcar como pagas
          </p>
        </div>

        {/* Plano de Pagamento */}
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Plano de Pagamento</h3>
            <button
              onClick={() => setShowFlowEditor(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-[12px] font-medium shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-105 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar Fluxo
            </button>
          </div>
          <PlanoPagamentoTable
            plano={preReserva.plano}
            interactive
            onParcelaClick={handleParcelaClick}
          />
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-3">
          <button
            onClick={handleShare}
            className="w-full h-12 bg-[#25D366] hover:bg-[#20BD5A] text-white text-[15px] font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Enviar Atualização para Cliente
          </button>
        </div>
      </main>

      {/* Floating AI Button */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/40 flex items-center justify-center hover:scale-110 transition-transform z-30 animate-[pulse_2s_ease-in-out_infinite]"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        context={chatContext}
        title="Assistente Prática"
      />

      {/* Flow Editor */}
      {flowEditorPlano && (
        <FlowEditor
          isOpen={showFlowEditor}
          onClose={() => setShowFlowEditor(false)}
          plano={flowEditorPlano}
          onSave={handleFlowSave}
          unidade={preReserva.unidade}
          empreendimento={preReserva.empreendimentoNome}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(168, 85, 247, 0); }
        }
      `}</style>
    </div>
  )
}
