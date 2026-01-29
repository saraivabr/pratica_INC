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
  Home,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  Moon,
  Sun,
  Search,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Workflow,
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
  Wifi,
  GraduationCap,
  Briefcase,
  Shield,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NavGroup } from "@/components/ui/nav-group"

const navItems = [
  { href: "/empreendimentos", icon: Building2, label: "Imóveis" },
  { href: "/calculadora/juncao", icon: Merge, label: "Junção" },
  { href: "/calculadora", icon: Calculator, label: "Calculadora" },
]

// Grouped admin navigation (ROTAS UNIFICADAS)
const adminGroups = {
  principal: {
    title: "Principal",
    defaultOpen: true,
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/pipeline", icon: Workflow, label: "Pipeline" },
      { href: "/empreendimentos", icon: Building2, label: "Imóveis" },
    ],
  },
  comunicacao: {
    title: "Comunicação",
    defaultOpen: true,
    items: [
      { href: "/chat", icon: MessageSquare, label: "Chat" },
      { href: "/whatsapp", icon: Smartphone, label: "WhatsApp" },
      { href: "/admin/whatsapp-status", icon: Wifi, label: "WhatsApp Status" },
      { href: "/admin/campaigns", icon: Megaphone, label: "Campanhas" },
    ],
  },
  inteligencia: {
    title: "Inteligência",
    defaultOpen: true,
    items: [
      { href: "/recupera-leads", icon: Search, label: "CataVendas" },
      { href: "/admin/score", icon: ShieldCheck, label: "Consulta Score" },
    ],
  },
  gestao: {
    title: "Gestão",
    defaultOpen: false,
    items: [
      { href: "/clientes", icon: UserCircle, label: "Leads" },
      { href: "/agenda", icon: Calendar, label: "Agenda" },
      { href: "/performance", icon: TrendingUp, label: "Performance" },
      { href: "/admin/equipe", icon: Users, label: "Equipe" },
      { href: "/admin/gerentes", icon: Users, label: "Gerentes" },
      { href: "/admin/eventos", icon: Calendar, label: "Eventos" },
      { href: "/admin/intermediacao/vendas", icon: Briefcase, label: "Intermediação" },
    ],
  },
  ferramentas: {
    title: "Ferramentas",
    defaultOpen: false,
    items: [
      { href: "/calculadora/juncao", icon: Merge, label: "Calculadora Junção" },
      { href: "/calculadora", icon: Calculator, label: "Simulador" },
    ],
  },
  treinamento: {
    title: "Treinamento",
    defaultOpen: false,
    items: [
      { href: "/academy", icon: GraduationCap, label: "Academy" },
    ],
  },
  config: {
    title: "Configurações",
    defaultOpen: false,
    items: [
      { href: "/admin/permissoes", icon: Shield, label: "Permissões" },
      { href: "/admin/automations", icon: Zap, label: "Automações" },
      { href: "/admin/reports", icon: BarChart3, label: "Relatórios" },
      { href: "/admin/status", icon: Settings, label: "Status API" },
    ],
  },
}

// Flat list for mobile and collapsed mode
const adminItems = Object.values(adminGroups).flatMap(g => g.items)

// Corretor navigation (ROTAS UNIFICADAS)
const corretorNavItems = [
  { href: "/corretor", icon: LayoutDashboard, label: "Command Center" },
  { href: "/empreendimentos", icon: Building2, label: "Imóveis" },
  { href: "/corretor/salva-leads", icon: Search, label: "CataVendas" },
]

// Mobile bottom nav for corretor (3 main items)
const corretorMobileNavItems = [
  { href: "/corretor", icon: LayoutDashboard, label: "Central" },
  { href: "/empreendimentos", icon: Building2, label: "Imóveis" },
  { href: "/corretor/salva-leads", icon: Search, label: "CataVendas" },
]

// Mobile bottom nav for admin (5 main items)
const adminMobileNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Home" },
  { href: "/admin/pipeline", icon: Workflow, label: "Pipeline" },
  { href: "/empreendimentos", icon: Building2, label: "Imóveis" },
  { href: "/admin/chat", icon: MessageSquare, label: "Chat" },
  { href: "/admin/leads", icon: UserCircle, label: "Leads" },
]

