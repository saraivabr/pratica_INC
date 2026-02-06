"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { AnimatedBackground } from "@/components/animated-background"
import { toast } from "sonner"
import {
  MessageSquare,
  Search,
  Phone,
  Clock,
  CheckCheck,
  AlertCircle,
  Send,
  Loader2,
  User,
  Zap,
  ChevronRight,
  Wifi,
  WifiOff,
  QrCode,
  RefreshCcw,
  Inbox,
  Star,
  Filter,
} from "lucide-react"

interface Conversation {
  id: string
  contactName: string
  contactPhone: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isOnline?: boolean
  leadId?: string
}

export default function CorretorMensagensPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-mensagens")

  const [whatsappStatus, setWhatsappStatus] = useState<"loading" | "connected" | "disconnected">("loading")
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("todas")

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
        // Sempre salvar instanceName se disponível (para poder carregar mensagens)
        if (data.instanceName) {
          setInstanceName(data.instanceName)
        }
        if (data.status === "ready") {
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

  // Fetch conversations from real API (with auto-sync if empty)
  useEffect(() => {
    const fetchConversations = async () => {
      if (whatsappStatus !== "connected" || !instanceName) {
        setConversations([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/whatsapp/messages?instance=${instanceName}`)
        const data = await res.json()

        if (data.success && data.data && data.data.length > 0) {
          const mappedConversations: Conversation[] = data.data.map((conv: any) => ({
            id: conv.phone_number,
            contactName: conv.contact_name || conv.phone_number,
            contactPhone: conv.phone_number,
            lastMessage: conv.last_message || "",
            lastMessageTime: formatMessageTime(conv.last_message_time),
            unreadCount: conv.unread_count || 0,
            isOnline: false,
            leadId: conv.lead_id,
          }))
          setConversations(mappedConversations)
          setLoading(false)
        } else {
          // Sem mensagens - sincronizar automaticamente
          setSyncing(true)
          try {
            const syncRes = await fetch("/api/whatsapp/sync", { method: "POST" })
            await syncRes.json()
            setSyncing(false)

            // Buscar novamente após sync
            const res2 = await fetch(`/api/whatsapp/messages?instance=${instanceName}`)
            const data2 = await res2.json()

            if (data2.success && data2.data) {
              const mappedConversations: Conversation[] = data2.data.map((conv: any) => ({
                id: conv.phone_number,
                contactName: conv.contact_name || conv.phone_number,
                contactPhone: conv.phone_number,
                lastMessage: conv.last_message || "",
                lastMessageTime: formatMessageTime(conv.last_message_time),
                unreadCount: conv.unread_count || 0,
                isOnline: false,
                leadId: conv.lead_id,
              }))
              setConversations(mappedConversations)
            }
          } catch (syncError) {
            console.error("[Mensagens] Erro no sync:", syncError)
            toast.error("Erro ao sincronizar mensagens. Tente novamente.")
            setSyncing(false)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching conversations:", error)
        toast.error("Erro ao carregar conversas.")
        setConversations([])
        setLoading(false)
      }
    }

    if (isAuthenticated && whatsappStatus === "connected") {
      fetchConversations()
    }
  }, [isAuthenticated, whatsappStatus, instanceName])

  // Helper to format message time
  function formatMessageTime(timestamp: string): string {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Ontem"
    } else if (diffDays < 7) {
      return date.toLocaleDateString("pt-BR", { weekday: "short" })
    } else {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (search) {
      const query = search.toLowerCase()
      if (!conv.contactName.toLowerCase().includes(query) && !conv.contactPhone.includes(query)) {
        return false
      }
    }
    if (activeTab === "nao-lidas" && conv.unreadCount === 0) return false
    if (activeTab === "prioritarias" && conv.unreadCount < 2) return false
    return true
  })

  const totalUnread = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)

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
    <AppShell title="Mensagens">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Mensagens
              </h1>
              <p className="text-muted-foreground">
                Gerencie suas conversas do WhatsApp
              </p>
            </div>

            {/* Connection Status + Sync Button */}
            <div className="flex items-center gap-3">
              {whatsappStatus === "connected" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setSyncing(true)
                    try {
                      const res = await fetch("/api/whatsapp/sync", { method: "POST" })
                      const data = await res.json()
                      console.log("[Sync Manual]", data)
                      // Recarregar conversas
                      const res2 = await fetch(`/api/whatsapp/messages?instance=${instanceName}`)
                      const data2 = await res2.json()
                      if (data2.success && data2.data) {
                        setConversations(data2.data.map((conv: any) => ({
                          id: conv.phone_number,
                          contactName: conv.contact_name || conv.phone_number,
                          contactPhone: conv.phone_number,
                          lastMessage: conv.last_message || "",
                          lastMessageTime: formatMessageTime(conv.last_message_time),
                          unreadCount: conv.unread_count || 0,
                          isOnline: false,
                          leadId: conv.lead_id,
                        })))
                      }
                    } catch (e) {
                      console.error("[Sync Manual] Erro:", e)
                      toast.error("Erro ao sincronizar. Tente novamente.")
                    } finally {
                      setSyncing(false)
                    }
                  }}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCcw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "Sincronizando..." : "Sincronizar"}
                </Button>
              )}
              {whatsappStatus === "loading" ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Verificando...</span>
                </div>
              ) : whatsappStatus === "connected" ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Conectado</span>
                </div>
              ) : (
                <Link href="/onboarding/whatsapp">
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                    <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Desconectado</span>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* WhatsApp Connection Required */}
          {whatsappStatus === "disconnected" && (
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
                      Escaneie o QR Code para começar a receber e enviar mensagens diretamente da plataforma.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <Link href="/onboarding/whatsapp">
                        <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25">
                          <Zap className="h-4 w-4" />
                          Conectar Agora
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connected State */}
          {whatsappStatus === "connected" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-xl font-bold">{conversations.length}</p>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Não lidas</p>
                      <p className="text-xl font-bold">{totalUnread}</p>
                    </div>
                  </div>
                </div>

                <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-700/60 p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <CheckCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Respondidas</p>
                      <p className="text-xl font-bold">{conversations.filter((c) => c.unreadCount === 0).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 via-green-400/30 to-teal-400/30 rounded-2xl blur-xl opacity-60" />
                  <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 p-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Buscar conversas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 h-12 text-base bg-white/80 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full max-w-md grid grid-cols-3 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-1 rounded-xl">
                    <TabsTrigger value="todas" className="gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-gray-600 data-[state=active]:text-white rounded-lg text-xs">
                      Todas
                    </TabsTrigger>
                    <TabsTrigger value="nao-lidas" className="gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg text-xs">
                      Não lidas
                      {totalUnread > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{totalUnread}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="prioritarias" className="gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-500 data-[state=active]:text-white rounded-lg text-xs">
                      Prioritárias
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Conversations List */}
              {loading || syncing ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                    <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
                  </div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    {syncing ? "Sincronizando mensagens do WhatsApp..." : "Carregando conversas..."}
                  </p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {search ? "Tente buscar por outro termo" : "As mensagens dos seus leads aparecerão aqui"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConversations.map((conversation, index) => (
                    <div
                      key={conversation.id}
                      className="animate-fadeInUp"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="relative group">
                        <div className={cn(
                          "absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-all duration-500",
                          conversation.unreadCount > 0
                            ? "bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400"
                            : "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400"
                        )} />

                        <div className={cn(
                          "relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-lg border overflow-hidden cursor-pointer transition-all hover:shadow-xl",
                          conversation.unreadCount > 0
                            ? "border-green-200/60 dark:border-green-800/60"
                            : "border-white/60 dark:border-zinc-800/60"
                        )}>
                          <div className="p-4 flex items-center gap-4">
                            {/* Avatar */}
                            <div className="relative">
                              <div className={cn(
                                "h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold",
                                "bg-gradient-to-br from-green-500 to-emerald-600"
                              )}>
                                {conversation.contactName.substring(0, 2).toUpperCase()}
                              </div>
                              {conversation.isOnline && (
                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {conversation.contactName}
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                  {conversation.lastMessageTime}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {conversation.lastMessage}
                              </p>
                            </div>

                            {/* Badge & Arrow */}
                            <div className="flex items-center gap-2">
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-green-500 text-white border-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Loading State */}
          {whatsappStatus === "loading" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Verificando conexão WhatsApp...</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
