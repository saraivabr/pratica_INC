"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { AnimatedBackground } from "@/components/animated-background"
import { toast } from "sonner"
import {
  User,
  Bell,
  Smartphone,
  Shield,
  Camera,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  Wifi,
  WifiOff,
  QrCode,
  ChevronRight,
  Moon,
  Sun,
  Volume2,
  MessageSquare,
  Calendar,
  Zap,
} from "lucide-react"
import { useTheme } from "next-themes"

export default function CorretorConfiguracoesPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  usePageTracking("corretor-configuracoes")

  const [whatsappStatus, setWhatsappStatus] = useState<"loading" | "connected" | "disconnected">("loading")
  const [saving, setSaving] = useState(false)

  // Form state
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [creci, setCreci] = useState("")

  // Notification settings
  const [notifyNewLead, setNotifyNewLead] = useState(true)
  const [notifyMessages, setNotifyMessages] = useState(true)
  const [notifyReminders, setNotifyReminders] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Load user data
  useEffect(() => {
    if (user) {
      setNome(user.nome || "")
      setTelefone(user.telefone || "")
      setEmail(user.email || "")
      setCreci(user.creci || "")
    }
  }, [user])

  // Check WhatsApp status
  useEffect(() => {
    const checkWhatsApp = async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        const data = await res.json()
        setWhatsappStatus(data.status === "ready" ? "connected" : "disconnected")
      } catch {
        setWhatsappStatus("disconnected")
      }
    }
    if (isAuthenticated) {
      checkWhatsApp()
    }
  }, [isAuthenticated])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone, creci }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success("Perfil atualizado com sucesso!")
      } else {
        toast.error(data.error || "Erro ao salvar perfil")
      }
    } catch (error) {
      toast.error("Erro ao salvar perfil")
    } finally {
      setSaving(false)
    }
  }

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
    <AppShell title="Configurações">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp max-w-3xl mx-auto">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Gerencie seu perfil e preferências
            </p>
          </div>

          {/* Profile Section */}
          <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-500" />
                Meu Perfil
              </CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xl font-semibold">
                      {user?.nome?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-lg">{user?.nome || "Corretor"}</p>
                  <p className="text-sm text-muted-foreground">Corretor de Imóveis</p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="bg-white/80 dark:bg-zinc-800/80"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white/80 dark:bg-zinc-800/80"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="telefone"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="pl-10 bg-white/80 dark:bg-zinc-800/80"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="creci">CRECI</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="creci"
                      value={creci}
                      onChange={(e) => setCreci(e.target.value)}
                      placeholder="Ex: 123456-F"
                      className="pl-10 bg-white/80 dark:bg-zinc-800/80"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Section */}
          <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                WhatsApp
              </CardTitle>
              <CardDescription>Gerencie sua conexão do WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-800/50">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center",
                    whatsappStatus === "connected"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600"
                      : "bg-gradient-to-br from-gray-400 to-gray-500"
                  )}>
                    {whatsappStatus === "loading" ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : whatsappStatus === "connected" ? (
                      <Wifi className="h-6 w-6 text-white" />
                    ) : (
                      <WifiOff className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {whatsappStatus === "loading"
                        ? "Verificando..."
                        : whatsappStatus === "connected"
                        ? "WhatsApp Conectado"
                        : "WhatsApp Desconectado"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {whatsappStatus === "connected"
                        ? "Pronto para enviar e receber mensagens"
                        : "Conecte para usar o chat integrado"}
                    </p>
                  </div>
                </div>
                <Link href="/onboarding/whatsapp">
                  <Button variant={whatsappStatus === "connected" ? "outline" : "default"} className="gap-2">
                    {whatsappStatus === "connected" ? (
                      <>Reconectar</>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4" />
                        Conectar
                      </>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Notificações
              </CardTitle>
              <CardDescription>Configure suas preferências de notificação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Novos Leads</p>
                    <p className="text-sm text-muted-foreground">Receber alerta quando um novo lead chegar</p>
                  </div>
                </div>
                <Switch checked={notifyNewLead} onCheckedChange={setNotifyNewLead} />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Mensagens</p>
                    <p className="text-sm text-muted-foreground">Notificar novas mensagens do WhatsApp</p>
                  </div>
                </div>
                <Switch checked={notifyMessages} onCheckedChange={setNotifyMessages} />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Lembretes</p>
                    <p className="text-sm text-muted-foreground">Lembretes de atividades agendadas</p>
                  </div>
                </div>
                <Switch checked={notifyReminders} onCheckedChange={setNotifyReminders} />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-cyan-500" />
                  <div>
                    <p className="font-medium">Sons</p>
                    <p className="text-sm text-muted-foreground">Ativar sons de notificação</p>
                  </div>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-yellow-500" />}
                Aparência
              </CardTitle>
              <CardDescription>Personalize a interface do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="font-medium">Modo Escuro</p>
                    <p className="text-sm text-muted-foreground">Alternar entre tema claro e escuro</p>
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
