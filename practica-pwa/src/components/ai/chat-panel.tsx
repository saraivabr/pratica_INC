"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Sparkles, Loader2, Bot, User, Lightbulb, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatContext {
  preReserva?: {
    cliente: string
    empreendimento: string
    unidade: string
    valorTotal: number
    status: string
  }
  unidade?: {
    numero: string
    area: number
    dormitorios: number
    valorTotal: number
  }
}

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  context?: ChatContext
  title?: string
}

const QUICK_PROMPTS = [
  { icon: "💰", text: "Como simular financiamento?" },
  { icon: "📝", text: "Documentos necessários" },
  { icon: "🎯", text: "Argumentos de venda" },
  { icon: "💳", text: "Usar FGTS?" },
]

export function ChatPanel({ isOpen, onClose, context, title = "Assistente IA" }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context
        })
      })

      if (!response.ok) throw new Error("Erro na API")

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Desculpe, ocorreu um erro. Tente novamente em instantes.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const resetChat = () => {
    setMessages([])
    setInput("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div className="relative w-full max-w-lg h-[85vh] sm:h-[600px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out] overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-[17px]">{title}</h2>
              <p className="text-white/50 text-[12px]">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetChat}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Reiniciar conversa"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Context Badge */}
        {context?.preReserva && (
          <div className="px-5 py-2 bg-purple-500/10 border-b border-white/5">
            <p className="text-[11px] text-purple-300">
              Contexto: {context.preReserva.cliente} - {context.preReserva.unidade}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-white font-medium text-[17px] mb-2">
                Como posso ajudar?
              </h3>
              <p className="text-white/50 text-[13px] max-w-xs mb-6">
                Sou seu assistente de vendas. Pergunte sobre financiamento, argumentos de venda ou tire dúvidas.
              </p>

              {/* Quick Prompts */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 transition-all text-left group"
                  >
                    <span className="text-lg">{prompt.icon}</span>
                    <span className="text-[12px] text-white/70 group-hover:text-white transition-colors">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-[fadeIn_0.3s_ease-out]",
                    message.role === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                      : "bg-gradient-to-br from-purple-500 to-pink-500"
                  )}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                      : "bg-white/10 text-white/90"
                  )}>
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 animate-[fadeIn_0.3s_ease-out]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/10 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      <span className="text-white/60 text-[13px]">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all text-[14px]"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                input.trim() && !isLoading
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:scale-105"
                  : "bg-white/10 text-white/30"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-white/30 text-[10px] mt-2">
            Pressione Enter para enviar
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
