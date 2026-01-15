"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Building2, User, ChevronRight, Calendar, Search } from "lucide-react"
import { PreReserva } from "@/types/pagamento"
import { StatusPreReserva } from "@/components/reserva/status-pagamento"

export default function PreReservasPage() {
  const router = useRouter()
  const [preReservas, setPreReservas] = useState<PreReserva[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"todas" | "pendente" | "ativa" | "concluida">("todas")
  const [search, setSearch] = useState("")

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short"
    })
  }

  const filteredPreReservas = preReservas
    .filter(r => filter === "todas" || r.status === filter)
    .filter(r =>
      search === "" ||
      r.cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.empreendimentoNome.toLowerCase().includes(search.toLowerCase()) ||
      r.unidade.includes(search)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const stats = {
    total: preReservas.length,
    pendentes: preReservas.filter(r => r.status === "pendente").length,
    ativas: preReservas.filter(r => r.status === "ativa").length,
    valorTotal: preReservas.reduce((sum, r) => sum + r.plano.valorTotal, 0)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="px-5 pt-14 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                Pré-Reservas
              </h1>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                {stats.total} pré-reserva{stats.total !== 1 ? "s" : ""} | {formatCurrency(stats.valorTotal)} em VGV
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34c759]/10 rounded-full">
              <FileText className="w-3.5 h-3.5 text-[#34c759]" />
              <span className="text-[11px] font-semibold text-[#34c759]">
                {stats.ativas} ativa{stats.ativas !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, empreendimento..."
              className="w-full h-11 pl-12 pr-4 bg-white rounded-xl border border-[#e8e8ed] text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3]"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
            {(["todas", "pendente", "ativa", "concluida"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  filter === f
                    ? "bg-[#0071e3] text-white"
                    : "bg-white text-[#1d1d1f] border border-[#e8e8ed]"
                }`}
              >
                {f === "todas" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== "todas" && (
                  <span className="ml-1 opacity-70">
                    ({preReservas.filter(r => r.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-5 py-5 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#0071e3]/30 border-t-[#0071e3] rounded-full animate-spin" />
          </div>
        ) : filteredPreReservas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[17px] font-medium text-[#1d1d1f]">
              {search || filter !== "todas" ? "Nenhuma pré-reserva encontrada" : "Nenhuma pré-reserva ainda"}
            </p>
            <p className="text-[13px] text-[#86868b] mt-1">
              {search || filter !== "todas"
                ? "Tente ajustar os filtros"
                : "Comece pelo Espelho de Vendas"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPreReservas.map((preReserva) => (
              <button
                key={preReserva.id}
                onClick={() => router.push(`/pre-reservas/${preReserva.id}`)}
                className="w-full bg-white rounded-2xl border border-[#e8e8ed] p-4 text-left transition-all hover:border-[#0071e3]/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#0071e3]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">
                        {preReserva.empreendimentoNome}
                      </p>
                      <p className="text-[12px] text-[#86868b]">
                        Unidade {preReserva.unidade} | {preReserva.tipologia.area_m2}m²
                      </p>
                    </div>
                  </div>
                  <StatusPreReserva status={preReserva.status} size="sm" />
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
                    <User className="w-4 h-4" />
                    <span>{preReserva.cliente.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(preReserva.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f5f5f7]">
                  <div>
                    <p className="text-[11px] text-[#86868b] mb-0.5">Valor Total</p>
                    <p className="text-[17px] font-bold text-[#0071e3]">
                      {formatCurrency(preReserva.plano.valorTotal)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#86868b]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
