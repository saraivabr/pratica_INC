"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Loader2, MapPin, Save } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function NovoLocalPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    descricao: "",
    latitude: "",
    longitude: "",
    raio_geofence: "100",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.nome.trim()) {
      toast.error("Nome e obrigatorio")
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        nome: form.nome.trim(),
        endereco: form.endereco.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        raio_geofence: parseInt(form.raio_geofence) || 100,
      }

      if (form.latitude && form.longitude) {
        payload.latitude = parseFloat(form.latitude)
        payload.longitude = parseFloat(form.longitude)
      }

      const response = await fetch("/api/recepcao/locais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Local criado com sucesso!")
        router.push("/admin/recepcao/locais")
      } else {
        toast.error(result.error || "Erro ao criar local")
      }
    } catch (error) {
      toast.error("Erro ao criar local")
    }
    setSaving(false)
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalizacao nao suportada pelo navegador")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm({
          ...form,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8),
        })
        toast.success("Localizacao obtida!")
      },
      (error) => {
        toast.error("Erro ao obter localizacao")
      }
    )
  }

  return (
    <AppShell title="Novo Local">
      <div className="container px-4 py-6 animate-page-in space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Local</h1>
            <p className="text-muted-foreground">
              Cadastrar stand ou ponto de atendimento
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Basicos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados do Local
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Stand Shopping Center"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereco</Label>
                <Input
                  id="endereco"
                  placeholder="Ex: Av. Brasil, 1000 - Centro"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descricao</Label>
                <Textarea
                  id="descricao"
                  placeholder="Informacoes adicionais sobre o local..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* GPS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geolocalizacao (Opcional)
              </CardTitle>
              <CardDescription>
                Configure para permitir check-in por GPS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="-23.550520"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="-46.633308"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="raio_geofence">Raio de Check-in (metros)</Label>
                  <Input
                    id="raio_geofence"
                    type="number"
                    min="10"
                    max="1000"
                    value={form.raio_geofence}
                    onChange={(e) => setForm({ ...form, raio_geofence: e.target.value })}
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleGetLocation}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Usar Minha Localizacao
                </Button>
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
              Salvar Local
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
