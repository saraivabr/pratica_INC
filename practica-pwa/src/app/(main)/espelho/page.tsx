"use client"

import { useState } from "react"
import { ChevronDown, Lock, Zap, TrendingUp, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// Dados mockados do espelho de vendas
const empreendimentos = [
  { id: "aura", nome: "Aura by Pratica", torres: 1, andares: 22, unidadesPorAndar: 4 },
  { id: "colatinna", nome: "Colatinna 56", torres: 1, andares: 21, unidadesPorAndar: 8 },
  { id: "giardino", nome: "Giardino Verticale", torres: 1, andares: 15, unidadesPorAndar: 4 },
]

// Gerar unidades mockadas com status aleatório
const generateUnidades = (andares: number, porAndar: number) => {
  const unidades: Record<string, { status: string; preco: number; area: number }> = {}
  const statusOptions = ["disponivel", "disponivel", "disponivel", "reservado", "vendido", "bloqueado"]

  for (let andar = andares; andar >= 1; andar--) {
    for (let unidade = 1; unidade <= porAndar; unidade++) {
      const id = `${andar.toString().padStart(2, "0")}${unidade.toString().padStart(2, "0")}`
      const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)]
      unidades[id] = {
        status: randomStatus,
        preco: 380000 + (andar * 5000) + (unidade * 2000),
        area: 40 + (unidade * 2),
      }
    }
  }
  return unidades
}

const statusConfig = {
  disponivel: { color: "bg-emerald-500", label: "Disponível", textColor: "text-emerald-700" },
  reservado: { color: "bg-amber-400", label: "Reservado", textColor: "text-amber-700" },
  vendido: { color: "bg-red-400", label: "Vendido", textColor: "text-red-700" },
  bloqueado: { color: "bg-gray-400", label: "Bloqueado", textColor: "text-gray-600" },
}

