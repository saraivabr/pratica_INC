"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { Loader2, MessageSquare, User, Clock } from "lucide-react"

export default function MensagensPage() {
  const { user } = useAuth()
  const [mensagens, setMensagens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMensagens()
  }, [])

  async function fetchMensagens() {
    try {
      const res = await fetch('/api/whatsapp/messages')
      if (res.ok) {
        const data = await res.json()
        setMensagens(data.messages || [])
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Mensagens">
      <div className="container px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Mensagens</h1>
          <p className="text-muted-foreground mt-2">
            Histórico de conversas WhatsApp
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Últimas Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma mensagem ainda</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Conecte seu WhatsApp para começar a receber e gerenciar mensagens
                </p>
                <a 
                  href="/whatsapp"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  Configurar WhatsApp
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {mensagens.slice(0, 50).map((msg: any) => (
                  <div
                    key={msg.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold truncate">
                            {msg.contact_name || msg.phone_number}
                          </p>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(msg.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {msg.message_text || '(mídia)'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
