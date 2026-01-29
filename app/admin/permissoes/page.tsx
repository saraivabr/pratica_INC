"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Users,
  ChevronDown,
  Check,
  X,
  RotateCcw,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Feature {
  feature_slug: string
  feature_nome: string
  feature_icone?: string
  rota_base?: string
  enabled: boolean
  is_override: boolean
}

interface UserWithPermissions {
  id: string
  telefone: string
  nome: string
  hierarquia_id: number
  hierarquia_slug: string
  hierarquia_nome: string
  hierarquia_nivel: number
  imobiliaria_id?: string
  imobiliaria_nome?: string
  features: Feature[]
}

interface Hierarquia {
  id: number
  slug: string
  nome: string
  nivel: number
  descricao?: string
  features: {
    feature_id: number
    feature_slug: string
    feature_nome: string
    enabled: boolean
  }[]
}

interface FeatureInfo {
  id: number
  slug: string
  nome: string
  descricao?: string
  icone?: string
  rota_base?: string
}

const hierarquiaColors: Record<string, string> = {
  master: "bg-purple-100 text-purple-700 border-purple-200",
  diretor: "bg-blue-100 text-blue-700 border-blue-200",
  gerente: "bg-emerald-100 text-emerald-700 border-emerald-200",
  parcerias: "bg-amber-100 text-amber-700 border-amber-200",
  corretor: "bg-zinc-100 text-zinc-700 border-zinc-200",
  assistente: "bg-slate-100 text-slate-600 border-slate-200",
}

