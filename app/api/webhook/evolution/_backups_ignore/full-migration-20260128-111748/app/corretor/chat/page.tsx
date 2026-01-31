"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/animated-background"
import { ChatCRM } from "@/components/corretor/chat-crm"
import {
  Loader2,
  Zap,
  QrCode,
  Wifi,
  WifiOff,
  MessageSquare,
} from "lucide-react"

export default function CorretorChatPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-chat")

  const [whatsappStatus, setWhatsappStatus] = useState<"loading" | "connected" | "disconnected">("loading")
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Check WhatsApp connection status
  useEffect(() => {
    const checkWhatsApp = async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        const data = await res.json()

        if (data.instanceName) {
          setInstanceName(data.instanceName)
        }
        if (data.userId) {
          setUserId(data.userId)
        }

        if (data.status === "ready" || data.status === "open") {
          setWhatsappStatus("connected")
        } else {
          setWhatsappStatus("disconnected")
        }
      } catch {
        setWhatsappStatus("disconnected")
      }
    }

    if (isAuthenticated) {
      checkWhatsApp()
    }
  }, [isAuthenticated])

  // Set userId from user context if not from API
  useEffect(() => {
    if (user?.id && !userId) {
      setUserId(user.id)
    }
  }, [user, userId])

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
    <AppShell title="Chat CRM">
      <div className="relative h-full">
        <AnimatedBackground />

        <div className="relative z-10 h-full animate-fadeInUp">
          {/* WhatsApp Loading State */}
          {whatsappStatus === "loading" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Verificando conexao WhatsApp...</p>
            </div>
          )}

          {/* WhatsApp Connection Required */}
          {whatsappStatus === "disconnected" && (
            <div className="max-w-2xl mx-auto py-8">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-2xl blur opacity-30" />
                <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 backdrop-blur-xl rounded-2xl border border-green-200 dark:border-green-800 p-6 overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <div className="relative flex flex-col md:flex-row items-center gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 rounded-2xl blur-lg opacity-40 animate-pulse" />
                      <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                        <QrCode className="h-10 w-10 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Conecte seu WhatsApp
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Para usar o Chat CRM, voce precisa conectar seu WhatsApp. Escaneie o QR Code para comecar a gerenciar suas conversas.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <Link href="/onboarding/whatsapp">
                          <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25">
                            <Zap className="h-4 w-4" />
                            Conectar WhatsApp
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features preview */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg">
                  <MessageSquare className="h-8 w-8 text-emerald-500 mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Conversas em tempo real</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Veja e responda mensagens instantaneamente</p>
                </div>
                <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg">
                  <Wifi className="h-8 w-8 text-emerald-500 mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Sincronizacao automatica</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Todas as mensagens sincronizadas com seus leads</p>
                </div>
                <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg">
                  <Zap className="h-8 w-8 text-emerald-500 mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Painel de leads</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Acesse informacoes do lead enquanto conversa</p>
                </div>
              </div>
            </div>
          )}

          {/* Connected State - Show ChatCRM */}
          {whatsappStatus === "connected" && instanceName && userId && (
            <div className="h-full">
              <ChatCRM instanceName={instanceName} userId={userId} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
