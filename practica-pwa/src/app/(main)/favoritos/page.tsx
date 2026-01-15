"use client"

import { useMemo } from "react"
import { Heart, Share2, FolderOpen } from "lucide-react"
import { EmpreendimentoCard } from "@/components/catalogo/empreendimento-card"
import { useEmpreendimentos } from "@/hooks/use-empreendimentos"
import { useFavoritesStore } from "@/store/favorites"

function FavoritosSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2].map((i) => (
        <div key={i} className="luxury-card">
          <div className="skeleton-luxury h-56 w-full" />
          <div className="p-5 space-y-4">
            <div className="skeleton-luxury h-6 w-3/4 rounded-lg" />
            <div className="skeleton-luxury h-4 w-1/2 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-20 h-20 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mb-6">
        <Heart className="w-9 h-9 text-[#C9A962]" />
      </div>
      <h2 className="font-display text-2xl font-semibold text-[#1A1A1A] mb-2 text-center">
        Sua colecao esta vazia
      </h2>
      <p className="text-[#8A8A8A] text-center max-w-xs leading-relaxed">
        Explore o portfolio e toque no coracao para salvar seus empreendimentos favoritos.
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
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[#E5E2DC]">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[#C9A962] text-xs font-semibold tracking-[0.15em] uppercase mb-1">
                Minha Selecao
              </p>
              <h1 className="font-display text-3xl font-semibold text-[#1B4332]">
                Salvos
              </h1>
            </div>
            {favorites.length > 0 && (
              <div className="text-right">
                <p className="text-2xl font-display font-semibold text-[#1A1A1A]">{favorites.length}</p>
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">imoveis</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 py-6">
        {isLoading ? (
          <FavoritosSkeleton />
        ) : favoritedEmpreendimentos.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Quick Actions - Em Breve */}
            <div className="flex gap-3 mb-6">
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 h-12 bg-white border border-[#E5E2DC] rounded-xl text-[#8A8A8A]"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">Compartilhar</span>
                <span className="text-[9px] bg-[#F0EDE8] px-2 py-0.5 rounded-full">Em breve</span>
              </button>
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 h-12 bg-white border border-[#E5E2DC] rounded-xl text-[#8A8A8A]"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Pastas</span>
                <span className="text-[9px] bg-[#F0EDE8] px-2 py-0.5 rounded-full">Em breve</span>
              </button>
            </div>

            {/* Lista */}
            <div className="space-y-5">
              {favoritedEmpreendimentos.map((emp, index) => (
                <div
                  key={emp.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.08}s`, opacity: 0 }}
                >
                  <EmpreendimentoCard empreendimento={emp} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
