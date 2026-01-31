"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Bot,
  MessageSquare,
  Pause,
  Play,
  RefreshCcw,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  ArrowRight,
  Phone,
  Building2,
  Calendar,
  Zap,
  AlertTriangle,
  ChevronRight,
  MessageCircle,
  UserCheck,
  Send,
  Brain,
  Target,
  Search as SearchIcon,
  Eye,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPhone } from "@/utils/leadUtils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ============================================================================
// Types
// ============================================================================

interface SalvaLeadsConversation {
  id: number
  lead_phone: string
  lead_name: string | null
  corretor_id: string
  status: "pending" | "active" | "paused_by_corretor" | "completed" | "expired"
  classification: "tem_potencial" | "encerrada" | null
  messages: Array<{ role: string; content: string; timestamp: string }>
  bot_paused: boolean
  created_at: string
  updated_at: string
}

interface SalvaLeadsStats {
  conversations: {
    total: number
    active: number
    completed: number
    paused: number
    with_potential: number
    closed: number
  }
  runs: {
    total: number
    leads_processed: number
    leads_sent: number
  }
}

interface WhatsAppOpportunity {
  contact_jid: string
  contact_name: string
  phone: string
  last_message_text: string
  last_message_time: string
  days_without_response: number
  potential: "alto" | "medio" | "baixo"
  suggested_message: string
  linked_lead?: {
    id: number
    name: string
    empreendimento?: string
  } | null
}

interface SyncStatus {
  last_sync: string | null
  opportunities_found: number
  leads_matched: number
}

const AUTO_SYNC_STALE_MS = 1000 * 60 * 30

// ============================================================================
// Components
// ============================================================================

function GlowCard({
  children,
  className,
  glowColor = "emerald",
}: {
  children: React.ReactNode
  className?: string
  glowColor?: "emerald" | "amber" | "red" | "blue" | "purple" | "cyan"
}) {
  const glowColors = {
    emerald: "from-emerald-400 via-green-400 to-teal-400",
    amber: "from-amber-400 via-orange-400 to-yellow-400",
    red: "from-red-400 via-rose-400 to-pink-400",
    blue: "from-blue-400 via-cyan-400 to-sky-400",
    purple: "from-purple-400 via-violet-400 to-indigo-400",
    cyan: "from-cyan-400 via-teal-400 to-emerald-400",
  }

  return (
    <div className="relative group">
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500",
          glowColors[glowColor]
        )}
      />
      <div
        className={cn(
          "relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800/60 overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  glowColor = "emerald",
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  value: string | number
  subtitle?: string
  glowColor?: "emerald" | "amber" | "red" | "blue" | "purple" | "cyan"
  delay?: number
}) {
  const iconColors = {
    emerald: "from-emerald-400 to-green-500",
    amber: "from-amber-400 to-orange-500",
    red: "from-red-400 to-rose-500",
    blue: "from-blue-400 to-cyan-500",
    purple: "from-purple-400 to-violet-500",
    cyan: "from-cyan-400 to-teal-500",
  }

  return (
    <div className="animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
      <GlowCard glowColor={glowColor} className="p-5 h-full">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
              iconColors[glowColor]
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </GlowCard>
    </div>
  )
}

