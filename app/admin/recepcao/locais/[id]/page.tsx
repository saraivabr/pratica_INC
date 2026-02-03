"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Building2, Loader2, MapPin, QrCode, RefreshCw, Save } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface Local {
  id: string
  nome: string
  endereco: string | null
  descricao: string | null
  latitude: number | null
  longitude: number | null
  raio_geofence: number
  qr_code_token: string
  is_active: boolean
}

export default function EditLocalPage() {
  const router = useRouter()
  const params = useParams()
  const localId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    descricao: "",
    latitude: "",
    longitude: "",
    raio_geofence: "100",
    is_active: true,
  })
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrData, setQrData] = useState<{
    qr_code_image_url: string
    checkin_url: string
  } | null>(null)
  const [regeneratingQr, setRegeneratingQr] = useState(false)

  useEffect(() => {
    fetchLocal()
  }, [localId])

  const fetchLocal = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/recepcao/locais/${localId}`)
      const result = await response.json()

      if (result.success) {
        const local: Local = result.data
        setForm({
          nome: local.nome,
          endereco: local.endereco || "",
          descricao: local.descricao || "",
          latitude: local.latitude?.toString() || "",
          longitude: local.longitude?.toString() || "",
          raio_geofence: local.raio_geofence.toString(),
          is_active: local.is_active,
        })
      } else {
        toast.error(result.error || "Erro ao carregar local")
        router.push("/admin/recepcao/locais")
      }
    } catch (error) {
      toast.error("Erro ao carregar local")
      router.push("/admin/recepcao/locais")
    }
    setLoading(false)
  }

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
        endereco: form.endereco.trim() || null,
        descricao: form.descricao.trim() || null,
        raio_geofence: parseInt(form.raio_geofence) || 100,
        is_active: form.is_active,
      }

      if (form.latitude && form.longitude) {
        payload.latitude = parseFloat(form.latitude)
        payload.longitude = parseFloat(form.longitude)
      } else {
        payload.latitude = null
        payload.longitude = null
      }

      const response = await fetch(`/api/recepcao/locais/${localId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Local atualizado com sucesso!")
        router.push("/admin/recepcao/locais")
      } else {
        toast.error(result.error || "Erro ao atualizar local")
      }
    } catch (error) {
      toast.error("Erro ao atualizar local")
    }
    setSaving(false)
  }

  const handleShowQr = async () => {
    try {
      const response = await fetch(`/api/recepcao/locais/${localId}/qr-code`)
      const result = await response.json()

      if (result.success) {
        setQrData(result.data)
        setQrDialogOpen(true)
      } else {
        toast.error(result.error || "Erro ao gerar QR Code")
      }
    } catch (error) {
      toast.error("Erro ao gerar QR Code")
    }
  }

  const handleRegenerateQr = async () => {
    setRegeneratingQr(true)
    try {
      const response = await fetch(`/api/recepcao/locais/${localId}/qr-code`, {
        method: "POST",
      })
      const result = await response.json()

      if (result.success) {
        setQrData(result.data)
        toast.success("QR Code regenerado!")
      } else {
        toast.error(result.error || "Erro ao regenerar QR Code")
      }
    } catch (error) {
      toast.error("Erro ao regenerar QR Code")
    }
    setRegeneratingQr(false)
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
      () => {
        toast.error("Erro ao obter localizacao")
      }
    )
  }

  if (loading) {
    return (
      <AppShell title="Carregando...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Editar Local">
      <div className="container px-4 py-6 animate-page-in space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Editar Local</h1>
            <p className="text-muted-foreground">{form.nome}</p>
          </div>
          <Button variant="outline" onClick={handleShowQr}>
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
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

              <div className="flex items-center justify-between">
                <div>
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">Local ativo para plantoes</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* GPS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geolocalizacao
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
              Salvar Alteracoes
            </Button>
          </div>
        </form>

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code - {form.nome}</DialogTitle>
              <DialogDescription>
                Escaneie para fazer check-in
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              {qrData && (
                <>
                  <img
                    src={qrData.qr_code_image_url}
                    alt="QR Code"
                    className="w-64 h-64 border rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground text-center break-all">
                    {qrData.checkin_url}
                  </p>
                </>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerateQr}
                disabled={regeneratingQr}
              >
                {regeneratingQr ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regenerar
              </Button>
              <Button onClick={() => setQrDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
