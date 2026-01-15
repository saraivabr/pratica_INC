"use client"

import { useState, useEffect } from "react"
import { X, Save, Calculator, TrendingUp, Calendar, Percent, DollarSign, Sparkles, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanoPagamento {
  valorTotal: number
  ato: {
    percentual: number
    valor: number
    vencimento: string
  }
  mensais: {
    quantidade: number
    percentual: number
    valorTotal: number
    valorParcela: number
    primeiroVencimento: string
  }
  financiamento: {
    percentual: number
    valor: number
    vencimento: string
  }
}

interface FlowEditorProps {
  isOpen: boolean
  onClose: () => void
  plano: PlanoPagamento
  onSave: (plano: PlanoPagamento) => void
  unidade: string
  empreendimento: string
}

const PRESETS = [
  { name: "Padrão", ato: 10, mensais: 20, financiamento: 70, qtdMensais: 3 },
  { name: "Entrada Maior", ato: 20, mensais: 20, financiamento: 60, qtdMensais: 3 },
  { name: "Mais Parcelas", ato: 10, mensais: 30, financiamento: 60, qtdMensais: 6 },
  { name: "Mínimo", ato: 5, mensais: 15, financiamento: 80, qtdMensais: 3 },
]

export function FlowEditor({ isOpen, onClose, plano, onSave, unidade, empreendimento }: FlowEditorProps) {
  const [valorTotal] = useState(plano.valorTotal)
  const [percentualAto, setPercentualAto] = useState(plano.ato.percentual)
  const [percentualMensais, setPercentualMensais] = useState(plano.mensais.percentual)
  const [qtdMensais, setQtdMensais] = useState(plano.mensais.quantidade)
  const [dataAto, setDataAto] = useState(plano.ato.vencimento)
  const [dataPrimeiraMensal, setDataPrimeiraMensal] = useState(plano.mensais.primeiroVencimento)
  const [dataFinanciamento, setDataFinanciamento] = useState(plano.financiamento.vencimento)
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)

  const percentualFinanciamento = 100 - percentualAto - percentualMensais

  // Calculated values
  const valorAto = (valorTotal * percentualAto) / 100
  const valorMensaisTotal = (valorTotal * percentualMensais) / 100
  const valorMensaisParcela = valorMensaisTotal / qtdMensais
  const valorFinanciamento = (valorTotal * percentualFinanciamento) / 100

  const handleSave = () => {
    const novoPlano: PlanoPagamento = {
      valorTotal,
      ato: {
        percentual: percentualAto,
        valor: valorAto,
        vencimento: dataAto
      },
      mensais: {
        quantidade: qtdMensais,
        percentual: percentualMensais,
        valorTotal: valorMensaisTotal,
        valorParcela: valorMensaisParcela,
        primeiroVencimento: dataPrimeiraMensal
      },
      financiamento: {
        percentual: percentualFinanciamento,
        valor: valorFinanciamento,
        vencimento: dataFinanciamento
      }
    }
    onSave(novoPlano)
    onClose()
  }

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setPercentualAto(preset.ato)
    setPercentualMensais(preset.mensais)
    setQtdMensais(preset.qtdMensais)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Editor Panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e8ed] bg-gradient-to-r from-[#667eea] to-[#764ba2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-[17px]">Editar Fluxo</h2>
              <p className="text-white/70 text-[12px]">{unidade} - {empreendimento}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Value Summary */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#f5f5f7] to-[#e8e8ed]">
            <p className="text-[#86868b] text-[12px] mb-1">Valor Total da Unidade</p>
            <p className="text-[#1d1d1f] text-[28px] font-bold tracking-tight">
              {formatCurrency(valorTotal)}
            </p>
          </div>

          {/* Presets */}
          <div className="px-5 py-4 border-b border-[#e8e8ed]">
            <p className="text-[#86868b] text-[12px] font-medium mb-3">Modelos Pré-definidos</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(preset)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] border border-transparent hover:border-[#667eea] transition-all"
                >
                  <p className="text-[13px] font-medium text-[#1d1d1f]">{preset.name}</p>
                  <p className="text-[11px] text-[#86868b]">
                    {preset.ato}% + {preset.mensais}% + {preset.financiamento}%
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="px-5 py-4 space-y-6">
            {/* ATO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">ATO (Entrada)</p>
                    <p className="text-[11px] text-[#86868b]">Pagamento na assinatura</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[17px] font-semibold text-green-600">{percentualAto}%</p>
                  <p className="text-[12px] text-[#86868b]">{formatCurrency(valorAto)}</p>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={percentualAto}
                onChange={(e) => setPercentualAto(Number(e.target.value))}
                className="w-full h-2 bg-[#e8e8ed] rounded-full appearance-none cursor-pointer accent-green-500"
              />
              <input
                type="date"
                value={dataAto}
                onChange={(e) => setDataAto(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e8e8ed] text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#667eea]"
              />
            </div>

            {/* MENSAIS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">Mensais</p>
                    <p className="text-[11px] text-[#86868b]">{qtdMensais} parcelas durante obra</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[17px] font-semibold text-blue-600">{percentualMensais}%</p>
                  <p className="text-[12px] text-[#86868b]">{qtdMensais}x {formatCurrency(valorMensaisParcela)}</p>
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={percentualMensais}
                onChange={(e) => setPercentualMensais(Number(e.target.value))}
                className="w-full h-2 bg-[#e8e8ed] rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex gap-2">
                <select
                  value={qtdMensais}
                  onChange={(e) => setQtdMensais(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#e8e8ed] text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#667eea]"
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                    <option key={n} value={n}>{n} parcelas</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dataPrimeiraMensal}
                  onChange={(e) => setDataPrimeiraMensal(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#e8e8ed] text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#667eea]"
                />
              </div>
            </div>

            {/* FINANCIAMENTO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">Financiamento</p>
                    <p className="text-[11px] text-[#86868b]">Na entrega das chaves</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[17px] font-semibold text-purple-600">{percentualFinanciamento}%</p>
                  <p className="text-[12px] text-[#86868b]">{formatCurrency(valorFinanciamento)}</p>
                </div>
              </div>
              <div className="w-full h-2 bg-purple-200 rounded-full">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${percentualFinanciamento}%` }}
                />
              </div>
              <input
                type="date"
                value={dataFinanciamento}
                onChange={(e) => setDataFinanciamento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e8e8ed] text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#667eea]"
              />
            </div>
          </div>

          {/* AI Suggestion Button */}
          <div className="px-5 py-4 border-t border-[#e8e8ed]">
            <button
              onClick={() => setShowAiSuggestion(!showAiSuggestion)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 hover:border-purple-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-medium text-[#1d1d1f]">Sugestão IA</p>
                  <p className="text-[11px] text-[#86868b]">Melhor plano para este cliente</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Summary */}
          <div className="px-5 py-4 bg-[#f5f5f7]">
            <p className="text-[12px] font-medium text-[#86868b] mb-3">Resumo do Plano</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center border border-[#e8e8ed]">
                <p className="text-[20px] font-bold text-green-600">{percentualAto}%</p>
                <p className="text-[10px] text-[#86868b]">ATO</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-[#e8e8ed]">
                <p className="text-[20px] font-bold text-blue-600">{percentualMensais}%</p>
                <p className="text-[10px] text-[#86868b]">MENSAIS</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-[#e8e8ed]">
                <p className="text-[20px] font-bold text-purple-600">{percentualFinanciamento}%</p>
                <p className="text-[10px] text-[#86868b]">FINANC.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#e8e8ed] bg-white">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-[#e8e8ed] text-[15px] font-medium text-[#86868b] hover:bg-[#f5f5f7] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-[15px] font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Plano
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
