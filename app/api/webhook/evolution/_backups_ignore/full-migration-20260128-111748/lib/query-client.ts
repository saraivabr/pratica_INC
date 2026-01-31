import { QueryClient } from '@tanstack/react-query'

// Create a client factory function instead of a singleton
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}

// Browser-only QueryClient instance
let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  // Server: always create a new QueryClient
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }

  // Browser: reuse existing QueryClient
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
