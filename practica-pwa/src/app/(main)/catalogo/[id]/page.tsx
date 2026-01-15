"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Heart, MapPin, Train, Building2, Check, Dumbbell, CreditCard, ChevronLeft } from "lucide-react"
import { ShareSheet } from "@/components/catalogo/share-sheet"
import { useFavorites } from "@/hooks/use-favorites"
import { formatarPreco, cn } from "@/lib/utils"
import { Empreendimento } from "@/types/empreendimento"

const statusConfig = {
  em_construcao: { label: "Em Construção", className: "bg-[#ff9500] text-white" },
  lancamento: { label: "Lançamento", className: "bg-[#1d1d1f] text-white" },
  entregue: { label: "Pronto", className: "bg-[#34c759] text-white" },
}

const defaultPlaceholder = "https://praticaincorporadora.com.br/assets/new-images/aura-guilhermina/praticaincorporadora-aura-guilhermina-hero.jpg"

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
      <div className="min-h-screen bg-[#f5f5f7]">
        <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
          <div className="flex items-center gap-3 px-5 h-14">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-[#e8e8ed] transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#1d1d1f]" />
            </button>
            <span className="text-[17px] font-semibold text-[#1d1d1f]">Erro</span>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center p-8 pt-24">
          <div className="w-20 h-20 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6">
            <Building2 className="w-10 h-10 text-[#86868b]" />
          </div>
          <p className="text-[15px] text-[#86868b] text-center font-medium">
            {error || "Empreendimento não encontrado"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 px-6 py-3 bg-[#0071e3] text-white text-[15px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const status = statusConfig[empreendimento.status]
  const preco = empreendimento.tipologias?.[0]?.preco_base
  const imageUrl = empreendimento.imagemCapa || defaultPlaceholder

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="flex items-center justify-between px-5 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-[#e8e8ed] transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#1d1d1f]" />
          </button>
          <span className="text-[15px] font-semibold text-[#1d1d1f] truncate max-w-[200px]">
            {empreendimento.nome}
          </span>
          <button
            onClick={() => toggle(empreendimento.id)}
            className={cn(
              "p-2 -mr-2 rounded-full transition-all",
              favorited
                ? "bg-[#ff3b30]/10 text-[#ff3b30]"
                : "hover:bg-[#e8e8ed] text-[#86868b]"
            )}
          >
            <Heart className={cn("w-5 h-5", favorited && "fill-current")} />
          </button>
        </div>
      </header>

      {/* Image */}
      <div className="relative h-72 bg-[#e8e8ed] mt-14">
        <img
          src={imageUrl}
          alt={empreendimento.nome}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className={cn(
          "absolute top-4 left-4 px-3 py-1.5 rounded-lg text-[12px] font-semibold",
          status.className
        )}>
          {status.label}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 space-y-5 max-w-lg mx-auto">
        {/* Title and Location */}
        <section>
          <h1 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">
            {empreendimento.nome}
          </h1>

          <div className="flex items-center gap-1.5 text-[#86868b] mt-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-[14px]">
              {empreendimento.localizacao.bairro}, {empreendimento.localizacao.zona}
            </span>
          </div>

          {empreendimento.localizacao.proximidade_metro && (
            <div className="flex items-center gap-1.5 text-[#0071e3] mt-1.5">
              <Train className="w-4 h-4 flex-shrink-0" />
              <span className="text-[14px] font-medium">
                {empreendimento.localizacao.proximidade_metro}
              </span>
            </div>
          )}

          {empreendimento.localizacao.endereco && (
            <p className="text-[13px] text-[#86868b] mt-1">
              {empreendimento.localizacao.endereco}
            </p>
          )}
        </section>

        {/* Price */}
        <section className="bg-[#1d1d1f] rounded-2xl p-5 text-white shadow-lg">
          <p className="text-[13px] text-white/60">A partir de</p>
          <p className="text-[28px] font-semibold tracking-tight">
            R$ {formatarPreco(preco)}
          </p>
          {empreendimento.preco_m2 && (
            <p className="text-[13px] text-white/50 mt-1">
              {empreendimento.preco_m2}
            </p>
          )}
        </section>

        {/* Tipologias */}
        {empreendimento.tipologias && empreendimento.tipologias.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">
              Tipologias
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {empreendimento.tipologias.map((tip, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 border border-[#e8e8ed] shadow-sm"
                >
                  <p className="text-[17px] font-semibold text-[#1d1d1f]">
                    {tip.area_m2}m²
                  </p>
                  <div className="space-y-0.5 mt-2 text-[13px] text-[#86868b]">
                    {tip.dormitorios && (
                      <p>{tip.dormitorios} dormitório{Number(tip.dormitorios) > 1 ? "s" : ""}</p>
                    )}
                    {tip.suites && tip.suites > 0 && (
                      <p>{tip.suites} suíte{tip.suites > 1 ? "s" : ""}</p>
                    )}
                    {tip.vagas && tip.vagas > 0 && (
                      <p>{tip.vagas} vaga{tip.vagas > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  {tip.preco_base && (
                    <p className="text-[#0071e3] font-semibold mt-2 text-[14px]">
                      R$ {formatarPreco(tip.preco_base)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Diferenciais */}
        {empreendimento.diferenciais && empreendimento.diferenciais.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">
              Diferenciais
            </h2>
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 shadow-sm">
              <div className="space-y-2.5">
                {empreendimento.diferenciais.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-[#1d1d1f]">
                    <Check className="w-5 h-5 text-[#34c759] flex-shrink-0 mt-0.5" />
                    <span className="text-[14px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Diferenciais Premium */}
        {empreendimento.diferenciais_premium && empreendimento.diferenciais_premium.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">
              Diferenciais Premium
            </h2>
            <div className="bg-gradient-to-br from-[#0071e3]/5 to-[#0071e3]/10 rounded-2xl p-4 border border-[#0071e3]/20">
              <div className="space-y-2.5">
                {empreendimento.diferenciais_premium.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-[#1d1d1f]">
                    <Check className="w-5 h-5 text-[#0071e3] flex-shrink-0 mt-0.5" />
                    <span className="text-[14px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lazer */}
        {empreendimento.lazer && empreendimento.lazer.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-[#1d1d1f]" />
              Lazer
            </h2>
            <div className="flex flex-wrap gap-2">
              {empreendimento.lazer.map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium rounded-full"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Financiamento */}
        {empreendimento.financiamento && empreendimento.financiamento.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#1d1d1f]" />
              Financiamento
            </h2>
            <div className="bg-[#f5f5f7] rounded-2xl p-4">
              <div className="space-y-2.5">
                {empreendimento.financiamento.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-[#1d1d1f]">
                    <Check className="w-5 h-5 text-[#1d1d1f] flex-shrink-0 mt-0.5" />
                    <span className="text-[14px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Conceito */}
        {empreendimento.conceito && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">
              Conceito
            </h2>
            <div className="bg-[#f5f5f7] rounded-2xl p-4">
              {Array.isArray(empreendimento.conceito) ? (
                <ul className="space-y-2">
                  {empreendimento.conceito.map((item, i) => (
                    <li key={i} className="text-[14px] text-[#1d1d1f]">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-[#1d1d1f]">{empreendimento.conceito}</p>
              )}
            </div>
          </section>
        )}

        {/* Configuração */}
        {empreendimento.configuracao && (
          <section>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">
              Configuração
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {empreendimento.configuracao.torres && (
                <div className="bg-white rounded-2xl p-4 border border-[#e8e8ed] text-center shadow-sm">
                  <p className="text-[24px] font-semibold text-[#0071e3]">
                    {empreendimento.configuracao.torres}
                  </p>
                  <p className="text-[11px] text-[#86868b] mt-1">Torre{empreendimento.configuracao.torres > 1 ? "s" : ""}</p>
                </div>
              )}
              {empreendimento.configuracao.pavimentos && (
                <div className="bg-white rounded-2xl p-4 border border-[#e8e8ed] text-center shadow-sm">
                  <p className="text-[24px] font-semibold text-[#0071e3]">
                    {empreendimento.configuracao.pavimentos}
                  </p>
                  <p className="text-[11px] text-[#86868b] mt-1">Pavimentos</p>
                </div>
              )}
              {empreendimento.configuracao.unidades_totais && (
                <div className="bg-white rounded-2xl p-4 border border-[#e8e8ed] text-center shadow-sm">
                  <p className="text-[24px] font-semibold text-[#0071e3]">
                    {empreendimento.configuracao.unidades_totais}
                  </p>
                  <p className="text-[11px] text-[#86868b] mt-1">Unidades</p>
                </div>
              )}
              {empreendimento.configuracao.elevadores && (
                <div className="bg-white rounded-2xl p-4 border border-[#e8e8ed] text-center shadow-sm">
                  <p className="text-[24px] font-semibold text-[#0071e3]">
                    {empreendimento.configuracao.elevadores}
                  </p>
                  <p className="text-[11px] text-[#86868b] mt-1">Elevador{empreendimento.configuracao.elevadores > 1 ? "es" : ""}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Datas */}
        <section className="bg-white rounded-2xl p-4 border border-[#e8e8ed] shadow-sm">
          <div className="space-y-3">
            {empreendimento.lançamento && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#86868b]">Lançamento</span>
                <span className="text-[14px] font-medium text-[#1d1d1f]">
                  {empreendimento.lançamento}
                </span>
              </div>
            )}
            {empreendimento.entrega_prevista && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#86868b]">Previsão de Entrega</span>
                <span className="text-[14px] font-medium text-[#1d1d1f]">
                  {empreendimento.entrega_prevista}
                </span>
              </div>
            )}
            {empreendimento.entrega && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#86868b]">Entrega</span>
                <span className="text-[14px] font-medium text-[#1d1d1f]">
                  {empreendimento.entrega}
                </span>
              </div>
            )}
            {empreendimento.padrao && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#86868b]">Padrão</span>
                <span className="px-3 py-1 bg-[#0071e3]/10 text-[#0071e3] text-[12px] font-semibold rounded-full">
                  {empreendimento.padrao}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ShareSheet */}
      <ShareSheet empreendimento={empreendimento} />
    </div>
  )
}