function FlowStep({
  number,
  icon: Icon,
  title,
  description,
  color,
  isLast = false,
}: {
  number: number
  icon: React.ElementType
  title: string
  description: string
  color: string
  isLast?: boolean
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg",
            color
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        {!isLast && (
          <div className="w-0.5 h-full bg-gradient-to-b from-gray-300 to-transparent dark:from-zinc-600 min-h-[60px]" />
        )}
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            PASSO {number}
          </span>
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
          {title}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function ConversationCard({
  conversation,
  onViewDetails,
  onTogglePause,
  delay = 0,
}: {
  conversation: SalvaLeadsConversation
  onViewDetails: (conv: SalvaLeadsConversation) => void
  onTogglePause: (conv: SalvaLeadsConversation) => void
  delay?: number
}) {
  const statusConfig = {
    pending: {
      label: "Aguardando",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      icon: Clock,
    },
    active: {
      label: "IA Ativa",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      icon: Bot,
    },
    paused_by_corretor: {
      label: "Voce assumiu",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: UserCheck,
    },
    completed: {
      label: "Finalizada",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      icon: CheckCircle2,
    },
    expired: {
      label: "Expirada",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      icon: XCircle,
    },
  }

  const config = statusConfig[conversation.status]
  const StatusIcon = config.icon
  const lastMessage = conversation.messages?.[conversation.messages.length - 1]
  const messageCount = conversation.messages?.length || 0

  return (
    <div className="animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
      <GlowCard
        glowColor={
          conversation.status === "active"
            ? "emerald"
            : conversation.status === "paused_by_corretor"
            ? "blue"
            : "purple"
        }
        className="p-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-semibold shadow-md">
              {conversation.lead_name?.substring(0, 2).toUpperCase() || "??"}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                {conversation.lead_name || "Lead sem nome"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatPhone(conversation.lead_phone)}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-medium",
              config.color
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </span>
        </div>

        {/* Last message preview */}
        {lastMessage && (
          <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                {lastMessage.role === "assistant" ? "IA respondeu" : "Cliente disse"}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {lastMessage.content}
            </p>
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {messageCount} mensagens
          </span>
          {conversation.classification && (
            <span
              className={cn(
                "flex items-center gap-1",
                conversation.classification === "tem_potencial"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-400"
              )}
            >
              <Target className="h-3 w-3" />
              {conversation.classification === "tem_potencial"
                ? "Tem potencial"
                : "Encerrada"}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5"
            onClick={() => onViewDetails(conversation)}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver conversa
          </Button>
          {conversation.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
              onClick={() => onTogglePause(conversation)}
            >
              <Pause className="h-3.5 w-3.5" />
              Assumir
            </Button>
          )}
          {conversation.status === "paused_by_corretor" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
              onClick={() => onTogglePause(conversation)}
            >
              <Play className="h-3.5 w-3.5" />
              Reativar IA
            </Button>
          )}
        </div>
      </GlowCard>
    </div>
  )
}

function ConversationDetailModal({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: SalvaLeadsConversation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!conversation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-semibold shadow-md">
              {conversation.lead_name?.substring(0, 2).toUpperCase() || "??"}
            </div>
            <div>
              <span>{conversation.lead_name || "Lead sem nome"}</span>
              <p className="text-sm font-normal text-gray-500">
                {formatPhone(conversation.lead_phone)}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Historico completo da conversa com a IA
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {conversation.messages?.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                msg.role === "assistant" ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === "assistant"
                    ? "bg-gray-100 dark:bg-zinc-800 rounded-tl-none"
                    : "bg-emerald-500 text-white rounded-tr-none"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.role === "assistant" ? (
                    <>
                      <Bot className="h-3 w-3 text-purple-500" />
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Salva-Leads IA
                      </span>
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3 text-white/80" />
                      <span className="text-[10px] uppercase tracking-wider text-white/80">
                        Cliente
                      </span>
                    </>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm",
                    msg.role === "assistant"
                      ? "text-gray-700 dark:text-gray-200"
                      : "text-white"
                  )}
                >
                  {msg.content}
                </p>
                <p
                  className={cn(
                    "text-[10px] mt-2",
                    msg.role === "assistant"
                      ? "text-gray-400"
                      : "text-white/60"
                  )}
                >
                  {new Date(msg.timestamp).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OpportunityCard({
  opportunity,
  onViewSuggestion,
  delay = 0,
}: {
  opportunity: WhatsAppOpportunity
  onViewSuggestion: (opp: WhatsAppOpportunity) => void
  delay?: number
}) {
  const potentialConfig = {
    alto: {
      label: "Alto potencial",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    medio: {
      label: "Medio potencial",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    baixo: {
      label: "Baixo potencial",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
  }

  const config = potentialConfig[opportunity.potential]

  const handleOpenWhatsApp = () => {
    const phone = opportunity.phone.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}`, "_blank")
  }

  return (
    <div className="animate-fadeInUp" style={{ animationDelay: `${delay}ms` }}>
      <GlowCard
        glowColor={
          opportunity.potential === "alto"
            ? "emerald"
            : opportunity.potential === "medio"
            ? "amber"
            : "purple"
        }
        className="p-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold shadow-md">
              {opportunity.contact_name?.substring(0, 2).toUpperCase() || "??"}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                {opportunity.contact_name || "Contato sem nome"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatPhone(opportunity.phone)}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-medium",
              config.color
            )}
          >
            <Target className="h-3 w-3" />
            {config.label}
          </span>
        </div>

        {/* Last message preview */}
        <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] uppercase tracking-wider text-gray-400">
              Ultima mensagem
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {opportunity.last_message_text}
          </p>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {opportunity.days_without_response} dias sem resposta
          </span>
          {opportunity.linked_lead && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Users className="h-3 w-3" />
              {opportunity.linked_lead.name}
            </span>
          )}
        </div>

        {/* Linked lead info */}
        {opportunity.linked_lead && (
          <div className="mb-4 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <Building2 className="h-3 w-3" />
              <span className="font-medium">Lead vinculado:</span>
              <span>{opportunity.linked_lead.name}</span>
              {opportunity.linked_lead.empreendimento && (
                <span className="text-blue-500">
                  - {opportunity.linked_lead.empreendimento}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5"
            onClick={() => onViewSuggestion(opportunity)}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver mensagem sugerida
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
            onClick={handleOpenWhatsApp}
          >
            <Phone className="h-3.5 w-3.5" />
            Iniciar conversa
          </Button>
        </div>
      </GlowCard>
    </div>
  )
}

function SuggestedMessageModal({
  opportunity,
  open,
  onOpenChange,
}: {
  opportunity: WhatsAppOpportunity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!opportunity) return null

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(opportunity.suggested_message)
  }

  const handleOpenWhatsApp = () => {
    const phone = opportunity.phone.replace(/\D/g, "")
    const message = encodeURIComponent(opportunity.suggested_message)
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span>Mensagem Sugerida</span>
              <p className="text-sm font-normal text-gray-500">
                Para {opportunity.contact_name || "Contato"}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Use essa sugestao para reativar a conversa com o cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 border border-gray-200 dark:border-zinc-700">
            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
              {opportunity.suggested_message}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleCopyMessage}
            >
              <MessageSquare className="h-4 w-4" />
              Copiar mensagem
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
              onClick={handleOpenWhatsApp}
            >
              <Phone className="h-4 w-4" />
              Enviar no WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function SalvaLeadsPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-salva-leads")

  const [conversations, setConversations] = useState<SalvaLeadsConversation[]>([])
  const [stats, setStats] = useState<SalvaLeadsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] =
    useState<SalvaLeadsConversation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Opportunities state
  const [opportunities, setOpportunities] = useState<WhatsAppOpportunity[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<WhatsAppOpportunity | null>(null)
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false)
  const autoSyncTriggered = useRef(false)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.tenantId) return

      setLoading(true)
      try {
        const [convRes, statsRes] = await Promise.all([
          fetch(`/api/salva-leads/conversations?tenantId=${user.tenantId}&limit=50`),
          fetch(`/api/salva-leads/stats?tenantId=${user.tenantId}`),
        ])

        if (convRes.ok) {
          const convData = await convRes.json()
          setConversations(convData.data || [])
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && user?.tenantId) {
      fetchData()
    }
  }, [isAuthenticated, user?.tenantId])

  const handleRefresh = async () => {
    if (!user?.tenantId) return

    setLoading(true)
    try {
      const [convRes, statsRes] = await Promise.all([
        fetch(`/api/salva-leads/conversations?tenantId=${user.tenantId}&limit=50`),
        fetch(`/api/salva-leads/stats?tenantId=${user.tenantId}`),
      ])

      if (convRes.ok) {
        const convData = await convRes.json()
        setConversations(convData.data || [])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error)
    } finally {
      setLoading(false)
    }

    await handleRefreshOpportunities()
  }

  const handleTogglePause = async (conv: SalvaLeadsConversation) => {
    try {
      const newPaused = !conv.bot_paused
      await fetch(`/api/salva-leads/conversations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: conv.id,
          bot_paused: newPaused,
        }),
      })
      handleRefresh()
    } catch (error) {
      console.error("Erro ao alterar status:", error)
    }
  }

  const handleViewDetails = (conv: SalvaLeadsConversation) => {
    setSelectedConversation(conv)
    setIsModalOpen(true)
  }

  // Fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    if (!user?.tenantId) return

    setOpportunitiesLoading(true)
    setSyncError(null)
    try {
      const res = await fetch(`/api/whatsapp/sync/opportunities?tenantId=${user.tenantId}`)
      if (res.ok) {
        const data = await res.json()
        const normalized = (data.data || []).map((opp: any) => {
          const rawPotential = String(opp.recovery_potential || "baixo")
          const potential =
            rawPotential === "alto" || rawPotential === "medio" || rawPotential === "baixo"
              ? rawPotential
              : "baixo"

          return {
            contact_jid: String(opp.id ?? opp.phone_number),
            contact_name: opp.contact_name,
            phone: opp.phone_number,
            last_message_text: opp.last_message_text,
            last_message_time: opp.last_message_at,
            days_without_response: opp.days_without_response ?? 0,
            potential,
            suggested_message: opp.suggested_message || "",
            linked_lead: opp.lead
              ? {
                  id: Number(opp.lead.idlead ?? opp.matched_lead_id ?? 0),
                  name: opp.lead.nome,
                  empreendimento: opp.lead.empreendimento,
                }
              : null,
          }
        })

        setOpportunities(normalized)
        setSyncStatus((prev) => ({
          last_sync: prev?.last_sync || null,
          leads_matched: prev?.leads_matched || 0,
          opportunities_found: normalized.length,
        }))
      } else {
        const errorData = await res.json()
        setSyncError(errorData.error || "Erro ao buscar oportunidades")
      }
    } catch (error) {
      console.error("Erro ao buscar oportunidades:", error)
      setSyncError("Erro de conexao ao buscar oportunidades")
    } finally {
      setOpportunitiesLoading(false)
    }
  }, [user?.tenantId])

  const fetchSyncStatus = useCallback(async () => {
    if (!user?.tenantId) return null

    try {
      const res = await fetch(`/api/whatsapp/sync?tenantId=${user.tenantId}`)
      if (!res.ok) {
        const errorData = await res.json()
        setSyncError(errorData.error || "Erro ao buscar status do WhatsApp")
        return null
      }

      const data = await res.json()
      const lastSyncTime =
        data.last_sync?.completed_at ||
        data.last_sync?.started_at ||
        null

      setSyncStatus((prev) => ({
        last_sync: lastSyncTime,
        opportunities_found:
          data.last_sync?.opportunities_found ?? prev?.opportunities_found ?? 0,
        leads_matched:
          data.last_sync?.leads_matched ?? prev?.leads_matched ?? 0,
      }))

      return lastSyncTime
    } catch (error) {
      console.error("Erro ao buscar status do WhatsApp:", error)
      setSyncError("Erro de conexao ao buscar status")
      return null
    }
  }, [user?.tenantId])

  const handleRefreshOpportunities = useCallback(async () => {
    await Promise.all([fetchOpportunities(), fetchSyncStatus()])
  }, [fetchOpportunities, fetchSyncStatus])

  // Sync WhatsApp
  const handleSyncWhatsApp = useCallback(async () => {
    if (!user?.tenantId || syncLoading) return

    setSyncLoading(true)
    setSyncError(null)
    try {
      const res = await fetch(`/api/whatsapp/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: user.tenantId }),
      })

      if (res.ok) {
        const data = await res.json()
        setSyncStatus((prev) => ({
          last_sync: new Date().toISOString(),
          opportunities_found: data.opportunities_found || prev?.opportunities_found || 0,
          leads_matched: data.leads_matched || prev?.leads_matched || 0,
        }))
        // Refresh opportunities after sync
        await fetchOpportunities()
      } else {
        const errorData = await res.json()
        setSyncError(errorData.error || "Erro ao sincronizar WhatsApp")
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error)
      setSyncError("Erro de conexao ao sincronizar")
    } finally {
      setSyncLoading(false)
    }
  }, [fetchOpportunities, syncLoading, user?.tenantId])

  // Auto-sync opportunities on load (no user action needed)
  useEffect(() => {
    if (!isAuthenticated || !user?.tenantId) return

    let isActive = true
    const runAutoSync = async () => {
      const lastSync = await fetchSyncStatus()
      await fetchOpportunities()
      if (!isActive) return

      const shouldSync =
        !lastSync || Date.now() - new Date(lastSync).getTime() > AUTO_SYNC_STALE_MS

      if (!autoSyncTriggered.current && shouldSync) {
        autoSyncTriggered.current = true
        await handleSyncWhatsApp()
      }
    }

    runAutoSync()

    return () => {
      isActive = false
    }
  }, [
    isAuthenticated,
    user?.tenantId,
    fetchOpportunities,
    fetchSyncStatus,
    handleSyncWhatsApp,
  ])

  const handleViewSuggestion = (opp: WhatsAppOpportunity) => {
    setSelectedOpportunity(opp)
    setIsSuggestionModalOpen(true)
  }

  // Filter conversations by status
  const activeConversations = useMemo(
    () => conversations.filter((c) => c.status === "active" || c.status === "pending"),
    [conversations]
  )
  const myConversations = useMemo(
    () => conversations.filter((c) => c.status === "paused_by_corretor"),
    [conversations]
  )
  const completedConversations = useMemo(
    () => conversations.filter((c) => c.status === "completed" || c.status === "expired"),
    [conversations]
  )

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
    <AppShell title="Salva-Leads">
      <div className="min-h-screen relative">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-page-in">
          {/* Header */}
          <section className="relative">
            <GlowCard className="p-6 md:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2 animate-fadeInUp">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-4 w-4" />
                    <span>Recuperacao Inteligente de Leads</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                    Salva-Leads
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 max-w-lg">
                    Sistema de IA que recupera leads abandonados automaticamente.
                    A IA conversa com o cliente e voce assume quando quiser.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Atualizar
                  </Button>
                </div>
              </div>
            </GlowCard>
          </section>

          {/* How it works - Didactic explanation */}
          <section>
            <GlowCard glowColor="purple" className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Como funciona?
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Entenda o fluxo de recuperacao automatica
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Flow steps */}
                <div className="space-y-2">
                  <FlowStep
                    number={1}
                    icon={Calendar}
                    title="Todo dia as 8h"
                    description="O sistema identifica leads que nao respondem ha mais de 7 dias e envia uma mensagem personalizada via WhatsApp."
                    color="bg-gradient-to-br from-amber-400 to-orange-500"
                  />
                  <FlowStep
                    number={2}
                    icon={MessageCircle}
                    title="Cliente responde"
                    description="Quando o cliente responde, a IA assume a conversa. Ela pode buscar imoveis, responder duvidas e agendar visitas."
                    color="bg-gradient-to-br from-emerald-400 to-green-500"
                  />
                  <FlowStep
                    number={3}
                    icon={UserCheck}
                    title="Voce assume quando quiser"
                    description="A qualquer momento voce pode assumir a conversa. Basta enviar uma mensagem pelo WhatsApp que a IA para automaticamente."
                    color="bg-gradient-to-br from-blue-400 to-cyan-500"
                    isLast
                  />
                </div>

                {/* Key features */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3 mb-2">
                      <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        IA Conversacional
                      </span>
                    </div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      A IA entende o contexto e responde de forma natural, buscando imoveis
                      que combinam com o interesse do cliente.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-2">
                      <Pause className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        Controle Total
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Quando voce envia uma mensagem pelo WhatsApp, a IA para automaticamente
                      e voce assume o controle da conversa.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-purple-700 dark:text-purple-300">
                        Classificacao Automatica
                      </span>
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">
                      A IA classifica se o lead tem potencial ou se a conversa foi encerrada,
                      ajudando voce a priorizar os melhores.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </section>

          {/* Opportunities Section */}
          <section>
            <GlowCard glowColor="cyan" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Oportunidades Identificadas
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Conversas do WhatsApp que podem virar negocios
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {syncLoading ? (
                    <span className="text-xs text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                      <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                      Sincronizando automaticamente...
                    </span>
                  ) : (
                    <Badge variant="secondary" className="gap-1.5">
                      <Zap className="h-3 w-3 text-cyan-500" />
                      Sync automatico ativo
                    </Badge>
                  )}
                  {syncStatus?.last_sync && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Ultima sync: {new Date(syncStatus.last_sync).toLocaleString("pt-BR")}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleRefreshOpportunities}
                    disabled={opportunitiesLoading}
                  >
                    <RefreshCcw className={cn("h-4 w-4", opportunitiesLoading && "animate-spin")} />
                    Atualizar lista
                  </Button>
                </div>
              </div>

              {/* Sync error */}
              {syncError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{syncError}</span>
                  </div>
                </div>
              )}

              {/* Sync status summary */}
              {syncStatus && syncStatus.opportunities_found > 0 && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                    <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                      {syncStatus.opportunities_found}
                    </div>
                    <div className="text-xs text-cyan-600 dark:text-cyan-400">
                      Oportunidades
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {syncStatus.leads_matched}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Leads vinculados
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {opportunities.filter((o) => o.potential === "alto").length}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      Alto potencial
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {opportunities.filter((o) => o.potential === "medio").length}
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      Medio potencial
                    </div>
                  </div>
                </div>
              )}

              {/* Opportunities loading */}
              {opportunitiesLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full blur-xl opacity-30 animate-pulse" />
                    <div className="relative h-12 w-12 rounded-full border-4 border-cyan-100 dark:border-cyan-900 border-t-cyan-500 animate-spin" />
                  </div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    Buscando oportunidades...
                  </p>
                </div>
              )}

              {/* Opportunities list */}
              {!opportunitiesLoading && opportunities.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {opportunities.map((opp, index) => (
                    <OpportunityCard
                      key={opp.contact_jid}
                      opportunity={opp}
                      onViewSuggestion={handleViewSuggestion}
                      delay={index * 50}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!opportunitiesLoading && opportunities.length === 0 && !syncError && (
                <div className="text-center py-12">
                  <Zap className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Nenhuma oportunidade ainda
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                    A sincronizacao acontece automaticamente. Assim que novas conversas
                    forem analisadas, as oportunidades aparecem aqui.
                  </p>
                  <Button
                    className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    onClick={handleRefreshOpportunities}
                    disabled={opportunitiesLoading}
                  >
                    <RefreshCcw className={cn("h-4 w-4", opportunitiesLoading && "animate-spin")} />
                    Atualizar lista
                  </Button>
                </div>
              )}
            </GlowCard>
          </section>

          {/* Stats */}
          {stats && (
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                icon={Send}
                title="Enviadas"
                value={stats.runs?.leads_sent || 0}
                subtitle="Mensagens enviadas"
                glowColor="amber"
                delay={0}
              />
              <MetricCard
                icon={MessageSquare}
                title="Conversas Ativas"
                value={stats.conversations?.active || 0}
                subtitle="IA conversando"
                glowColor="emerald"
                delay={100}
              />
              <MetricCard
                icon={UserCheck}
                title="Voce Assumiu"
                value={stats.conversations?.paused || 0}
                subtitle="Sob seu controle"
                glowColor="blue"
                delay={200}
              />
              <MetricCard
                icon={TrendingUp}
                title="Com Potencial"
                value={stats.conversations?.with_potential || 0}
                subtitle="Leads qualificados"
                glowColor="purple"
                delay={300}
              />
              <MetricCard
                icon={Zap}
                title="Oportunidades"
                value={opportunities.length}
                subtitle={syncStatus?.leads_matched ? `${syncStatus.leads_matched} leads vinculados` : "Via WhatsApp"}
                glowColor="cyan"
                delay={400}
              />
            </section>
          )}

          {/* Conversations */}
          <section className="space-y-6">
            {/* Active conversations */}
            {activeConversations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    IA Conversando ({activeConversations.length})
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeConversations.map((conv, index) => (
                    <ConversationCard
                      key={conv.id}
                      conversation={conv}
                      onViewDetails={handleViewDetails}
                      onTogglePause={handleTogglePause}
                      delay={index * 50}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* My conversations (paused) */}
            {myConversations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Voce Assumiu ({myConversations.length})
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myConversations.map((conv, index) => (
                    <ConversationCard
                      key={conv.id}
                      conversation={conv}
                      onViewDetails={handleViewDetails}
                      onTogglePause={handleTogglePause}
                      delay={index * 50}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedConversations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Finalizadas ({completedConversations.length})
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedConversations.slice(0, 6).map((conv, index) => (
                    <ConversationCard
                      key={conv.id}
                      conversation={conv}
                      onViewDetails={handleViewDetails}
                      onTogglePause={handleTogglePause}
                      delay={index * 50}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {conversations.length === 0 && !loading && (
              <GlowCard className="p-12 text-center">
                <Bot className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Nenhuma conversa ainda
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  O Salva-Leads envia mensagens automaticamente todo dia as 8h para leads
                  que estao sem resposta. As conversas aparecerao aqui.
                </p>
              </GlowCard>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="relative h-14 w-14 rounded-full border-4 border-purple-100 dark:border-purple-900 border-t-purple-500 animate-spin" />
                </div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">
                  Carregando conversas...
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Conversation detail modal */}
      <ConversationDetailModal
        conversation={selectedConversation}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      {/* Suggested message modal for opportunities */}
      <SuggestedMessageModal
        opportunity={selectedOpportunity}
        open={isSuggestionModalOpen}
        onOpenChange={setIsSuggestionModalOpen}
      />
    </AppShell>
  )
}