// Role Switch Component
function RoleSwitch({ currentView, onSwitch }: { currentView: "admin" | "corretor"; onSwitch: (view: "admin" | "corretor") => void }) {
  return (
    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-1">
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
  item: { href: string; icon: React.ElementType; label: string }
  isActive: boolean
  isCollapsed: boolean
}) {
  const content = (
    <Link
      href={item.href}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        isActive
          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        isCollapsed && "justify-center px-2"
      )}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!isCollapsed && (
        <span className="text-sm truncate min-w-0">{item.label}</span>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

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

  const showAdminSection = user?.role !== "corretor"
  const isCorretor = user?.role === "corretor"

  // Determine current view based on pathname
  const currentView: "admin" | "corretor" = pathname.startsWith("/corretor") ? "corretor" : "admin"

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
              className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar Desktop */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 64 : 240 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed top-0 left-0 z-50 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex md:flex-col"
        >
          {/* Logo */}
          <div className={cn(
            "flex items-center h-14 px-4 border-b border-zinc-200 dark:border-zinc-800",
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 py-3"
              >
                <button
                  onClick={() => router.push("/empreendimentos")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span>Buscar...</span>
                  <kbd className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">⌘K</kbd>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden w-full">
            {/* Show nav based on current view (for admin/gerente who can switch) or role (for corretor) */}
            {(isCorretor || currentView === "corretor") ? (
              corretorNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/corretor" && pathname.startsWith(item.href))
                return (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    isCollapsed={sidebarCollapsed}
                  />
                )
              })
            ) : (
              /* Admin & Manager Navigation */
              sidebarCollapsed ? (
                // Collapsed mode: flat list
                adminItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                  return (
                    <NavItem
                      key={item.href}
                      item={item}
                      isActive={isActive}
                      isCollapsed={sidebarCollapsed}
                    />
                  )
                })
              ) : (
                // Expanded mode: grouped navigation
                Object.entries(adminGroups).map(([key, group]) => (
                  <NavGroup key={key} title={group.title} defaultOpen={group.defaultOpen}>
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
              )
            )}
          </nav>

          {/* Footer */}
          <div className={cn(
            "p-3 border-t border-zinc-200 dark:border-zinc-800",
            sidebarCollapsed && "px-2"
          )}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2 py-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                    {user?.nome ? user.nome.substring(0, 2).toUpperCase() : "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user?.nome || "Usuário"}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {user?.role === "admin" ? "Admin" : user?.role === "gerente" ? "Gerente" : "Corretor"}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={sidebarCollapsed ? "icon" : "sm"}
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className={cn(
                      "w-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      !sidebarCollapsed && "justify-start gap-2"
                    )}
                  >
                    {mounted && (theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    ))}
                    {!sidebarCollapsed && (
                      <span className="text-sm">{mounted && (theme === "dark" ? "Claro" : "Escuro")}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" className="text-xs">
                    {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={sidebarCollapsed ? "icon" : "sm"}
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={cn(
                      "w-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      !sidebarCollapsed && "justify-start gap-2"
                    )}
                  >
                    <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
                    {!sidebarCollapsed && <span className="text-sm">Recolher</span>}
                  </Button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" className="text-xs">Expandir</TooltipContent>
                )}
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={sidebarCollapsed ? "icon" : "sm"}
                    onClick={handleLogout}
                    className={cn(
                      "w-full text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
                      !sidebarCollapsed && "justify-start gap-2"
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                    {!sidebarCollapsed && <span className="text-sm">Sair</span>}
                  </Button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" className="text-xs">Sair</TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </motion.aside>

        {/* Sidebar Mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-200 dark:border-zinc-800">
                <Image
                  src="/logo-pratica.svg"
                  alt="Pratica Incorporadora"
                  width={120}
                  height={28}
                  className="shrink-0"
                />
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="text-zinc-500">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                      {user?.nome ? user.nome.substring(0, 2).toUpperCase() : "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{user?.nome || "Usuário"}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {user?.role === "admin" ? "Administrador" : user?.role === "gerente" ? "Gerente" : "Corretor"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-3 py-3">
                <button
                  onClick={() => {
                    router.push("/empreendimentos")
                    setSidebarOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm"
                >
                  <Search className="h-4 w-4" />
                  <span>Buscar imóveis...</span>
                </button>
              </div>

              <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                {/* Mobile Navigation based on current view */}
                {(isCorretor || currentView === "corretor") ? (
                  corretorNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/corretor" && pathname.startsWith(item.href))
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          isActive
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })
                ) : (
                  /* Admin & Manager Mobile Navigation */
                  Object.entries(adminGroups).map(([key, group]) => (
                    <NavGroup key={key} title={group.title} defaultOpen={group.defaultOpen}>
                      {group.items.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                              isActive
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </NavGroup>
                  ))
                )}
              </nav>

              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-zinc-600 dark:text-zinc-400"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
                  <span>{mounted && (theme === "dark" ? "Modo Claro" : "Modo Escuro")}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div
          className={cn(
            "flex flex-col min-h-screen transition-all duration-200 ease-in-out",
            sidebarCollapsed ? "md:pl-16" : "md:pl-60"
          )}
        >
          {/* Header */}
          <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between h-full px-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-zinc-600 dark:text-zinc-400"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {showBackButton && backHref && (
                  <Button variant="ghost" size="icon" asChild className="hidden md:flex text-zinc-600 dark:text-zinc-400">
                    <Link href={backHref}>
                      <ChevronLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                )}

                <h1 className="font-medium text-zinc-900 dark:text-zinc-100">{pageTitle}</h1>
              </div>

              <div className="flex items-center gap-3">
                {/* Role Switch - only for admin/gerente */}
                {canSwitchRoles && (
                  <RoleSwitch currentView={currentView} onSwitch={handleRoleSwitch} />
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-zinc-500"
                  onClick={() => router.push("/empreendimentos")}
                >
                  <Search className="h-5 w-5" />
                </Button>

                <Link href="/perfil" className="hidden md:block">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
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

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-2 pb-safe">
          <div className="flex items-center justify-around h-16">
            {((isCorretor || currentView === "corretor") ? corretorMobileNavItems : adminMobileNavItems).map((item) => {
              const baseHref = (isCorretor || currentView === "corretor") ? "/corretor" : "/admin"
              const isActive = pathname === item.href || (item.href !== baseHref && item.href !== "/" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
                    isActive
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
