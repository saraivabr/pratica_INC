"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { 
  X, Check, Calendar, Wallet, Home, User, Share2, Copy, 
  ArrowRight, CircleDollarSign, Loader2, Building2, Sparkles, 
  Calculator, Filter, Search, SlidersHorizontal, MapPin, Zap, MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppMode } from "@/lib/useAppMode"
import { colors } from "@/lib/theme"

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

export default function EspelhoPage() {
  const { mode, toggleMode } = useAppMode()
  const { data: session } = useSession()
  const [unidades, setUnidades] = useState<UnidadeDB[]>([])
  const [empreendimentoNome, setEmpreendimentoNome] = useState("Station Park Apartamentos")
  const [loading, setLoading] = useState(true)
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeDB | null>(null)

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

  const stats = {
    total: unidades.length,
    disponiveis: unidades.filter(u => u.status === "disponivel").length,
    vgv: unidades.reduce((sum, u) => sum + u.valorTotal, 0),
    saidas: Math.floor(Math.random() * 5) + 1 // Simulando saídas da semana
  }

  const unidadesPorAndar = useMemo(() => {
    const grouped: Record<number, UnidadeDB[]> = {}
    unidades.forEach(u => {
      const andar = parseInt(u.numero.slice(0, -2)) || parseInt(u.numero.slice(0, -1))
      if (!grouped[andar]) grouped[andar] = []
      grouped[andar].push(u)
    })
    return grouped
  }, [unidades])

  const andares = Object.keys(unidadesPorAndar).map(Number).sort((a, b) => a - b)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          <p className="text-[15px]" style={{ color: colors.textTertiary }}>Carregando espelho...</p>
        </div>
      </div>
    )
  }

  // Modo Presentation (Padrão)
  if (mode === "presentation") {
    return (
      <div className="min-h-screen pb-32" style={{ backgroundColor: colors.bg }}>
        {/* Header */}
        <header className="sticky top-0 z-40 border-b" style={{ borderColor: colors.bgElevated, backgroundColor: colors.bgElevated }}>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-bold" style={{ color: colors.text }}>
                {empreendimentoNome}
              </h1>
              <div className="flex items-center gap-1.5 text-[13px]" style={{ color: colors.textTertiary }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.success }}></span>
                Disponibilidade ao vivo
              </div>
            </div>
            <button
              onClick={() => {
                toggleMode()
                vibrate([10])
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: colors.bgElevated }}
              title="Alternar modo"
            >
              <span className="text-[10px]" style={{ color: colors.textTertiary }}>M</span>
            </button>
          </div>
        </header>

        <main className="px-6 py-6">
          {/* Fala Amigável */}
          <div className="mb-6 p-4 rounded-2xl" style={{ backgroundColor: colors.bgElevated, borderLeft: `4px solid ${colors.warning}` }}>
            <p className="text-[14px] font-semibold" style={{ color: colors.text }}>
              💬 Vê só: {stats.saidas} {stats.saidas === 1 ? "unidade saiu" : "unidades saíram"} essa semana!
            </p>
          </div>

          {/* Grid 4x8 de Unidades */}
          <div className="space-y-4">
            {andares.map(andar => (
              <div key={andar} className="flex items-start gap-3">
                <div className="w-8 pt-2.5 text-right">
                  <span className="text-[13px] font-bold" style={{ color: colors.textTertiary }}>{andar}º</span>
                </div>
                <div className="flex-1 grid grid-cols-4 gap-2">
                  {unidadesPorAndar[andar]
                    .sort((a, b) => a.numero.localeCompare(b.numero))
                    .map(unidade => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case "disponivel":
                            return { bg: colors.success, text: "#000" }
                          case "reservado":
                            return { bg: colors.warning, text: "#000" }
                          case "vendido":
                            return { bg: colors.textTertiary, text: "#000" }
                          default:
                            return { bg: colors.textTertiary, text: colors.text }
                        }
                      }

                      const statusStyle = getStatusColor(unidade.status)

                      return (
                        <button
                          key={unidade.id}
                          onClick={() => {
                            if (unidade.status === "disponivel") {
                              setSelectedUnidade(unidade)
                              vibrate([10])
                            }
                          }}
                          disabled={unidade.status !== "disponivel"}
                          className={cn(
                            "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90 font-semibold",
                            unidade.status === "disponivel" ? "cursor-pointer hover:shadow-lg" : "opacity-60 cursor-not-allowed"
                          )}
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                            boxShadow: unidade.status === "disponivel" ? `0 0 16px ${colors.success}40` : "none"
                          }}
                        >
                          <span className="text-[14px]">{unidade.numero.slice(-2)}</span>
                          {unidade.status === "disponivel" && (
                            <span className="text-[10px]">{unidade.area}m</span>
                          )}
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Legenda de Status */}
          <div className="mt-8 p-4 rounded-xl" style={{ backgroundColor: colors.bgElevated }}>
            <p className="text-[11px] font-bold mb-3" style={{ color: colors.textTertiary }}>LEGENDA</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.success }}></div>
                <span className="text-[12px]" style={{ color: colors.textSecondary }}>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.warning }}></div>
                <span className="text-[12px]" style={{ color: colors.textSecondary }}>Reservado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.textTertiary }}></div>
                <span className="text-[12px]" style={{ color: colors.textSecondary }}>Vendido</span>
              </div>
            </div>
          </div>

          {/* Ações Principais */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              onClick={() => vibrate([10])}
              className="h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: colors.primary, color: colors.text }}
            >
              <Zap className="w-4 h-4" />
              Simular Caixa
            </button>
            <button
              onClick={() => vibrate([10])}
              className="h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: colors.secondary, color: "#000" }}
            >
              <MessageCircle className="w-4 h-4" />
              Enviar Cliente
            </button>
          </div>
        </main>

        {/* Modal de Unidade Selecionada */}
        {selectedUnidade && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0">
            <div 
              className="absolute inset-0"
              onClick={() => setSelectedUnidade(null)}
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            />
            <div className="relative w-full max-w-md max-h-[90vh] rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300" style={{ backgroundColor: colors.bgElevated }}>
              <div className="bg-gradient-to-r px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: colors.surface, background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                <div>
                  <h2 className="text-[20px] font-bold text-white">Apt {selectedUnidade.numero}</h2>
                  <p className="text-[12px] text-white/80">{selectedUnidade.area}m² • {selectedUnidade.dormitorios} Dorms</p>
                </div>
                <button 
                  onClick={() => setSelectedUnidade(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6 space-y-4 scrollbar-hide pb-24">
                <div className="p-4 rounded-xl" style={{ backgroundColor: colors.surface }}>
                  <p className="text-[11px]" style={{ color: colors.textTertiary }}>VALOR DE TABELA</p>
                  <p className="text-[28px] font-bold mt-1" style={{ color: colors.success }}>
                    {formatCurrency(selectedUnidade.valorTotal)}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t p-4 flex gap-2" style={{ background: `linear-gradient(to top, ${colors.bgElevated}, transparent)`, paddingTop: "2rem" }}>
                <button
                  onClick={() => setSelectedUnidade(null)}
                  className="flex-1 h-12 rounded-xl font-semibold"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  Voltar
                </button>
                <button
                  className="flex-1 h-12 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: colors.secondary, color: "#000" }}
                >
                  <Zap className="w-4 h-4" />
                  Reservar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Modo Work (Compacto)
  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ borderColor: colors.bgElevated, backgroundColor: colors.bgElevated }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold" style={{ color: colors.text }}>
              Modo Trabalho
            </h1>
            <p className="text-[12px]" style={{ color: colors.textTertiary }}>
              {stats.total} unidades | {stats.disponiveis} disponíveis
            </p>
          </div>
          <button
            onClick={() => {
              toggleMode()
              vibrate([10])
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{ backgroundColor: colors.bgElevated }}
            title="Alternar modo"
          >
            <span className="text-[10px]" style={{ color: colors.textTertiary }}>M</span>
          </button>
        </div>
      </header>

      <main className="px-6 py-4">
        {/* Filtro Rápido */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { label: "Todos", value: null },
            { label: "1 Dorm", value: 1 },
            { label: "2 Dorm", value: 2 },
          ].map(filter => (
            <button
              key={filter.value}
              className="flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-all"
              style={{ backgroundColor: colors.bgElevated, color: colors.textSecondary }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Lista de Unidades */}
        <div className="space-y-2">
          {unidades.map(unidade => {
            const statusLabel = {
              disponivel: "Disponível",
              reservado: "Reservado",
              vendido: "Vendido"
            }[unidade.status] || "N/A"

            const statusColor = {
              disponivel: colors.success,
              reservado: colors.warning,
              vendido: colors.textTertiary
            }[unidade.status] || colors.textTertiary

            return (
              <div
                key={unidade.id}
                onClick={() => {
                  if (unidade.status === "disponivel") {
                    setSelectedUnidade(unidade)
                    vibrate([10])
                  }
                }}
                className={cn(
                  "p-3 rounded-lg transition-all",
                  unidade.status === "disponivel" ? "cursor-pointer hover:shadow-lg" : "opacity-60 cursor-not-allowed"
                )}
                style={{ backgroundColor: colors.bgElevated }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: statusColor, color: statusColor === colors.success || statusColor === colors.warning ? "#000" : colors.text }}>
                      {unidade.numero.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold" style={{ color: colors.text }}>
                        Apt {unidade.numero} • {unidade.area}m²
                      </p>
                      <p className="text-[11px]" style={{ color: colors.textTertiary }}>
                        {unidade.dormitorios} dorms • {formatCurrency(unidade.valorTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold" style={{ color: statusColor }}>
                      {statusLabel}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Modal de Unidade Selecionada */}
      {selectedUnidade && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0">
          <div 
            className="absolute inset-0"
            onClick={() => setSelectedUnidade(null)}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          />
          <div className="relative w-full max-w-md max-h-[90vh] rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300" style={{ backgroundColor: colors.bgElevated }}>
            <div className="bg-gradient-to-r px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: colors.surface, background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
              <div>
                <h2 className="text-[18px] font-bold text-white">Apt {selectedUnidade.numero}</h2>
                <p className="text-[11px] text-white/80">{selectedUnidade.area}m² • {selectedUnidade.dormitorios} Dorms</p>
              </div>
              <button 
                onClick={() => setSelectedUnidade(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-3 scrollbar-hide pb-24">
              <div className="p-3 rounded-lg" style={{ backgroundColor: colors.surface }}>
                <p className="text-[10px]" style={{ color: colors.textTertiary }}>VALOR</p>
                <p className="text-[24px] font-bold mt-1" style={{ color: colors.success }}>
                  {formatCurrency(selectedUnidade.valorTotal)}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: colors.surface }}>
                <p className="text-[10px]" style={{ color: colors.textTertiary }}>ÁREA</p>
                <p className="text-[16px] font-semibold" style={{ color: colors.text }}>
                  {selectedUnidade.area}m²
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: colors.surface }}>
                <p className="text-[10px]" style={{ color: colors.textTertiary }}>DORMITÓRIOS</p>
                <p className="text-[16px] font-semibold" style={{ color: colors.text }}>
                  {selectedUnidade.dormitorios}
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t p-4 flex gap-2" style={{ background: `linear-gradient(to top, ${colors.bgElevated}, transparent)`, paddingTop: "2rem" }}>
              <button
                onClick={() => setSelectedUnidade(null)}
                className="flex-1 h-10 rounded-lg font-medium text-[13px]"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              >
                Voltar
              </button>
              <button
                className="flex-1 h-10 rounded-lg font-medium text-[13px] flex items-center justify-center gap-1"
                style={{ backgroundColor: colors.secondary, color: "#000" }}
              >
                <Zap className="w-3 h-3" />
                Ação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
