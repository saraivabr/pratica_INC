"use client"

import { useState, useMemo } from "react"
import { Calculator, Calendar, Percent } from "lucide-react"
import { PlanoPagamento, Parcela } from "@/types/pagamento"

interface SimuladorParcelasProps {
  valorTotal: number
  onPlanChange: (plano: PlanoPagamento) => void
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function SimuladorParcelas({ valorTotal, onPlanChange }: SimuladorParcelasProps) {
  const [percentualAto, setPercentualAto] = useState(10)
  const [quantidadeMensais, setQuantidadeMensais] = useState(3)
  const [dataAto, setDataAto] = useState(() => {
    const hoje = new Date()
    hoje.setDate(25)
    if (new Date().getDate() > 20) {
      hoje.setMonth(hoje.getMonth() + 1)
    }
    return formatDate(hoje)
  })

  const plano = useMemo(() => {
    const valorAto = Math.round(valorTotal * (percentualAto / 100))
    const valorRestante = valorTotal - valorAto
    const percentualMensaisCalc = quantidadeMensais > 0 ? 30 : 0
    const valorMensaisTotal = Math.round(valorRestante * (percentualMensaisCalc / 100))
    const valorPorMensal = quantidadeMensais > 0 ? Math.round(valorMensaisTotal / quantidadeMensais) : 0
    const valorFinanciamento = valorRestante - valorMensaisTotal

    const dataAtoDate = new Date(dataAto + "T12:00:00")

    const ato: Parcela = {
      tipo: "ato",
      numero: 1,
      valor: valorAto,
      vencimento: dataAto,
      status: "pendente"
    }

    const mensais: Parcela[] = Array.from({ length: quantidadeMensais }, (_, i) => ({
      tipo: "mensal" as const,
      numero: i + 1,
      valor: valorPorMensal,
      vencimento: formatDate(addMonths(dataAtoDate, i + 1)),
      status: "pendente" as const
    }))

    const mesesAteFinanciamento = quantidadeMensais + 7
    const financiamento: Parcela = {
      tipo: "financiamento",
      numero: 1,
      valor: valorFinanciamento,
      vencimento: formatDate(addMonths(dataAtoDate, mesesAteFinanciamento)),
      status: "pendente"
    }

    const novoPlan: PlanoPagamento = {
      valorTotal,
      percentualAto,
      percentualMensais: percentualMensaisCalc,
      percentualFinanciamento: 100 - percentualAto - percentualMensaisCalc,
      quantidadeMensais,
      ato,
      mensais,
      financiamento
    }

    return novoPlan
  }, [valorTotal, percentualAto, quantidadeMensais, dataAto])

  useMemo(() => {
    onPlanChange(plano)
  }, [plano, onPlanChange])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f5f5f7]">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#0071e3]" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Simulador de Pagamento</h3>
        </div>
        <p className="text-[13px] text-[#86868b] mt-1">
          Valor total: {formatCurrency(valorTotal)}
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Data do ATO */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f] mb-2">
            <Calendar className="w-4 h-4 text-[#86868b]" />
            Data do ATO (Sinal)
          </label>
          <input
            type="date"
            value={dataAto}
            onChange={(e) => setDataAto(e.target.value)}
            className="w-full h-12 px-4 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3]"
          />
        </div>

        {/* Percentual ATO */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f] mb-2">
            <Percent className="w-4 h-4 text-[#86868b]" />
            Percentual do ATO
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={percentualAto}
              onChange={(e) => setPercentualAto(Number(e.target.value))}
              className="flex-1 h-2 bg-[#e8e8ed] rounded-full appearance-none cursor-pointer accent-[#0071e3]"
            />
            <span className="w-16 text-center text-[15px] font-semibold text-[#0071e3]">
              {percentualAto}%
            </span>
          </div>
          <p className="text-[12px] text-[#86868b] mt-1">
            {formatCurrency(plano.ato.valor)}
          </p>
        </div>

        {/* Quantidade de Mensais */}
        <div>
          <label className="text-[13px] font-medium text-[#1d1d1f] mb-2 block">
            Parcelas Mensais
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 3, 6, 12].map((qtd) => (
              <button
                key={qtd}
                onClick={() => setQuantidadeMensais(qtd)}
                className={`h-11 rounded-xl text-[14px] font-medium transition-all ${
                  quantidadeMensais === qtd
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                }`}
              >
                {qtd === 0 ? "Sem" : `${qtd}x`}
              </button>
            ))}
          </div>
          {quantidadeMensais > 0 && (
            <p className="text-[12px] text-[#86868b] mt-2">
              {quantidadeMensais}x de {formatCurrency(plano.mensais[0]?.valor || 0)}
            </p>
          )}
        </div>

        {/* Resumo */}
        <div className="pt-4 border-t border-[#f5f5f7]">
          <h4 className="text-[13px] font-medium text-[#86868b] mb-3">Resumo do Plano</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-[#86868b]">ATO ({percentualAto}%)</span>
              <span className="font-semibold text-[#1d1d1f]">{formatCurrency(plano.ato.valor)}</span>
            </div>
            {quantidadeMensais > 0 && (
              <div className="flex justify-between text-[14px]">
                <span className="text-[#86868b]">Mensais ({plano.percentualMensais}%)</span>
                <span className="font-semibold text-[#1d1d1f]">
                  {quantidadeMensais}x {formatCurrency(plano.mensais[0]?.valor || 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[14px]">
              <span className="text-[#86868b]">Financiamento ({plano.percentualFinanciamento}%)</span>
              <span className="font-semibold text-[#1d1d1f]">{formatCurrency(plano.financiamento.valor)}</span>
            </div>
            <div className="flex justify-between text-[15px] pt-2 border-t border-[#f5f5f7]">
              <span className="font-medium text-[#1d1d1f]">Total</span>
              <span className="font-bold text-[#0071e3]">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
