"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Phone,
  LogOut,
  Loader2,
  User,
  Briefcase,
  Edit2,
  Check,
  X,
  Shield,
  MessageSquare,
  TrendingUp,
  Clock,
  Calendar,
  Activity,
  Settings,
  Bell,
  Sparkles,
  Target,
  Users,
  ChevronRight,
  Star,
  Award,
  Zap
} from "lucide-react"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { AnimatedBackground } from "@/components/animated-background"
import { GlowButton } from "@/components/ui/glow-button"

// Glassmorphism card component
function GlassCard({
  children,
  className,
  glowColor = "emerald",
  animate = true,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "emerald" | "blue" | "purple" | "orange" | "amber";
  animate?: boolean;
  delay?: number;
}) {
  const glowColors = {
    emerald: "from-emerald-400 via-green-400 to-teal-400",
    blue: "from-blue-400 via-cyan-400 to-teal-400",
    purple: "from-purple-400 via-pink-400 to-rose-400",
    orange: "from-orange-400 via-amber-400 to-yellow-400",
    amber: "from-amber-400 via-orange-400 to-red-400"
  };

  return (
    <div
      className={cn(
        "relative group",
        animate && "animate-fadeInUp",
        className
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {/* Card glow effect */}
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r rounded-[2rem] blur-xl opacity-20 transition-opacity duration-300 group-hover:opacity-30",
        glowColors[glowColor]
      )} />

      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-900/10 dark:shadow-emerald-400/5 border border-white/60 dark:border-gray-800/60 overflow-hidden">
        {/* Animated top border */}
        <div className={cn("h-1 bg-gradient-to-r animate-gradient", glowColors[glowColor])} />

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "emerald",
  delay = 0
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  color?: "emerald" | "blue" | "purple" | "orange" | "amber";
  delay?: number;
}) {
  const colorClasses = {
    emerald: {
      bg: "from-emerald-500 to-green-500",
      light: "from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20",
      text: "text-emerald-600 dark:text-emerald-400"
    },
    blue: {
      bg: "from-blue-500 to-cyan-500",
      light: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
      text: "text-blue-600 dark:text-blue-400"
    },
    purple: {
      bg: "from-purple-500 to-pink-500",
      light: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
      text: "text-purple-600 dark:text-purple-400"
    },
    orange: {
      bg: "from-orange-500 to-amber-500",
      light: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20",
      text: "text-orange-600 dark:text-orange-400"
    },
    amber: {
      bg: "from-amber-500 to-yellow-500",
      light: "from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20",
      text: "text-amber-600 dark:text-amber-400"
    }
  };

  const colors = colorClasses[color];

  return (
    <div
      className="animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn(
        "relative p-4 rounded-2xl bg-gradient-to-r transition-all duration-300 hover:scale-105",
        colors.light
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-br shadow-lg",
            colors.bg
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              {trend && (
                <span className={cn("text-sm font-medium", colors.text)}>{trend}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity item component
function ActivityItem({
  icon: Icon,
  title,
  description,
  time,
  color = "emerald",
  delay = 0
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
  color?: "emerald" | "blue" | "purple" | "orange";
  delay?: number;
}) {
  const colorClasses = {
    emerald: "from-emerald-500 to-green-500",
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
    orange: "from-orange-500 to-amber-500"
  };

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn(
        "p-2 rounded-lg bg-gradient-to-br shadow-md flex-shrink-0",
        colorClasses[color]
      )}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{time}</span>
    </div>
  );
}

// Setting item component
function SettingItem({
  icon: Icon,
  title,
  description,
  action,
  color = "emerald",
  delay = 0
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange";
  delay?: number;
}) {
  const colorClasses = {
    emerald: "from-emerald-500 to-green-500 group-hover:from-emerald-600 group-hover:to-green-600",
    blue: "from-blue-500 to-cyan-500 group-hover:from-blue-600 group-hover:to-cyan-600",
    purple: "from-purple-500 to-pink-500 group-hover:from-purple-600 group-hover:to-pink-600",
    orange: "from-orange-500 to-amber-500 group-hover:from-orange-600 group-hover:to-amber-600"
  };

  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all cursor-pointer animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn(
        "p-3 rounded-xl bg-gradient-to-br shadow-lg transition-all",
        colorClasses[color]
      )}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {action || <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />}
    </div>
  );
}

