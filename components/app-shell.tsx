"use client"

import type React from "react"
import { useState, useEffect, useSyncExternalStore } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building2,
  Calculator,
  Menu,
  X,
  ChevronLeft,
  Moon,
  Sun,
  Search,
  Users,
  Settings,
  LogOut,
  Megaphone,
  MessageSquare,
  Zap,
  Calendar,
  BarChart3,
  UserCircle,
  ShieldCheck,
  Merge,
  Bot,
  Smartphone,
  Briefcase,
  Shield,
  Sparkles,
  Target,
  Send,
  CircleDollarSign,
  ClipboardList,
  ClipboardCheck,
  Clock,
  PartyPopper,
  Gauge,
  PanelLeft,
  FileText,
  Activity,
  Layers,
  Contact,
  Grid3X3,
  Table,
  Plus,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { useRoletaStatus } from "@/hooks/use-roleta-status"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NavGroup } from "@/components/ui/nav-group"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

// ────────────────────────────────────────────────────────
// Corretor Navigation - Primary (core) + Secondary (bonificados)
// Prioridade: Empreendimentos > Espelho > Tabela > Leads
// ────────────────────────────────────────────────────────
const corretorPrimaryItems = [
  { href: "/corretor/recepcao", icon: ClipboardCheck, label: "Roleta", description: "Check-in e fila de plantão", roleta: true },
  { href: "/corretor", icon: Gauge, label: "Painel", description: "Visão geral e métricas" },
  { href: "/corretor/imoveis", icon: Building2, label: "Empreendimentos", description: "Catálogo de imóveis" },
  { href: "/corretor/espelho", icon: Grid3X3, label: "Espelho", description: "Disponibilidade de unidades" },
  { href: "/corretor/tabela", icon: Table, label: "Tabela", description: "Tabela de preços" },
  { href: "/corretor/clientes", icon: Contact, label: "Leads", description: "Gestão de clientes" },
]

const corretorSecondaryItems = [
  { href: "/corretor/assistente", icon: Sparkles, label: "Assistente IA", highlight: true, description: "Tire dúvidas com a IA" },
  { href: "/corretor/salva-leads", icon: Bot, label: "Salva-Leads", description: "Follow-up automático" },
  { href: "/corretor/disparador", icon: Send, label: "Disparador", description: "Envios em massa" },
  { href: "/corretor/chat", icon: MessageSquare, label: "Conversas", description: "Chat com leads" },
  { href: "/corretor/agenda", icon: Calendar, label: "Agenda", description: "Visitas e compromissos" },
  { href: "/corretor/propostas", icon: FileText, label: "Propostas", description: "Propostas enviadas" },
  { href: "/corretor/configuracoes", icon: Settings, label: "Configurações", description: "Perfil e preferências" },
]

// Combined for mobile sidebar
const corretorNavItems = [...corretorPrimaryItems, ...corretorSecondaryItems]

