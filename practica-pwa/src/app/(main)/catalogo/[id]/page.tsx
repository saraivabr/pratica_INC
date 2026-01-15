"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Heart, MapPin, Train, Building2, Check, Dumbbell, CreditCard, ChevronLeft, ArrowUpRight } from "lucide-react"
import { ShareSheet } from "@/components/catalogo/share-sheet"
import { useFavorites } from "@/hooks/use-favorites"
import { formatarPreco, cn } from "@/lib/utils"
import { Empreendimento } from "@/types/empreendimento"
import { EmpreendimentoEspelho } from "@/components/catalogo/empreendimento-espelho"

const statusConfig = {
  em_construcao: { label: "Em Obras", className: "bg-[#ff9500] text-white" },
  lancamento: { label: "Lançamento", className: "bg-[#1d1d1f] text-white" },
  entregue: { label: "Pronto", className: "bg-[#34c759] text-white" },
}

const defaultPlaceholder = "https://praticaincorporadora.com.br/assets/new-images/aura-guilhermina/praticaincorporadora-aura-guilhermina-hero.jpg"

// Dados Mockados para Enriquecimento (já que a busca falhou)
const dadosMercado = {
  valor_m2_regiao: "R$ 8.500",
  valorizacao_anual: "12%",
  bairro_score: 8.5
}

const galeriaImagens = [
  "https://images.unsplash.com/photo-1600596542815-2a42920879f4?q=80&w=1000&auto=format&fit=crop", // Sala
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop", // Fachada
  "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=1000&auto=format&fit=crop", // Piscina
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1000&auto=format&fit=crop"  // Quarto
]

export default function EmpreendimentoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { toggle, isFavorite } = useFavorites()
  const [empreendimento, setEmpreendimento] = useState<Empreendimento | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const favorited = empreendimento ? isFavorite(empreendimento.id) : false

  useEffect(() => {
    async function fetchEmpreendimento() {
      try {
        setLoading(true)
        const res = await fetch(`/api/empreendimentos/${id}`)

        if (!res.ok) {
          throw new Error("Empreendimento não encontrado")
        }

        const data = await res.json()
        setEmpreendimento(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchEmpreendimento()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <div className="h-72 bg-[#e8e8ed] animate-pulse" />
        <div className="p-5 space-y-4">
          <div className="h-7 bg-[#e8e8ed] rounded-lg w-3/4 animate-pulse" />
          <div className="h-5 bg-[#e8e8ed] rounded-lg w-1/2 animate-pulse" />
          <div className="h-24 bg-[#e8e8ed] rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !empreendimento) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-8">
        <Building2 className="w-16 h-16 text-[#86868b] mb-4" />
        <p className="text-[16px] text-[#86868b] font-medium">{error || "Empreendimento não encontrado"}</p>
        <button onClick={() => router.back()} className="mt-6 px-6 py-2.5 bg-[#0071e3] text-white rounded-xl font-medium">Voltar</button>
      </div>
    )
  }

  const status = statusConfig[empreendimento.status] || { label: "Disponível", className: "bg-gray-500" }
  const preco = empreendimento.tipologias?.[0]?.preco_base
  const imageUrl = empreendimento.imagemCapa || defaultPlaceholder

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-32">
      {/* Header Transparente ao Scroll */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f7]/90 backdrop-blur-xl border-b border-[#d2d2d7]/50 transition-all">
        <div className="flex items-center justify-between px-5 h-14">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 shadow-sm border border-[#e8e8ed]">
            <ChevronLeft className="w-5 h-5 text-[#1d1d1f]" />
          </button>
          <span className="text-[14px] font-semibold text-[#1d1d1f] truncate opacity-90">
            {empreendimento.nome}
          </span>
          <button
            onClick={() => toggle(empreendimento.id)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 shadow-sm border border-[#e8e8ed]"
          >
            <Heart className={cn("w-5 h-5", favorited ? "fill-[#ff3b30] text-[#ff3b30]" : "text-[#1d1d1f]")} />
          </button>
        </div>
      </header>

      {/* Hero Image */}
      <div className="relative h-[400px] bg-[#e8e8ed]">
        <img
          src={imageUrl}
          alt={empreendimento.nome}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f5f5f7] via-transparent to-black/20" />
        
        <div className="absolute bottom-6 left-5 right-5">
          <div className={cn(
            "inline-flex px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide mb-3 shadow-lg",
            status.className
          )}>
            {status.label}
          </div>
          <h1 className="text-[32px] font-bold text-[#1d1d1f] leading-tight mb-1">
            {empreendimento.nome}
          </h1>
          <div className="flex items-center gap-1.5 text-[#86868b]">
            <MapPin className="w-4 h-4" />
            <span className="text-[14px] font-medium">{empreendimento.localizacao.bairro}, SP</span>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 relative z-10 space-y-8">
        
        {/* Galeria Rápida */}
        <section className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {galeriaImagens.map((img, i) => (
            <div key={i} className="snap-center flex-shrink-0 w-32 h-24 rounded-xl overflow-hidden shadow-sm border border-white">
              <img src={img} className="w-full h-full object-cover" alt={`Ambiente ${i}`} />
            </div>
          ))}
        </section>

        {/* Dados de Mercado (Inteligência) */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#e8e8ed]">
          <h3 className="text-[13px] font-bold text-[#1d1d1f] mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-[#0071e3]" />
            Inteligência de Mercado
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#f5f5f7] rounded-xl">
              <p className="text-[11px] text-[#86868b] font-medium">Média da Região</p>
              <p className="text-[16px] font-bold text-[#1d1d1f]">{dadosMercado.valor_m2_regiao}<span className="text-[10px] font-normal">/m²</span></p>
            </div>
            <div className="p-3 bg-[#f5f5f7] rounded-xl">
              <p className="text-[11px] text-[#86868b] font-medium">Valorização/Ano</p>
              <p className="text-[16px] font-bold text-[#34c759]">+{dadosMercado.valorizacao_anual}</p>
            </div>
          </div>
        </section>

        {/* Espelho de Vendas (INTEGRADO) */}
        <section>
          <EmpreendimentoEspelho empreendimentoId={empreendimento.id} />
        </section>

        {/* Tipologias */}
        {empreendimento.tipologias && empreendimento.tipologias.length > 0 && (
          <section>
            <h2 className="text-[18px] font-bold text-[#1d1d1f] mb-4">Plantas</h2>
            <div className="space-y-3">
              {empreendimento.tipologias.map((tip, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-[#e8e8ed] flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-[16px] font-bold text-[#1d1d1f]">{tip.area_m2}m²</p>
                    <p className="text-[13px] text-[#86868b] mt-0.5">{tip.dormitorios} Dorms • {tip.suites || 0} Suítes</p>
                  </div>
                  {tip.preco_base && (
                    <div className="text-right">
                      <p className="text-[11px] text-[#86868b]">A partir de</p>
                      <p className="text-[16px] font-bold text-[#0071e3]">R$ {formatarPreco(tip.preco_base)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lazer e Diferenciais */}
        {empreendimento.lazer && (
          <section>
            <h2 className="text-[18px] font-bold text-[#1d1d1f] mb-4">Lazer e Diferenciais</h2>
            <div className="flex flex-wrap gap-2">
              {empreendimento.lazer.map((item, i) => (
                <span key={i} className="px-3 py-1.5 bg-white border border-[#e8e8ed] rounded-full text-[13px] font-medium text-[#1d1d1f] shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
