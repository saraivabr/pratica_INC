"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  UserPlus,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Crown,
  ChevronDown,
  ChevronRight,
  UserMinus,
  Search,
  Check,
  X,
  Shield,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface Gerente {
  id: string
  nome: string
  email: string
  telefone: string
  avatar_url?: string
  is_active: boolean
  imobiliaria_id?: string
  imobiliaria_nome?: string
  total_corretores: number
  total_leads: number
}

interface Corretor {
  id: string
  nome: string
  email?: string
  telefone: string
  avatar_url?: string
  is_active: boolean
  imobiliaria_id?: string
  imobiliaria_nome?: string
  gerente_id?: string
  gerente_nome?: string
  role: string
  total_leads?: number
  leads_novos?: number
}

export default function GerentesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [gerentes, setGerentes] = useState<Gerente[]>([])
  const [allUsers, setAllUsers] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGerente, setExpandedGerente] = useState<string | null>(null)
  const [equipeData, setEquipeData] = useState<Record<string, Corretor[]>>({})
  const [loadingEquipe, setLoadingEquipe] = useState<string | null>(null)

  // Modal de atribuição
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignGerenteId, setAssignGerenteId] = useState<string>("")
  const [searchCorretor, setSearchCorretor] = useState("")
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Modal promover
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [searchPromote, setSearchPromote] = useState("")

  const hasAccess = user?.role === "admin"

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const fetchGerentes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users/gerentes")
      const data = await res.json()
      if (data.success) {
        setGerentes(data.gerentes || [])
      }
    } catch (error) {
      console.error("Error fetching gerentes:", error)
    }
  }, [])

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      setAllUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchGerentes(), fetchAllUsers()])
    setLoading(false)
  }, [fetchGerentes, fetchAllUsers])

  useEffect(() => {
    if (hasAccess) {
      fetchData()
    }
  }, [hasAccess, fetchData])

  const fetchEquipe = async (gerenteId: string) => {
    setLoadingEquipe(gerenteId)
    try {
      const res = await fetch(`/api/admin/users/equipe?gerente_id=${gerenteId}`)
      const data = await res.json()
      if (data.success) {
        setEquipeData((prev) => ({ ...prev, [gerenteId]: data.corretores || [] }))
      }
    } catch (error) {
      console.error("Error fetching equipe:", error)
    }
    setLoadingEquipe(null)
  }

  const toggleExpand = (gerenteId: string) => {
    if (expandedGerente === gerenteId) {
      setExpandedGerente(null)
    } else {
      setExpandedGerente(gerenteId)
      if (!equipeData[gerenteId]) {
        fetchEquipe(gerenteId)
      }
    }
  }

  const openAssignModal = (gerenteId: string) => {
    setAssignGerenteId(gerenteId)
    setSelectedCorretores([])
    setSearchCorretor("")
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (selectedCorretores.length === 0) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users/assign-gerente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gerente_id: assignGerenteId,
          corretor_ids: selectedCorretores,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowAssignModal(false)
        // Refresh data
        await fetchData()
        // Refresh equipe if expanded
        if (expandedGerente === assignGerenteId) {
          await fetchEquipe(assignGerenteId)
        }
      } else {
        alert(data.error || "Erro ao atribuir")
      }
    } catch (error) {
      alert("Erro ao atribuir corretores")
    }
    setSaving(false)
  }

  const handleRemoveFromTeam = async (corretorId: string, gerenteId: string) => {
    if (!confirm("Remover corretor da equipe?")) return
    try {
      const res = await fetch("/api/admin/users/assign-gerente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gerente_id: null,
          corretor_ids: [corretorId],
        }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchData()
        await fetchEquipe(gerenteId)
      }
    } catch (error) {
      alert("Erro ao remover")
    }
  }

  const handlePromote = async (userId: string) => {
    if (!confirm("Promover este corretor a gerente?")) return
    try {
      const res = await fetch("/api/admin/users/promote-gerente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (data.success) {
        setShowPromoteModal(false)
        await fetchData()
      } else {
        alert(data.error || "Erro ao promover")
      }
    } catch (error) {
      alert("Erro ao promover")
    }
  }

  const handleDemote = async (userId: string) => {
    if (!confirm("Rebaixar este gerente para corretor? Os corretores da equipe ficarão sem gerente.")) return
    try {
      const res = await fetch("/api/admin/users/promote-gerente", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchData()
        setExpandedGerente(null)
      } else {
        alert(data.error || "Erro ao rebaixar")
      }
    } catch (error) {
      alert("Erro ao rebaixar")
    }
  }

  // Corretores sem gerente (para modal de atribuição)
  const unassignedCorretores = allUsers.filter(
    (u) => u.role === "corretor" && !u.gerente_id
  )

  const filteredUnassigned = unassignedCorretores.filter((u) =>
    u.nome?.toLowerCase().includes(searchCorretor.toLowerCase()) ||
    u.telefone?.includes(searchCorretor) ||
    u.email?.toLowerCase().includes(searchCorretor.toLowerCase())
  )

  // Corretores para promover
  const promotableUsers = allUsers.filter(
    (u) => u.role === "corretor"
  )
  const filteredPromotable = promotableUsers.filter((u) =>
    u.nome?.toLowerCase().includes(searchPromote.toLowerCase()) ||
    u.telefone?.includes(searchPromote)
  )

  // Corretores sem gerente count
  const semGerente = allUsers.filter((u) => u.role === "corretor" && !u.gerente_id).length
  const totalCorretores = allUsers.filter((u) => u.role === "corretor").length

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">Apenas administradores podem acessar esta página.</p>
            <Button onClick={() => router.push("/")}>Voltar</Button>
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
    <AppShell title="Gerentes & Equipes">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-500" />
              Gerentes & Equipes
            </h1>
            <p className="text-muted-foreground">
              Gerencie gerentes e suas equipes de corretores
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => { setSearchPromote(""); setShowPromoteModal(true) }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Gerente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Gerentes</p>
              <p className="text-2xl font-bold">{gerentes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Corretores</p>
              <p className="text-2xl font-bold">{totalCorretores}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Com Gerente</p>
              <p className="text-2xl font-bold text-green-600">{totalCorretores - semGerente}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Sem Gerente</p>
              <p className="text-2xl font-bold text-amber-600">{semGerente}</p>
            </CardContent>
          </Card>
        </div>

        {/* Gerentes List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : gerentes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum gerente cadastrado</p>
              <p className="text-muted-foreground mb-4">Promova um corretor para começar a organizar as equipes.</p>
              <Button onClick={() => { setSearchPromote(""); setShowPromoteModal(true) }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Promover Corretor a Gerente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {gerentes.map((gerente) => (
              <Card key={gerente.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => toggleExpand(gerente.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Crown className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{gerente.nome}</CardTitle>
                        <CardDescription>
                          {gerente.telefone} {gerente.imobiliaria_nome && `• ${gerente.imobiliaria_nome}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <Badge variant="outline" className="mr-2">
                          <Users className="h-3 w-3 mr-1" />
                          {gerente.total_corretores} corretores
                        </Badge>
                        <Badge variant="secondary">
                          {gerente.total_leads} leads
                        </Badge>
                      </div>
                      {expandedGerente === gerente.id ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {expandedGerente === gerente.id && (
                  <CardContent className="border-t">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button size="sm" variant="outline" onClick={() => openAssignModal(gerente.id)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Corretores
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDemote(gerente.id)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Rebaixar para Corretor
                      </Button>
                    </div>

                    {loadingEquipe === gerente.id ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : equipeData[gerente.id]?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum corretor na equipe</p>
                        <Button
                          size="sm"
                          variant="link"
                          onClick={() => openAssignModal(gerente.id)}
                        >
                          Adicionar corretores →
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {equipeData[gerente.id]?.map((corretor) => (
                          <div
                            key={corretor.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-secondary/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary text-sm font-semibold">
                                  {corretor.nome?.[0]?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{corretor.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {corretor.telefone}
                                  {corretor.imobiliaria_nome && ` • ${corretor.imobiliaria_nome}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {corretor.total_leads || 0} leads
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveFromTeam(corretor.id, gerente.id)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Corretores sem gerente */}
        {semGerente > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Corretores sem Gerente ({semGerente})
              </CardTitle>
              <CardDescription>
                Estes corretores não estão vinculados a nenhum gerente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {unassignedCorretores.slice(0, 20).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-background/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold">
                          {u.nome?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <span>{u.nome}</span>
                      <span className="text-muted-foreground text-xs">{u.telefone}</span>
                    </div>
                  </div>
                ))}
                {semGerente > 20 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    ... e mais {semGerente - 20} corretores
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal: Atribuir Corretores */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Adicionar Corretores à Equipe</DialogTitle>
              <DialogDescription>
                Selecione os corretores para adicionar ao gerente{" "}
                <strong>{gerentes.find((g) => g.id === assignGerenteId)?.nome}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar corretor..."
                value={searchCorretor}
                onChange={(e) => setSearchCorretor(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedCorretores.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCorretores.map((id) => {
                  const u = allUsers.find((u) => u.id === id)
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => setSelectedCorretores((prev) => prev.filter((i) => i !== id))}
                    >
                      {u?.nome || id}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  )
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-1">
              {filteredUnassigned.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchCorretor ? "Nenhum corretor encontrado" : "Todos os corretores já estão em equipes"}
                </p>
              ) : (
                filteredUnassigned.map((u) => {
                  const isSelected = selectedCorretores.includes(u.id)
                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                        isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-secondary/30"
                      )}
                      onClick={() => {
                        setSelectedCorretores((prev) =>
                          isSelected ? prev.filter((i) => i !== u.id) : [...prev, u.id]
                        )
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="text-sm font-semibold">{u.nome?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.telefone}
                            {u.imobiliaria_nome && ` • ${u.imobiliaria_nome}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAssign}
                disabled={selectedCorretores.length === 0 || saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Adicionar {selectedCorretores.length > 0 ? `(${selectedCorretores.length})` : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Promover a Gerente */}
        <Dialog open={showPromoteModal} onOpenChange={setShowPromoteModal}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Promover a Gerente</DialogTitle>
              <DialogDescription>
                Selecione um corretor para promover ao cargo de gerente
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar corretor..."
                value={searchPromote}
                onChange={(e) => setSearchPromote(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-1">
              {filteredPromotable.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum corretor encontrado
                </p>
              ) : (
                filteredPromotable.slice(0, 50).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-semibold">{u.nome?.[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.telefone}
                          {u.imobiliaria_nome && ` • ${u.imobiliaria_nome}`}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handlePromote(u.id)}>
                      <Crown className="h-4 w-4 mr-1" />
                      Promover
                    </Button>
                  </div>
                ))
              )}
              {filteredPromotable.length > 50 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Refine a busca para ver mais resultados
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPromoteModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
