"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { WhatsAppConnect } from "@/components/corretor/whatsapp-connect"
import { WhatsAppAutomations } from "@/components/corretor/whatsapp-automations"
import { ChatCRM } from "@/components/corretor/chat-crm"
import { Loader2, MessageSquare, Bot } from "lucide-react"

export default function CorretorWhatsAppPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-whatsapp")

  const [whatsappStatus, setWhatsappStatus] = useState<"loading" | "connected" | "disconnected">("loading")
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pairedPhone, setPairedPhone] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("conversas")
  const retryRef = useRef<NodeJS.Timeout | null>(null)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Check WhatsApp connection — same pattern as old /corretor/chat
  useEffect(() => {
    let cancelled = false

    const checkWhatsApp = async (attempt = 0) => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        if (cancelled) return

        if (!res.ok) {
          // Auth not ready yet — retry up to 3 times
          if (attempt < 3) {
            retryRef.current = setTimeout(() => checkWhatsApp(attempt + 1), 1000)
            return
          }
          setWhatsappStatus("disconnected")
          return
        }

        const data = await res.json()
        if (cancelled) return

        if (data.instanceName) setInstanceName(data.instanceName)
        if (data.pairedPhone) setPairedPhone(data.pairedPhone)
        if (data.profileName) setProfileName(data.profileName)

        if (data.status === "ready" || data.status === "open") {
          setWhatsappStatus("connected")
        } else {
          setWhatsappStatus("disconnected")
        }
      } catch {
        if (!cancelled) setWhatsappStatus("disconnected")
      }
    }

    if (isAuthenticated) {
      checkWhatsApp()
    }

    return () => {
      cancelled = true
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [isAuthenticated])

  // Set userId from auth context
  useEffect(() => {
    if (user?.id) setUserId(user.id)
  }, [user?.id])

  // Re-check handler (for onConnected / onReconnect)
  const recheckStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/session/status")
      if (!res.ok) return
      const data = await res.json()

      if (data.instanceName) setInstanceName(data.instanceName)
      if (data.pairedPhone) setPairedPhone(data.pairedPhone)
      if (data.profileName) setProfileName(data.profileName)

      if (data.status === "ready" || data.status === "open") {
        setWhatsappStatus("connected")
      } else {
        setWhatsappStatus("disconnected")
      }
    } catch {
      // Keep current state on error
    }
  }

  if (authLoading || whatsappStatus === "loading") {
    return (
      <AppShell title="WhatsApp">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </AppShell>
    )
  }

  if (whatsappStatus === "disconnected") {
    return (
      <AppShell title="WhatsApp">
        <WhatsAppConnect onConnected={recheckStatus} />
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
            {instanceName && userId && (
              <ChatCRM instanceName={instanceName} userId={userId} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="automacoes" className="flex-1 overflow-auto">
          {instanceName && userId && (
            <WhatsAppAutomations
              instanceName={instanceName}
              userId={userId}
              pairedPhone={pairedPhone}
              profileName={profileName}
              onReconnect={recheckStatus}
              onSwitchToChat={() => setActiveTab("conversas")}
            />
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
