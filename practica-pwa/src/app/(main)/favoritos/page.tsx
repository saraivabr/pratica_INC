"use client"

import { useMemo } from "react"
import { Heart, Share2, FolderOpen } from "lucide-react"
import { EmpreendimentoCard } from "@/components/catalogo/empreendimento-card"
import { useEmpreendimentos } from "@/hooks/use-empreendimentos"
import { useFavoritesStore } from "@/store/favorites"

function FavoritosSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
          <div className="h-48 bg-[#f5f5f7] animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-[#f5f5f7] rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-[#f5f5f7] rounded-lg w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-20 h-20 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6">
        <Heart className="w-9 h-9 text-[#86868b]" />
      </div>
      <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2 text-center">
        Sua coleção está vazia
      </h2>
      <p className="text-[14px] text-[#86868b] text-center max-w-[280px] leading-relaxed">
        Explore o portfólio e toque no coração para salvar seus empreendimentos favoritos.
      </p>
    </div>
  )
}

export default function FavoritosPage() {
  const { empreendimentos, isLoading } = useEmpreendimentos()
  const favorites = useFavoritesStore((state) => state.favorites)

  const favoritedEmpreendimentos = useMemo(() => {
    return empreendimentos.filter((emp) => favorites.includes(emp.id))
  }, [empreendimentos, favorites])

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="px-5 pt-14 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                Salvos
              </h1>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                Sua seleção de imóveis
              </p>
            </div>
            {favorites.length > 0 && (
              <div className="bg-[#1d1d1f] text-white px-3 py-1.5 rounded-full">
                <span className="text-[13px] font-semibold">{favorites.length}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 py-5 pb-28">
        {isLoading ? (
          <FavoritosSkeleton />
        ) : favoritedEmpreendimentos.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Quick Actions */}
            <div className="flex gap-3 mb-5">
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-white border border-[#e8e8ed] rounded-xl text-[#86868b] shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-[13px] font-medium">Compartilhar</span>
                <span className="text-[10px] bg-[#f5f5f7] px-2 py-0.5 rounded-full">Em breve</span>
              </button>
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-white border border-[#e8e8ed] rounded-xl text-[#86868b] shadow-sm"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-[13px] font-medium">Pastas</span>
                <span className="text-[10px] bg-[#f5f5f7] px-2 py-0.5 rounded-full">Em breve</span>
              </button>
            </div>

            {/* List */}
            <div className="space-y-4">
              {favoritedEmpreendimentos.map((emp, index) => (
                <div
                  key={emp.id}
                  className="animate-[fadeIn_0.4s_ease-out_both]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <EmpreendimentoCard empreendimento={emp} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
