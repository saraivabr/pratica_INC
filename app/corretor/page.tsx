"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Building2,
  MessageSquare,
  Sparkles,
  Loader2,
  Calendar,
  Zap,
  Target,
  Flame,
  ShieldAlert,
  CalendarX,
  DollarSign,
  Trophy,
  Send,
  Plus,
  Mic,
  Square,
  RefreshCw,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChatMarkdown } from "@/components/chat-cards"

interface Lead {
  id: string
  nome: string
  telefone: string
  origem?: string
  situacao?: string
  empreendimento?: { id?: number; nome?: string } | null
  interacoes?: Array<{ descricao?: string; data_cad?: string }>
}

interface CategorizedItem {
  lead: Lead
  reason: string
  priority: number
}

interface CategorizedLeads {
  contactNow: CategorizedItem[]
  lossRisks: CategorizedItem[]
  opportunities: CategorizedItem[]
  overdue: CategorizedItem[]
}

interface Mensagem {
  id?: number
  role: "user" | "assistant"
  content: string
}

// Helper function to categorize leads by urgency
function categorizeLeads(leads: Lead[]): CategorizedLeads {
  const contactNow: CategorizedItem[] = []
  const lossRisks: CategorizedItem[] = []
  const opportunities: CategorizedItem[] = []
  const overdue: CategorizedItem[] = []

  const now = new Date()

  leads.forEach((lead) => {
    const lastInteraction = lead.interacoes?.[0]
    const lastDate = lastInteraction?.data_cad ? new Date(lastInteraction.data_cad) : null
    const daysSinceContact = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : 999

    if (daysSinceContact > 7 && lead.situacao === "quente") {
      contactNow.push({ lead, reason: `Sem contato há ${daysSinceContact} dias`, priority: 1 })
    } else if (daysSinceContact > 14 || lead.situacao === "frio") {
      lossRisks.push({ lead, reason: `Lead esfriando - ${daysSinceContact} dias sem contato`, priority: 2 })
    } else if (lead.situacao === "quente" && daysSinceContact <= 3) {
      opportunities.push({ lead, reason: "Lead quente - pronto para avançar", priority: 3 })
    } else if (daysSinceContact > 5) {
      overdue.push({ lead, reason: `Follow-up atrasado - ${daysSinceContact} dias`, priority: 4 })
    }
  })

  return { contactNow, lossRisks, opportunities, overdue }
}

function getUrgencyStats(leads: Lead[]) {
  const categorized = categorizeLeads(leads)
  return {
    totalLeads: leads.length,
    criticalActions: categorized.contactNow.length,
    atRisk: categorized.lossRisks.length,
    hotOpportunities: categorized.opportunities.length,
    overdueFollowups: categorized.overdue.length,
  }
}

