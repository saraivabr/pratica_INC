"use client"

import { useEffect, useState, useRef } from "react"
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
  Bot,
  LifeBuoy,
  BookOpen,
  CreditCard,
  Search,
  BarChart3,
  Send,
  CalendarDays,
  Eye,
  DollarSign,
  Calculator,
  GitCompareArrows,
  Shuffle,
  Trophy,
  GraduationCap,
  Handshake,
  Calendar,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  Target,
  Clock,
  Brain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Typewriter } from "@/components/ui/typewriter"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"

function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!startOnView) {
      setStarted(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started, startOnView])

  useEffect(() => {
    if (!started) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [started, target, duration])

  return { count, ref }
}

const moduleCategories = [
  {
    title: "Inteligência Artificial",
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50",
    borderColor: "border-violet-200",
    iconColor: "text-violet-600",
    modules: [
      { icon: Bot, title: "Sofia IA 24/7", desc: "Atende leads no WhatsApp dia e noite" },
      { icon: LifeBuoy, title: "Recupera-Lead", desc: "Recupera leads inativos automaticamente" },
      { icon: BookOpen, title: "Salesbook IA", desc: "Guia de abordagem personalizado por lead" },
      { icon: CreditCard, title: "Score de Crédito", desc: "Consulta Serasa direto na plataforma" },
    ],
  },
  {
    title: "Gestão de Leads",
    color: "from-emerald-500 to-green-600",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-600",
    modules: [
      { icon: Target, title: "Pipeline Kanban", desc: "Funil visual com drag-and-drop" },
      { icon: TrendingUp, title: "Lead Scoring", desc: "Classificação automática por potencial" },
      { icon: Clock, title: "Histórico Completo", desc: "Interações, visitas e simulações em um lugar" },
      { icon: Search, title: "Busca Inteligente", desc: "Encontre qualquer lead em segundos" },
    ],
  },
  {
    title: "Comunicação",
    color: "from-blue-500 to-cyan-600",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    modules: [
      { icon: MessageCircle, title: "WhatsApp Multi-Corretor", desc: "Cada corretor com seu WhatsApp" },
      { icon: Send, title: "Disparador em Massa", desc: "Campanhas para centenas de leads" },
      { icon: MessageCircle, title: "Chat Integrado", desc: "Converse direto pela plataforma" },
      { icon: CalendarDays, title: "Eventos e Convites", desc: "Crie eventos e envie convites via WhatsApp" },
    ],
  },
  {
    title: "Imóveis e Vendas",
    color: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-600",
    modules: [
      { icon: Building2, title: "Catálogo de Empreendimentos", desc: "Dados atualizados do CV CRM" },
      { icon: Eye, title: "Espelho de Vendas", desc: "Disponibilidade em tempo real" },
      { icon: DollarSign, title: "Tabela de Preços", desc: "Consulta rápida de valores" },
      { icon: Calculator, title: "Simulador Financeiro", desc: "Calcula financiamento na hora" },
      { icon: GitCompareArrows, title: "Comparador de Imóveis", desc: "Compare unidades lado a lado" },
    ],
  },
  {
    title: "Gestão da Equipe",
    color: "from-pink-500 to-rose-600",
    bgLight: "bg-pink-50",
    borderColor: "border-pink-200",
    iconColor: "text-pink-600",
    modules: [
      { icon: Shuffle, title: "Roleta de Atendimento", desc: "Fila inteligente de corretores" },
      { icon: Trophy, title: "Ranking de Performance", desc: "Métricas em tempo real" },
      { icon: BarChart3, title: "Comissões", desc: "Cálculo automático de comissões" },
      { icon: GraduationCap, title: "Academy", desc: "Treinamento com certificados" },
    ],
  },
  {
    title: "Financeiro e Operacional",
    color: "from-slate-600 to-gray-700",
    bgLight: "bg-slate-50",
    borderColor: "border-slate-200",
    iconColor: "text-slate-600",
    modules: [
      { icon: Calendar, title: "Parcelas e Calendário", desc: "Controle de vencimentos" },
      { icon: ShieldCheck, title: "Auditoria", desc: "Rastreabilidade total" },
      { icon: FileSpreadsheet, title: "Relatórios", desc: "Exportação em PDF e Excel" },
    ],
  },
]

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [showTypewriter, setShowTypewriter] = useState(false)

  usePageTracking("home")

  const stat1 = useCountUp(50, 1500)
  const stat2 = useCountUp(2000, 2000)
  const stat3 = useCountUp(148, 1800)

  // Only animate typewriter on first view per session
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem('landing-typewriter-seen')
      if (!seen) {
        setShowTypewriter(true)
        sessionStorage.setItem('landing-typewriter-seen', '1')
      }
    } catch {
      // sessionStorage may be unavailable (e.g. SSR, private browsing restrictions)
      setShowTypewriter(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "admin" || user.role === "gerente") {
        router.push("/admin")
      } else {
        router.push("/corretor")
      }
    }
  }, [isAuthenticated, isLoading, user, router])

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-green-50 overflow-hidden">
        <AnimatedBackground />

        {/* Header - sticky */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200/60 animate-fadeInDown">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 rounded-xl blur-lg opacity-40" />
                <Image
                  src="/logo-pratica-icon.svg"
                  alt="Corretor Parceria"
                  width={40}
                  height={40}
                  className="relative h-9 sm:h-10 w-9 sm:w-10 drop-shadow-2xl"
                />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg text-gray-800">Corretor</span>
                <span className="text-emerald-600 font-bold text-base sm:text-lg ml-1">Parceria</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
              <a href="#recursos" className="hover:text-emerald-600 transition-colors">Recursos</a>
              <a href="#como-funciona" className="hover:text-emerald-600 transition-colors">Como Funciona</a>
              <a href="#modulos" className="hover:text-emerald-600 transition-colors">Módulos</a>
            </nav>

            <Button
              asChild
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0 shadow-lg text-sm px-5"
            >
              <Link href="/login">
                Entrar
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 backdrop-blur-sm animate-fadeInUp">
              <Sparkles className="h-4 w-4" />
              Plataforma completa para incorporadoras
            </div>

            <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-gray-900">Venda imóveis</span>
                <br />
                <span className="text-gray-900">com </span>
                {showTypewriter ? (
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
                ) : (
                  <span className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 bg-clip-text text-transparent">
                    inteligência artificial
                  </span>
                )}
              </h1>
            </div>

            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-fadeInUp" style={{ animationDelay: "200ms" }}>
              O Corretor Parceria atende seus leads no WhatsApp 24/7, qualifica interessados e agenda visitas automaticamente.
              <span className="text-gray-800 font-medium"> Você foca em fechar negócios.</span>
            </p>

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-12 border-t border-gray-200/60 animate-fadeInUp" style={{ animationDelay: "400ms" }}>
              {[
                { value: "+50", label: "Incorporadoras", icon: Building2 },
                { value: "+2.000", label: "Leads/mês", icon: Users },
                { value: "24/7", label: "IA ativa", icon: Bot },
                { value: "148", label: "Funcionalidades", icon: Zap },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="h-5 w-5 text-emerald-500 hidden sm:block" />
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section id="como-funciona" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Como funciona</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">Do primeiro contato ao fechamento, a IA cuida de tudo</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
              {[
                {
                  step: "01",
                  icon: MessageCircle,
                  title: "Lead chega",
                  desc: "Via WhatsApp, portal, stand ou qualquer canal. O sistema captura automaticamente.",
                  gradient: "from-blue-500 to-cyan-500",
                },
                {
                  step: "02",
                  icon: Brain,
                  title: "IA qualifica e engaja",
                  desc: "Sofia IA responde em segundos, tira dúvidas, envia materiais e agenda visitas.",
                  gradient: "from-emerald-500 to-green-500",
                },
                {
                  step: "03",
                  icon: Handshake,
                  title: "Corretor fecha negócio",
                  desc: "Com dados completos, histórico e score do lead pronto para a abordagem.",
                  gradient: "from-amber-500 to-orange-500",
                },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  <div className="p-8 rounded-2xl bg-white/80 border border-gray-200 backdrop-blur-sm hover:shadow-xl transition-all duration-300 text-center h-full">
                    <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br ${item.gradient} mb-6 shadow-lg`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Passo {item.step}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden sm:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Módulos */}
        <section id="modulos" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 sm:mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-4">
                <Zap className="h-4 w-4" />
                148 funcionalidades
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4" id="recursos">Tudo que você precisa em um lugar</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">6 módulos integrados para cobrir toda a operação da sua incorporadora</p>
            </div>

            <div className="space-y-10 sm:space-y-12">
              {moduleCategories.map((cat, ci) => (
                <div key={ci}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${cat.color}`} />
                    <h3 className="text-lg font-bold text-gray-800">{cat.title}</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cat.modules.map((mod, mi) => (
                      <div
                        key={mi}
                        className={`group p-5 rounded-xl bg-white border ${cat.borderColor} hover:shadow-lg hover:border-transparent hover:ring-2 hover:ring-emerald-200 transition-all duration-300`}
                      >
                        <div className={`h-10 w-10 rounded-lg ${cat.bgLight} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <mod.icon className={`h-5 w-5 ${cat.iconColor}`} />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{mod.title}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">{mod.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Números / Impacto */}
        <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Números que falam por si</h2>
              <p className="text-gray-600 text-lg">Resultados reais de quem usa a plataforma</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8" ref={stat1.ref}>
              {[
                { value: `+${stat1.count}`, label: "Incorporadoras ativas", icon: Building2, color: "text-emerald-500" },
                { value: `+${stat2.count.toLocaleString("pt-BR")}`, label: "Leads atendidos/mês", icon: Users, color: "text-blue-500" },
                { value: "< 30s", label: "Tempo de resposta IA", icon: Clock, color: "text-amber-500" },
                { value: stat3.count.toString(), label: "Funcionalidades", icon: Zap, color: "text-purple-500" },
              ].map((stat, i) => (
                <div key={i} className="text-center p-6 rounded-2xl bg-white/80 border border-gray-200 backdrop-blur-sm">
                  <stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-3`} />
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 p-10 sm:p-16 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.2),_transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.15),_transparent_60%)]" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Transforme sua incorporadora
                </h2>
                <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
                  Junte-se a mais de 50 incorporadoras que já vendem mais com inteligência artificial
                </p>
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-10 text-base bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white border-0 shadow-2xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105"
                >
                  <Link href="/login">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Começar agora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 py-8 px-4 sm:px-6 border-t border-gray-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-pratica-icon.svg"
                alt="Corretor Parceria"
                width={28}
                height={28}
                className="h-7 w-7"
              />
              <span className="font-semibold text-gray-700">Corretor <span className="text-emerald-600">Parceria</span></span>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Corretor Parceria — Powered by AI
            </p>
          </div>
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
