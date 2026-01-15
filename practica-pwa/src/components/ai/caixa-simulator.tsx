"use client"

import { useState, useEffect } from "react"
import { X, Calculator, Building2, User, Calendar, DollarSign, Percent, TrendingUp, ExternalLink, Copy, Check, Sparkles, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CaixaSimulatorProps {
  isOpen: boolean
  onClose: () => void
  valorImovel: number
  empreendimento: string
  unidade: string
}

interface SimulationResult {
  parcela: number
  taxaJuros: number
  prazo: number
  valorFinanciado: number
  valorEntrada: number
  sistemaAmortizacao: "SAC" | "PRICE"
  programa: string
  renda: number
}

const PROGRAMAS = [
  { id: "mcmv", nome: "Minha Casa Minha Vida", taxaMin: 4.0, taxaMax: 8.16, limiteRenda: 8000, limiteImovel: 350000 },
  { id: "sbpe", nome: "SBPE (Poupança)", taxaMin: 9.37, taxaMax: 11.49, limiteRenda: null, limiteImovel: 1500000 },
  { id: "fgts", nome: "Pró-Cotista FGTS", taxaMin: 7.66, taxaMax: 8.16, limiteRenda: null, limiteImovel: 1500000 },
]

export function CaixaSimulator({ isOpen, onClose, valorImovel, empreendimento, unidade }: CaixaSimulatorProps) {
  const [step, setStep] = useState(1)
  const [cpf, setCpf] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [rendaBruta, setRendaBruta] = useState("")
  const [temFgts, setTemFgts] = useState(false)
  const [saldoFgts, setSaldoFgts] = useState("")
  const [prazo, setPrazo] = useState(360) // 30 anos
  const [percentualEntrada, setPercentualEntrada] = useState(20)
  const [sistemaAmortizacao, setSistemaAmortizacao] = useState<"SAC" | "PRICE">("SAC")
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Calculate age from birth date
  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return 0
    const hoje = new Date()
    const nascimento = new Date(dataNasc)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  // Determine best program based on income and property value
  const determinarPrograma = (renda: number, valorImovel: number) => {
    if (renda <= 8000 && valorImovel <= 350000) {
      return PROGRAMAS[0] // MCMV
    }
    if (temFgts) {
      return PROGRAMAS[2] // Pró-Cotista
    }
    return PROGRAMAS[1] // SBPE
  }

  // Calculate monthly payment (SAC)
  const calcularParcelaSAC = (valorFinanciado: number, taxaAnual: number, meses: number) => {
    const taxaMensal = taxaAnual / 100 / 12
    const amortizacao = valorFinanciado / meses
    const jurosPrimeiraParcela = valorFinanciado * taxaMensal
    return amortizacao + jurosPrimeiraParcela
  }

  // Calculate monthly payment (PRICE)
  const calcularParcelaPRICE = (valorFinanciado: number, taxaAnual: number, meses: number) => {
    const taxaMensal = taxaAnual / 100 / 12
    return valorFinanciado * (taxaMensal * Math.pow(1 + taxaMensal, meses)) / (Math.pow(1 + taxaMensal, meses) - 1)
  }

  const handleSimular = () => {
    setIsCalculating(true)

    setTimeout(() => {
      const renda = parseFloat(rendaBruta.replace(/\D/g, "")) / 100
      const programa = determinarPrograma(renda, valorImovel)
      const idade = calcularIdade(dataNascimento)

      // Max prazo based on age (80 years limit)
      const prazoMaxIdade = Math.min(prazo, (80 - idade) * 12)
      const prazoFinal = Math.max(prazoMaxIdade, 60) // Minimum 5 years

      // Calculate values
      const valorEntrada = (valorImovel * percentualEntrada) / 100
      const valorFgts = temFgts ? parseFloat(saldoFgts.replace(/\D/g, "")) / 100 : 0
      const valorFinanciado = valorImovel - valorEntrada - valorFgts

      // Determine interest rate based on income (simplified)
      let taxaJuros = programa.taxaMin
      if (programa.id === "mcmv") {
        if (renda <= 2000) taxaJuros = 4.0
        else if (renda <= 2640) taxaJuros = 4.25
        else if (renda <= 3200) taxaJuros = 5.0
        else if (renda <= 3800) taxaJuros = 6.0
        else if (renda <= 4400) taxaJuros = 7.0
        else taxaJuros = 8.16
      }

      // Calculate payment
      const parcela = sistemaAmortizacao === "SAC"
        ? calcularParcelaSAC(valorFinanciado, taxaJuros, prazoFinal)
        : calcularParcelaPRICE(valorFinanciado, taxaJuros, prazoFinal)

      setResult({
        parcela,
        taxaJuros,
        prazo: prazoFinal,
        valorFinanciado,
        valorEntrada: valorEntrada + valorFgts,
        sistemaAmortizacao,
        programa: programa.nome,
        renda
      })

      setIsCalculating(false)
      setStep(3)
    }, 1500)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  const formatMoney = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    const amount = parseInt(numbers || "0") / 100
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleCopy = () => {
    if (!result) return

    const text = `*SIMULAÇÃO DE FINANCIAMENTO CAIXA*

📍 ${empreendimento} - Unidade ${unidade}
💰 Valor do Imóvel: ${formatCurrency(valorImovel)}

👤 Renda Bruta: ${formatCurrency(result.renda)}
🏦 Programa: ${result.programa}

📊 *RESULTADO:*
- Entrada: ${formatCurrency(result.valorEntrada)}
- Financiado: ${formatCurrency(result.valorFinanciado)}
- Prazo: ${result.prazo / 12} anos (${result.prazo} meses)
- Taxa: ${result.taxaJuros.toFixed(2)}% a.a.
- Sistema: ${result.sistemaAmortizacao}

💳 *PARCELA: ${formatCurrency(result.parcela)}*

_Simulação estimada. Valores sujeitos a análise de crédito._`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openCaixaSimulator = () => {
    window.open("https://www8.caixa.gov.br/siopiinternet-web/simulaOperacaoInternet.do?method=inicializarCasoUso", "_blank")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e8ed] bg-gradient-to-r from-[#005CA9] to-[#F37021]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-[17px]">Simulador Caixa</h2>
              <p className="text-white/70 text-[12px]">Financiamento Habitacional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 py-3 bg-[#f5f5f7] flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1 rounded-full transition-all",
                step >= s ? "bg-[#005CA9]" : "bg-[#e8e8ed]"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="p-5 space-y-5">
              {/* Property Info */}
              <div className="bg-gradient-to-r from-[#005CA9]/10 to-[#F37021]/10 rounded-2xl p-4">
                <p className="text-[12px] text-[#86868b] mb-1">Imóvel</p>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">{empreendimento}</p>
                <p className="text-[13px] text-[#86868b]">Unidade {unidade}</p>
                <div className="mt-3 pt-3 border-t border-[#e8e8ed]">
                  <p className="text-[12px] text-[#86868b]">Valor do Imóvel</p>
                  <p className="text-[24px] font-bold text-[#005CA9]">{formatCurrency(valorImovel)}</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-medium text-[#1d1d1f] mb-1.5 block">CPF do Cliente</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-[15px] focus:outline-none focus:border-[#005CA9] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-medium text-[#1d1d1f] mb-1.5 block">Data de Nascimento</label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-[15px] focus:outline-none focus:border-[#005CA9] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-medium text-[#1d1d1f] mb-1.5 block">Renda Bruta Familiar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]">R$</span>
                    <input
                      type="text"
                      value={rendaBruta}
                      onChange={(e) => setRendaBruta(formatMoney(e.target.value))}
                      placeholder="0,00"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#e8e8ed] text-[15px] focus:outline-none focus:border-[#005CA9] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-5 space-y-5">
              {/* FGTS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#005CA9]/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-[#005CA9]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">Usar FGTS?</p>
                      <p className="text-[12px] text-[#86868b]">Reduz valor financiado</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTemFgts(!temFgts)}
                    className={cn(
                      "w-12 h-7 rounded-full transition-colors relative",
                      temFgts ? "bg-[#005CA9]" : "bg-[#e8e8ed]"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all",
                        temFgts ? "right-1" : "left-1"
                      )}
                    />
                  </button>
                </div>

                {temFgts && (
                  <div>
                    <label className="text-[13px] font-medium text-[#1d1d1f] mb-1.5 block">Saldo FGTS</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]">R$</span>
                      <input
                        type="text"
                        value={saldoFgts}
                        onChange={(e) => setSaldoFgts(formatMoney(e.target.value))}
                        placeholder="0,00"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#e8e8ed] text-[15px] focus:outline-none focus:border-[#005CA9] transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Entrada */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium text-[#1d1d1f]">Entrada</p>
                  <p className="text-[17px] font-bold text-[#005CA9]">{percentualEntrada}%</p>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={percentualEntrada}
                  onChange={(e) => setPercentualEntrada(Number(e.target.value))}
                  className="w-full h-2 bg-[#e8e8ed] rounded-full appearance-none cursor-pointer accent-[#005CA9]"
                />
                <p className="text-[13px] text-[#86868b]">
                  {formatCurrency((valorImovel * percentualEntrada) / 100)}
                </p>
              </div>

              {/* Prazo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium text-[#1d1d1f]">Prazo</p>
                  <p className="text-[17px] font-bold text-[#005CA9]">{prazo / 12} anos</p>
                </div>
                <input
                  type="range"
                  min="60"
                  max="420"
                  step="12"
                  value={prazo}
                  onChange={(e) => setPrazo(Number(e.target.value))}
                  className="w-full h-2 bg-[#e8e8ed] rounded-full appearance-none cursor-pointer accent-[#005CA9]"
                />
                <p className="text-[13px] text-[#86868b]">{prazo} meses</p>
              </div>

              {/* Sistema */}
              <div className="space-y-3">
                <p className="text-[14px] font-medium text-[#1d1d1f]">Sistema de Amortização</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["SAC", "PRICE"] as const).map((sistema) => (
                    <button
                      key={sistema}
                      onClick={() => setSistemaAmortizacao(sistema)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        sistemaAmortizacao === sistema
                          ? "border-[#005CA9] bg-[#005CA9]/5"
                          : "border-[#e8e8ed] hover:border-[#005CA9]/50"
                      )}
                    >
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">{sistema}</p>
                      <p className="text-[11px] text-[#86868b] mt-1">
                        {sistema === "SAC" ? "Parcelas decrescentes" : "Parcelas fixas"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="p-5 space-y-5">
              {/* Result Card */}
              <div className="bg-gradient-to-br from-[#005CA9] to-[#003366] rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5" />
                  <p className="text-[14px] font-medium opacity-80">Parcela Estimada</p>
                </div>
                <p className="text-[36px] font-bold tracking-tight">{formatCurrency(result.parcela)}</p>
                <p className="text-[13px] opacity-70 mt-1">por mês ({result.sistemaAmortizacao})</p>

                <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] opacity-60">Programa</p>
                    <p className="text-[13px] font-medium">{result.programa}</p>
                  </div>
                  <div>
                    <p className="text-[11px] opacity-60">Taxa de Juros</p>
                    <p className="text-[13px] font-medium">{result.taxaJuros.toFixed(2)}% a.a.</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="bg-[#f5f5f7] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[13px] text-[#86868b]">Valor do Imóvel</span>
                  <span className="text-[13px] font-medium text-[#1d1d1f]">{formatCurrency(valorImovel)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-[#86868b]">Entrada</span>
                  <span className="text-[13px] font-medium text-[#34c759]">{formatCurrency(result.valorEntrada)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-[#86868b]">Valor Financiado</span>
                  <span className="text-[13px] font-medium text-[#1d1d1f]">{formatCurrency(result.valorFinanciado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-[#86868b]">Prazo</span>
                  <span className="text-[13px] font-medium text-[#1d1d1f]">{result.prazo / 12} anos ({result.prazo}x)</span>
                </div>
              </div>

              {/* Comprometimento de Renda */}
              <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-[#86868b]">Comprometimento da Renda</span>
                  <span className={cn(
                    "text-[13px] font-semibold",
                    (result.parcela / result.renda) * 100 <= 30 ? "text-[#34c759]" : "text-[#ff9500]"
                  )}>
                    {((result.parcela / result.renda) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#e8e8ed] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      (result.parcela / result.renda) * 100 <= 30 ? "bg-[#34c759]" : "bg-[#ff9500]"
                    )}
                    style={{ width: `${Math.min((result.parcela / result.renda) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#86868b] mt-2">
                  {(result.parcela / result.renda) * 100 <= 30
                    ? "✅ Dentro do limite recomendado (30%)"
                    : "⚠️ Acima do limite recomendado (30%)"}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleCopy}
                  className="w-full py-3.5 rounded-xl bg-[#25D366] text-white font-medium flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? "Copiado!" : "Copiar para WhatsApp"}
                </button>

                <button
                  onClick={openCaixaSimulator}
                  className="w-full py-3.5 rounded-xl border border-[#005CA9] text-[#005CA9] font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Simular no Site da Caixa
                </button>
              </div>

              <p className="text-[10px] text-[#86868b] text-center">
                Simulação estimada. Valores sujeitos a análise de crédito e aprovação.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
          <div className="px-5 py-4 border-t border-[#e8e8ed] bg-white">
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3.5 rounded-xl border border-[#e8e8ed] text-[15px] font-medium text-[#86868b]"
                >
                  Voltar
                </button>
              )}
              <button
                onClick={() => step === 2 ? handleSimular() : setStep(2)}
                disabled={step === 1 && (!cpf || !dataNascimento || !rendaBruta)}
                className={cn(
                  "flex-1 py-3.5 rounded-xl text-white text-[15px] font-semibold transition-all flex items-center justify-center gap-2",
                  step === 1 && (!cpf || !dataNascimento || !rendaBruta)
                    ? "bg-[#e8e8ed] text-[#86868b]"
                    : "bg-gradient-to-r from-[#005CA9] to-[#F37021] shadow-lg"
                )}
              >
                {isCalculating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Calculando...
                  </>
                ) : step === 2 ? (
                  <>
                    <Calculator className="w-5 h-5" />
                    Simular
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="px-5 py-4 border-t border-[#e8e8ed] bg-white">
            <button
              onClick={() => { setStep(1); setResult(null) }}
              className="w-full py-3.5 rounded-xl border border-[#e8e8ed] text-[15px] font-medium text-[#86868b]"
            >
              Nova Simulação
            </button>
          </div>
        )}
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