interface Lead {
  id: number;
  nome: string;
  situacao: string | null;
  data_cadastro: string | null;
}

interface LeadsStats {
  totalLeads: number;
  conversions: number;
  avgResponseTime: string;
  daysActive: number;
}

export default function PerfilPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout, login, sessionId } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [stats, setStats] = useState<LeadsStats>({
    totalLeads: 0,
    conversions: 0,
    avgResponseTime: "-",
    daysActive: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  usePageTracking("perfil")

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user?.nome) {
      setEditName(user.nome)
    }
  }, [user?.nome])

  // Fetch real leads data for stats
  useEffect(() => {
    const fetchLeadsStats = async () => {
      if (!isAuthenticated || !user) return;

      setIsLoadingStats(true);
      try {
        const response = await fetch('/api/leads?limit=200');
        if (response.ok) {
          const result = await response.json();
          const leads: Lead[] = result.data || [];

          // Calculate stats
          const totalLeads = leads.length;

          // Count conversions (situacao contains "vend", "convers", or "fechad")
          const conversions = leads.filter(lead => {
            const situacao = (lead.situacao || '').toLowerCase();
            return situacao.includes('vend') ||
                   situacao.includes('convers') ||
                   situacao.includes('fechad');
          }).length;

          // Calculate days active (from first lead date to now)
          const leadDates = leads
            .map(l => l.data_cadastro ? new Date(l.data_cadastro) : null)
            .filter((d): d is Date => d !== null);

          let daysActive = 0;
          if (leadDates.length > 0) {
            const oldestDate = new Date(Math.min(...leadDates.map(d => d.getTime())));
            const now = new Date();
            daysActive = Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          setStats({
            totalLeads,
            conversions,
            avgResponseTime: "-", // Not calculated from available data
            daysActive: Math.max(0, daysActive)
          });
        }
      } catch (error) {
        console.error('Error fetching leads stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchLeadsStats();
  }, [isAuthenticated, user])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const handleSaveName = async () => {
    if (!editName.trim() || !user?.id) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, nome: editName.trim() }),
      })

      if (response.ok) {
        // Update local user data
        const updatedUser = { ...user, nome: editName.trim() }
        login(updatedUser, sessionId!)
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error updating name:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  const getInitials = (name: string) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  const formatPhone = (phone: string) => {
    if (!phone) return "-"
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 13 && digits.startsWith("55")) {
      const ddd = digits.slice(2, 4)
      const first = digits.slice(4, 9)
      const second = digits.slice(9, 13)
      return `(${ddd}) ${first}-${second}`
    }
    return phone
  }

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; gradient: string; icon: React.ElementType }> = {
      admin: { label: "Administrador", gradient: "from-red-400 to-orange-500", icon: Shield },
      gerente: { label: "Gerente", gradient: "from-blue-400 to-cyan-500", icon: Users },
      corretor: { label: "Corretor", gradient: "from-emerald-400 to-green-500", icon: Target },
    }
    return badges[role] || { label: role, gradient: "from-gray-400 to-gray-500", icon: User }
  }

  const roleBadge = getRoleBadge(user.role || "corretor")
  const RoleIcon = roleBadge.icon

  return (
    <AppShell title="Meu Perfil">
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <AnimatedBackground />

        <div className="relative z-10 container px-4 py-6 max-w-5xl mx-auto">
          {/* Header with animated icon */}
          <div className="mb-8 text-center animate-fadeInDown">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                  <User className="h-10 w-10 text-white" />
                  <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-300 animate-pulse" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              Meu Perfil
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gerencie suas informacoes e configuracoes
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <GlassCard glowColor="emerald" delay={100}>
                <div className="flex flex-col items-center text-center">
                  {/* Avatar with gradient border and glow */}
                  <div className="relative mb-4">
                    <div className={cn(
                      "absolute -inset-3 bg-gradient-to-br rounded-full blur-lg opacity-60 animate-pulse",
                      roleBadge.gradient
                    )} />
                    <div className={cn(
                      "absolute -inset-1 bg-gradient-to-br rounded-full",
                      roleBadge.gradient
                    )} />
                    <Avatar className="relative h-28 w-28 ring-4 ring-white dark:ring-gray-900">
                      <AvatarFallback className={cn(
                        "text-3xl font-bold bg-gradient-to-br text-white",
                        roleBadge.gradient
                      )}>
                        {getInitials(user.nome || "")}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute bottom-1 right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-white dark:border-gray-900 shadow-lg" />
                  </div>

                  {/* Name editing */}
                  {isEditing ? (
                    <div className="w-full space-y-3">
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-50 blur transition-opacity duration-300" />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="relative h-12 text-lg text-center bg-white/80 border-transparent focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl"
                          onClick={handleSaveName}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-12 rounded-xl"
                          onClick={() => { setIsEditing(false); setEditName(user.nome || "") }}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {user.nome || "Usuario"}
                        </h2>
                        <button
                          className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit2 className="h-4 w-4 text-emerald-600" />
                        </button>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {user.role === "gerente" ? "Gerente de Vendas" :
                         user.role === "admin" ? "Administrador" : "Corretor de Imoveis"}
                      </p>
                    </>
                  )}

                  {/* Role badge */}
                  <Badge className={cn(
                    "px-4 py-2 bg-gradient-to-r text-white border-0 shadow-lg text-sm",
                    roleBadge.gradient
                  )}>
                    <RoleIcon className="h-4 w-4 mr-2" />
                    {roleBadge.label}
                  </Badge>
                </div>
              </GlassCard>

              {/* Achievements */}
              <GlassCard glowColor="blue" delay={200}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  Conquistas
                </h3>
                <div className="space-y-3">
                  {stats.totalLeads >= 50 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
                      <Star className="h-6 w-6 text-amber-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Top Corretor</p>
                        <p className="text-xs text-gray-500">Mais de 50 leads cadastrados</p>
                      </div>
                    </div>
                  )}
                  {stats.conversions >= 10 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
                      <Zap className="h-6 w-6 text-emerald-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Fechador</p>
                        <p className="text-xs text-gray-500">{stats.conversions} conversões realizadas</p>
                      </div>
                    </div>
                  )}
                  {stats.totalLeads >= 100 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                      <Award className="h-6 w-6 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Expert</p>
                        <p className="text-xs text-gray-500">100+ leads na base</p>
                      </div>
                    </div>
                  )}
                  {stats.totalLeads === 0 && !isLoadingStats && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Suas conquistas aparecerão aqui conforme você adiciona leads
                    </p>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={Target}
                  label="Leads"
                  value={isLoadingStats ? "-" : stats.totalLeads}
                  color="emerald"
                  delay={150}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Conversoes"
                  value={isLoadingStats ? "-" : stats.conversions}
                  color="blue"
                  delay={200}
                />
                <StatCard
                  icon={Clock}
                  label="Tempo Medio"
                  value={stats.avgResponseTime}
                  color="purple"
                  delay={250}
                />
                <StatCard
                  icon={Calendar}
                  label="Dias Ativos"
                  value={isLoadingStats ? "-" : stats.daysActive}
                  color="orange"
                  delay={300}
                />
              </div>

              {/* Contact Information */}
              <GlassCard glowColor="emerald" delay={350}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-emerald-500" />
                  Informacoes de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Telefone</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{formatPhone(user.telefone || "")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 shadow-lg">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">Conectado</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Funcao</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{roleBadge.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                      <Badge className="mt-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow">
                        Ativo
                      </Badge>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Settings */}
              <GlassCard glowColor="purple" delay={400}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  Preferencias
                </h3>
                <div className="space-y-1">
                  <SettingItem
                    icon={Bell}
                    title="Notificacoes"
                    description="Gerencie alertas e lembretes"
                    color="orange"
                    delay={450}
                  />
                  <SettingItem
                    icon={MessageSquare}
                    title="WhatsApp"
                    description="Configuracoes de integracao"
                    color="emerald"
                    delay={500}
                  />
                  <SettingItem
                    icon={Shield}
                    title="Privacidade"
                    description="Controle seus dados"
                    color="blue"
                    delay={550}
                  />
                </div>
              </GlassCard>

              {/* Recent Activity */}
              <GlassCard glowColor="orange" delay={450}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Atividade Recente
                </h3>
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 mb-4">
                      <Activity className="h-8 w-8 text-orange-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Suas atividades recentes aparecerão aqui
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Logout Button */}
              <div className="animate-fadeInUp" style={{ animationDelay: "500ms" }}>
                <GlowButton
                  variant="danger"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  Sair da Conta
                </GlowButton>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center text-sm text-gray-400 animate-fadeInUp" style={{ animationDelay: "600ms" }}>
            Pratica Incorporadora &copy; {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </AppShell>
  )
}
