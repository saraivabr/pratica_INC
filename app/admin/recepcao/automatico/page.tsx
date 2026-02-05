"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Check,
  Clock,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Target,
  Trash2,
  Users,
  Zap,
  Ban,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Local {
  id: string
  nome: string
  endereco: string | null
}

interface PlantaoRecorrente {
  id: string
  local_id: string
  local_nome: string
  local_endereco: string | null
  nome: string
  dias_semana: number[]
  dias_semana_texto: string[]
  hora_inicio: string
  hora_fim: string
  hora_limite_checkin: string | null
  max_corretores: number | null
  meta_ofertas: number
  descricao: string | null
  is_active: boolean
  total_plantoes_criados: number
  ultimo_plantao_criado: string | null
}

const DIAS_SEMANA = [
  { value: 1, label: "Seg", full: "Segunda" },
  { value: 2, label: "Ter", full: "Terça" },
  { value: 3, label: "Qua", full: "Quarta" },
  { value: 4, label: "Qui", full: "Quinta" },
  { value: 5, label: "Sex", full: "Sexta" },
  { value: 6, label: "Sab", full: "Sábado" },
  { value: 7, label: "Dom", full: "Domingo" },
]

export default function PlantaoAutomaticoPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [locais, setLocais] = useState<Local[]>([])
  const [templates, setTemplates] = useState<PlantaoRecorrente[]>([])

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PlantaoRecorrente | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    local_id: "",
    nome: "",
    dias_semana: [1, 2, 3, 4, 5] as number[],
    hora_inicio: "08:00",
    hora_fim: "17:00",
    hora_limite_checkin: "",
    max_corretores: "",
    meta_ofertas: "30",
    descricao: "",
  })

  // Cron status
  const [cronStatus, setCronStatus] = useState<{
    templates: { ativos: number; total: number }
    hoje: { data: string; plantoes_ativos: number }
  } | null>(null)
  const [executingCron, setExecutingCron] = useState(false)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchData()
      fetchCronStatus()
    }
  }, [hasAccess])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [locaisRes, templatesRes] = await Promise.all([
        fetch("/api/recepcao/locais"),
        fetch("/api/recepcao/plantoes-recorrentes"),
      ])

      const locaisData = await locaisRes.json()
      const templatesData = await templatesRes.json()

      if (locaisData.success) setLocais(locaisData.data)
      if (templatesData.success) setTemplates(templatesData.data)
    } catch (error) {
      toast.error("Erro ao carregar dados")
    }
    setLoading(false)
  }

  const fetchCronStatus = async () => {
    try {
      const res = await fetch("/api/cron/criar-plantoes")
      const data = await res.json()
      if (data.success) {
        setCronStatus(data)
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.local_id || !formData.nome || formData.dias_semana.length === 0) {
      toast.error("Preencha os campos obrigatórios")
      return
    }

    setSaving(true)
    try {
      const payload = {
        local_id: formData.local_id,
        nome: formData.nome,
        dias_semana: formData.dias_semana,
        hora_inicio: formData.hora_inicio,
        hora_fim: formData.hora_fim,
        hora_limite_checkin: formData.hora_limite_checkin || null,
        max_corretores: formData.max_corretores ? parseInt(formData.max_corretores) : null,
        meta_ofertas: parseInt(formData.meta_ofertas) || 30,
        descricao: formData.descricao || null,
      }

      const url = editingTemplate
        ? `/api/recepcao/plantoes-recorrentes/${editingTemplate.id}`
        : "/api/recepcao/plantoes-recorrentes"

      const res = await fetch(url, {
        method: editingTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(editingTemplate ? "Template atualizado" : "Template criado")
        setDialogOpen(false)
        resetForm()
        fetchData()
        fetchCronStatus()
      } else {
        toast.error(data.error || "Erro ao salvar")
      }
    } catch (error) {
      toast.error("Erro ao salvar")
    }
    setSaving(false)
  }

  const handleToggleActive = async (template: PlantaoRecorrente) => {
    try {
      const res = await fetch(`/api/recepcao/plantoes-recorrentes/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !template.is_active }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(template.is_active ? "Template desativado" : "Template ativado")
        fetchData()
        fetchCronStatus()
      } else {
        toast.error(data.error || "Erro ao atualizar")
      }
    } catch (error) {
      toast.error("Erro ao atualizar")
    }
  }

  const handleDelete = async (template: PlantaoRecorrente) => {
    if (!confirm(`Desativar "${template.nome}"? Plantões futuros não serão criados.`)) return

    try {
      const res = await fetch(`/api/recepcao/plantoes-recorrentes/${template.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (data.success) {
        toast.success("Template desativado")
        fetchData()
        fetchCronStatus()
      } else {
        toast.error(data.error || "Erro ao desativar")
      }
    } catch (error) {
      toast.error("Erro ao desativar")
    }
  }

  const handleExecuteCron = async () => {
    setExecutingCron(true)
    try {
      const res = await fetch("/api/cron/criar-plantoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await res.json()

      if (data.success) {
        if (data.criados > 0) {
          toast.success(`${data.criados} plantão(ões) criado(s)!`)
        } else if (data.feriado) {
          toast.info(`Hoje é feriado: ${data.feriado}`)
        } else {
          toast.info(data.message || "Nenhum plantão novo criado")
        }
        fetchCronStatus()
      } else {
        toast.error(data.error || "Erro ao executar")
      }
    } catch (error) {
      toast.error("Erro ao executar")
    }
    setExecutingCron(false)
  }

  const openEditDialog = (template: PlantaoRecorrente) => {
    setEditingTemplate(template)
    setFormData({
      local_id: template.local_id,
      nome: template.nome,
      dias_semana: template.dias_semana,
      hora_inicio: template.hora_inicio.slice(0, 5),
      hora_fim: template.hora_fim.slice(0, 5),
      hora_limite_checkin: template.hora_limite_checkin?.slice(0, 5) || "",
      max_corretores: template.max_corretores?.toString() || "",
      meta_ofertas: template.meta_ofertas.toString(),
      descricao: template.descricao || "",
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingTemplate(null)
    setFormData({
      local_id: "",
      nome: "",
      dias_semana: [1, 2, 3, 4, 5],
      hora_inicio: "08:00",
      hora_fim: "17:00",
      hora_limite_checkin: "",
      max_corretores: "",
      meta_ofertas: "30",
      descricao: "",
    })
  }

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(day)
        ? prev.dias_semana.filter((d) => d !== day)
        : [...prev.dias_semana, day].sort((a, b) => a - b),
    }))
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Plantões Automáticos">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              Plantões Automáticos
            </h1>
            <p className="text-muted-foreground">
              Configure uma vez, plantões criados automaticamente todo dia
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold">
                    {cronStatus?.templates.ativos || 0} templates ativos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cronStatus?.hoje.plantoes_ativos || 0} plantões ativos hoje
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExecuteCron}
                disabled={executingCron}
              >
                {executingCron ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Criar Plantões de Hoje
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-semibold text-lg">Nenhum template configurado</h3>
              <p className="text-muted-foreground mb-4">
                Crie um template para gerar plantões automaticamente
              </p>
              <Button
                onClick={() => {
                  resetForm()
                  setDialogOpen(true)
                }}
              >
                Criar Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "transition-all",
                  !template.is_active && "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Info */}
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-lg flex items-center justify-center",
                          template.is_active
                            ? "bg-emerald-100"
                            : "bg-zinc-100"
                        )}
                      >
                        <MapPin
                          className={cn(
                            "h-6 w-6",
                            template.is_active
                              ? "text-emerald-600"
                              : "text-zinc-400"
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{template.nome}</h3>
                          {!template.is_active && (
                            <Badge variant="secondary">Desativado</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.local_nome}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {template.hora_inicio.slice(0, 5)} - {template.hora_fim.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {template.dias_semana_texto?.join(", ")}
                          </span>
                          {template.max_corretores && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              Max {template.max_corretores}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Target className="h-3.5 w-3.5" />
                            Meta {template.meta_ofertas} ofertas
                          </span>
                        </div>
                        {template.total_plantoes_criados > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {template.total_plantoes_criados} plantões criados
                            {template.ultimo_plantao_criado && (
                              <> • Último: {new Date(template.ultimo_plantao_criado).toLocaleDateString("pt-BR")}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleActive(template)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {template.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(template)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(template)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Desativar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Template" : "Novo Template de Plantão"}
              </DialogTitle>
              <DialogDescription>
                Configure os dias e horários. Plantões serão criados automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do template *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Plantão Manhã, Turno Tarde..."
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nome: e.target.value }))
                  }
                />
              </div>

              {/* Local */}
              <div className="space-y-2">
                <Label>Local *</Label>
                <Select
                  value={formData.local_id}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, local_id: v }))
                  }
                  disabled={!!editingTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locais.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dias da Semana */}
              <div className="space-y-2">
                <Label>Dias da semana *</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((dia) => (
                    <Button
                      key={dia.value}
                      type="button"
                      variant={
                        formData.dias_semana.includes(dia.value)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="w-12"
                      onClick={() => toggleDay(dia.value)}
                    >
                      {dia.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique para selecionar/deselecionar
                </p>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_inicio">Início *</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hora_inicio: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_fim">Fim *</Label>
                  <Input
                    id="hora_fim"
                    type="time"
                    value={formData.hora_fim}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hora_fim: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Limite Check-in */}
              <div className="space-y-2">
                <Label htmlFor="hora_limite_checkin">
                  Limite para check-in (opcional)
                </Label>
                <Input
                  id="hora_limite_checkin"
                  type="time"
                  value={formData.hora_limite_checkin}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hora_limite_checkin: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Ex: 08:45 - corretor só pode entrar até esse horário
                </p>
              </div>

              {/* Config avançada */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_corretores">Máx corretores</Label>
                  <Input
                    id="max_corretores"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Sem limite"
                    value={formData.max_corretores}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_corretores: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_ofertas">Meta de ofertas</Label>
                  <Input
                    id="meta_ofertas"
                    type="number"
                    min="1"
                    max="200"
                    value={formData.meta_ofertas}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        meta_ofertas: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Input
                  id="descricao"
                  placeholder="Observações sobre este plantão..."
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTemplate ? "Salvar" : "Criar Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
