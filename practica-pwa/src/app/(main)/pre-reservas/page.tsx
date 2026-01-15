"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Building2, User, Calendar, Zap } from "lucide-react"
import { PreReserva } from "@/types/pagamento"
import { StatusPreReserva } from "@/components/reserva/status-pagamento"
import { colors } from "@/lib/theme"
import { OrganicBackground } from "@/components/svg/SvgBackgrounds"

function PreReservasSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 py-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
          <div className="h-40 bg-gradient-to-br animate-pulse" style={{ backgroundColor: colors.bgElevated }} />
          <div className="p-4 space-y-3">
            <div className="h-4 rounded-full w-2/3 animate-pulse" style={{ backgroundColor: colors.bgElevated }} />
            <div className="h-4 rounded-full w-1/2 animate-pulse" style={{ backgroundColor: colors.bgElevated }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PreReservasPage() {
  const router = useRouter()
  const [preReservas, setPreReservas] = useState<PreReserva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreReservas()
  }, [])

  const fetchPreReservas = async () => {
    try {
      const response = await fetch("/api/pre-reservas")
      if (response.ok) {
        const data = await response.json()
        setPreReservas(data.preReservas || [])
      }
    } catch (error) {
      console.error("Erro ao buscar pré-reservas:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0
    }).format(value)
  }

  const stats = {
    total: preReservas.length,
    pendentes: preReservas.filter(r => r.status === "pendente").length,
    ativas: preReservas.filter(r => r.status === "ativa").length,
    valorTotal: preReservas.reduce((sum, r) => sum + r.plano.valorTotal, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativa": return colors.success
      case "pendente": return colors.warning
      case "concluida": return colors.secondary
      default: return colors.textTertiary
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ativa": return "Ativa"
      case "pendente": return "Pendente"
      case "concluida": return "Concluída"
      default: return "Desconhecido"
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Organic background */}
      <div className="fixed inset-0 -z-10 opacity-20">
        <OrganicBackground className="pointer-events-none opacity-20" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{
        backgroundColor: colors.bgElevated,
        borderColor: colors.surface
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight leading-none" style={{
              fontFamily: "var(--font-serif)",
              color: colors.text
            }}>
              Pré-Reservas
            </h1>
            <p className="text-[13px] mt-1" style={{ color: colors.textTertiary }}>
              {stats.total} pré-reserva{stats.total !== 1 ? 's' : ''} • {formatCurrency(stats.valorTotal)} em VGV
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">
        {loading ? (
          <PreReservasSkeleton />
        ) : preReservas.length === 0 ? (
          <div className="text-center py-32">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bgElevated }}>
              <Zap className="w-8 h-8" style={{ color: colors.textTertiary }} />
            </div>
            <p className="text-[20px] font-semibold mb-2" style={{ color: colors.text, fontFamily: "var(--font-serif)" }}>
              Nenhuma pré-reserva
            </p>
            <p className="text-[14px] max-w-xs mx-auto" style={{ color: colors.textTertiary }}>
              Crie sua primeira pré-reserva para começar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 py-8 pb-32">
            {preReservas.map((reserva, index) => (
              <button
                key={reserva.id}
                onClick={() => router.push(`/pre-reservas/${reserva.id}`)}
                className="group text-left animate-fadeIn rounded-2xl overflow-hidden transition-transform duration-300 hover:shadow-2xl"
                style={{
                  animationDelay: `${index * 50}ms`,
                  backgroundColor: colors.surface
                }}
              >
                {/* Top Section - Status & Info */}
                <div className="p-5 border-b" style={{ borderColor: colors.bgElevated }}>
                  {/* Status Badge */}
                  <div className="mb-3 inline-block px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md uppercase tracking-wider" style={{
                    backgroundColor: `${getStatusColor(reserva.status)}20`,
                    color: getStatusColor(reserva.status)
                  }}>
                    {getStatusLabel(reserva.status)}
                  </div>

                  {/* Client Name */}
                  <h3 className="text-[16px] font-semibold leading-tight mb-1 group-hover:text-primary transition-colors duration-300" style={{
                    fontFamily: "var(--font-serif)",
                    color: colors.text
                  }}>
                    {reserva.cliente.nome}
                  </h3>

                  {/* Empreendimento */}
                  <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                    {reserva.empreendimentoNome} • Apt {reserva.unidade}
                  </p>
                </div>

                {/* Middle Section - Details */}
                <div className="p-5 space-y-3 border-b" style={{ borderColor: colors.bgElevated }}>
                  {/* Valor */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: colors.textTertiary }}>
                      Valor Total
                    </p>
                    <p className="text-[18px] font-semibold" style={{ color: colors.secondary }}>
                      {formatCurrency(reserva.plano.valorTotal)}
                    </p>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div style={{ backgroundColor: colors.bgElevated }} className="p-2.5 rounded-lg">
                      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.textTertiary }}>
                        Ato
                      </p>
                      <p className="text-[12px] font-semibold" style={{ color: colors.text }}>
                        {formatCurrency(reserva.plano.ato.valor)}
                      </p>
                    </div>
                    <div style={{ backgroundColor: colors.bgElevated }} className="p-2.5 rounded-lg">
                      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.textTertiary }}>
                        Mensais
                      </p>
                      <p className="text-[12px] font-semibold" style={{ color: colors.text }}>
                        {reserva.plano.quantidadeMensais}x
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Section - CTA */}
                <div className="p-4 flex items-center justify-between" style={{ backgroundColor: colors.bgElevated }}>
                  <div className="flex items-center gap-2" style={{ color: colors.textTertiary }}>
                    <Calendar className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-[12px]">Ver detalhes</span>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-primary transition-all duration-300" style={{ backgroundColor: colors.surface }}>
                    <FileText className="w-4 h-4 transition-colors duration-300 group-hover:text-white" strokeWidth={1.5} style={{ color: colors.textTertiary }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}
