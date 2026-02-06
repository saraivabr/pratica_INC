"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { WhatsAppConnect } from "@/components/corretor/whatsapp-connect"
import { WhatsAppAutomations } from "@/components/corretor/whatsapp-automations"
import { ChatCRM } from "@/components/corretor/chat-crm"
import { Loader2, MessageSquare, Bot } from "lucide-react"

type WhatsAppState =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "connected"; instanceName: string; userId: string; pairedPhone?: string; profileName?: string }

export default function CorretorWhatsAppPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-whatsapp")

  const [state, setState] = useState<WhatsAppState>({ status: "loading" })
  const [activeTab, setActiveTab] = useState("conversas")

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/session/status")
      const data = await res.json()

      if (data.status === "ready" || data.status === "open") {
        setState({
          status: "connected",
          instanceName: data.instanceName || "",
          userId: data.userId || user?.id || "",
          pairedPhone: data.pairedPhone || undefined,
          profileName: data.deviceName || undefined,
        })
      } else {
        setState({ status: "disconnected" })
      }
    } catch {
      setState({ status: "disconnected" })
    }
  }, [user?.id])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) checkStatus()
  }, [isAuthenticated, checkStatus])

  if (authLoading || state.status === "loading") {
    return (
      <AppShell title="WhatsApp">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </AppShell>
    )
  }

  if (state.status === "disconnected") {
    return (
      <AppShell title="WhatsApp">
        <WhatsAppConnect onConnected={checkStatus} />
      </AppShell>
    )
  }

  return (
    <AppShell title="WhatsApp">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="conversas" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="automacoes" className="gap-1.5">
            <Bot className="h-4 w-4" />
            Automações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversas" className="flex-1 min-h-0">
          <div className="h-[calc(100vh-170px)]">
            <ChatCRM instanceName={state.instanceName} userId={state.userId} />
          </div>
        </TabsContent>

        <TabsContent value="automacoes" className="flex-1 overflow-auto">
          <WhatsAppAutomations
            instanceName={state.instanceName}
            userId={state.userId}
            pairedPhone={state.pairedPhone}
            profileName={state.profileName}
            onReconnect={checkStatus}
            onSwitchToChat={() => setActiveTab("conversas")}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
