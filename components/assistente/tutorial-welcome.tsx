"use client"

import { useState, useEffect } from "react"
import {
  Sparkles,
  Users,
  Building2,
  BarChart3,
  Home,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Search,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const TUTORIAL_KEY = "pratica_ia_tutorial_done"

interface TutorialStep {
  icon: any
  iconColor: string
  iconBg: string
  title: string
  description: string
  details: string[]
  tryPrompt: string
  tryLabel: string
}

const STEPS: TutorialStep[] = [
  {
    icon: Users,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-900/30",
    title: "Sua Carteira de Leads",
    description: "Consulte seus leads direto do CRM, filtrados por situação, empreendimento ou período.",
    details: [
      "Veja quantos leads tem em cada etapa do funil",
      "Filtre por empreendimento de interesse",
      "Identifique leads quentes e oportunidades",
    ],
    tryPrompt: "Quantos leads tenho em cada etapa do funil?",
    tryLabel: "Ver meu funil de leads",
  },
  {
    icon: Building2,
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-50 dark:bg-violet-900/30",
    title: "Empreendimentos",
    description: "Explore os empreendimentos da incorporadora com fotos, preços e disponibilidade em tempo real.",
    details: [
      "Cards visuais com imagens reais dos empreendimentos",
      "Metragem, dormitórios e faixas de preço",
      "Quantidade de unidades disponíveis",
    ],
    tryPrompt: "Quais empreendimentos têm unidades disponíveis?",
    tryLabel: "Ver empreendimentos",
  },
  {
    icon: Home,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    title: "Espelho de Vendas",
    description: "Visualize unidades em um grid colorido por status — ideal para apresentar ao cliente.",
    details: [
      "Grid visual organizado por bloco e andar",
      "Cores indicam: disponível, reservada, vendida",
      "Valores e metragem de cada unidade",
    ],
    tryPrompt: "Mostre as unidades disponíveis com resumo por tipo e situação",
    tryLabel: "Ver espelho de vendas",
  },
  {
    icon: BarChart3,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-900/30",
    title: "Estatísticas e Resumos",
    description: "Dashboard visual com seus números: leads, reservas, vendas e desempenho geral.",
    details: [
      "Cards com números grandes e fáceis de ler",
      "Gráfico de barras por situação de lead",
      "Unidades por empreendimento em um clique",
    ],
    tryPrompt: "Me dê um resumo geral dos meus números no CRM",
    tryLabel: "Ver meu dashboard",
  },
]

interface TutorialWelcomeProps {
  corretorNome?: string
  onSendMessage: (prompt: string) => void
}

export function TutorialWelcome({ corretorNome, onSendMessage }: TutorialWelcomeProps) {
  const [step, setStep] = useState(-1) // -1 = intro, 0-3 = steps, 4 = done
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY)
    if (done === "true") setIsDone(true)
  }, [])

  const finishTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, "true")
    setIsDone(true)
  }

  const skipTutorial = () => {
    finishTutorial()
  }

  const handleTry = (prompt: string) => {
    finishTutorial()
    onSendMessage(prompt)
  }

  // After tutorial is done, show compact suggestions
  if (isDone) {
    return <CompactSuggestions corretorNome={corretorNome} onSendMessage={onSendMessage} />
  }

  // Intro screen
  if (step === -1) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
          <Sparkles className="h-10 w-10 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
          {corretorNome ? `Olá, ${corretorNome}!` : "Bem-vindo!"}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-2">
          Eu sou a <strong className="text-violet-600 dark:text-violet-400">Prática IA</strong>, sua assistente com acesso direto ao CRM.
        </p>
        <p className="text-[13px] text-zinc-400 dark:text-zinc-500 text-center max-w-sm mb-8">
          Posso consultar seus leads, empreendimentos, unidades e reservas em tempo real. Quer conhecer o que posso fazer?
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button
            onClick={() => setStep(0)}
            className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl h-11 gap-2 shadow-md shadow-violet-500/20"
          >
            <Rocket className="h-4 w-4" />
            Conhecer recursos
          </Button>
          <Button
            variant="outline"
            onClick={skipTutorial}
            className="flex-1 rounded-xl h-11 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Já conheço, pular
          </Button>
        </div>

        {/* Feature preview pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {["Leads", "Empreendimentos", "Unidades", "Reservas", "Estatísticas"].map((label) => (
            <span key={label} className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              {label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // Final screen
  if (step >= STEPS.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
          Tudo pronto!
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-6">
          Agora é só perguntar. Eu consulto o CRM e mostro os dados de forma visual e organizada.
        </p>

        <div className="w-full max-w-md space-y-4">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold text-center">
            Experimente agora
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleTry(s.tryPrompt)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all text-left group"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", s.iconBg)}>
                  <s.icon className={cn("h-4 w-4", s.iconColor)} />
                </div>
                <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 line-clamp-1">{s.tryLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={finishTutorial} className="mt-6 text-[12px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          Ou digite sua pergunta abaixo
        </button>
      </div>
    )
  }

  // Step screens
  const current = STEPS[step]

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Progress */}
      <div className="flex items-center gap-4 mb-8">
        {STEPS.map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === step
                  ? "w-6 bg-violet-500"
                  : i < step
                    ? "bg-violet-400"
                    : "bg-zinc-200 dark:bg-zinc-700"
              )}
            />
          </div>
        ))}
        <button
          onClick={skipTutorial}
          className="ml-2 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          Pular
        </button>
      </div>

      {/* Step content */}
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm", current.iconBg)}>
        <current.icon className={cn("h-7 w-7", current.iconColor)} />
      </div>

      <p className="text-[11px] text-violet-500 dark:text-violet-400 uppercase tracking-wider font-semibold mb-1">
        Passo {step + 1} de {STEPS.length}
      </p>

      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
        {current.title}
      </h3>

      <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-5">
        {current.description}
      </p>

      {/* Detail bullets */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {current.details.map((detail, i) => (
          <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-[12.5px] text-zinc-600 dark:text-zinc-400">{detail}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="rounded-xl h-10 px-4 border-zinc-200 dark:border-zinc-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <Button
          onClick={() => handleTry(current.tryPrompt)}
          variant="outline"
          className="flex-1 rounded-xl h-10 gap-2 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
        >
          <Zap className="h-3.5 w-3.5" />
          {current.tryLabel}
        </Button>

        <Button
          onClick={() => setStep(step + 1)}
          className="rounded-xl h-10 px-4 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
        >
          {step < STEPS.length - 1 ? <ChevronRight className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Compact Suggestions (shown after tutorial is completed)
// ============================================================================

const QUICK_SUGGESTIONS = [
  { icon: Users, label: "Meus leads", prompt: "Quantos leads tenho em cada etapa do funil?", color: "text-blue-500" },
  { icon: Building2, label: "Disponibilidade", prompt: "Quais empreendimentos têm unidades disponíveis?", color: "text-violet-500" },
  { icon: BarChart3, label: "Estatísticas", prompt: "Me dê um resumo geral dos meus números no CRM", color: "text-amber-500" },
  { icon: Search, label: "Buscar lead", prompt: "Busque leads em atendimento nos últimos 7 dias", color: "text-emerald-500" },
  { icon: Home, label: "Espelho", prompt: "Mostre as unidades disponíveis com resumo por tipo e situação", color: "text-indigo-500" },
  { icon: TrendingUp, label: "Leads recentes", prompt: "Quais foram os últimos leads que entraram?", color: "text-rose-500" },
]

function CompactSuggestions({ corretorNome, onSendMessage }: { corretorNome?: string; onSendMessage: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {corretorNome ? `Olá, ${corretorNome}` : "Prática IA"}
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-8">
        Pergunte sobre leads, empreendimentos, unidades ou vendas. Os dados vêm direto do seu CRM.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-lg">
        {QUICK_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSendMessage(s.prompt)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all text-left group"
          >
            <s.icon className={cn("h-4 w-4 shrink-0", s.color)} />
            <div>
              <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{s.label}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
