import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Empreendimento } from './data'

type ComparisonStore = {
  properties: Empreendimento[]
  addProperty: (property: Empreendimento) => void
  removeProperty: (id: string) => void
  clearAll: () => void
  isInComparison: (id: string) => boolean
}

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set, get) => ({
      properties: [],

      addProperty: (property) => set((state) => {
        // Máximo de 4 propriedades para comparação
        if (state.properties.length >= 4) {
          return state
        }

        // Não adicionar duplicatas
        if (state.properties.some(p => p.id === property.id)) {
          return state
        }

        return {
          properties: [...state.properties, property]
        }
      }),

      removeProperty: (id) => set((state) => ({
        properties: state.properties.filter(p => p.id !== id)
      })),

      clearAll: () => set({ properties: [] }),

      isInComparison: (id) => get().properties.some(p => p.id === id),
    }),
    {
      name: 'property-comparison',
    }
  )
)
