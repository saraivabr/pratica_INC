"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, Save, Users } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { format } from "date-fns"

interface Local {
  id: string
  nome: string
  endereco: string | null
}

export default function NovoPlantaoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [locais, setLocais] = useState<Local[]>([])
  const [loadingLocais, setLoadingLocais] = useState(true)
  const [form, setForm] = useState({
    local_id: "",
    data: format(new Date(), "yyyy-MM-dd"),
    hora_inicio: "09:00",
    hora_fim: "18:00",
    max_corretores: "",
    descricao: "",
  })

  useEffect(() => {
    fetchLocais()
  }, [])

  const fetchLocais = async () => {
    setLoadingLocais(true)
    try {
      const response = await fetch("/api/recepcao/locais")
      const result = await response.json()

      if (result.success) {
        setLocais(result.data)
        if (result.data.length > 0) {
          setForm({ ...form, local_id: result.data[0].id })
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar locais")
    }
    setLoadingLocais(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.local_id) {
      toast.error("Selecione um local")
      return
    }

    if (!form.data) {
      toast.error("Informe a data")
      return
    }

    if (form.hora_fim <= form.hora_inicio) {
      toast.error("Hora fim deve ser maior que hora inicio")
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        local_id: form.local_id,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        descricao: form.descricao.trim() || undefined,
      }

      if (form.max_corretores) {
        payload.max_corretores = parseInt(form.max_corretores)
      }

      const response = await fetch("/api/recepcao/plantoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Plantao criado com sucesso!")
        router.push("/admin/recepcao/plantoes")
      } else {
        toast.error(result.error || "Erro ao criar plantao")
      }
    } catch (error) {
      toast.error("Erro ao criar plantao")
    }
    setSaving(false)
  }

  if (loadingLocais) {
    return (
      <AppShell title="Carregando...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  if (locais.length === 0) {
    return (
      <AppShell title="Novo Plantao">
        <div className="container px-4 py-6 animate-page-in space-y-6 max-w-2xl">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Novo Plantao</h1>
            </div>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-semibold text-lg">Nenhum local cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre um local antes de criar um plantao
              </p>
              <Button onClick={() => router.push("/admin/recepcao/locais/novo")}>
                Criar Local
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Novo Plantao">
      <div className="container px-4 py-6 animate-page-in space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Plantao</h1>
            <p className="text-muted-foreground">
              Agendar turno de atendimento
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Local */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Local
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="local_id">Selecione o local *</Label>
                <Select
                  value={form.local_id}
                  onValueChange={(value) => setForm({ ...form, local_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locais.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        <div className="flex flex-col">
                          <span>{local.nome}</span>
                          {local.endereco && (
                            <span className="text-xs text-muted-foreground">{local.endereco}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data e Horario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Data e Horario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_inicio">Hora Inicio *</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_fim">Hora Fim *</Label>
                  <Input
                    id="hora_fim"
                    type="time"
                    value={form.hora_fim}
                    onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuracoes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Configuracoes
              </CardTitle>
              <CardDescription>
                Opcoes adicionais do plantao
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max_corretores">Maximo de Corretores (opcional)</Label>
                <Input
                  id="max_corretores"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Ilimitado"
                  value={form.max_corretores}
                  onChange={(e) => setForm({ ...form, max_corretores: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para permitir qualquer quantidade
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descricao (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Informacoes adicionais sobre o plantao..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Criar Plantao
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