export default function CorretorDashboard() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-dashboard")

  // Data states
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<{
    goals: { leads: number; conversions: number; revenue: number }
    current: { leads: number; conversions: number; revenue: number }
    progress: { leads: number; conversions: number; revenue: number }
    overallProgress: number
    period: { month: string; daysRemaining: number }
  } | null>(null)
  const [activities, setActivities] = useState<Array<{
    id: string
    title: string
    scheduled_at: string
    lead_name?: string
    activity_type?: string
    status?: string
  }>>([])
  const [whatsappData, setWhatsappData] = useState<{
    status: "loading" | "connected" | "disconnected"
  }>({ status: "loading" })

  // Chat states
  const [conversaAtiva, setConversaAtiva] = useState<number | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Leads accordion
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Check WhatsApp status
  useEffect(() => {
    if (!isAuthenticated) return
    fetch("/api/whatsapp/session/status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setWhatsappData({ status: data.status === "ready" ? "connected" : "disconnected" })
        } else {
          setWhatsappData({ status: "disconnected" })
        }
      })
      .catch(() => setWhatsappData({ status: "disconnected" }))
  }, [isAuthenticated])

  // Fetch leads
  useEffect(() => {
    if (!isAuthenticated) return
    setLoading(true)
    fetch("/api/leads?limit=100")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setLeads(data.data || []) })
      .catch((e) => console.error("Erro ao buscar leads:", e))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  // Fetch goals, activities
  useEffect(() => {
    if (!isAuthenticated) return

    fetch("/api/crm/goals")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setGoals(data) })
      .catch((e) => console.error("Erro ao buscar metas:", e))

    const params = user?.id ? `?userId=${user.id}` : ""
    fetch(`/api/crm/activities${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          const now = new Date()
          const upcoming = (data || [])
            .filter((a: any) => a.scheduled_at && new Date(a.scheduled_at) >= now && a.status !== "completed")
            .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .slice(0, 3)
          setActivities(upcoming)
        }
      })
      .catch((e) => console.error("Erro ao buscar atividades:", e))
  }, [isAuthenticated, user?.id])

  // Process leads
  const categorizedLeads = useMemo(() => {
    if (!leads.length) return null
    return categorizeLeads(leads)
  }, [leads])

  const urgencyStats = useMemo(() => {
    if (!leads.length) return null
    return getUrgencyStats(leads)
  }, [leads])

  const metrics = useMemo(() => {
    if (!urgencyStats) return { score: 0 }
    const { criticalActions, atRisk, hotOpportunities } = urgencyStats
    const scoreBase = Math.min(100, Math.max(0,
      70 + (hotOpportunities * 8) - (criticalActions * 3) - (atRisk * 5)
    ))
    return { score: Math.round(scoreBase) }
  }, [urgencyStats])

  // Smart suggestions based on real data
  const smartSuggestions = useMemo(() => {
    const suggestions: Array<{ icon: typeof Users; label: string; prompt: string }> = []

    if (urgencyStats && urgencyStats.criticalActions > 0) {
      suggestions.push({
        icon: Flame,
        label: `${urgencyStats.criticalActions} urgentes`,
        prompt: `Tenho ${urgencyStats.criticalActions} leads urgentes que precisam de contato imediato. Me ajude a priorizar e montar um plano de ação.`,
      })
    }

    if (goals && goals.overallProgress < 70) {
      suggestions.push({
        icon: Target,
        label: `Meta ${goals.overallProgress}%`,
        prompt: `Estou em ${goals.overallProgress}% da minha meta mensal com ${goals.period.daysRemaining} dias restantes. O que posso fazer para acelerar?`,
      })
    }

    if (activities.length > 0) {
      suggestions.push({
        icon: Calendar,
        label: `${activities.length} compromisso${activities.length > 1 ? "s" : ""}`,
        prompt: "Quais são meus compromissos de hoje e amanhã? Me ajude a me preparar.",
      })
    }

    if (urgencyStats && urgencyStats.overdueFollowups > 0) {
      suggestions.push({
        icon: CalendarX,
        label: `${urgencyStats.overdueFollowups} atrasados`,
        prompt: `Tenho ${urgencyStats.overdueFollowups} follow-ups atrasados. Como posso recuperar esses leads?`,
      })
    }

    // Fallbacks
    if (suggestions.length < 2) {
      suggestions.push({
        icon: Users,
        label: "Meu funil",
        prompt: "Quantos leads tenho em cada etapa do funil? Me dê um resumo.",
      })
    }
    if (suggestions.length < 3) {
      suggestions.push({
        icon: Building2,
        label: "Disponibilidade",
        prompt: "Quais empreendimentos têm unidades disponíveis?",
      })
    }
    if (suggestions.length < 4) {
      suggestions.push({
        icon: TrendingUp,
        label: "Estatísticas",
        prompt: "Me dê um resumo geral dos meus números no CRM.",
      })
    }

    return suggestions.slice(0, 4)
  }, [urgencyStats, goals, activities])

  // Chat scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens, statusMessage])

  // Auto-resize textarea
  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  // Send message with SSE streaming
  const enviarMensagem = useCallback(async (texto?: string) => {
    const msg = (texto || chatInput).trim()
    if (!msg || isStreaming) return

    setChatInput("")
    if (chatInputRef.current) chatInputRef.current.style.height = "auto"

    setMensagens((prev) => [...prev, { role: "user", content: msg }])
    setIsStreaming(true)
    setStatusMessage(null)
    setMensagens((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch("/api/assistente/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: conversaAtiva, message: msg }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error("Erro na resposta")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Sem stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "meta" && event.conversaId) {
              setConversaAtiva(event.conversaId)
              localStorage.setItem("chat-conversa-id", String(event.conversaId))
            } else if (event.type === "status") {
              setStatusMessage(event.message)
            } else if (event.type === "text") {
              setStatusMessage(null)
              setMensagens((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + event.content }
                }
                return updated
              })
            } else if (event.type === "error") {
              setMensagens((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: "Desculpe, ocorreu um erro. Tente novamente." }
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMensagens((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === "assistant" && !last.content) {
            updated[updated.length - 1] = { ...last, content: "Erro de conexão. Tente novamente." }
          }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
      setStatusMessage(null)
      abortRef.current = null
    }
  }, [chatInput, isStreaming, conversaAtiva])

  const novaConversa = () => {
    setConversaAtiva(null)
    setMensagens([])
    setChatInput("")
    chatInputRef.current?.focus()
  }

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        setRecordingTime(0)

        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        if (blob.size < 1000) return // too small, ignore

        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'audio.webm')
          const res = await fetch('/api/assistente/transcribe', { method: 'POST', body: formData })
          if (res.ok) {
            const { text } = await res.json()
            if (text) {
              setChatInput((prev) => (prev ? prev + ' ' + text : text))
              chatInputRef.current?.focus()
            }
          }
        } catch (err) {
          console.error('Erro na transcrição:', err)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 59) { stopRecording(); return 0 }
          return t + 1
        })
      }, 1000)
    } catch {
      // permission denied or not available
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording()
    else startRecording()
  }, [isRecording, startRecording, stopRecording])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  const handleContact = (lead: Lead, method: "phone" | "whatsapp") => {
    if (method === "whatsapp") {
      const phoneNumber = lead.telefone.replace(/\D/g, "")
      const firstName = lead.nome?.split(" ")[0] || "cliente"
      const propertyName = lead.empreendimento?.nome || "as oportunidades disponíveis"
      const message = encodeURIComponent(`Olá ${firstName}! Como vai? Gostaria de conversar sobre ${propertyName}.`)
      window.open(`https://wa.me/55${phoneNumber}?text=${message}`, "_blank")
    } else {
      const phoneNumber = lead.telefone.replace(/\D/g, "")
      window.location.href = `tel:+55${phoneNumber}`
    }
  }

  // Lead category config for compact view
  const leadCategories = useMemo(() => {
    if (!categorizedLeads) return []
    return [
      { key: "contactNow", label: "Urgentes", icon: Flame, color: "text-red-500", dot: "bg-red-500", items: categorizedLeads.contactNow, href: "/leads?filter=urgente" },
      { key: "lossRisks", label: "Em risco", icon: ShieldAlert, color: "text-amber-500", dot: "bg-amber-500", items: categorizedLeads.lossRisks, href: "/leads?filter=risco" },
      { key: "opportunities", label: "Quentes", icon: TrendingUp, color: "text-emerald-500", dot: "bg-emerald-500", items: categorizedLeads.opportunities, href: "/leads?filter=quente" },
      { key: "overdue", label: "Atrasados", icon: CalendarX, color: "text-gray-500", dot: "bg-gray-400", items: categorizedLeads.overdue, href: "/leads?filter=atrasado" },
    ].filter((c) => c.items.length > 0)
  }, [categorizedLeads])

  // Context strip items
  const contextItems = useMemo(() => {
    return [
      { icon: Users, label: "Leads", value: goals?.current.leads ?? "-", prompt: "Me fale sobre meus leads do mês. Quantos tenho e como estão distribuídos?" },
      { icon: Trophy, label: "Conversões", value: goals?.current.conversions ?? "-", prompt: "Quantas conversões tive este mês? Como posso melhorar?" },
      { icon: DollarSign, label: "Receita", value: goals ? `R$${(goals.current.revenue / 1000).toFixed(0)}k` : "-", prompt: "Qual minha receita do mês? Estou batendo a meta?" },
      { icon: Target, label: "Meta", value: goals ? `${goals.overallProgress}%` : "-", prompt: "Como está meu progresso geral da meta? O que posso fazer para melhorar?" },
    ]
  }, [goals])

  // Loading state
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
    <AppShell title="Dashboard">
      <div className="min-h-screen relative">
        <AnimatedBackground />

        <div className="relative z-10 max-w-4xl mx-auto space-y-3 sm:space-y-4 animate-page-in">

          {/* ===== SECTION 1: Compact Header ===== */}
          <section className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                {getGreeting()}, {user?.nome?.split(" ")[0] || "Corretor"}!
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Score badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm">
                <Sparkles className="h-3 w-3" />
                <span className="text-xs font-bold">{metrics.score}</span>
              </div>
              {/* WhatsApp status */}
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full flex-shrink-0",
                  whatsappData.status === "connected" ? "bg-green-500 shadow-sm shadow-green-500/50" :
                  whatsappData.status === "loading" ? "bg-gray-300 animate-pulse" :
                  "bg-gray-300"
                )}
                title={whatsappData.status === "connected" ? "WhatsApp conectado" : "WhatsApp desconectado"}
              />
            </div>
          </section>

          {/* ===== SECTION 2: Context Strip ===== */}
          <section className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
            {contextItems.map((item) => (
              <button
                key={item.label}
                onClick={() => enviarMensagem(item.prompt)}
                disabled={isStreaming}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80 backdrop-blur-sm hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all flex-shrink-0 group"
              >
                <item.icon className="h-3.5 w-3.5 text-gray-400 group-hover:text-violet-500 transition-colors" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
              </button>
            ))}
          </section>

          {/* ===== SECTION 3: AI Chat (HERO) ===== */}
          <section className="relative">
            <div className="relative bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm md:backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden">
              {/* Chat area */}
              <div className="flex flex-col" style={{ minHeight: "55vh", maxHeight: "65vh" }}>
                {/* Messages or Welcome */}
                <div className="flex-1 overflow-y-auto">
                  {mensagens.length === 0 ? (
                    /* Welcome Screen — Narrative */
                    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
                      {/* Glow icon */}
                      <div className="relative mb-5">
                        <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl scale-150" />
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                          <Sparkles className="h-7 w-7 text-white" />
                        </div>
                      </div>

                      <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
                        Seu dia rende mais com IA
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-6 leading-relaxed">
                        Enquanto você visita clientes, eu cuido do resto: respondo leads, encontro imóveis e aviso quando um negócio está esfriando.
                      </p>

                      {/* 4 Activity cards — 2x2 grid */}
                      <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mb-5">
                        {[
                          {
                            icon: Sparkles,
                            title: "Briefing do dia",
                            subtitle: urgencyStats && urgencyStats.criticalActions > 0
                              ? `${urgencyStats.criticalActions} urgente${urgencyStats.criticalActions > 1 ? "s" : ""}, ${activities.length} compromisso${activities.length !== 1 ? "s" : ""}`
                              : "O que precisa da sua atenção agora",
                            prompt: "Me dê um briefing completo do meu dia: leads urgentes, compromissos, follow-ups atrasados e como está minha meta",
                          },
                          {
                            icon: Building2,
                            title: "Achar imóvel ideal",
                            subtitle: "Descreva o cliente e eu busco",
                            prompt: "Tenho um cliente procurando apartamento de 2 quartos até R$500 mil. O que temos disponível?",
                          },
                          {
                            icon: MessageSquare,
                            title: "Montar mensagem",
                            subtitle: "Crio textos prontos pro WhatsApp",
                            prompt: "Me ajude a montar uma mensagem de follow-up para um lead que visitou o empreendimento semana passada mas não deu retorno",
                          },
                          {
                            icon: TrendingUp,
                            title: "Analisar meu funil",
                            subtitle: "Onde estão seus gargalos de vendas",
                            prompt: "Analise meu funil de vendas e me diga onde estou perdendo mais leads e o que posso fazer",
                          },
                        ].map((card) => (
                          <button
                            key={card.title}
                            onClick={() => enviarMensagem(card.prompt)}
                            disabled={isStreaming}
                            className="flex flex-col gap-1.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/50 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/80 dark:hover:bg-violet-900/10 transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                              <card.icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{card.title}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight line-clamp-2">{card.subtitle}</span>
                          </button>
                        ))}
                      </div>

                      {/* Power-user pills */}
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          { label: "Leads recentes", prompt: "Quais foram os últimos leads que entraram?" },
                          { label: "Unidades disponíveis", prompt: "Quais empreendimentos têm unidades disponíveis?" },
                          { label: "Meus números", prompt: "Me dê um resumo geral dos meus números no CRM." },
                        ].map((pill) => (
                          <button
                            key={pill.label}
                            onClick={() => enviarMensagem(pill.prompt)}
                            disabled={isStreaming}
                            className="px-3 py-1.5 rounded-full text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Messages */
                    <div className="space-y-3 py-4 px-3 sm:px-4">
                      {mensagens.map((msg, i) => (
                        <div key={i}>
                          {msg.role === "user" ? (
                            /* User message — right-aligned bubble */
                            <div className="flex justify-end">
                              <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>
                          ) : (
                            /* Assistant message — full-width, no bubble */
                            <div className="flex gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0 text-zinc-900 dark:text-zinc-100">
                                {msg.content ? (
                                  <div className="chat-markdown">
                                    <ChatMarkdown content={msg.content} />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 py-2">
                                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {statusMessage && (
                        <div className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 pl-10">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {statusMessage}
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 sm:px-4 pt-3 pb-3">
                  {mensagens.length > 0 && (
                    <div className="flex justify-center mb-2">
                      <button
                        onClick={novaConversa}
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Nova conversa
                      </button>
                    </div>
                  )}
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="flex items-center justify-center gap-3 mb-2 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-1 h-7 text-red-500">
                        <span className="voice-bar" /><span className="voice-bar" /><span className="voice-bar" /><span className="voice-bar" /><span className="voice-bar" />
                      </div>
                      <span className="text-xs font-medium text-red-600 dark:text-red-400 recording-pulse">
                        {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                  {isTranscribing && (
                    <div className="flex items-center justify-center gap-2 mb-2 py-2 text-sm text-violet-600 dark:text-violet-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Transcrevendo...
                    </div>
                  )}
                  <div className="relative flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-400/20 transition-all">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={handleChatInputChange}
                      onKeyDown={handleChatKeyDown}
                      placeholder="Ex: Quais leads preciso ligar hoje?"
                      rows={1}
                      className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none outline-none max-h-[120px]"
                      disabled={isStreaming || isTranscribing}
                    />
                    {/* Mic button */}
                    <button
                      onClick={toggleRecording}
                      disabled={isStreaming || isTranscribing}
                      className={cn(
                        "shrink-0 rounded-lg h-8 w-8 flex items-center justify-center transition-all",
                        isRecording
                          ? "bg-red-500 text-white shadow-md shadow-red-500/30 hover:bg-red-600"
                          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      )}
                      title={isRecording ? "Parar gravação" : "Gravar áudio"}
                    >
                      {isRecording ? (
                        <Square className="h-3 w-3 fill-current" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                    {/* Send button */}
                    <Button
                      size="icon"
                      onClick={() => enviarMensagem()}
                      disabled={!chatInput.trim() || isStreaming}
                      className={cn(
                        "shrink-0 rounded-lg h-8 w-8 transition-all",
                        chatInput.trim() && !isStreaming
                          ? "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20"
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                      )}
                    >
                      {isStreaming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-1.5">
                    Consulto dados reais do seu CRM — pode perguntar a qualquer hora
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ===== SECTION 4: Compact Lead Categories ===== */}
          {!loading && leadCategories.length > 0 && (
            <section className="px-1">
              <div className="bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm md:backdrop-blur-2xl rounded-2xl shadow-lg border border-white/60 dark:border-zinc-800/60 overflow-hidden">
                {leadCategories.map((cat, idx) => (
                  <div key={cat.key}>
                    {idx > 0 && <div className="border-t border-gray-100 dark:border-zinc-800" />}
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                    >
                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", cat.dot)} />
                      <cat.icon className={cn("h-4 w-4 flex-shrink-0", cat.color)} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{cat.label}</span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        {cat.items.length}
                      </span>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-gray-400 transition-transform duration-200",
                        expandedCategory === cat.key && "rotate-180"
                      )} />
                    </button>

                    {/* Expanded content */}
                    {expandedCategory === cat.key && (
                      <div className="px-4 pb-3 space-y-1.5">
                        {cat.items.slice(0, 5).map((item, i) => (
                          <div
                            key={item.lead.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <span className="text-[10px] font-bold text-gray-400 w-4 text-center flex-shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.lead.nome}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{item.reason}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleContact(item.lead, "whatsapp") }}
                              className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex-shrink-0"
                              title="WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            </button>
                          </div>
                        ))}
                        {cat.items.length > 5 && (
                          <Link
                            href={cat.href}
                            className="flex items-center justify-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline py-1"
                          >
                            Ver todos ({cat.items.length})
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== SECTION 5: Roleta Card ===== */}
          <section className="px-1">
            <Link
              href="/corretor/recepcao"
              className="block bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm md:backdrop-blur-2xl rounded-2xl shadow-lg border border-primary/20 dark:border-primary/10 overflow-hidden hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/20 group-hover:to-primary/30 transition-colors">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Roleta de Leads</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Puxe leads e gerencie atendimentos</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </section>

          {/* ===== SECTION 6: Quick Actions Slim ===== */}
          <section className="flex flex-wrap gap-2 px-1 pb-4">
            <Link
              href="/leads"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all"
            >
              <Users className="h-3.5 w-3.5" />
              Leads
            </Link>
            <Link
              href="/empreendimentos"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all"
            >
              <Building2 className="h-3.5 w-3.5" />
              Imóveis
            </Link>
            <Link
              href="/corretor/agenda"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              Agenda
            </Link>
            {whatsappData.status === "connected" && (
              <Link
                href="/corretor/whatsapp"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp
              </Link>
            )}
            {whatsappData.status === "disconnected" && (
              <Link
                href="/onboarding/whatsapp"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium hover:shadow-md hover:shadow-green-500/20 transition-all"
              >
                <Zap className="h-3.5 w-3.5" />
                Conectar WhatsApp
              </Link>
            )}
            <Link
              href="/corretor/assistente"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              IA tela cheia
            </Link>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
