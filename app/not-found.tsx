import Link from 'next/link'
import { Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
      <div className="text-center space-y-6 p-8">
        <div className="relative mx-auto w-fit">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
          <div className="relative h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Search className="h-8 w-8 text-emerald-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Página não encontrada
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            A página que você procura não existe ou foi movida.
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </div>
  )
}
