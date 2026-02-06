"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Phone,
  Mail,
  Loader2,
  ShieldAlert,
  Download,
  UserPlus,
  Building,
  CloudDownload,
  CheckCircle2,
  XCircle,
  Clock,
  BadgeCheck,
  MapPin,
  Briefcase,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Imobiliaria {
  id: string
  nome: string
  cnpj?: string
  telefone?: string
  email?: string
  cidade?: string
  uf?: string
  creci?: string
  cvcrm_id?: number
  synced_at?: string
  is_active: boolean
  total_users?: number
}

interface User {
  id: string
  nome: string
  telefone: string
  email?: string
  role: string
  imobiliaria_id?: string
  imobiliaria_nome?: string
  gerente_id?: string
  gerente_nome?: string
  categoria?: string
  nivel?: string
  time?: string
  creci?: string
  cvcrm_id?: number
  synced_at?: string
  is_active: boolean
}

interface SyncLog {
  id: string
  sync_type: string
  status: string
  started_at: string
  completed_at?: string
  total_items: number
  created: number
  updated: number
  errors: number
}

interface SyncStats {
  total_corretores: number
  corretores_sincronizados: number
  total_imobiliarias: number
  imobiliarias_sincronizadas: number
  corretores_vinculados: number
}

export default function EquipePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState("imobiliarias")

  // Modal states
  const [showImobModal, setShowImobModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showUserDetail, setShowUserDetail] = useState<User | null>(null)
  const [editingImob, setEditingImob] = useState<Imobiliaria | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Form states
  const [imobForm, setImobForm] = useState({ nome: "", cnpj: "", telefone: "", email: "" })
  const [userForm, setUserForm] = useState({ nome: "", telefone: "", role: "corretor", imobiliaria_id: "" })

  // Search
  const [searchUsers, setSearchUsers] = useState("")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchData()
      if (user?.role === "admin") {
        fetchSyncData()
      }
    }
  }, [hasAccess])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [imobRes, usersRes] = await Promise.all([
        fetch("/api/admin/imobiliarias"),
        fetch("/api/admin/users"),
      ])
      const imobData = await imobRes.json()
      const usersData = await usersRes.json()
      setImobiliarias(imobData.imobiliarias || [])
      setUsers(usersData.users || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
    setLoading(false)
  }

  const fetchSyncData = async () => {
    try {
      const res = await fetch("/api/admin/sync/full")
      const data = await res.json()
      setSyncLogs(data.logs || [])
      setSyncStats(data.stats || null)
    } catch (error) {
      console.error("Error fetching sync data:", error)
    }
  }

  const handleFullSync = async () => {
    if (!confirm("Isso irá sincronizar TODOS os dados do CV CRM. Continuar?")) return

    setSyncing(true)
    try {
      const res = await fetch("/api/admin/sync/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.success) {
        const r = data.results
        toast.success(
          `Sincronização completa! Imobiliárias: ${r.imobiliarias.created} criadas, ${r.imobiliarias.updated} atualizadas. Corretores: ${r.corretores.created} criados, ${r.corretores.updated} atualizados, ${r.corretores.linked} vinculados.`
        )
        fetchData()
        fetchSyncData()
      } else {
        toast.error(`Erro: ${data.error}`)
      }
    } catch (error) {
      toast.error("Erro ao sincronizar")
    }
    setSyncing(false)
  }

  const handleSync = async (type: "imobiliarias" | "corretores") => {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Sincronização concluída! Criados: ${data.results.created}, Atualizados: ${data.results.updated}`)
        fetchData()
        fetchSyncData()
      } else {
        toast.error(`Erro: ${data.error}`)
      }
    } catch (error) {
      toast.error("Erro ao sincronizar")
    }
    setSyncing(false)
  }

  const handleSaveImob = async () => {
    try {
      const method = editingImob ? "PUT" : "POST"
      const body = editingImob ? { ...imobForm, id: editingImob.id } : imobForm

      const res = await fetch("/api/admin/imobiliarias", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowImobModal(false)
        setEditingImob(null)
        setImobForm({ nome: "", cnpj: "", telefone: "", email: "" })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Erro ao salvar")
      }
    } catch (error) {
      toast.error("Erro ao salvar")
    }
  }

  const handleSaveUser = async () => {
    try {
      const method = editingUser ? "PUT" : "POST"
      const body = editingUser ? { ...userForm, id: editingUser.id } : userForm

      const res = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowUserModal(false)
        setEditingUser(null)
        setUserForm({ nome: "", telefone: "", role: "corretor", imobiliaria_id: "" })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Erro ao salvar")
      }
    } catch (error) {
      toast.error("Erro ao salvar")
    }
  }

  const handleDeleteImob = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta imobiliária?")) return

    const res = await fetch(`/api/admin/imobiliarias?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      fetchData()
    } else {
      const data = await res.json()
      toast.error(data.error || "Erro ao excluir")
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return

    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      fetchData()
    } else {
      const data = await res.json()
      toast.error(data.error || "Erro ao excluir")
    }
  }

  const openEditImob = (imob: Imobiliaria) => {
    setEditingImob(imob)
    setImobForm({
      nome: imob.nome,
      cnpj: imob.cnpj || "",
      telefone: imob.telefone || "",
      email: imob.email || "",
    })
    setShowImobModal(true)
  }

  const openEditUser = (u: User) => {
    setEditingUser(u)
    setUserForm({
      nome: u.nome,
      telefone: u.telefone,
      role: u.role,
      imobiliaria_id: u.imobiliaria_id || "",
    })
    setShowUserModal(true)
  }

  const filteredUsers = users.filter(u =>
    u.nome.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.telefone.includes(searchUsers) ||
    (u.email && u.email.toLowerCase().includes(searchUsers.toLowerCase())) ||
    (u.imobiliaria_nome && u.imobiliaria_nome.toLowerCase().includes(searchUsers.toLowerCase()))
  )

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Esta área é exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppShell title="Equipe">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Equipe</h1>
            <p className="text-muted-foreground">Gerencie imobiliárias e corretores</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={cn("grid w-full max-w-md", user?.role === "admin" ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="imobiliarias" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Imobiliárias</span>
            </TabsTrigger>
            <TabsTrigger value="corretores" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Corretores</span>
            </TabsTrigger>
            {user?.role === "admin" && (
              <TabsTrigger value="sync" className="gap-2">
                <CloudDownload className="h-4 w-4" />
                <span className="hidden sm:inline">Sync</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Imobiliárias Tab */}
          <TabsContent value="imobiliarias" className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => { setEditingImob(null); setImobForm({ nome: "", cnpj: "", telefone: "", email: "" }); setShowImobModal(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Imobiliária
              </Button>
              {user?.role === "admin" && (
                <Button variant="outline" onClick={() => handleSync("imobiliarias")} disabled={syncing}>
                  <Download className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                  Sync CV CRM
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {imobiliarias.map((imob) => (
                  <Card key={imob.id} className="relative">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        {imob.nome}
                      </CardTitle>
                      {imob.cvcrm_id && (
                        <CardDescription className="flex items-center gap-1">
                          <BadgeCheck className="h-3 w-3 text-green-500" />
                          CV CRM #{imob.cvcrm_id}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {imob.cnpj && (
                        <p className="text-sm text-muted-foreground">CNPJ: {imob.cnpj}</p>
                      )}
                      {imob.telefone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {imob.telefone}
                        </p>
                      )}
                      {imob.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {imob.email}
                        </p>
                      )}
                      {(imob.cidade || imob.uf) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {[imob.cidade, imob.uf].filter(Boolean).join(" - ")}
                        </p>
                      )}
                      {imob.creci && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> CRECI: {imob.creci}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <Badge variant={imob.is_active ? "default" : "secondary"}>
                          {imob.total_users || 0} usuários
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditImob(imob)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user?.role === "admin" && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteImob(imob.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {imobiliarias.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma imobiliária cadastrada</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Corretores Tab */}
          <TabsContent value="corretores" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setEditingUser(null); setUserForm({ nome: "", telefone: "", role: "corretor", imobiliaria_id: "" }); setShowUserModal(true) }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Corretor
              </Button>
              {user?.role === "admin" && (
                <Button variant="outline" onClick={() => handleSync("corretores")} disabled={syncing}>
                  <Download className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                  Sync CV CRM
                </Button>
              )}
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Buscar por nome, telefone, email..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nome</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Telefone</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Imobiliária</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Categoria/Time</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b hover:bg-secondary/30 cursor-pointer" onClick={() => setShowUserDetail(u)}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-primary text-sm font-semibold">
                                    {u.nome[0].toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">{u.nome}</span>
                                  {u.cvcrm_id && (
                                    <span className="ml-2 text-xs text-green-600">
                                      <BadgeCheck className="h-3 w-3 inline" />
                                    </span>
                                  )}
                                  {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{u.telefone}</td>
                            <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                              {u.imobiliaria_nome || "-"}
                            </td>
                            <td className="py-3 px-4 hidden lg:table-cell">
                              <div className="flex flex-col gap-1">
                                {u.categoria && <Badge variant="outline" className="text-xs">{u.categoria}</Badge>}
                                {u.time && <span className="text-xs text-muted-foreground">{u.time}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={u.is_active ? "default" : "secondary"}>
                                {u.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditUser(u)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user?.role === "admin" && u.id !== user.id && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-muted-foreground">
                              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>{searchUsers ? "Nenhum resultado encontrado" : "Nenhum usuário cadastrado"}</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            <p className="text-sm text-muted-foreground">
              Total: {filteredUsers.length} {filteredUsers.length !== users.length && `de ${users.length}`} usuários
            </p>
          </TabsContent>

          {/* Sync Tab (Admin only) */}
          {user?.role === "admin" && (
            <TabsContent value="sync" className="space-y-6">
              {/* Stats Cards */}
              {syncStats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Imobiliárias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{syncStats.total_imobiliarias}</div>
                      <p className="text-xs text-muted-foreground">
                        {syncStats.imobiliarias_sincronizadas} sincronizadas do CV CRM
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Corretores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{syncStats.total_corretores}</div>
                      <p className="text-xs text-muted-foreground">
                        {syncStats.corretores_sincronizados} sincronizados do CV CRM
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Corretores Vinculados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{syncStats.corretores_vinculados}</div>
                      <p className="text-xs text-muted-foreground">
                        {((syncStats.corretores_vinculados / syncStats.total_corretores) * 100).toFixed(0)}% do total
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Ação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={handleFullSync} disabled={syncing} className="w-full">
                        {syncing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <CloudDownload className="h-4 w-4 mr-2" />
                            Sync Completo
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Sync History */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Sincronizações</CardTitle>
                  <CardDescription>Últimas sincronizações realizadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {syncLogs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhuma sincronização realizada</p>
                  ) : (
                    <div className="space-y-4">
                      {syncLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                          <div className="flex items-center gap-3">
                            {log.status === "completed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            {log.status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
                            {log.status === "running" && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                            <div>
                              <p className="font-medium capitalize">{log.sync_type}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(log.started_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex gap-2 text-sm">
                              {log.created > 0 && <Badge variant="outline" className="text-green-600">+{log.created}</Badge>}
                              {log.updated > 0 && <Badge variant="outline" className="text-blue-600">~{log.updated}</Badge>}
                              {log.errors > 0 && <Badge variant="destructive">{log.errors} erros</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.total_items} itens processados
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Modal Imobiliária */}
        <Dialog open={showImobModal} onOpenChange={setShowImobModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingImob ? "Editar Imobiliária" : "Nova Imobiliária"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={imobForm.nome}
                  onChange={(e) => setImobForm({ ...imobForm, nome: e.target.value })}
                  placeholder="Nome da imobiliária"
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={imobForm.cnpj}
                  onChange={(e) => setImobForm({ ...imobForm, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={imobForm.telefone}
                  onChange={(e) => setImobForm({ ...imobForm, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={imobForm.email}
                  onChange={(e) => setImobForm({ ...imobForm, email: e.target.value })}
                  placeholder="contato@imobiliaria.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImobModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveImob}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Usuário */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={userForm.nome}
                  onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={userForm.telefone}
                  onChange={(e) => setUserForm({ ...userForm, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label>Imobiliária</Label>
                <Select
                  value={userForm.imobiliaria_id}
                  onValueChange={(v) => setUserForm({ ...userForm, imobiliaria_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma imobiliária" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {imobiliarias.map((imob) => (
                      <SelectItem key={imob.id} value={imob.id}>{imob.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {user?.role === "admin" && (
                <div>
                  <Label>Cargo</Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(v) => setUserForm({ ...userForm, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corretor">Corretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveUser}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Detalhes do Usuário */}
        <Dialog open={!!showUserDetail} onOpenChange={() => setShowUserDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-lg font-semibold">
                    {showUserDetail?.nome[0].toUpperCase()}
                  </span>
                </div>
                {showUserDetail?.nome}
                {showUserDetail?.cvcrm_id && (
                  <Badge variant="outline" className="ml-2 text-green-600">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    CV CRM
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {showUserDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{showUserDetail.telefone}</p>
                  </div>
                  {showUserDetail.email && (
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{showUserDetail.email}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Cargo</Label>
                    <p className="font-medium capitalize">{showUserDetail.role}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Imobiliária</Label>
                    <p className="font-medium">{showUserDetail.imobiliaria_nome || "-"}</p>
                  </div>
                  {showUserDetail.categoria && (
                    <div>
                      <Label className="text-muted-foreground">Categoria</Label>
                      <p className="font-medium">{showUserDetail.categoria}</p>
                    </div>
                  )}
                  {showUserDetail.nivel && (
                    <div>
                      <Label className="text-muted-foreground">Nível</Label>
                      <p className="font-medium">{showUserDetail.nivel}</p>
                    </div>
                  )}
                  {showUserDetail.time && (
                    <div>
                      <Label className="text-muted-foreground">Time</Label>
                      <p className="font-medium">{showUserDetail.time}</p>
                    </div>
                  )}
                  {showUserDetail.creci && (
                    <div>
                      <Label className="text-muted-foreground">CRECI</Label>
                      <p className="font-medium">{showUserDetail.creci}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <Badge variant={showUserDetail.is_active ? "default" : "secondary"}>
                    {showUserDetail.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  {showUserDetail.synced_at && (
                    <p className="text-xs text-muted-foreground">
                      Sincronizado em {new Date(showUserDetail.synced_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserDetail(null)}>Fechar</Button>
              <Button onClick={() => { openEditUser(showUserDetail!); setShowUserDetail(null) }}>Editar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
