"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Sparkles, X, Minus, Send, Loader2, Plus, Mic, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { ChatMarkdown } from "@/components/chat-cards"

interface Mensagem {
  role: "user" | "assistant"
  content: string
}

const STORAGE_KEY = "chat-conversa-id"
const OPEN_KEY = "chat-widget-open"

// Pages that have their own chat UI — hide widget there
const HIDE_ON = ["/corretor", "/corretor/assistente"]

export function ChatWidget() {
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [conversaId, setConversaId] = useState<number | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  // Voice
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Should we show? Only for authenticated non-recepcionista, not on pages with own chat
  const isRecepcionista = user?.hierarquia?.slug === "recepcionista" || user?.role === "recepcionista"
  const shouldShow = isAuthenticated && !isRecepcionista && !HIDE_ON.includes(pathname)

  // Load state from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) return
    const savedId = localStorage.getItem(STORAGE_KEY)
    if (savedId) {
      const id = parseInt(savedId, 10)
      if (!isNaN(id)) {
        setConversaId(id)
        loadMessages(id)
      }
    }
    const savedOpen = localStorage.getItem(OPEN_KEY)
    if (savedOpen === "true") setIsOpen(true)
  }, [isAuthenticated])

  // Persist open state
  useEffect(() => {
    localStorage.setItem(OPEN_KEY, String(isOpen))
    if (isOpen) setHasNewMessage(false)
  }, [isOpen])

  // Check for conversaId changes from other pages (dashboard)
  useEffect(() => {
    if (!isAuthenticated) return
    const handler = () => {
      const savedId = localStorage.getItem(STORAGE_KEY)
      const id = savedId ? parseInt(savedId, 10) : null
      if (id && id !== conversaId) {
        setConversaId(id)
        loadMessages(id)
      }
    }
    window.addEventListener("storage", handler)
    // Also poll (same-tab storage changes don't fire 'storage')
    const interval = setInterval(() => {
      const savedId = localStorage.getItem(STORAGE_KEY)
      const id = savedId ? parseInt(savedId, 10) : null
      if (id && id !== conversaId) {
        setConversaId(id)
        loadMessages(id)
      }
    }, 2000)
    return () => {
      window.removeEventListener("storage", handler)
      clearInterval(interval)
    }
  }, [isAuthenticated, conversaId])

  // Listen for 'chat-prompt' custom events from cards
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.message) {
        setIsOpen(true)
        // Small delay to let panel open
        setTimeout(() => enviarMensagem(detail.message), 100)
      }
    }
    window.addEventListener("chat-prompt", handler)
    return () => window.removeEventListener("chat-prompt", handler)
  }, [])

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens, statusMessage, isOpen])

  async function loadMessages(id: number) {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/assistente/chat?conversaId=${id}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.mensagens) {
          setMensagens(data.mensagens.map((m: any) => ({ role: m.role, content: m.content })))
        }
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const enviarMensagem = useCallback(async (texto?: string) => {
    const msg = (texto || input).trim()
    if (!msg || isStreaming) return

    setInput("")
    if (inputRef.current) inputRef.current.style.height = "auto"

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
        body: JSON.stringify({ conversaId, message: msg }),
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
              setConversaId(event.conversaId)
              localStorage.setItem(STORAGE_KEY, String(event.conversaId))
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

      if (!isOpen) setHasNewMessage(true)
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
  }, [input, isStreaming, conversaId, isOpen])

  const novaConversa = () => {
    setConversaId(null)
    setMensagens([])
    setInput("")
    localStorage.removeItem(STORAGE_KEY)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"
  }

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
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
            if (text) { setInput((prev) => (prev ? prev + ' ' + text : text)); inputRef.current?.focus() }
          }
        } catch {} finally { setIsTranscribing(false) }
      }
      mediaRecorder.start(250)
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => { if (t >= 59) { stopRecording(); return 0 } return t + 1 })
      }, 1000)
    } catch {}
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording(); else startRecording()
  }, [isRecording, startRecording, stopRecording])

  if (!shouldShow) return null

  return (
    <>
      {/* Expanded panel */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-2 md:right-6 z-50 w-[calc(100%-1rem)] md:w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col overflow-hidden" style={{ maxHeight: "min(70vh, 550px)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Prática IA</span>
              </div>
              <div className="flex items-center gap-1">
                {mensagens.length > 0 && (
                  <button onClick={novaConversa} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Nova conversa">
                    <Plus className="h-4 w-4 text-zinc-400" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Minimizar">
                  <Minus className="h-4 w-4 text-zinc-400" />
                </button>
                <button onClick={() => { setIsOpen(false) }} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Fechar">
                  <X className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                </div>
              ) : mensagens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">Como posso ajudar?</p>
                  <p className="text-xs text-zinc-400 text-center mb-4">Pergunte sobre leads, empreendimentos, metas...</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {[
                      { label: "Leads urgentes", prompt: "Quais leads preciso contatar urgente?" },
                      { label: "Meus números", prompt: "Me dê um resumo dos meus números no CRM." },
                      { label: "Imóveis disponíveis", prompt: "Quais empreendimentos têm unidades disponíveis?" },
                    ].map((pill) => (
                      <button
                        key={pill.label}
                        onClick={() => enviarMensagem(pill.prompt)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 hover:text-violet-600 transition-all"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-3 px-3">
                  {mensagens.map((msg, i) => (
                    <div key={i}>
                      {msg.role === "user" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                            <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 text-zinc-900 dark:text-zinc-100">
                            {msg.content ? (
                              <div className="chat-markdown text-[13px]">
                                <ChatMarkdown content={msg.content} />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 py-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {statusMessage && (
                    <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 pl-8">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {statusMessage}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 py-2.5">
              {isRecording && (
                <div className="flex items-center justify-center gap-2 mb-2 py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-0.5 h-5 text-red-500">
                    <span className="voice-bar" /><span className="voice-bar" /><span className="voice-bar" /><span className="voice-bar" /><span className="voice-bar" />
                  </div>
                  <span className="text-[10px] font-medium text-red-600 dark:text-red-400 recording-pulse">
                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              {isTranscribing && (
                <div className="flex items-center justify-center gap-1.5 mb-2 py-1.5 text-xs text-violet-600 dark:text-violet-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Transcrevendo...
                </div>
              )}
              <div className="flex items-end gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-400/20 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte algo..."
                  rows={1}
                  className="flex-1 bg-transparent text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none outline-none max-h-[100px]"
                  disabled={isStreaming || isTranscribing}
                />
                <button
                  onClick={toggleRecording}
                  disabled={isStreaming || isTranscribing}
                  className={cn(
                    "shrink-0 rounded-lg h-7 w-7 flex items-center justify-center transition-all",
                    isRecording
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  {isRecording ? <Square className="h-2.5 w-2.5 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => enviarMensagem()}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    "shrink-0 rounded-lg h-7 w-7 flex items-center justify-center transition-all",
                    input.trim() && !isStreaming
                      ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                  )}
                >
                  {isStreaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-full shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all px-4 py-3 md:px-5 md:py-3.5">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Prática IA</span>
              {hasNewMessage && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
          </div>
        </button>
      )}
    </>
  )
}
