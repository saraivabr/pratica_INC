'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CorretorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Corretor error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <div className="relative mx-auto w-fit">
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
          <div className="relative h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Erro ao carregar
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Ocorreu um erro ao carregar esta seção. Por favor, tente novamente.
          </p>
        </div>

        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-lg mx-auto text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              Detalhes do erro (dev)
            </summary>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
