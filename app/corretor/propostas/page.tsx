"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/animated-background"
import {
  FileText,
  Calculator,
  Sparkles,
  Bell,
  CheckCircle2,
  Clock,
  Send,
  ChevronRight,
  Rocket,
} from "lucide-react"

export default function CorretorPropostasPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-propostas")

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AppShell title="Propostas">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          {/* Icon with glow effect */}
          <div className="relative mb-8 animate-fadeInUp">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-3xl blur-2xl opacity-40 animate-pulse" />
            <div className="relative h-32 w-32 rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 flex items-center justify-center shadow-2xl">
              <FileText className="h-16 w-16 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Rocket className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 bg-clip-text text-transparent animate-fadeInUp" style={{ animationDelay: "100ms" }}>
            Propostas Digitais
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md animate-fadeInUp" style={{ animationDelay: "200ms" }}>
            Em breve você poderá criar e enviar propostas profissionais diretamente para seus clientes.
          </p>

          {/* Features preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mb-10 animate-fadeInUp" style={{ animationDelay: "300ms" }}>
            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl p-5 border border-white/60 dark:border-zinc-800/60 shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-3">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Simulador Integrado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gere propostas com cálculos automáticos</p>
            </div>

            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl p-5 border border-white/60 dark:border-zinc-800/60 shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-3">
                <Send className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Envio pelo WhatsApp</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Envie propostas em PDF diretamente</p>
            </div>

            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl p-5 border border-white/60 dark:border-zinc-800/60 shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Acompanhamento</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saiba quando o cliente visualizar</p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 animate-fadeInUp" style={{ animationDelay: "400ms" }}>
            <Link href="/calculadora">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25">
                <Calculator className="h-5 w-5" />
                Usar Calculadora
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Status badge */}
          <div className="mt-10 flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-fadeInUp" style={{ animationDelay: "500ms" }}>
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Em desenvolvimento
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
