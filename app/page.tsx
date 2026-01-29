"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Building2,
  Loader2,
  MessageCircle,
  Sparkles,
  Users,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Typewriter } from "@/components/ui/typewriter"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  usePageTracking("home")

  // Redirect authenticated users based on role
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Admin/gerentes vão para /admin, corretores vão para /dashboard
      if (user.role === "admin" || user.role === "gerente") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-green-50 overflow-hidden">
        <AnimatedBackground />

        {/* Header */}
        <header className="relative z-20 p-4 sm:p-6 md:p-8 animate-fadeInDown">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 rounded-xl blur-lg opacity-40" />
                <Image
                  src="/logo-pratica-icon.svg"
                  alt="Pratica Incorporadora"
                  width={48}
                  height={48}
                  className="relative h-10 sm:h-12 w-10 sm:w-12 drop-shadow-2xl"
                />
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-base sm:text-lg text-gray-800">Pratica</span>
                <span className="text-emerald-600 font-semibold text-base sm:text-lg ml-1">IA</span>
              </div>
            </div>
            <Button
              asChild
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0 shadow-lg text-sm sm:text-base px-4 sm:px-6"
            >
              <Link href="/login">
                Entrar
                <ArrowRight className="ml-1.5 sm:ml-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Hero */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 md:py-20">
          <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-emerald-700 backdrop-blur-sm animate-fadeInUp">
              <Sparkles className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span className="hidden xs:inline">Atendimento inteligente via WhatsApp</span>
              <span className="xs:hidden">WhatsApp IA 24/7</span>
            </div>

            {/* Main headline with typewriter */}
            <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-gray-900">Venda imóveis</span>
                <br />
                <span className="text-gray-900">com </span>
                <Typewriter
                  text={[
                    "inteligência artificial",
                    "respostas em segundos",
                    "leads qualificados",
                    "automação poderosa",
                    "resultados reais",
                  ]}
                  speed={60}
                  className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 bg-clip-text text-transparent"
                  waitTime={2000}
                  deleteSpeed={35}
                  cursorChar={"_"}
                  cursorClassName="text-emerald-500 ml-1"
                />
              </h1>
            </div>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-fadeInUp" style={{ animationDelay: "200ms" }}>
              A Pratica IA atende seus leads no WhatsApp 24/7, qualifica interessados e agenda visitas automaticamente.
              <span className="text-gray-800 font-medium"> Você foca em fechar negócios.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeInUp" style={{ animationDelay: "300ms" }}>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto h-14 px-8 text-base bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105"
              >
                <Link href="/login">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Acessar plataforma
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-14 px-8 text-base bg-white/80 border-gray-200 hover:bg-white text-gray-800 backdrop-blur-sm"
              >
                <Link href="/empreendimentos">
                  <Building2 className="mr-2 h-5 w-5" />
                  Ver empreendimentos
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 sm:gap-12 pt-12 border-t border-gray-200 animate-fadeInUp" style={{ animationDelay: "400ms" }}>
              {[
                { value: "500+", label: "Leads atendidos", icon: Users },
                { value: "42s", label: "Tempo médio resposta", icon: MessageCircle },
                { value: "3x", label: "Mais conversões", icon: TrendingUp },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <stat.icon className="h-5 w-5 text-emerald-500 hidden sm:block" />
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Features section */}
        <section className="relative z-10 py-16 px-6 border-t border-gray-200">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: MessageCircle,
                  title: "Atendimento 24/7",
                  description: "IA responde leads no WhatsApp a qualquer hora, sem perder oportunidades.",
                },
                {
                  icon: Building2,
                  title: "Catálogo integrado",
                  description: "Dados de empreendimentos e unidades sempre atualizados do CVCRM.",
                },
                {
                  icon: CheckCircle2,
                  title: "Agendamento automático",
                  description: "Marca visitas direto na conversa e notifica o corretor responsável.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-2xl bg-white/70 border border-gray-200 backdrop-blur-sm hover:bg-white hover:border-emerald-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                    <feature.icon className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 p-6 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Pratica Incorporadora &copy; {new Date().getFullYear()} — Powered by AI
          </p>
        </footer>
      </div>
    )
  }

  // If somehow we get here while authenticated, redirect
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
