"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  MessageSquare,
  Sparkles,
  Loader2,
  TrendingUp,
  Send,
  Plus,
  Mic,
  Square,
  Users,
  Target,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Trophy,
  UserPlus,
  Phone,
  MapPin,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChatMarkdown } from "@/components/chat-cards"
import {
  useSidebarLeads,
  useSidebarGoals,
  useDashboardStats,
  useDashboardActivities,
  useRecentLeads,
} from "@/hooks/use-sidebar-data"

interface Mensagem {
  id?: number
  role: "user" | "assistant"
  content: string
}

// ============================================================================
// KPI Card component
// ============================================================================

function KpiCard({
  icon: Icon,
  label,
  value,
  variation,
  suffix,
  extra,
  isLoading,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  variation?: number
  suffix?: string
  extra?: React.ReactNode
  isLoading?: boolean
}) {
  return (
    <div className="min-w-[150px] flex-1 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-zinc-800/60 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        {variation !== undefined && variation !== 0 && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              variation > 0
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
            )}
          >
            {variation > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(variation)}%
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="h-7 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      ) : (
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {value}
          {suffix && <span className="text-sm font-normal text-zinc-400 ml-0.5">{suffix}</span>}
        </div>
      )}
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</div>
      {extra}
    </div>
  )
}

// ============================================================================
// Dashboard Right Sidebar (desktop only)
// ============================================================================

function DashboardSidebar() {
  const { leads, isLoading: leadsLoading } = useRecentLeads()
  const { upcoming, isLoading: activitiesLoading } = useDashboardActivities()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
    if (days === 1) return "Amanhã"
    if (days > 1 && days <= 7) return d.toLocaleDateString("pt-BR", { weekday: "short" })
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }

  const formatLeadDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}min atrás`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h atrás`
    const diffD = Math.floor(diffH / 24)
    if (diffD === 1) return "ontem"
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }

  const activityTypeIcon = (type: string) => {
    switch (type) {
      case "visit":
      case "visita":
        return MapPin
      case "call":
      case "ligacao":
        return Phone
      default:
        return Calendar
    }
  }

  return (
    <div className="w-[320px] shrink-0 space-y-4 hidden lg:flex lg:flex-col">
      {/* Recent leads */}
      <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-zinc-800/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Leads recentes</h3>
        </div>
        {leadsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">Nenhum lead recente</p>
        ) : (
          <div className="space-y-2">
            {leads.map(lead => (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-default"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {lead.nome?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{lead.nome}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {lead.origem} {lead.data_cadastro ? `· ${formatLeadDate(lead.data_cadastro)}` : ""}
                  </p>
                </div>
                {lead.situacao && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0 max-w-[70px] truncate">
                    {lead.situacao}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming activities */}
      <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-zinc-800/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Próximas atividades</h3>
        </div>
        {activitiesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">Nenhuma atividade agendada</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(activity => {
              const TypeIcon = activityTypeIcon(activity.activity_type)
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-default"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5">
                    <TypeIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{activity.title}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {formatDate(activity.scheduled_at)}
                      {activity.lead_name ? ` · ${activity.lead_name}` : ""}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function CorretorDashboard() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-dashboard")

  // Data hooks
  const { total: totalLeads, newToday } = useSidebarLeads()
  const { overallProgress } = useSidebarGoals()
  const { totalLeads: leadsThisMonth, leadsVariation, conversionRate, conversionVariation, isLoading: statsLoading } = useDashboardStats()

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

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

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
        if (blob.size < 1000) return

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
    <AppShell title="Início">
      <div className="min-h-screen relative">
        <AnimatedBackground />

        <div className="relative z-10 max-w-7xl mx-auto space-y-4 animate-page-in">

          {/* ===== Greeting ===== */}
          <section className="px-1 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, {user?.nome?.split(" ")[0] || "Corretor"}!
              </h1>
              {newToday > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  +{newToday} {newToday === 1 ? "novo lead" : "novos leads"} hoje
                </p>
              )}
            </div>
          </section>

          {/* ===== KPI Cards ===== */}
          <section className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-1">
            <KpiCard
              icon={Users}
              label="Leads ativos"
              value={totalLeads}
              variation={leadsVariation}
              isLoading={statsLoading}
            />
            <KpiCard
              icon={TrendingUp}
              label="Leads este mês"
              value={leadsThisMonth}
              variation={leadsVariation}
              isLoading={statsLoading}
            />
            <KpiCard
              icon={Percent}
              label="Conversão"
              value={`${conversionRate}%`}
              variation={conversionVariation}
              isLoading={statsLoading}
            />
            <KpiCard
              icon={Trophy}
              label="Meta geral"
              value={`${overallProgress}%`}
              isLoading={statsLoading}
              extra={
                <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-700"
                    style={{ width: `${Math.min(overallProgress, 100)}%` }}
                  />
                </div>
              }
            />
          </section>

          {/* ===== Main Content: Chat + Sidebar ===== */}
          <section className="flex gap-4 items-start px-1">
            {/* AI Chat Card */}
            <div className="flex-1 min-w-0">
              <div className="relative bg-white/90 md:bg-white/70 dark:bg-zinc-900/90 md:dark:bg-zinc-900/70 backdrop-blur-sm md:backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden">
                {/* Emerald glow border on top */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500" />

                <div className="flex flex-col" style={{ minHeight: "60vh", maxHeight: "75vh" }}>
                  {/* Messages or Welcome */}
                  <div className="flex-1 overflow-y-auto">
                    {mensagens.length === 0 ? (
                      /* Welcome Screen */
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
                              subtitle: "O que precisa da sua atenção agora",
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
                              <div className="flex justify-end">
                                <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              </div>
                            ) : (
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
            </div>

            {/* Desktop Right Sidebar */}
            <DashboardSidebar />
          </section>

        </div>
      </div>
    </AppShell>
  )
}
