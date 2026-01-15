"use client"

import { useState, useMemo } from "react"
import { getRandomCopy } from "@/lib/copywriting"
import { PropostaCard } from "@/components/propostas/PropostaCard"
import { Zap, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react"
import { colors } from "@/lib/theme"
import { OrganicBackground } from "@/components/svg/SvgBackgrounds"
import { EmptyDocumentIllustration } from "@/components/svg/SvgIllustrations"

// Mock data
const mockPropostas = [
  {
    id: "1",
    clienteNome: "João Silva",
    empreendimento: "Station Park",
    unidade: "501",
    valor: 850000,
    status: "ativa" as const,
    criadoEm: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: "2",
    clienteNome: "Maria Santos",
    empreendimento: "Aura Guilhermina",
    unidade: "302",
    valor: 650000,
    status: "pendente" as const,
    criadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "3",
    clienteNome: "Carlos Costa",
    empreendimento: "Station Park",
    unidade: "801",
    valor: 1200000,
    status: "concluida" as const,
    criadoEm: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    clienteNome: "Ana Oliveira",
    empreendimento: "Aura Guilhermina",
    unidade: "105",
    valor: 520000,
    status: "cancelada" as const,
    criadoEm: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    clienteNome: "Pedro Alves",
    empreendimento: "Station Park",
    unidade: "602",
    valor: 950000,
    status: "ativa" as const,
    criadoEm: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "6",
    clienteNome: "Beatriz Lima",
    empreendimento: "Aura Guilhermina",
    unidade: "201",
    valor: 580000,
    status: "pendente" as const,
    criadoEm: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
]

function PropostasSkeleton() {
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

function StatCard({
  icon: Icon,
  label,
  value,
  colorBg,
  colorText,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  colorBg: string
  colorText: string
}) {
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-300 hover:shadow-lg"
      style={{
        backgroundColor: colorBg,
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="opacity-80" style={{ color: colorText }}>
          {Icon}
        </div>
        <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: colorText, opacity: 0.8 }}>
          {label}
        </p>
      </div>
      <p className="text-[24px] font-bold" style={{ color: colorText }}>
        {value}
      </p>
    </div>
  )
}

export default function PropostasPage() {
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
  }

  const handleDelete = (id: string) => {
    setPropostas(propostas.filter((p) => p.id !== id))
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
              Propostas
            </h1>
            <p className="text-[13px] mt-1" style={{ color: colors.textTertiary }}>
              {motivationalCopy}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">
        <div className="px-6 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatCard
              icon={<Zap className="w-5 h-5" strokeWidth={2} />}
              label="Ativas"
              value={stats.ativas}
              colorBg={`${colors.primary}20`}
              colorText={colors.primary}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" strokeWidth={2} />}
              label="Pendentes"
              value={stats.pendentes}
              colorBg={`${colors.warning}20`}
              colorText={colors.warning}
            />
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5" strokeWidth={2} />}
              label="Concluídas"
              value={stats.concluidas}
              colorBg={`${colors.success}20`}
              colorText={colors.success}
            />
          </div>

          {/* Propostas Grid */}
          {propostas.length === 0 ? (
            <div className="text-center py-32">
              <div className="mx-auto mb-6 w-20 h-20 animate-float">
                <EmptyDocumentIllustration className="w-full h-full" />
              </div>
              <p className="text-[20px] font-semibold mb-2 animate-slideInRight" style={{ color: colors.text, fontFamily: "var(--font-serif)" }}>
                Nenhuma proposta
              </p>
              <p className="text-[14px] max-w-xs mx-auto animate-slideInLeft" style={{ color: colors.textTertiary }}>
                Crie sua primeira proposta para começar a acompanhar suas vendas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32">
              {propostas.map((proposta, index) => (
                <div
                  key={proposta.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
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
        </div>
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
