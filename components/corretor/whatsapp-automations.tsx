"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Bot,
  MessageSquare,
  Send,
  Settings,
  ArrowRight,
  Loader2,
  RefreshCcw,
  Smartphone,
  Activity,
  Users,
  MailCheck,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConversations } from "@/hooks/use-chat"

interface WhatsAppAutomationsProps {
  instanceName: string
  userId: string
  pairedPhone?: string | null
  profileName?: string | null
  onReconnect?: () => void
  onSwitchToChat?: () => void
}

function MetricCard({ label, value, icon: Icon, loading }: { label: string; value: number | string; icon: any; loading?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
          <Icon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        </div>
      </div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: any; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all"
    >
      <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-colors">
        <Icon className="h-5 w-5 text-emerald-600 group-hover:text-white transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors shrink-0" />
    </Link>
  )
}

export function WhatsAppAutomations({
  instanceName,
  userId,
  pairedPhone,
  profileName,
  onReconnect,
  onSwitchToChat,
}: WhatsAppAutomationsProps) {
  // Salva-Leads stats
  const { data: slStats, isLoading: slLoading } = useQuery<{
    conversations: { active: number; completed: number; with_potential: number }
    runs: { leads_sent: number }
  }>({
    queryKey: ["salva-leads-stats"],
    queryFn: async () => {
      const res = await fetch("/api/salva-leads/stats?period=7d")
      const json = await res.json()
      if (!json.success) throw new Error("Failed")
      return json
    },
    refetchInterval: 60000,
  })

  // WhatsApp conversations
  const { conversations, totalUnread, isLoading: chatLoading } = useConversations(instanceName)

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">Conectado</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">Ativo</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pairedPhone || "WhatsApp"}{profileName ? ` - ${profileName}` : ""}
            </p>
          </div>
        </div>
        {onReconnect && (
          <Button variant="outline" size="sm" onClick={onReconnect} className="gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" />
            Reconectar
          </Button>
        )}
      </div>

      {/* Salva-Leads Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Salva-Leads (7 dias)</h3>
          <Link href="/corretor/salva-leads" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            Gerenciar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Conversas ativas" value={slStats?.conversations.active ?? 0} icon={Activity} loading={slLoading} />
          <MetricCard label="Concluídas" value={slStats?.conversations.completed ?? 0} icon={MailCheck} loading={slLoading} />
          <MetricCard label="Com potencial" value={slStats?.conversations.with_potential ?? 0} icon={Users} loading={slLoading} />
          <MetricCard label="Msgs do bot" value={slStats?.runs.leads_sent ?? 0} icon={Bot} loading={slLoading} />
        </div>
      </div>

      {/* WhatsApp Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Conversas WhatsApp</h3>
          {onSwitchToChat && (
            <button onClick={onSwitchToChat} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              Abrir Chat <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Total de conversas" value={conversations.length} icon={MessageSquare} loading={chatLoading} />
          <MetricCard label="Não lidas" value={totalUnread} icon={Zap} loading={chatLoading} />
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Acesso Rápido</h3>
        <div className="space-y-2">
          <QuickLink
            href="/corretor/salva-leads"
            icon={Bot}
            title="Salva-Leads"
            description="Gerencie o follow-up automático de leads"
          />
          <QuickLink
            href="/corretor/disparador"
            icon={Send}
            title="Disparador"
            description="Envie mensagens em massa para corretores"
          />
          <QuickLink
            href="/corretor/configuracoes"
            icon={Settings}
            title="Configurações"
            description="Perfil, preferências e reconexão WhatsApp"
          />
        </div>
      </div>
    </div>
  )
}