// ────────────────────────────────────────────────────────
// Admin Navigation - grouped with better naming
// ────────────────────────────────────────────────────────
const adminGroups = {
  visaoGeral: {
    title: "Visão Geral",
    icon: Layers,
    defaultOpen: true,
    items: [
      { href: "/admin", icon: Gauge, label: "Painel", description: "Dashboard geral" },
      { href: "/admin/leads", icon: Target, label: "Leads & Funil", description: "Pipeline de vendas e leads" },
    ],
  },
  comunicacao: {
    title: "Comunicação",
    icon: MessageSquare,
    defaultOpen: true,
    items: [
      { href: "/admin/whatsapp", icon: Smartphone, label: "WhatsApp", description: "Instâncias e conexões" },
    ],
  },
  inteligencia: {
    title: "Inteligência",
    icon: Sparkles,
    defaultOpen: true,
    items: [
      { href: "/corretor/assistente", icon: Sparkles, label: "Assistente IA", highlight: true, description: "Pergunte à IA" },
      { href: "/corretor/salva-leads", icon: Bot, label: "Salva-Leads", description: "Recuperação automática" },
      { href: "/admin/score", icon: ShieldCheck, label: "Consulta Score", description: "Análise de crédito" },
    ],
  },
  gestao: {
    title: "Gestão",
    icon: ClipboardList,
    defaultOpen: false,
    items: [
      { href: "/admin/equipe", icon: Users, label: "Equipe", description: "Corretores e ranking" },
      { href: "/admin/eventos", icon: PartyPopper, label: "Eventos", description: "Criar e gerenciar eventos" },
      { href: "/admin/recepcao", icon: ClipboardCheck, label: "Roleta", description: "Controle de plantão e fila" },
      { href: "/admin/comissao", icon: Calculator, label: "Comissão", description: "Cálculo de comissões" },
      { href: "/admin/agenda", icon: Calendar, label: "Agenda", description: "Visitas da equipe" },
    ],
  },
  imoveis: {
    title: "Imóveis",
    icon: Building2,
    defaultOpen: false,
    items: [
      { href: "/empreendimentos", icon: Building2, label: "Empreendimentos", description: "Imóveis e unidades" },
      { href: "/calculadora", icon: CircleDollarSign, label: "Simulador", description: "Simular financiamento" },
      { href: "/calculadora/juncao", icon: Merge, label: "Junção de Lotes", description: "Calculadora de junção" },
    ],
  },
  configuracoes: {
    title: "Configurações",
    icon: Settings,
    defaultOpen: false,
    items: [
      { href: "/admin/permissoes", icon: Shield, label: "Permissões", description: "Controle de acesso" },
      { href: "/admin/reports", icon: BarChart3, label: "Relatórios", description: "Exportação e análises" },
      { href: "/admin/status", icon: Activity, label: "Status do Sistema", description: "Status das integrações" },
      { href: "/admin/chat", icon: MessageSquare, label: "Chat", description: "Conversas com leads" },
    ],
  },
}

// Flat list for collapsed mode
const adminItems = Object.values(adminGroups).flatMap(g => g.items)

// Mobile bottom nav for corretor (5 main items - core priority)
const corretorMobileNavItems = [
  { href: "/corretor", icon: Gauge, label: "Painel" },
  { href: "/corretor/imoveis", icon: Building2, label: "Imóveis" },
  { href: "/corretor/espelho", icon: Grid3X3, label: "Espelho" },
  { href: "/corretor/clientes", icon: Contact, label: "Leads" },
  { href: "/corretor/assistente", icon: Sparkles, label: "IA", highlight: true },
]

// Mobile bottom nav for admin (5 main items)
const adminMobileNavItems = [
  { href: "/admin", icon: Gauge, label: "Painel" },
  { href: "/admin/leads", icon: Target, label: "Leads" },
  { href: "/admin/whatsapp", icon: Smartphone, label: "WhatsApp" },
  { href: "/corretor/assistente", icon: Sparkles, label: "IA", highlight: true },
]

// ────────────────────────────────────────────────────────
// Recepcionista Navigation - simplified
// ────────────────────────────────────────────────────────
const recepcionistaNavItems = [
  { href: "/recepcionista", icon: ClipboardList, label: "Cadastro de Leads", description: "Registrar novos leads" },
  { href: "/recepcionista/historico", icon: Clock, label: "Histórico", description: "Leads cadastrados" },
]

const recepcionistaMobileNavItems = [
  { href: "/recepcionista", icon: ClipboardList, label: "Leads" },
  { href: "/recepcionista/historico", icon: Clock, label: "Histórico" },
]

// ────────────────────────────────────────────────────────
// Quick Actions (for "Novo" button)
// ────────────────────────────────────────────────────────
const adminQuickActions = [
  { href: "/calculadora", icon: Calculator, label: "Nova Simulação", description: "Simular financiamento" },
  { href: "/admin/eventos/novo", icon: PartyPopper, label: "Novo Evento", description: "Criar evento para corretores" },
  { href: "/admin/leads", icon: UserPlus, label: "Novo Lead", description: "Cadastrar novo lead" },
]

const corretorQuickActions = [
  { href: "/calculadora", icon: Calculator, label: "Nova Simulação", description: "Simular financiamento" },
  { href: "/corretor/clientes", icon: UserPlus, label: "Novo Lead", description: "Cadastrar novo cliente" },
  { href: "/corretor/propostas", icon: FileText, label: "Nova Proposta", description: "Criar proposta comercial" },
]

