"use client"

import { AppShell } from "@/components/app-shell"
import { WhatsAppChat } from "@/components/whatsapp-chat"
import { useAuth } from "@/lib/auth-context"

export default function ChatPage() {
  const { user } = useAuth()

  return (
    <AppShell title="Chat WhatsApp">
      <WhatsAppChat />
    </AppShell>
  )
}
