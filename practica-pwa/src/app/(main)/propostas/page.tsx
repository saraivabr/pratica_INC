"use client"

import { useState, useMemo } from "react"
import { useAppMode } from "@/hooks/useAppMode"
import { getRandomCopy } from "@/lib/copywriting"
import { PropostaCard } from "@/components/propostas/PropostaCard"
import { Zap, TrendingUp, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data - replace with real data from API/DB
const mockPropostas = [
  {
    id: "1",
    clienteNome: "João Silva",
    empreendimento: "Station Park",
    unidade: "501",
    valor: 850000,
    status: "ativa" as const,
    criadoEm: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    id: "2",
    clienteNome: "Maria Santos",
    empreendimento: "Aura Guilhermina",
    unidade: "302",
    valor: 650000,
    status: "pendente" as const,
    criadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: "3",
    clienteNome: "Carlos Costa",
    empreendimento: "Station Park",
    unidade: "801",
    valor: 1200000,
    status: "concluida" as const,
    criadoEm: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  },
  {
    id: "4",
    clienteNome: "Ana Oliveira",
    empreendimento: "Aura Guilhermina",
    unidade: "105",
    valor: 520000,
    status: "cancelada" as const,
    criadoEm: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  },
  {
    id: "5",
    clienteNome: "Pedro Alves",
    empreendimento: "Station Park",
    unidade: "602",
    valor: 950000,
    status: "ativa" as const,
    criadoEm: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "6",
    clienteNome: "Beatriz Lima",
    empreendimento: "Aura Guilhermina",
    unidade: "201",
    valor: 580000,
    status: "pendente" as const,
    criadoEm: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  },
]

function PulsingCircle() {
  return (
    <svg
      className="w-24 h-24 mx-auto text-[#4ECDC4]"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer pulsing circle */}
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.2"
        className="animate-pulse"
      />

      {/* Middle pulsing circle */}
      <circle
        cx="50"
        cy="50"
        r="35"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
        className="animate-pulse"
        style={{ animationDelay: "0.1s" }}
      />

      {/* Inner pulsing circle */}
      <circle
        cx="50"
        cy="50"
        r="25"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.6"
        className="animate-pulse"
        style={{ animationDelay: "0.2s" }}
      />

      {/* Center dot */}
      <circle cx="50" cy="50" r="8" fill="currentColor" />

      {/* Animated ring */}
      <circle
        cx="50"
        cy="50"
        r="40"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        className="animate-spin"
        style={{ animationDuration: "4s", opacity: 0.3 }}
      />
    </svg>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: "coral" | "yellow" | "green"
}) {
  const colorClasses = {
    coral: "bg-orange-500/20 text-orange-500 border-orange-500/30",
    yellow: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    green: "bg-green-500/20 text-green-500 border-green-500/30",
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-105",
        colorClasses[color]
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-current opacity-10 flex items-center justify-center">
          {Icon}
        </div>
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-[28px] font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function PropostasPage() {
  const { mode } = useAppMode()
  const isPresentation = mode === "presentation"
  const [propostas, setPropostas] = useState(mockPropostas)

  const motivationalCopy = useMemo(() => getRandomCopy("propostas"), [])

  const stats = useMemo(() => {
    const ativas = propostas.filter((p) => p.status === "ativa").length
    const concluidas = propostas.filter((p) => p.status === "concluida").length
    const pendentes = propostas.filter((p) => p.status === "pendente").length
    const totalValor = propostas.reduce((sum, p) => sum + p.valor, 0)

    return { ativas, concluidas, pendentes, totalValor }
  }, [propostas])

  const handleShare = (id: string) => {
    console.log("Compartilhar proposta:", id)
    // Implement share logic
  }

  const handleDelete = (id: string) => {
    setPropostas(propostas.filter((p) => p.id !== id))
  }

  if (isPresentation) {
    return (
      <div className="min-h-screen bg-[#0F1419] text-white">
        {/* Grain texture overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-2xl border-b border-[#2A3142]/50 bg-[#0F1419]/90">
          <div className="px-6 pt-16 pb-8">
            {/* Title Section */}
            <div>
              <div className="w-8 h-0.5 bg-gradient-to-r from-[#4ECDC4] to-[#45B8AF] mb-3 rounded-full" />
              <h1 className="text-[36px] font-bold tracking-tight leading-none mb-2">
                Propostas
              </h1>
              <p className="text-[14px] text-gray-400 tracking-wide">
                {motivationalCopy}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-8 pb-32">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatCard
              icon={<Zap className="w-5 h-5" strokeWidth={2} />}
              label="Propostas Ativas"
              value={stats.ativas}
              color="coral"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" strokeWidth={2} />}
              label="Pendentes"
              value={stats.pendentes}
              color="yellow"
            />
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5" strokeWidth={2} />}
              label="Concluídas"
              value={stats.concluidas}
              color="green"
            />
          </div>

          {/* Propostas Grid */}
          {propostas.length === 0 ? (
            <div className="text-center py-20">
              <div className="mb-8">
                <PulsingCircle />
              </div>
              <p className="text-[20px] font-semibold mb-2">Nenhuma proposta ainda</p>
              <p className="text-gray-400 max-w-xs mx-auto">
                Crie sua primeira proposta para começar a acompanhar suas vendas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {propostas.map((proposta, index) => (
                <div
                  key={proposta.id}
                  className="animate-slideUp"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <PropostaCard
                    proposta={proposta}
                    onShare={handleShare}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bottom flourish */}
          {propostas.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <div className="w-1 h-1 rounded-full bg-[#4ECDC4]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ECDC4]/80" />
              <div className="w-1 h-1 rounded-full bg-[#4ECDC4]" />
            </div>
          )}

          {/* Pulsing circle at the end */}
          {propostas.length > 0 && (
            <div className="mt-16 pb-8">
              <PulsingCircle />
            </div>
          )}
        </main>

        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slideUp {
            animation: slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
      </div>
    )
  }

  // Work Mode
  return (
    <div className="min-h-screen bg-white">
      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl border-b border-gray-100/50 bg-white/80">
        <div className="px-6 pt-16 pb-6 max-w-4xl mx-auto">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="w-8 h-0.5 bg-gradient-to-r from-amber-600 to-amber-400 mb-3 rounded-full" />
              <h1 className="text-[28px] font-semibold text-stone-900 tracking-tight">
                Propostas
              </h1>
              <p className="text-[13px] text-stone-500 mt-1">
                {propostas.length} proposta(s) no total
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-4 pb-24 max-w-4xl mx-auto">
        {propostas.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-600 font-medium mb-2">Nenhuma proposta</p>
            <p className="text-stone-400 text-sm">
              Suas propostas aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {propostas.map((proposta, index) => (
              <div
                key={proposta.id}
                className="animate-slideUp"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PropostaCard
                  proposta={proposta}
                  onShare={handleShare}
                  onDelete={handleDelete}
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}