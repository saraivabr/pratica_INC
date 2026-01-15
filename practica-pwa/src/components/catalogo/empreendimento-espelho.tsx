"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  X, Check, Calendar, Wallet, Home, Share2, 
  ArrowRight, Calculator, Filter, SlidersHorizontal, MapPin, Building2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CaixaSimulator } from "@/components/ai/caixa-simulator"
import { Cliente, PlanoPagamento, PreReserva } from "@/types/pagamento"
import { Loader2 } from "lucide-react"
import { ClienteForm } from "@/components/reserva/cliente-form"
import { useSession } from "next-auth/react"

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

interface EmpreendimentoEspelhoProps {
  empreendimentoId: string
}

export function EmpreendimentoEspelho({ empreendimentoId }: EmpreendimentoEspelhoProps) {
  const { data: session } = useSession()
  const [unidades, setUnidades] = useState<UnidadeDB[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeDB | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterDorms, setFilterDorms] = useState<number | null>(null)
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)
  const [modalStep, setModalStep] = useState<"detalhes" | "cliente" | "confirmacao">("detalhes")
  const [preReserva, setPreReserva] = useState<PreReserva | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        // Busca unidades específicas do empreendimento
        // Se empreendimentoId for "station-park" (exemplo), usamos o ID correto
        const res = await fetch(`/api/unidades?empreendimentoId=${empreendimentoId}`)
        if (res.ok) {
          const data = await res.json()
          setUnidades(data)
        }
      } catch (error) {
        console.error("Erro ao buscar unidades:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [empreendimentoId])

  const vibrate = (pattern = [5]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }

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

  const filteredUnidades = useMemo(() => {
    return unidades.filter(u => {
      if (filterDorms && u.dormitorios !== filterDorms) return false
      if (filterMaxPrice && u.valorTotal > filterMaxPrice) return false
      return true
    })
  }, [unidades, filterDorms, filterMaxPrice])

  const unidadesPorAndar = useMemo(() => {
    const grouped: Record<number, UnidadeDB[]> = {}
    filteredUnidades.forEach(u => {
      const andar = parseInt(u.numero.slice(0, -2)) || parseInt(u.numero.slice(0, -1))
      if (!grouped[andar]) grouped[andar] = []
      grouped[andar].push(u)
    })
    return grouped
  }, [filteredUnidades])

  const andares = Object.keys(unidadesPorAndar).map(Number).sort((a, b) => a - b)

  const handleUnidadeClick = (unidade: UnidadeDB) => {
    vibrate([10])
    setSelectedUnidade(unidade)
    setModalStep("detalhes")
    setShowSimulator(false)
  }

  const generateWhatsAppShare = () => {
    if (!selectedUnidade || !selectedUnidade.plano) return
    vibrate([10])

    const plano = selectedUnidade.plano
    
    const msg = `
🏢 *PROPOSTA COMERCIAL - ${selectedUnidade.empreendimentoNome.toUpperCase()}*
📍 Unidade: *${selectedUnidade.numero}* (${selectedUnidade.area}m²)
🛏️ ${selectedUnidade.dormitorios} Dormitórios

💰 *VALOR TOTAL: ${formatCurrency(selectedUnidade.valorTotal)}*

📅 *FLUXO DE PAGAMENTO SUJERIDO:*

🔹 *ATO (Sinal):* ${formatCurrency(plano.ato.valor)}
   _Vencimento: ${formatDate(plano.ato.vencimento)}_

🔹 *MENSAIS:* ${plano.mensais.quantidade}x de ${formatCurrency(plano.mensais.valor)}
   _Início em: ${formatDate(plano.mensais.primeiroVencimento)}_

🔹 *FINANCIAMENTO:* ${formatCurrency(plano.financiamento.valor)}
   _Saldo final via banco (Caixa/BB)_

✅ *Condições válidas por 24h*
👨‍💼 Corretor: ${session?.user?.name || "Consultor Prática"}
    `.trim()

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank")
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
    const plano = criarPlanoFromUnidade(selectedUnidade)

    try {
      const response = await fetch("/api/pre-reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretorId: session.user.id,
          corretorNome: session.user.name,
          empreendimentoId: selectedUnidade.empreendimentoId,
          empreendimentoNome: selectedUnidade.empreendimentoNome,
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
      vibrate([50, 50, 50])

      // Atualizar lista de unidades localmente
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-[#f5f5f7] rounded-3xl">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
        <p className="text-[13px] text-[#86868b] mt-2">Carregando espelho...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-[#e8e8ed] overflow-hidden shadow-sm">
      {/* Header do Espelho */}
      <div className="px-5 py-4 border-b border-[#f5f5f7] bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[16px] font-bold text-[#1d1d1f]">Espelho de Vendas</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all",
              showFilters ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
          </button>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-[#f5f5f7] p-3 rounded-xl mb-3 space-y-3 animate-in slide-in-from-top-2">
            <div>
              <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Dormitórios</p>
              <div className="flex gap-2">
                {[1, 2, 3].map(dorms => (
                  <button
                    key={dorms}
                    onClick={() => setFilterDorms(filterDorms === dorms ? null : dorms)}
                    className={cn(
                      "flex-1 h-8 rounded-lg text-[12px] font-medium transition-all",
                      filterDorms === dorms ? "bg-[#0071e3] text-white" : "bg-white text-[#1d1d1f] border border-[#e5e5ea]"
                    )}
                  >
                    {dorms}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Valor Máximo</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[400000, 500000, 600000, 700000].map(price => (
                  <button
                    key={price}
                    onClick={() => setFilterMaxPrice(filterMaxPrice === price ? null : price)}
                    className={cn(
                      "flex-shrink-0 h-8 px-3 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap",
                      filterMaxPrice === price ? "bg-[#34c759] text-white" : "bg-white text-[#1d1d1f] border border-[#e5e5ea]"
                    )}
                  >
                    Até {price/1000}k
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legenda */}
        <div className="flex gap-3 text-[10px] text-[#86868b] font-medium">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#34c759]" />Disponível</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ff9500]" />Reservado</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ff3b30]" />Vendido</span>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 bg-[#fbfbfd]">
        {andares.length === 0 ? (
          <div className="py-10 text-center text-[#86868b]">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-[13px]">Nenhuma unidade encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {andares.map(andar => (
              <div key={andar} className="flex items-start gap-2">
                <div className="w-6 pt-2.5 text-right">
                  <span className="text-[11px] font-bold text-[#86868b]">{andar}º</span>
                </div>
                <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {unidadesPorAndar[andar]
                    .sort((a, b) => a.numero.localeCompare(b.numero))
                    .map(unidade => {
                      const statusColor = {
                        disponivel: "bg-[#34c759] shadow-sm shadow-green-500/20 text-white hover:scale-105",
                        reservado: "bg-[#ff9500] opacity-50 cursor-not-allowed text-white",
                        vendido: "bg-[#ff3b30] opacity-30 cursor-not-allowed text-white"
                      }[unidade.status] || "bg-gray-200"

                      return (
                        <button
                          key={unidade.id}
                          onClick={() => handleUnidadeClick(unidade)}
                          disabled={unidade.status !== "disponivel"}
                          className={cn(
                            "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90",
                            statusColor
                          )}
                        >
                          <span className="text-[12px] font-bold tracking-tight">{unidade.numero.slice(-2)}</span>
                          {unidade.status === "disponivel" && (
                            <span className="text-[8px] font-medium opacity-90">{unidade.area}m</span>
                          )}
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Unidade */}
      {selectedUnidade && selectedUnidade.plano && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setSelectedUnidade(null)} />
          
          <div className="relative bg-[#fbfbfd] w-full max-w-md max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
            {/* Header Modal */}
            <div className="bg-white px-6 py-4 border-b border-[#f5f5f7] flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-[20px] font-bold text-[#1d1d1f] flex items-center gap-2">
                  Unidade {selectedUnidade.numero}
                  {modalStep === "confirmacao" && <span className="text-[#34c759] text-[12px]">Reservada!</span>}
                </h2>
                <p className="text-[12px] text-[#86868b]">{selectedUnidade.area}m² • {selectedUnidade.dormitorios} Dorms</p>
              </div>
              <button 
                onClick={() => setSelectedUnidade(null)}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center"
              >
                <X className="w-4 h-4 text-[#1d1d1f]" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 pb-24 scrollbar-hide">
              {modalStep === "detalhes" && (
                <>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#f5f5f7]">
                    <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1">Valor de Tabela</p>
                    <p className="text-[28px] font-bold text-[#1d1d1f] tracking-tight">{formatCurrency(selectedUnidade.valorTotal)}</p>
                    
                    <button
                      onClick={() => setShowSimulator(true)}
                      className="mt-4 w-full h-10 bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#0071e3]/20 transition-colors"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Simular Financiamento
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[13px] font-bold text-[#1d1d1f] flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 text-[#0071e3]" />
                      Fluxo de Pagamento
                    </h3>
                    
                    <div className="space-y-2">
                      {/* Ato */}
                      <div className="flex justify-between items-center p-3 bg-white border border-[#e8e8ed] rounded-xl">
                        <div>
                          <p className="text-[12px] font-semibold text-[#1d1d1f]">Ato / Sinal</p>
                          <p className="text-[10px] text-[#86868b]">{formatDate(selectedUnidade.plano.ato.vencimento)}</p>
                        </div>
                        <span className="text-[13px] font-bold text-[#1d1d1f]">{formatCurrency(selectedUnidade.plano.ato.valor)}</span>
                      </div>

                      {/* Mensais */}
                      <div className="flex justify-between items-center p-3 bg-white border border-[#e8e8ed] rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#ff9500]/10 text-[#ff9500] flex items-center justify-center text-[10px] font-bold">
                            {selectedUnidade.plano.mensais.quantidade}x
                          </span>
                          <div>
                            <p className="text-[12px] font-semibold text-[#1d1d1f]">Mensais</p>
                            <p className="text-[10px] text-[#86868b]">Parcelas fixas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-[#1d1d1f]">{formatCurrency(selectedUnidade.plano.mensais.valor)}</span>
                          <p className="text-[9px] text-[#86868b]">/mês</p>
                        </div>
                      </div>

                      {/* Financiamento */}
                      <div className="flex justify-between items-center p-3 bg-white border border-[#e8e8ed] rounded-xl">
                        <div>
                          <p className="text-[12px] font-semibold text-[#1d1d1f]">Financiamento</p>
                          <p className="text-[10px] text-[#86868b]">Saldo final</p>
                        </div>
                        <span className="text-[13px] font-bold text-[#1d1d1f]">{formatCurrency(selectedUnidade.plano.financiamento.valor)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalStep === "cliente" && (
                <ClienteForm onSubmit={handleClienteSubmit} loading={submitting} />
              )}

              {modalStep === "confirmacao" && preReserva && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[#34c759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-[#34c759]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1d1d1f]">Pré-Reserva Confirmada!</h3>
                  <p className="text-[13px] text-[#86868b] mt-2 mb-6">
                    A unidade {selectedUnidade.numero} foi reservada para {preReserva.cliente.nome}.
                  </p>
                  <button
                    onClick={() => window.open(`https://wa.me/55${preReserva.cliente.whatsapp}`, "_blank")}
                    className="w-full h-12 bg-[#25D366] text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Enviar Comprovante
                  </button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {modalStep === "detalhes" && (
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#e8e8ed] p-4 flex gap-3">
                <button
                  onClick={generateWhatsAppShare}
                  className="flex-1 h-12 bg-[#25D366] text-white text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all shadow-lg shadow-green-500/20"
                >
                  <Share2 className="w-4 h-4" />
                  Proposta
                </button>
                <button
                  onClick={() => setModalStep("cliente")}
                  className="flex-1 h-12 bg-[#1d1d1f] text-white text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#2d2d2f] active:scale-95 transition-all"
                >
                  Reservar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Simulador */}
            <CaixaSimulator
              isOpen={showSimulator}
              onClose={() => setShowSimulator(false)}
              valorImovel={selectedUnidade.valorTotal}
              empreendimento={selectedUnidade.empreendimentoNome}
              unidade={selectedUnidade.numero}
            />
          </div>
        </div>
      )}
    </div>
  )
}
