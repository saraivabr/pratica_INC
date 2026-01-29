import { create } from 'zustand'

export type Toast = {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'info' | 'warning'
  timestamp: Date
}

type ToastStore = {
  toasts: Toast[]
  history: Toast[]
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void
  removeToast: (id: string) => void
  clearHistory: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  history: [],

  addToast: (toast) => {
    const newToast: Toast = {
      ...toast,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
    }

    set((state) => ({
      toasts: [...state.toasts, newToast],
      history: [newToast, ...state.history].slice(0, 50), // Últimas 50
    }))

    // Auto-remover após 5s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== newToast.id)
      }))
    }, 5000)
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  clearHistory: () => set({ history: [] }),
}))
