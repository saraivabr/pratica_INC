"use client"

import { PlanoPagamento, Parcela } from "@/types/pagamento"
import { Check, Clock, AlertCircle } from "lucide-react"

interface PlanoPagamentoProps {
  plano: PlanoPagamento
  onParcelaClick?: (parcela: Parcela, tipo: "ato" | "mensal" | "financiamento", index?: number) => void
  interactive?: boolean
}

export function PlanoPagamentoTable({ plano, onParcelaClick, interactive = false }: PlanoPagamentoProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  const getStatusIcon = (status: Parcela["status"]) => {
    switch (status) {
      case "pago":
        return <Check className="w-4 h-4 text-[#34c759]" />
      case "vencido":
        return <AlertCircle className="w-4 h-4 text-[#ff3b30]" />
      default:
        return <Clock className="w-4 h-4 text-[#ff9500]" />
    }
  }

  const getStatusColor = (status: Parcela["status"]) => {
    switch (status) {
      case "pago":
        return "bg-[#34c759]/10 text-[#34c759]"
      case "vencido":
        return "bg-[#ff3b30]/10 text-[#ff3b30]"
      default:
        return "bg-[#ff9500]/10 text-[#ff9500]"
    }
  }

  const ParcelaRow = ({
    parcela,
    label,
    tipo,
    index
  }: {
    parcela: Parcela
    label: string
    tipo: "ato" | "mensal" | "financiamento"
    index?: number
  }) => (
    <button
      onClick={() => interactive && onParcelaClick?.(parcela, tipo, index)}
      disabled={!interactive}
      className={`w-full flex items-center justify-between p-4 border-b border-[#f5f5f7] last:border-0 transition-colors ${
        interactive ? "hover:bg-[#f5f5f7] cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(parcela.status)}`}>
          {getStatusIcon(parcela.status)}
        </div>
        <div className="text-left">
          <p className="text-[14px] font-medium text-[#1d1d1f]">{label}</p>
          <p className="text-[12px] text-[#86868b]">{formatDate(parcela.vencimento)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[15px] font-semibold text-[#1d1d1f]">{formatCurrency(parcela.valor)}</p>
        <p className={`text-[11px] font-medium capitalize ${
          parcela.status === "pago" ? "text-[#34c759]" :
          parcela.status === "vencido" ? "text-[#ff3b30]" : "text-[#ff9500]"
        }`}>
          {parcela.status}
        </p>
      </div>
    </button>
  )

  return (
    <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-3 border-b border-[#e8e8ed]">
        <div className="px-4 py-3 text-center border-r border-[#e8e8ed]">
          <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">ATO (1x)</p>
          <p className="text-[10px] text-[#86868b] mt-0.5">{formatDate(plano.ato.vencimento)}</p>
        </div>
        <div className="px-4 py-3 text-center border-r border-[#e8e8ed]">
          <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
            MENSAIS ({plano.quantidadeMensais}x)
          </p>
          {plano.mensais.length > 0 && (
            <p className="text-[10px] text-[#86868b] mt-0.5">{formatDate(plano.mensais[0].vencimento)}</p>
          )}
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">FINANCIA (1x)</p>
          <p className="text-[10px] text-[#86868b] mt-0.5">{formatDate(plano.financiamento.vencimento)}</p>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-3 border-b border-[#e8e8ed]">
        <div className="px-4 py-4 text-center border-r border-[#e8e8ed] bg-[#f5f5f7]/50">
          <p className="text-[17px] font-bold text-[#0071e3]">{formatCurrency(plano.ato.valor)}</p>
          <p className="text-[11px] text-[#86868b]">{plano.percentualAto}%</p>
        </div>
        <div className="px-4 py-4 text-center border-r border-[#e8e8ed] bg-[#f5f5f7]/50">
          {plano.mensais.length > 0 ? (
            <>
              <p className="text-[17px] font-bold text-[#1d1d1f]">{formatCurrency(plano.mensais[0].valor)}</p>
              <p className="text-[11px] text-[#86868b]">{plano.percentualMensais}%</p>
            </>
          ) : (
            <p className="text-[13px] text-[#86868b]">-</p>
          )}
        </div>
        <div className="px-4 py-4 text-center bg-[#f5f5f7]/50">
          <p className="text-[17px] font-bold text-[#1d1d1f]">{formatCurrency(plano.financiamento.valor)}</p>
          <p className="text-[11px] text-[#86868b]">{plano.percentualFinanciamento}%</p>
        </div>
      </div>

      {/* Timeline (quando interativo) */}
      {interactive && (
        <div className="divide-y divide-[#f5f5f7]">
          <ParcelaRow parcela={plano.ato} label="ATO - Sinal" tipo="ato" />
          {plano.mensais.map((parcela, i) => (
            <ParcelaRow
              key={i}
              parcela={parcela}
              label={`Mensal ${i + 1}/${plano.quantidadeMensais}`}
              tipo="mensal"
              index={i}
            />
          ))}
          <ParcelaRow parcela={plano.financiamento} label="Financiamento Bancário" tipo="financiamento" />
        </div>
      )}

      {/* Total */}
      <div className="px-4 py-4 bg-[#1d1d1f] flex items-center justify-between">
        <span className="text-[13px] font-medium text-white/70">Valor Total</span>
        <span className="text-[20px] font-bold text-white">{formatCurrency(plano.valorTotal)}</span>
      </div>
    </div>
  )
}
