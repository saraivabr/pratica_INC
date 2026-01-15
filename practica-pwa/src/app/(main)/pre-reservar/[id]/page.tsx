"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Building2, MapPin, Check, Share2 } from "lucide-react"
import { useEmpreendimento } from "@/hooks/use-empreendimentos"
import { SimuladorParcelas } from "@/components/reserva/simulador-parcelas"
import { PlanoPagamentoTable } from "@/components/reserva/plano-pagamento"
import { ClienteForm } from "@/components/reserva/cliente-form"
import { PlanoPagamento, Cliente, PreReserva } from "@/types/pagamento"

type Step = "simulador" | "cliente" | "confirmacao"

export default function PreReservarPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { empreendimento, isLoading } = useEmpreendimento(params.id as string)

  const unidade = searchParams.get("unidade") || "0101"
  const tipologiaIndex = parseInt(searchParams.get("tipologia") || "0")

  const [step, setStep] = useState<Step>("simulador")
  const [plano, setPlano] = useState<PlanoPagamento | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [preReserva, setPreReserva] = useState<PreReserva | null>(null)
  const [loading, setLoading] = useState(false)

  const tipologia = empreendimento?.tipologias?.[tipologiaIndex]
  const valorTotal = tipologia?.preco_base || 389940

  const handlePlanChange = useCallback((novoPlan: PlanoPagamento) => {
    setPlano(novoPlan)
  }, [])

  const handleClienteSubmit = async (dadosCliente: Cliente) => {
    if (!plano || !empreendimento || !session?.user) return

    setLoading(true)
    setCliente(dadosCliente)

    try {
      const response = await fetch("/api/pre-reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretorId: session.user.id,
          corretorNome: session.user.name,
          empreendimentoId: empreendimento.id,
          empreendimentoNome: empreendimento.nome,
          unidade,
          tipologia: {
            area_m2: tipologia?.area_m2 || 0,
            dormitorios: tipologia?.dormitorios || 0,
            descricao: tipologia?.descricao
          },
          cliente: dadosCliente,
          plano
        })
      })

      if (!response.ok) throw new Error("Erro ao criar pré-reserva")

      const data = await response.json()
      setPreReserva(data.preReserva)
      setStep("confirmacao")
    } catch (error) {
      console.error("Erro:", error)
      alert("Erro ao criar pré-reserva. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (!preReserva || !empreendimento || !cliente || !plano) return

    const formatCurrency = (v: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v)

    const message = `*PRÉ-RESERVA CONFIRMADA*

*${empreendimento.nome}*
Unidade: ${unidade}
${tipologia?.area_m2}m² | ${tipologia?.dormitorios} dorm

*Cliente:* ${cliente.nome}
*CPF:* ${cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}

*PLANO DE PAGAMENTO:*
- ATO: ${formatCurrency(plano.ato.valor)}
${plano.mensais.length > 0 ? `- Mensais: ${plano.quantidadeMensais}x ${formatCurrency(plano.mensais[0].valor)}` : ""}
- Financiamento: ${formatCurrency(plano.financiamento.valor)}

*Total: ${formatCurrency(plano.valorTotal)}*

Corretor: ${session?.user?.name}`

    const url = `https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#0071e3]/30 border-t-[#0071e3] rounded-full animate-spin" />
      </div>
    )
  }

  if (!empreendimento) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <p className="text-[#86868b]">Empreendimento não encontrado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="px-5 pt-14 pb-4">
          <button
            onClick={() => {
              if (step === "cliente") setStep("simulador")
              else if (step === "confirmacao") router.push("/pre-reservas")
              else router.back()
            }}
            className="flex items-center gap-1 text-[#0071e3] text-[15px] font-medium mb-3"
          >
            <ArrowLeft className="w-5 h-5" />
            {step === "confirmacao" ? "Ver Pré-Reservas" : "Voltar"}
          </button>

          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            {step === "confirmacao" ? "Pré-Reserva Confirmada" : "Nova Pré-Reserva"}
          </h1>

          {/* Progress */}
          {step !== "confirmacao" && (
            <div className="flex items-center gap-2 mt-4">
              <div className={`h-1 flex-1 rounded-full ${step === "simulador" || step === "cliente" ? "bg-[#0071e3]" : "bg-[#e8e8ed]"}`} />
              <div className={`h-1 flex-1 rounded-full ${step === "cliente" ? "bg-[#0071e3]" : "bg-[#e8e8ed]"}`} />
            </div>
          )}
        </div>
      </header>

      <main className="px-5 py-5 pb-28">
        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-[#0071e3]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                {empreendimento.nome}
              </h2>
              <p className="text-[13px] text-[#86868b] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {empreendimento.localizacao?.bairro}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[12px] bg-[#f5f5f7] px-2 py-1 rounded-md text-[#1d1d1f] font-medium">
                  Unidade {unidade}
                </span>
                <span className="text-[12px] text-[#86868b]">
                  {tipologia?.area_m2}m² | {tipologia?.dormitorios} dorm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step: Simulador */}
        {step === "simulador" && (
          <>
            <SimuladorParcelas
              valorTotal={valorTotal}
              onPlanChange={handlePlanChange}
            />

            {plano && (
              <div className="mt-5">
                <PlanoPagamentoTable plano={plano} />
              </div>
            )}

            <button
              onClick={() => setStep("cliente")}
              className="w-full h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium rounded-xl mt-5 transition-all"
            >
              Continuar
            </button>
          </>
        )}

        {/* Step: Cliente */}
        {step === "cliente" && plano && (
          <>
            <div className="mb-5">
              <PlanoPagamentoTable plano={plano} />
            </div>

            <ClienteForm onSubmit={handleClienteSubmit} loading={loading} />
          </>
        )}

        {/* Step: Confirmação */}
        {step === "confirmacao" && preReserva && plano && (
          <>
            <div className="bg-[#34c759]/10 rounded-2xl p-5 mb-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#34c759] flex items-center justify-center">
                <Check className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Pré-Reserva Criada!</h3>
                <p className="text-[13px] text-[#86868b] mt-0.5">
                  ID: {preReserva.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Cliente Info */}
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 mb-5">
              <h4 className="text-[13px] font-medium text-[#86868b] mb-3">Cliente</h4>
              <p className="text-[17px] font-semibold text-[#1d1d1f]">{cliente?.nome}</p>
              <p className="text-[13px] text-[#86868b] mt-1">
                CPF: {cliente?.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
              </p>
              <p className="text-[13px] text-[#86868b]">
                WhatsApp: {cliente?.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
              </p>
            </div>

            {/* Plano */}
            <PlanoPagamentoTable plano={plano} interactive />

            {/* Actions */}
            <div className="mt-5 space-y-3">
              <button
                onClick={handleShare}
                className="w-full h-12 bg-[#25D366] hover:bg-[#20BD5A] text-white text-[15px] font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Enviar para Cliente
              </button>

              <button
                onClick={() => router.push("/pre-reservas")}
                className="w-full h-12 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[15px] font-medium rounded-xl"
              >
                Ver Todas as Pré-Reservas
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
