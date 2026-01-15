"use client"

import { useFavoritesStore } from "@/store/favorites"

export function useFavorites() {
  const favorites = useFavoritesStore((state) => state.favorites)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const isFavorite = useFavoritesStore((state) => state.isFavorite)

  return {
    favorites,
    toggle: toggleFavorite,
    isFavorite,
  }
}
