"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"

/**
 * Corretor Parceria Domain Compatibility
 * 
 * Redirect para /dashboard para compatibilidade com domínio antigo
 * corretorparceria.com.br → corretorparceria.com.br/corretor → /dashboard → /leads
 */
export default function CorretorPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <AnimatedBackground />
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
        <Loader2 className="relative h-8 w-8 animate-spin text-emerald-500" />
      </div>
    </div>
  )
}