export default function PermissoesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [hierarquias, setHierarquias] = useState<Hierarquia[]>([])
  const [features, setFeatures] = useState<FeatureInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedHierarquia, setSelectedHierarquia] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"usuarios" | "niveis">("usuarios")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const [usersRes, hierarquiasRes] = await Promise.all([
        fetch("/api/admin/permissoes"),
        fetch("/api/admin/hierarquias"),
      ])

      if (!usersRes.ok || !hierarquiasRes.ok) {
        throw new Error("Erro ao carregar dados")
      }

      const [usersData, hierarquiasData] = await Promise.all([
        usersRes.json(),
        hierarquiasRes.json(),
      ])

      setUsers(usersData.users || [])
      setHierarquias(hierarquiasData.hierarquias || [])
      setFeatures(hierarquiasData.features || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Erro ao carregar permissões")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchData()
    }
  }, [isAuthenticated, authLoading, fetchData])

  const handleToggleUserFeature = async (
    userId: string,
    featureSlug: string,
    currentEnabled: boolean,
    isOverride: boolean
  ) => {
    const feature = features.find((f) => f.slug === featureSlug)
    if (!feature) return

    setSaving(`${userId}-${featureSlug}`)

    try {
      const res = await fetch("/api/admin/permissoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_user_feature",
          targetUserId: userId,
          featureId: feature.id,
          enabled: !currentEnabled,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao atualizar permissão")
      }

      // Atualiza localmente
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                features: u.features.map((f) =>
                  f.feature_slug === featureSlug
                    ? { ...f, enabled: !currentEnabled, is_override: true }
                    : f
                ),
              }
            : u
        )
      )

      toast.success("Permissão atualizada")
    } catch (error) {
      console.error("Error updating permission:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar")
    } finally {
      setSaving(null)
    }
  }

  const handleResetUserFeature = async (userId: string, featureSlug: string) => {
    const feature = features.find((f) => f.slug === featureSlug)
    if (!feature) return

    setSaving(`${userId}-${featureSlug}`)

    try {
      const res = await fetch("/api/admin/permissoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_user_feature",
          targetUserId: userId,
          featureId: feature.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao resetar permissão")
      }

      // Recarrega para pegar o valor do nível
      await fetchData()
      toast.success("Permissão resetada para padrão do nível")
    } catch (error) {
      console.error("Error resetting permission:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao resetar")
    } finally {
      setSaving(null)
    }
  }

  const handleChangeUserHierarquia = async (userId: string, hierarquiaId: number) => {
    setSaving(`hierarquia-${userId}`)

    try {
      const res = await fetch("/api/admin/permissoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_user_hierarquia",
          targetUserId: userId,
          hierarquiaId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao atualizar hierarquia")
      }

      // Recarrega para pegar as novas features
      await fetchData()
      toast.success("Hierarquia atualizada")
    } catch (error) {
      console.error("Error updating hierarquia:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar")
    } finally {
      setSaving(null)
    }
  }

  const handleToggleHierarquiaFeature = async (
    hierarquiaId: number,
    featureId: number,
    currentEnabled: boolean
  ) => {
    setSaving(`hierarquia-${hierarquiaId}-${featureId}`)

    try {
      const res = await fetch("/api/admin/permissoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_hierarquia_feature",
          hierarquiaId,
          featureId,
          enabled: !currentEnabled,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao atualizar permissão do nível")
      }

      // Atualiza localmente
      setHierarquias((prev) =>
        prev.map((h) =>
          h.id === hierarquiaId
            ? {
                ...h,
                features: h.features.map((f) =>
                  f.feature_id === featureId ? { ...f, enabled: !currentEnabled } : f
                ),
              }
            : h
        )
      )

      toast.success("Permissão do nível atualizada")
    } catch (error) {
      console.error("Error updating hierarquia feature:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar")
    } finally {
      setSaving(null)
    }
  }

  // Filtra usuários
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.telefone.includes(searchTerm)
    const matchesHierarquia =
      selectedHierarquia === "all" || u.hierarquia_id.toString() === selectedHierarquia
    return matchesSearch && matchesHierarquia
  })

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  // Verifica se usuário é master
  const isMaster = user?.hierarquia?.slug === "master"

  if (!isMaster) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas o Master pode acessar as configurações de permissões.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Permissões</h1>
            <p className="text-muted-foreground">
              Gerencie hierarquias e features dos usuários
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="usuarios" className="gap-2">
              <Users className="h-4 w-4" />
              Por Usuário
            </TabsTrigger>
            <TabsTrigger value="niveis" className="gap-2">
              <Shield className="h-4 w-4" />
              Por Nível
            </TabsTrigger>
          </TabsList>

          {/* Tab: Por Usuário */}
          <TabsContent value="usuarios" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou telefone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedHierarquia} onValueChange={setSelectedHierarquia}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os níveis</SelectItem>
                      {hierarquias.map((h) => (
                        <SelectItem key={h.id} value={h.id.toString()}>
                          {h.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Usuários */}
            <Card>
              <CardHeader>
                <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
                <CardDescription>
                  Clique nos toggles para alterar permissões individuais. ● indica override do
                  padrão.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Usuário</TableHead>
                        <TableHead className="min-w-[150px]">Nível</TableHead>
                        {features.map((f) => (
                          <TableHead key={f.slug} className="text-center min-w-[100px]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>{f.nome}</TooltipTrigger>
                                <TooltipContent>
                                  <p>{f.descricao || f.nome}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{u.nome}</p>
                              <p className="text-sm text-muted-foreground">{u.telefone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.hierarquia_id.toString()}
                              onValueChange={(v) => handleChangeUserHierarquia(u.id, parseInt(v))}
                              disabled={
                                saving === `hierarquia-${u.id}` || u.hierarquia_slug === "master"
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-[140px]",
                                  hierarquiaColors[u.hierarquia_slug]
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {hierarquias
                                  .filter((h) => h.slug !== "master")
                                  .map((h) => (
                                    <SelectItem key={h.id} value={h.id.toString()}>
                                      {h.nome}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {features.map((f) => {
                            const userFeature = u.features.find(
                              (uf) => uf.feature_slug === f.slug
                            )
                            const enabled = userFeature?.enabled ?? false
                            const isOverride = userFeature?.is_override ?? false
                            const isSaving = saving === `${u.id}-${f.slug}`

                            return (
                              <TableCell key={f.slug} className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="relative">
                                          <Switch
                                            checked={enabled}
                                            onCheckedChange={() =>
                                              handleToggleUserFeature(
                                                u.id,
                                                f.slug,
                                                enabled,
                                                isOverride
                                              )
                                            }
                                            disabled={isSaving || u.hierarquia_slug === "master"}
                                          />
                                          {isOverride && (
                                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {isOverride
                                          ? "Override individual (diferente do padrão)"
                                          : "Usando padrão do nível"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  {isOverride && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleResetUserFeature(u.id, f.slug)}
                                            disabled={isSaving}
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Resetar para padrão do nível</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Por Nível */}
          <TabsContent value="niveis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hierarquias.map((h) => (
                <Card key={h.id} className={h.slug === "master" ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className={hierarquiaColors[h.slug]}>{h.nome}</Badge>
                      <span className="text-sm text-muted-foreground">Nível {h.nivel}</span>
                    </div>
                    {h.descricao && (
                      <CardDescription className="mt-2">{h.descricao}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {h.features.map((f) => {
                        const isSaving = saving === `hierarquia-${h.id}-${f.feature_id}`
                        const isMasterLevel = h.slug === "master"

                        return (
                          <div
                            key={f.feature_id}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{f.feature_nome}</span>
                            <Switch
                              checked={f.enabled}
                              onCheckedChange={() =>
                                handleToggleHierarquiaFeature(h.id, f.feature_id, f.enabled)
                              }
                              disabled={isSaving || isMasterLevel}
                            />
                          </div>
                        )
                      })}
                    </div>
                    {h.slug === "master" && (
                      <p className="text-xs text-muted-foreground mt-4">
                        O nível Master tem acesso total e não pode ser alterado.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Legenda */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Switch checked disabled className="scale-75" />
                </div>
                <span>Liberado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Switch checked={false} disabled className="scale-75" />
                </div>
                <span>Bloqueado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Switch checked disabled className="scale-75" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <span>Override individual (diferente do padrão do nível)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
