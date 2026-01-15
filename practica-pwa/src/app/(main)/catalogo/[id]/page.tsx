"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Heart, MapPin, Train, Building2, Check, Dumbbell, CreditCard } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShareSheet } from "@/components/catalogo/share-sheet"
import { useFavorites } from "@/hooks/use-favorites"
import { formatarPreco, cn } from "@/lib/utils"
import { Empreendimento } from "@/types/empreendimento"

const statusConfig = {
  em_construcao: { label: "Em Construcao", variant: "construcao" as const },
  lancamento: { label: "Lancamento", variant: "lancamento" as const },
  entregue: { label: "Pronto", variant: "pronto" as const },
}

// Fallback placeholder se não houver imagem no banco de dados
const defaultPlaceholder = "https://praticaincorporadora.com.br/assets/new-images/aura-guilhermina/praticaincorporadora-aura-guilhermina-hero.jpg"

export default function EmpreendimentoDetailPage() {
  const params = useParams()
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
          throw new Error("Empreendimento nao encontrado")
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
      <div className="min-h-screen bg-[#FAF9F7]">
        <Header showBack title="Carregando..." />
        <div>
          <div className="h-72 skeleton-luxury" />
          <div className="p-5 space-y-4">
            <div className="h-8 skeleton-luxury rounded-lg w-3/4" />
            <div className="h-4 skeleton-luxury rounded-lg w-1/2" />
            <div className="h-24 skeleton-luxury rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !empreendimento) {
    return (
      <div className="min-h-screen bg-[#FAF9F7]">
        <Header showBack title="Erro" />
        <div className="flex flex-col items-center justify-center p-8 pt-24">
          <div className="w-20 h-20 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mb-6">
            <Building2 className="w-10 h-10 text-[#C9A962]" />
          </div>
          <p className="text-[#5C5C5C] text-center font-medium">
            {error || "Empreendimento nao encontrado"}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => window.history.back()}
          >
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  const status = statusConfig[empreendimento.status]
  const preco = empreendimento.tipologias?.[0]?.preco_base
  const imageUrl = empreendimento.imagemCapa || defaultPlaceholder

  return (
    <div className="min-h-screen bg-[#FAF9F7] pb-32">
      {/* Header */}
      <Header
        showBack
        title={empreendimento.nome}
        rightAction={
          <button
            onClick={() => toggle(empreendimento.id)}
            className={cn(
              "p-2 rounded-full transition-all duration-300 ripple",
              favorited
                ? "bg-red-100 text-red-500 shadow-md"
                : "hover:bg-[#F0EDE8] text-[#5C5C5C] hover:shadow-sm"
            )}
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-all duration-300",
                favorited && "fill-current scale-110"
              )}
            />
          </button>
        }
      />

      {/* Image Gallery with Parallax Effect */}
      <div className="relative h-72 bg-[#E5E2DC] overflow-hidden">
        <img
          src={imageUrl}
          alt={empreendimento.nome}
          className="w-full h-full object-cover animate-fade-in"
          style={{ transform: 'translateZ(0)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* Decorative Corner Gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9A962]/10 to-transparent opacity-50" />

        <Badge
          variant={status.variant}
          className="absolute top-4 left-4 shadow-lg px-3 py-1.5 animate-slide-in-left backdrop-blur-sm"
        >
          {status.label}
        </Badge>
      </div>

      {/* Content */}
      <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
        {/* Title and Location */}
        <section className="animate-fade-up stagger-1">
          <h1 className="font-display text-2xl font-semibold text-[#1A1A1A] mb-3">
            {empreendimento.nome}
          </h1>
          
          {/* Decorative Line */}
          <div className="h-0.5 w-16 bg-gradient-to-r from-[#C9A962] to-transparent mb-4 animate-reveal" />

          <div className="flex items-center gap-2 text-[#5C5C5C] mt-2">
            <MapPin className="w-4 h-4 flex-shrink-0 text-[#C9A962]" />
            <span className="text-sm">
              {empreendimento.localizacao.bairro}, {empreendimento.localizacao.zona}
            </span>
          </div>

          {empreendimento.localizacao.proximidade_metro && (
            <div className="flex items-center gap-2 text-[#1B4332] mt-1.5">
              <Train className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                {empreendimento.localizacao.proximidade_metro}
              </span>
            </div>
          )}

          {empreendimento.localizacao.endereco && (
            <p className="text-sm text-[#8A8A8A] mt-1">
              {empreendimento.localizacao.endereco}
            </p>
          )}
        </section>

        {/* Price */}
        <section className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] rounded-2xl p-5 text-white shadow-lg animate-fade-up stagger-2 relative overflow-hidden">
          {/* Decorative Pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#C9A962]/20 to-transparent rounded-full blur-xl" />
          
          <div className="relative z-10">
            <p className="text-sm text-white/70">A partir de</p>
            <p className="text-3xl font-display font-semibold">
              R$ {formatarPreco(preco)}
            </p>
            {empreendimento.preco_m2 && (
              <p className="text-sm text-white/60 mt-1">
                {empreendimento.preco_m2}
              </p>
            )}
          </div>
        </section>

        {/* Tipologias */}
        {empreendimento.tipologias && empreendimento.tipologias.length > 0 && (
          <section className="animate-fade-up stagger-3">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3 flex items-center">
              Tipologias
              <span className="ml-3 h-px flex-1 bg-gradient-to-r from-[#E5E2DC] to-transparent" />
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {empreendimento.tipologias.map((tip, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 border border-[#E5E2DC] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex items-baseline gap-1">
                    <p className="text-lg font-display font-semibold text-[#1A1A1A] group-hover:text-[#1B4332] transition-colors">
                      {tip.area_m2}
                    </p>
                    <span className="text-xs text-[#8A8A8A]">m²</span>
                  </div>
                  <div className="space-y-1 mt-2 text-sm text-[#5C5C5C]">
                    {tip.dormitorios && (
                      <p>{tip.dormitorios} dormitorio{Number(tip.dormitorios) > 1 ? "s" : ""}</p>
                    )}
                    {tip.suites && tip.suites > 0 && (
                      <p>{tip.suites} suite{tip.suites > 1 ? "s" : ""}</p>
                    )}
                    {tip.vagas && tip.vagas > 0 && (
                      <p>{tip.vagas} vaga{tip.vagas > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  {tip.preco_base && (
                    <p className="text-[#1B4332] font-semibold mt-2">
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
          <section className="animate-fade-up stagger-4">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3 flex items-center">
              Diferenciais
              <span className="ml-3 h-px flex-1 bg-gradient-to-r from-[#E5E2DC] to-transparent" />
            </h2>
            <div className="bg-white rounded-2xl border border-[#E5E2DC] p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="space-y-2">
                {empreendimento.diferenciais.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-[#5C5C5C] group"
                  >
                    <Check className="w-5 h-5 text-[#1B4332] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Diferenciais Premium */}
        {empreendimento.diferenciais_premium && empreendimento.diferenciais_premium.length > 0 && (
          <section className="animate-fade-up stagger-5">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3 flex items-center">
              <span className="gradient-text">Diferenciais Premium</span>
              <span className="ml-3 h-px flex-1 bg-gradient-to-r from-[#C9A962]/30 to-transparent" />
            </h2>
            <div className="bg-gradient-to-br from-[#C9A962]/10 to-[#C9A962]/20 rounded-2xl p-4 border border-[#C9A962]/30 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="space-y-2">
                {empreendimento.diferenciais_premium.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-[#5C5C5C] group"
                  >
                    <Check className="w-5 h-5 text-[#C9A962] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lazer */}
        {empreendimento.lazer && empreendimento.lazer.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-[#1B4332]" />
              Lazer
            </h2>
            <div className="flex flex-wrap gap-2">
              {empreendimento.lazer.map((item, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="px-3 py-1.5"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Financiamento */}
        {empreendimento.financiamento && empreendimento.financiamento.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#1B4332]" />
              Financiamento
            </h2>
            <div className="bg-[#1B4332]/5 rounded-2xl p-4 border border-[#1B4332]/10">
              <div className="space-y-2">
                {empreendimento.financiamento.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-[#5C5C5C]"
                  >
                    <Check className="w-5 h-5 text-[#1B4332] flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Conceito */}
        {empreendimento.conceito && (
          <section>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3">
              Conceito
            </h2>
            <div className="bg-[#F0EDE8] rounded-2xl p-4">
              {Array.isArray(empreendimento.conceito) ? (
                <ul className="space-y-2">
                  {empreendimento.conceito.map((item, i) => (
                    <li key={i} className="text-sm text-[#5C5C5C]">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#5C5C5C]">{empreendimento.conceito}</p>
              )}
            </div>
          </section>
        )}

        {/* Configuracao */}
        {empreendimento.configuracao && (
          <section>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3">
              Configuracao do Empreendimento
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {empreendimento.configuracao.torres && (
                <div className="bg-white rounded-2xl p-4 border border-[#E5E2DC] text-center">
                  <p className="text-2xl font-display font-semibold text-[#1B4332]">
                    {empreendimento.configuracao.torres}
                  </p>
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mt-1">Torre{empreendimento.configuracao.torres > 1 ? "s" : ""}</p>
                </div>
              )}
              {empreendimento.configuracao.pavimentos && (
                <div className="bg-white rounded-2xl p-4 border border-[#E5E2DC] text-center">
                  <p className="text-2xl font-display font-semibold text-[#1B4332]">
                    {empreendimento.configuracao.pavimentos}
                  </p>
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mt-1">Pavimentos</p>
                </div>
              )}
              {empreendimento.configuracao.unidades_totais && (
                <div className="bg-white rounded-2xl p-4 border border-[#E5E2DC] text-center">
                  <p className="text-2xl font-display font-semibold text-[#1B4332]">
                    {empreendimento.configuracao.unidades_totais}
                  </p>
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mt-1">Unidades</p>
                </div>
              )}
              {empreendimento.configuracao.elevadores && (
                <div className="bg-white rounded-2xl p-4 border border-[#E5E2DC] text-center">
                  <p className="text-2xl font-display font-semibold text-[#1B4332]">
                    {empreendimento.configuracao.elevadores}
                  </p>
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mt-1">Elevador{empreendimento.configuracao.elevadores > 1 ? "es" : ""}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Datas */}
        <section className="bg-white rounded-2xl p-4 border border-[#E5E2DC]">
          <div className="space-y-3">
            {empreendimento.lançamento && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A8A8A]">Lancamento</span>
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {empreendimento.lançamento}
                </span>
              </div>
            )}
            {empreendimento.entrega_prevista && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A8A8A]">Previsao de Entrega</span>
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {empreendimento.entrega_prevista}
                </span>
              </div>
            )}
            {empreendimento.entrega && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A8A8A]">Entrega</span>
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {empreendimento.entrega}
                </span>
              </div>
            )}
            {empreendimento.padrao && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A8A8A]">Padrao</span>
                <Badge variant="accent">
                  {empreendimento.padrao}
                </Badge>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ShareSheet - Fixed bottom right */}
      <ShareSheet empreendimento={empreendimento} />
    </div>
  )
}
