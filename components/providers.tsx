'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'
import { FeaturesProvider } from '@/hooks/use-feature-access'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <FeaturesProvider>
        {children}
      </FeaturesProvider>
    </QueryClientProvider>
  )
}
