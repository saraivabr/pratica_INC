"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2, User, Clock, ChevronRight, RefreshCw } from "lucide-react"
import { WhatsAppConnectionPanel } from "@/components/whatsapp-connection-panel"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/lib/auth-context"

interface Conversation {
  id: string
  user_id: string
  contact_name: string | null
  contact_phone: string | null
  contact_role: string | null
  messages: Array<{ role: string; content: string; timestamp: string }>
  context: any
  updated_at: string
}

function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/conversations')
      const data = await res.json()

      if (res.ok) {
        // Parse messages if they're strings
        const parsed = data.map((conv: any) => ({
          ...conv,
          messages: typeof conv.messages === 'string' ? JSON.parse(conv.messages) : conv.messages || []
        }))
        setConversations(parsed)
        setError(null)
      } else {
        setError(data.error || 'Erro ao carregar conversas')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conversas')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return { conversations, loading, error, refetch: fetchConversations }
}

export default function ChatPage() {
  const { conversations, loading, error, refetch } = useConversations()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  const getLastMessage = (conv: Conversation) => {
    if (!conv.messages || conv.messages.length === 0) return "Nenhuma mensagem"
    const last = conv.messages[conv.messages.length - 1]
    return last.content.slice(0, 60) + (last.content.length > 60 ? "..." : "")
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'corretor':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none text-[10px]">Corretor</Badge>
      case 'gerente':
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-none text-[10px]">Gerente</Badge>
      case 'admin':
        return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-none text-[10px]">Admin</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">Lead</Badge>
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppShell title="Chats">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Chats</h1>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* WhatsApp Connection Status */}
          <div className="lg:col-span-1">
            <WhatsAppConnectionPanel title="Status do WhatsApp" />
          </div>

          {/* Conversations List */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversas Recentes</CardTitle>
                  <Badge variant="outline">{conversations.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>{error}</p>
                    <Button variant="link" onClick={refetch}>Tentar novamente</Button>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <h3 className="font-semibold text-lg">Nenhuma conversa</h3>
                    <p className="text-muted-foreground">As conversas aparecerão aqui quando iniciadas.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer group"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-sm truncate">
                              {conv.contact_name || conv.contact_phone || "Usuário"}
                            </h4>
                            {getRoleBadge(conv.contact_role)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {getLastMessage(conv)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {conv.updated_at
                              ? formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: ptBR })
                              : "-"}
                          </p>
                          <Badge variant="secondary" className="text-[10px] mt-1">
                            {conv.messages?.length || 0} msgs
                          </Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
