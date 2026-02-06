"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  Send,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  Building2,
  Users,
  BarChart3,
  Clock,
  TrendingUp,
  Mic,
  Square,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { SmartTable } from "@/components/chat-cards"

interface Conversa {
  id: number
  titulo: string
  updated_at: string
}

interface Mensagem {
  id?: number
  role: "user" | "assistant"
  content: string
}

const ACTIVITY_CARDS = [
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
]

const PILLS = [
  { label: "Leads recentes", prompt: "Quais foram os últimos leads que entraram?" },
  { label: "Unidades disponíveis", prompt: "Quais empreendimentos têm unidades disponíveis?" },
  { label: "Meus números", prompt: "Me dê um resumo geral dos meus números no CRM." },
]

export default function AssistentePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking("pratica-ia")

  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaAtiva, setConversaAtiva] = useState<number | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login")
  }, [authLoading, isAuthenticated, router])

  // Load conversations
  useEffect(() => {
    if (!isAuthenticated) return
    fetch("/api/assistente/chat", { method: "GET" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.conversas) setConversas(data.conversas) })
      .catch((err) => { console.error('Erro ao carregar conversas:', err); toast.error('Erro ao carregar conversas'); })
  }, [isAuthenticated])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens, statusMessage])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px"
  }

  const enviarMensagem = useCallback(async (texto?: string) => {
    const msg = (texto || input).trim()
    if (!msg || isStreaming) return

    setInput("")
    if (inputRef.current) inputRef.current.style.height = "auto"

    // Add user message
    setMensagens((prev) => [...prev, { role: "user", content: msg }])
    setIsStreaming(true)
    setStatusMessage(null)

    // Add empty assistant message for streaming
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
          } catch (err) { console.error('Erro no streaming:', err); toast.error('Erro ao processar resposta'); }
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
  }, [input, isStreaming, conversaAtiva])

  const novaConversa = () => {
    setConversaAtiva(null)
    setMensagens([])
    setInput("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
              setInput((prev) => (prev ? prev + ' ' + text : text))
              inputRef.current?.focus()
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

  if (authLoading) {
    return (
      <AppShell title="Prática IA">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Prática IA">
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {mensagens.length === 0 ? (
            /* Welcome Screen — Narrative */
            <div className="flex flex-col items-center justify-center h-full px-4">
              {/* Glow icon */}
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl scale-150" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
                Seu dia rende mais com IA
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-8 leading-relaxed">
                Enquanto você visita clientes, eu cuido do resto: respondo leads, encontro imóveis e aviso quando um negócio está esfriando.
              </p>

              {/* 4 Activity cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-5">
                {ACTIVITY_CARDS.map((card) => (
                  <button
                    key={card.title}
                    onClick={() => enviarMensagem(card.prompt)}
                    disabled={isStreaming}
                    className="flex flex-col gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                      <card.icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{card.title}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{card.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Power-user pills */}
              <div className="flex flex-wrap justify-center gap-2">
                {PILLS.map((pill) => (
                  <button
                    key={pill.label}
                    onClick={() => enviarMensagem(pill.prompt)}
                    disabled={isStreaming}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-4 py-4 px-2">
              {mensagens.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-zinc-900 dark:text-zinc-100">
                        {msg.content ? (
                          <div className="chat-markdown">
                            <ReactMarkdown components={{ table: SmartTable }}>{msg.content}</ReactMarkdown>
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
                <div className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 pl-11">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {statusMessage}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 pb-2">
          {mensagens.length > 0 && (
            <div className="flex justify-center mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={novaConversa}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova conversa
              </Button>
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

          <div className="relative flex items-end gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 shadow-sm focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-400/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Quais leads preciso ligar hoje?"
              rows={1}
              className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none outline-none max-h-[150px]"
              disabled={isStreaming || isTranscribing}
            />
            {/* Mic button */}
            <button
              onClick={toggleRecording}
              disabled={isStreaming || isTranscribing}
              className={cn(
                "shrink-0 rounded-xl h-9 w-9 flex items-center justify-center transition-all",
                isRecording
                  ? "bg-red-500 text-white shadow-md shadow-red-500/30 hover:bg-red-600"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              )}
              title={isRecording ? "Parar gravação" : "Gravar áudio"}
            >
              {isRecording ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Mic className="h-4.5 w-4.5" />
              )}
            </button>
            {/* Send button */}
            <Button
              size="icon"
              onClick={() => enviarMensagem()}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "shrink-0 rounded-xl h-9 w-9 transition-all",
                input.trim() && !isStreaming
                  ? "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20"
                  : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400"
              )}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-2">
            Consulto dados reais do seu CRM — pode perguntar a qualquer hora
          </p>
        </div>
      </div>
    </AppShell>
  )
}