// ────────────────────────────────────────────────────────
// Role Switch Component
// ────────────────────────────────────────────────────────
function RoleSwitch({ currentView, onSwitch }: { currentView: "admin" | "corretor"; onSwitch: (view: "admin" | "corretor") => void }) {
  return (
    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => onSwitch("admin")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          currentView === "admin"
            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        )}
      >
        <Shield className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Admin</span>
      </button>
      <button
        onClick={() => onSwitch("corretor")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          currentView === "corretor"
            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        )}
      >
        <Briefcase className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Corretor</span>
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────
// Nav Item Component (redesigned)
// ────────────────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  backHref?: string
}

function NavItem({
  item,
  isActive,
  isCollapsed,
}: {
  item: { href: string; icon: React.ElementType; label: string; highlight?: boolean; badge?: string; badgeVariant?: "default" | "warning"; roleta?: boolean; description?: string }
  isActive: boolean
  isCollapsed: boolean
}) {
  const isHighlight = item.highlight
  const isRoleta = item.roleta
  const hasBadge = item.badge

  const content = (
    <Link
      href={item.href}
      className={cn(
        "group/item flex w-full items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 relative",
        // Roleta special styling
        isRoleta && !isActive
          ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 hover:from-emerald-500/18 hover:to-teal-500/18 font-medium"
          : isRoleta && isActive
            ? "bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-500 dark:to-teal-500 text-white dark:text-white font-medium shadow-md shadow-emerald-500/25"
        // IA highlight styling
          : isHighlight && !isActive
            ? "bg-gradient-to-r from-violet-500/8 to-indigo-500/8 text-violet-700 dark:text-violet-300 hover:from-violet-500/15 hover:to-indigo-500/15 font-medium"
            : isHighlight && isActive
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white dark:text-white shadow-md shadow-violet-500/20"
        // Normal styling
              : isActive
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium shadow-sm shadow-zinc-900/10 dark:shadow-white/10"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
        isCollapsed && "justify-center px-2 py-2.5"
      )}
    >
      {/* Pulsing glow behind roleta item when has badge */}
      {isRoleta && hasBadge && item.badgeVariant === "warning" && !isCollapsed && (
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/20 to-yellow-400/20 animate-pulse pointer-events-none" />
      )}
      {isRoleta && hasBadge && item.badgeVariant !== "warning" && !isCollapsed && (
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/10 to-teal-400/10 animate-pulse pointer-events-none" />
      )}
      <item.icon className={cn(
        "h-[18px] w-[18px] shrink-0 transition-transform duration-150 relative z-10",
        isRoleta && !isActive && "text-emerald-500 dark:text-emerald-400",
        isRoleta && isActive && "text-white",
        isHighlight && !isActive && "text-violet-500 dark:text-violet-400",
        isActive && !isHighlight && !isRoleta && "text-white dark:text-zinc-900",
        isActive && isHighlight && "text-white",
        !isActive && !isHighlight && !isRoleta && "text-zinc-400 dark:text-zinc-500 group-hover/item:text-zinc-600 dark:group-hover/item:text-zinc-300",
      )} />
      {!isCollapsed && (
        <span className="relative z-10 flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[13px] truncate min-w-0 flex-1">{item.label}</span>
          {isRoleta && hasBadge && (
            <span className={cn(
              "ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap",
              item.badgeVariant === "warning"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30 animate-pulse"
                : isActive
                  ? "bg-white/20 text-white"
                  : "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
            )}>
              {item.badge}
            </span>
          )}
          {isHighlight && (
            <span className={cn(
              "ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
              isActive
                ? "bg-white/20 text-white"
                : "bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
            )}>IA</span>
          )}
          {hasBadge && !isHighlight && !isRoleta && (
            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </span>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          <span>{item.label}</span>
          {item.description && (
            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-normal mt-0.5">{item.description}</span>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

// ────────────────────────────────────────────────────────
// Secondary Nav Item (smaller, softer for less-used items)
// ────────────────────────────────────────────────────────
function NavItemSecondary({
  item,
  isActive,
  isCollapsed,
}: {
  item: { href: string; icon: React.ElementType; label: string; description?: string; badge?: string; badgeVariant?: "default" | "warning" }
  isActive: boolean
  isCollapsed: boolean
}) {
  const content = (
    <Link
      href={item.href}
      className={cn(
        "group/item flex w-full items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 relative",
        isActive
          ? "bg-zinc-900/8 dark:bg-white/8 text-zinc-900 dark:text-zinc-100 font-medium"
          : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40",
        isCollapsed && "justify-center px-2 py-2"
      )}
    >
      <item.icon className={cn(
        "h-4 w-4 shrink-0",
        isActive
          ? "text-zinc-700 dark:text-zinc-300"
          : "text-zinc-400 dark:text-zinc-600 group-hover/item:text-zinc-500 dark:group-hover/item:text-zinc-400",
      )} />
      {!isCollapsed && (
        <>
          <span className="text-[12px] truncate min-w-0 flex-1">{item.label}</span>
          {item.badge && (
            <span className={cn(
              "ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
              item.badgeVariant === "warning"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          <span>{item.label}</span>
          {item.description && (
            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-normal mt-0.5">{item.description}</span>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

// ────────────────────────────────────────────────────────
// Separator for sidebar sections
// ────────────────────────────────────────────────────────
function SidebarDivider() {
  return <div className="mx-3 my-2 h-px bg-zinc-200/60 dark:bg-zinc-800/60" />
}

// ────────────────────────────────────────────────────────
// Quick Action Button (Novo)
// ────────────────────────────────────────────────────────
function QuickActionButton({
  isCollapsed,
  isCorretorView,
  onNavigate,
}: {
  isCollapsed: boolean
  isCorretorView: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const actions = isCorretorView ? corretorQuickActions : adminQuickActions

  const handleAction = (href: string) => {
    setOpen(false)
    router.push(href)
    onNavigate?.()
  }

  if (isCollapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          {!open && (
            <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
              Novo
            </TooltipContent>
          )}
        </Tooltip>
        <PopoverContent side="right" sideOffset={12} align="start" className="w-72 p-0 border-zinc-200/80 dark:border-zinc-700/80 shadow-xl rounded-xl overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Criar novo</p>
          </div>
          <div className="px-2 pb-2 space-y-0.5">
            {actions.map((action) => (
              <button
                key={action.href}
                onClick={() => handleAction(action.href)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group/action"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/15 shrink-0">
                  <action.icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{action.label}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-[13px] font-semibold shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Novo</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" sideOffset={12} align="start" className="w-72 p-0 border-zinc-200/80 dark:border-zinc-700/80 shadow-xl rounded-xl overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Criar novo</p>
        </div>
        <div className="px-2 pb-2 space-y-0.5">
          {actions.map((action) => (
            <button
              key={action.href}
              onClick={() => handleAction(action.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group/action"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/15 shrink-0">
                <action.icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{action.label}</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ────────────────────────────────────────────────────────
// Main AppShell
// ────────────────────────────────────────────────────────
const navItems = [
  { href: "/empreendimentos", icon: Building2, label: "Imóveis" },
  { href: "/calculadora/juncao", icon: Merge, label: "Junção" },
  { href: "/calculadora", icon: Calculator, label: "Calculadora" },
]

export function AppShell({ children, title, showBackButton, backHref }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const showAdminSection = user?.role !== "corretor" && user?.role !== "recepcionista"
  const isCorretor = user?.role === "corretor"
  const isRecepcionista = user?.hierarquia?.slug === "recepcionista" || user?.role === "recepcionista"

  // Determine current view based on pathname
  const currentView: "admin" | "corretor" | "recepcionista" = pathname.startsWith("/recepcionista")
    ? "recepcionista"
    : pathname.startsWith("/corretor")
      ? "corretor"
      : "admin"

  // Roleta status polling (only for corretor views)
  const isCorretorView = !isRecepcionista && (isCorretor || currentView === "corretor")
  const isOnRecepcaoPage = pathname.startsWith("/corretor/recepcao")
  const roletaStatus = useRoletaStatus(isCorretorView)

  // Build roleta badge for sidebar
  const roletaBadge = roletaStatus.isMyTurn
    ? "SUA VEZ!"
    : roletaStatus.inQueue
      ? `#${roletaStatus.posicaoReal ?? roletaStatus.posicao ?? '?'}`
      : undefined
  const roletaBadgeVariant = roletaStatus.isMyTurn ? "warning" as const : "default" as const

  // Can switch roles (admin and gerente can switch, corretor cannot)
  const canSwitchRoles = user?.role === "admin" || user?.role === "gerente"

  // Handle role switch
  const handleRoleSwitch = (view: "admin" | "corretor") => {
    if (view === "admin") {
      router.push("/admin")
    } else {
      router.push("/corretor")
    }
  }

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const currentNav = navItems.find(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  )
  const pageTitle = title || currentNav?.label || "Pratica"

  // ──── Render Navigation Items ────
  const renderCorretorNav = (collapsed: boolean) => {
    return (
      <>
        {/* Primary items - larger, more prominent */}
        {corretorPrimaryItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/corretor" && pathname.startsWith(item.href))
          const enrichedItem = item.roleta && roletaBadge
            ? { ...item, badge: roletaBadge, badgeVariant: roletaBadgeVariant }
            : item
          return (
            <NavItem
              key={item.href}
              item={enrichedItem}
              isActive={isActive}
              isCollapsed={collapsed}
            />
          )
        })}
        <SidebarDivider />
        {/* Secondary items - smaller, softer */}
        {corretorSecondaryItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/corretor" && pathname.startsWith(item.href))
          return (
            <NavItemSecondary
              key={item.href}
              item={item}
              isActive={isActive}
              isCollapsed={collapsed}
            />
          )
        })}
      </>
    )
  }

  const renderRecepcionistaNav = (collapsed: boolean) => {
    return recepcionistaNavItems.map((item) => {
      const isActive = pathname === item.href || (item.href !== "/recepcionista" && pathname.startsWith(item.href))
      return (
        <NavItem
          key={item.href}
          item={item}
          isActive={isActive}
          isCollapsed={collapsed}
        />
      )
    })
  }

  const renderAdminNav = (collapsed: boolean) => {
    if (collapsed) {
      return adminItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
        return (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive}
            isCollapsed={true}
          />
        )
      })
    }

    return Object.entries(adminGroups).map(([key, group]) => (
      <NavGroup key={key} title={group.title} icon={group.icon} defaultOpen={group.defaultOpen}>
        {group.items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive}
              isCollapsed={false}
            />
          )
        })}
      </NavGroup>
    ))
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Overlay mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ──────────── Sidebar Desktop ──────────── */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 68 : 260 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed top-0 left-0 z-50 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800/80 hidden md:flex md:flex-col"
        >
          {/* Logo */}
          <div className={cn(
            "flex items-center h-14 px-4 border-b border-zinc-200/80 dark:border-zinc-800/80",
            sidebarCollapsed ? "justify-center" : "gap-2"
          )}>
            {sidebarCollapsed ? (
              <Image
                src="/logo-pratica-icon.svg"
                alt="Pratica"
                width={28}
                height={28}
                className="shrink-0"
              />
            ) : (
              <Image
                src="/logo-pratica.svg"
                alt="Pratica Incorporadora"
                width={140}
                height={32}
                className="shrink-0"
              />
            )}
          </div>

          {/* Search */}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 pt-3 pb-1 overflow-hidden"
              >
                <button
                  onClick={() => router.push("/empreendimentos")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ring-1 ring-zinc-200/50 dark:ring-zinc-700/50"
                >
                  <Search className="h-4 w-4" />
                  <span className="text-[13px]">Buscar...</span>
                  <kbd className="ml-auto text-[10px] font-mono text-zinc-300 dark:text-zinc-600 bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded">⌘K</kbd>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Action Button */}
          <div className={cn("px-2 pt-2", sidebarCollapsed ? "flex justify-center" : "px-3")}>
            <QuickActionButton isCollapsed={sidebarCollapsed} isCorretorView={isCorretor || currentView === "corretor"} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden w-full scrollbar-thin">
            {isRecepcionista
              ? renderRecepcionistaNav(sidebarCollapsed)
              : (isCorretor || currentView === "corretor")
                ? renderCorretorNav(sidebarCollapsed)
                : renderAdminNav(sidebarCollapsed)
            }
          </nav>

          {/* Footer */}
          <div className={cn(
            "border-t border-zinc-200/80 dark:border-zinc-800/80",
            sidebarCollapsed ? "p-2" : "p-3"
          )}>
            {/* User info */}
            {!sidebarCollapsed && (
              <Link href="/perfil" className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group">
                <Avatar className="h-9 w-9 ring-2 ring-zinc-200/60 dark:ring-zinc-700/60">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 text-xs font-semibold">
                    {user?.nome ? user.nome.substring(0, 2).toUpperCase() : "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-white">{user?.nome || "Usuário"}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                    {user?.role === "admin" ? "Administrador" : user?.role === "gerente" ? "Gerente" : user?.role === "recepcionista" ? "Recepcionista" : "Corretor"}
                  </p>
                </div>
              </Link>
            )}

            <div className={cn("flex gap-1", sidebarCollapsed ? "flex-col" : "")}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {mounted && (theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    ))}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={sidebarCollapsed ? "right" : "top"} className="text-xs">
                  {mounted && (theme === "dark" ? "Modo Claro" : "Modo Escuro")}
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <PanelLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={sidebarCollapsed ? "right" : "top"} className="text-xs">
                  {sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={sidebarCollapsed ? "right" : "top"} className="text-xs">Sair</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.aside>

        {/* ──────────── Sidebar Mobile ──────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed top-0 left-0 z-50 h-full w-[280px] bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800/80 flex flex-col md:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <Image
                  src="/logo-pratica.svg"
                  alt="Pratica Incorporadora"
                  width={120}
                  height={28}
                  className="shrink-0"
                />
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-8 w-8 text-zinc-400 hover:text-zinc-600">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* User profile */}
              <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <Link href="/perfil" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                  <Avatar className="h-10 w-10 ring-2 ring-zinc-200/60 dark:ring-zinc-700/60">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 font-semibold">
                      {user?.nome ? user.nome.substring(0, 2).toUpperCase() : "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-[14px]">{user?.nome || "Usuário"}</p>
                    <p className="text-[12px] text-zinc-400 dark:text-zinc-500 truncate">
                      {user?.role === "admin" ? "Administrador" : user?.role === "gerente" ? "Gerente" : user?.role === "recepcionista" ? "Recepcionista" : "Corretor"}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Search */}
              <div className="px-3 py-3">
                <button
                  onClick={() => {
                    router.push("/empreendimentos")
                    setSidebarOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 text-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50"
                >
                  <Search className="h-4 w-4" />
                  <span className="text-[13px]">Buscar imóveis...</span>
                </button>
              </div>

              {/* Quick Action Button */}
              <div className="px-3 pb-2">
                <QuickActionButton isCollapsed={false} isCorretorView={isCorretor || currentView === "corretor"} onNavigate={() => setSidebarOpen(false)} />
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
                {isRecepcionista ? (
                  recepcionistaNavItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                          isActive
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium shadow-sm"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        )}
                      >
                        <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-current" : "text-zinc-400 dark:text-zinc-500")} />
                        <span className="text-[13px]">{item.label}</span>
                      </Link>
                    )
                  })
                ) : (isCorretor || currentView === "corretor") ? (
                  <>
                    {corretorPrimaryItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== "/corretor" && pathname.startsWith(item.href))
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative overflow-hidden",
                            item.roleta && !isActive
                              ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                              : item.roleta && isActive
                                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-md shadow-emerald-500/25"
                              : (item as any).highlight && !isActive
                                ? "bg-gradient-to-r from-violet-500/8 to-indigo-500/8 text-violet-700 dark:text-violet-300 font-medium"
                                : isActive
                                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium shadow-sm"
                                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
                            (item as any).highlight && isActive && "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                          )}
                        >
                          {item.roleta && roletaBadge && roletaBadgeVariant === "warning" && (
                            <span className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-yellow-400/20 animate-pulse pointer-events-none" />
                          )}
                          {item.roleta && roletaBadge && roletaBadgeVariant !== "warning" && (
                            <span className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 animate-pulse pointer-events-none" />
                          )}
                          <item.icon className={cn(
                            "h-[18px] w-[18px] shrink-0 relative z-10",
                            item.roleta && !isActive && "text-emerald-500 dark:text-emerald-400",
                            item.roleta && isActive && "text-white",
                            (item as any).highlight && !isActive && "text-violet-500 dark:text-violet-400",
                            !item.roleta && isActive && "text-current",
                            !isActive && !(item as any).highlight && !item.roleta && "text-zinc-400 dark:text-zinc-500",
                          )} />
                          <span className="text-[13px] relative z-10 flex-1">{item.label}</span>
                          {item.roleta && roletaBadge && (
                            <span className={cn(
                              "relative z-10 ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap",
                              roletaBadgeVariant === "warning"
                                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30 animate-pulse"
                                : isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                            )}>
                              {roletaBadge}
                            </span>
                          )}
                          {(item as any).highlight && (
                            <span className={cn(
                              "ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                              isActive ? "bg-white/20 text-white" : "bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
                            )}>IA</span>
                          )}
                        </Link>
                      )
                    })}
                    <SidebarDivider />
                    {corretorSecondaryItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== "/corretor" && pathname.startsWith(item.href))
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150",
                            isActive
                              ? "bg-zinc-900/8 dark:bg-white/8 text-zinc-900 dark:text-zinc-100 font-medium"
                              : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                          )}
                        >
                          <item.icon className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600",
                          )} />
                          <span className="text-[12px]">{item.label}</span>
                        </Link>
                      )
                    })}
                  </>
                ) : (
                  Object.entries(adminGroups).map(([key, group]) => (
                    <NavGroup key={key} title={group.title} icon={group.icon} defaultOpen={group.defaultOpen}>
                      {group.items.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                              (item as any).highlight && !isActive
                                ? "bg-gradient-to-r from-violet-500/8 to-indigo-500/8 text-violet-700 dark:text-violet-300 font-medium"
                                : isActive
                                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium shadow-sm"
                                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                            )}
                          >
                            <item.icon className={cn(
                              "h-[18px] w-[18px] shrink-0",
                              (item as any).highlight && !isActive && "text-violet-500",
                              isActive && "text-current",
                              !isActive && !(item as any).highlight && "text-zinc-400 dark:text-zinc-500",
                            )} />
                            <span className="text-[13px]">{item.label}</span>
                            {(item as any).highlight && (
                              <span className={cn(
                                "ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                                isActive ? "bg-white/20 text-white" : "bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
                              )}>IA</span>
                            )}
                          </Link>
                        )
                      })}
                    </NavGroup>
                  ))
                )}
              </nav>

              {/* Footer */}
              <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ──────────── Main content ──────────── */}
        <div
          className={cn(
            "flex flex-col min-h-screen transition-all duration-200 ease-in-out",
            sidebarCollapsed ? "md:pl-[68px]" : "md:pl-[260px]"
          )}
        >
          {/* Header */}
          <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center justify-between h-full px-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-zinc-500 dark:text-zinc-400 h-9 w-9"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {showBackButton && backHref && (
                  <Button variant="ghost" size="icon" asChild className="hidden md:flex text-zinc-500 dark:text-zinc-400 h-8 w-8">
                    <Link href={backHref}>
                      <ChevronLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                )}

                <h1 className="font-semibold text-[15px] text-zinc-900 dark:text-zinc-100">{pageTitle}</h1>
              </div>

              <div className="flex items-center gap-3">
                {/* Role Switch - only for admin/gerente */}
                {canSwitchRoles && (
                  <RoleSwitch currentView={currentView as "admin" | "corretor"} onSwitch={handleRoleSwitch} />
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-zinc-400 h-9 w-9"
                  onClick={() => router.push("/empreendimentos")}
                >
                  <Search className="h-5 w-5" />
                </Button>

                <Link href="/perfil" className="hidden md:block">
                  <Avatar className="h-8 w-8 ring-2 ring-zinc-200/60 dark:ring-zinc-700/60 hover:ring-zinc-300 dark:hover:ring-zinc-600 transition-all">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 text-xs font-semibold">
                      {user?.nome ? user.nome.substring(0, 2).toUpperCase() : "??"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 pb-20 md:pb-6 px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            {children}
          </main>
        </div>

        {/* ChatWidget is now in layout.tsx */}

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-2 pb-safe">
          <div className="flex items-center justify-around h-16">
            {(isRecepcionista ? recepcionistaMobileNavItems : (isCorretor || currentView === "corretor") ? corretorMobileNavItems : adminMobileNavItems).map((item) => {
              const baseHref = isRecepcionista ? "/recepcionista" : (isCorretor || currentView === "corretor") ? "/corretor" : "/admin"
              const isActive = pathname === item.href || (item.href !== baseHref && item.href !== "/" && pathname.startsWith(item.href))
              const isHighlight = (item as any).highlight
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-all duration-150",
                    isHighlight && !isActive
                      ? "text-violet-600 dark:text-violet-400"
                      : isActive
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-lg transition-colors",
                    isHighlight && !isActive && "bg-violet-500/10 dark:bg-violet-500/15",
                    isHighlight && isActive && "bg-violet-600/15 dark:bg-violet-400/15",
                    !isHighlight && isActive && "bg-zinc-900/10 dark:bg-white/10"
                  )}>
                    <item.icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.5]")} />
                  </div>
                  <span className={cn("text-[10px] font-medium", isHighlight && "font-semibold")}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