export default function EspelhoPage() {
  const [selectedEmp, setSelectedEmp] = useState(empreendimentos[0])
  const [showSelector, setShowSelector] = useState(false)
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null)
  const [unidades] = useState(() => generateUnidades(selectedEmp.andares, selectedEmp.unidadesPorAndar))

  const stats = {
    disponivel: Object.values(unidades).filter(u => u.status === "disponivel").length,
    reservado: Object.values(unidades).filter(u => u.status === "reservado").length,
    vendido: Object.values(unidades).filter(u => u.status === "vendido").length,
  }

  const selectedData = selectedUnidade ? unidades[selectedUnidade] : null

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[#E5E2DC]">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#C9A962] text-xs font-semibold tracking-[0.15em] uppercase mb-1">
                Disponibilidade
              </p>
              <h1 className="font-display text-3xl font-semibold text-[#1B4332]">
                Espelho de Vendas
              </h1>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4332]/10 rounded-full">
              <Zap className="w-3.5 h-3.5 text-[#C9A962]" />
              <span className="text-[10px] font-semibold text-[#1B4332] uppercase tracking-wider">
                Em breve
              </span>
            </div>
          </div>

          {/* Seletor de Empreendimento */}
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-[#E5E2DC] transition-all hover:border-[#1B4332]/30"
          >
            <div className="text-left">
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-0.5">Empreendimento</p>
              <p className="font-semibold text-[#1A1A1A]">{selectedEmp.nome}</p>
            </div>
            <ChevronDown className={cn("w-5 h-5 text-[#8A8A8A] transition-transform", showSelector && "rotate-180")} />
          </button>

          {showSelector && (
            <div className="mt-2 bg-white rounded-xl border border-[#E5E2DC] overflow-hidden animate-fade-in">
              {empreendimentos.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmp(emp)
                    setShowSelector(false)
                  }}
                  className={cn(
                    "w-full p-4 text-left border-b border-[#F0EDE8] last:border-0 transition-colors",
                    emp.id === selectedEmp.id ? "bg-[#1B4332]/5" : "hover:bg-[#FAF9F7]"
                  )}
                >
                  <p className="font-medium text-[#1A1A1A]">{emp.nome}</p>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    {emp.torres} torre • {emp.andares} andares • {emp.unidadesPorAndar * emp.andares} unidades
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="px-5 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-[#E5E2DC]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Disponível</span>
            </div>
            <p className="text-2xl font-display font-semibold text-[#1B4332]">{stats.disponivel}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E5E2DC]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Reservado</span>
            </div>
            <p className="text-2xl font-display font-semibold text-amber-600">{stats.reservado}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E5E2DC]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Vendido</span>
            </div>
            <p className="text-2xl font-display font-semibold text-red-500">{stats.vendido}</p>
          </div>
        </div>

        {/* Espelho Visual */}
        <div className="bg-white rounded-2xl border border-[#E5E2DC] overflow-hidden">
          {/* Header do Espelho */}
          <div className="px-4 py-3 border-b border-[#F0EDE8] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Torre A</p>
              <p className="text-[10px] text-[#8A8A8A]">{selectedEmp.andares} andares</p>
            </div>
            <div className="flex items-center gap-3">
              {Object.entries(statusConfig).slice(0, 3).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={cn("w-2.5 h-2.5 rounded-sm", config.color)} />
                  <span className="text-[10px] text-[#8A8A8A]">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid de Unidades */}
          <div className="p-4 overflow-x-auto">
            <div className="min-w-fit">
              {/* Labels das colunas */}
              <div className="flex gap-1.5 mb-2 pl-10">
                {Array.from({ length: selectedEmp.unidadesPorAndar }, (_, i) => (
                  <div key={i} className="w-12 text-center">
                    <span className="text-[10px] text-[#8A8A8A] font-medium">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Andares */}
              <div className="space-y-1.5">
                {Array.from({ length: Math.min(selectedEmp.andares, 15) }, (_, i) => {
                  const andar = selectedEmp.andares - i
                  return (
                    <div key={andar} className="flex items-center gap-1.5">
                      <div className="w-8 text-right">
                        <span className="text-xs text-[#8A8A8A] font-medium">{andar}º</span>
                      </div>
                      <div className="flex gap-1.5">
                        {Array.from({ length: selectedEmp.unidadesPorAndar }, (_, j) => {
                          const unidadeId = `${andar.toString().padStart(2, "0")}${(j + 1).toString().padStart(2, "0")}`
                          const unidade = unidades[unidadeId]
                          const status = unidade?.status || "disponivel"
                          const isSelected = selectedUnidade === unidadeId

                          return (
                            <button
                              key={unidadeId}
                              onClick={() => setSelectedUnidade(isSelected ? null : unidadeId)}
                              className={cn(
                                "w-12 h-10 rounded-lg text-[10px] font-semibold transition-all duration-200",
                                statusConfig[status as keyof typeof statusConfig].color,
                                status === "disponivel" ? "text-white" : "text-white/90",
                                isSelected && "ring-2 ring-[#1B4332] ring-offset-2 scale-105"
                              )}
                            >
                              {unidadeId}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedEmp.andares > 15 && (
                <p className="text-center text-[10px] text-[#8A8A8A] mt-3">
                  +{selectedEmp.andares - 15} andares...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Detalhes da Unidade Selecionada */}
        {selectedData && (
          <div className="mt-4 bg-white rounded-2xl border border-[#E5E2DC] p-5 animate-scale-in">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Unidade</p>
                <p className="text-2xl font-display font-semibold text-[#1A1A1A]">{selectedUnidade}</p>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold",
                statusConfig[selectedData.status as keyof typeof statusConfig].color,
                "text-white"
              )}>
                {statusConfig[selectedData.status as keyof typeof statusConfig].label}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Area Privativa</p>
                <p className="text-lg font-semibold text-[#1A1A1A]">{selectedData.area}m²</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Valor</p>
                <p className="text-lg font-semibold text-[#1B4332]">
                  R$ {selectedData.preco.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            {/* Ações - Em Breve */}
            <div className="space-y-3">
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 h-12 bg-[#F0EDE8] text-[#8A8A8A] rounded-xl font-medium"
              >
                <Lock className="w-4 h-4" />
                Reservar Unidade
                <span className="text-[10px] bg-[#1B4332]/10 text-[#1B4332] px-2 py-0.5 rounded-full ml-2">
                  Em breve
                </span>
              </button>
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 h-12 bg-[#F0EDE8] text-[#8A8A8A] rounded-xl font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                Simular Financiamento
                <span className="text-[10px] bg-[#1B4332]/10 text-[#1B4332] px-2 py-0.5 rounded-full ml-2">
                  Em breve
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Card de Integração */}
        <div className="mt-6 bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] rounded-2xl p-5 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-[#C9A962]" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold mb-1">Integracao CVCRM</h3>
              <p className="text-white/70 text-sm mb-3">
                Em breve, dados em tempo real do espelho de vendas, valores atualizados e reservas instantaneas.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full">Mapa de Disponibilidade</span>
                <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full">Tabela de Precos</span>
                <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full">Reservas Online</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
