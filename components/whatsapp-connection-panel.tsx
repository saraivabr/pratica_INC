"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import QRCode from "qrcode"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, QrCode, Link2Off, CheckCircle2, AlertTriangle } from "lucide-react"

type SessionStatus = "connecting" | "qr" | "ready" | "disconnected" | "error"

type StatusPayload = {
  status: SessionStatus
  pairedPhone?: string
  deviceName?: string
  lastQr?: string
  error?: string
}

export function WhatsAppConnectionPanel({ title = "WhatsApp" }: { title?: string }) {
  const { user, isLoading } = useAuth()
  const [status, setStatus] = useState<SessionStatus>("disconnected")
  const [pairedPhone, setPairedPhone] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [testTo, setTestTo] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const eventSourceRef = useRef<EventSource | null>(null)

  const statusLabel = useMemo(() => {
    switch (status) {
      case "connecting":
        return "Conectando..."
      case "qr":
        return "Aguardando leitura do QR"
      case "ready":
        return "WhatsApp conectado"
      case "error":
        return "Erro na conexão"
      default:
        return "Desconectado"
    }
  }, [status])

  const statusIcon = useMemo(() => {
    if (status === "ready") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    if (status === "error") return <AlertTriangle className="h-5 w-5 text-destructive" />
    if (status === "qr") return <QrCode className="h-5 w-5 text-primary" />
    return <Link2Off className="h-5 w-5 text-muted-foreground" />
  }, [status])

  const connectStream = (channelId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    const stream = new EventSource(`/api/whatsapp/session/stream?channel=${channelId}`)
    eventSourceRef.current = stream

    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as StatusPayload & { qr?: string }
        if (payload.status) setStatus(payload.status)
        if (payload.pairedPhone !== undefined) setPairedPhone(payload.pairedPhone || null)
        if (payload.deviceName !== undefined) setDeviceName(payload.deviceName || null)
        if (payload.error) setError(payload.error)
        if (payload.qr || payload.lastQr) {
          setQr(payload.qr || payload.lastQr || null)
        }
        if (payload.status === "ready") {
          stream.close()
        }
      } catch (streamError) {
        console.error("SSE parse error", streamError)
      }
    }

    stream.onerror = () => {
      stream.close()
    }
  }

  const fetchStatus = async () => {
    if (!user) return
    try {
      const res = await fetch("/api/whatsapp/session/status")
      const data: StatusPayload = await res.json()
      if (res.ok) {
        setStatus(data.status || "disconnected")
        setPairedPhone(data.pairedPhone || null)
        setDeviceName(data.deviceName || null)
        setQr(data.lastQr || null)
        setError(data.error || null)
      }
    } catch (statusError) {
      console.error("Status error", statusError)
    }
  }

  const handleStart = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/whatsapp/session/start", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao iniciar sessão")
        setStatus("error")
        return
      }
      setStatus(data.status || "connecting")
      setQr(data.qr || null)
      setPairedPhone(data.pairedPhone || null)
      setDeviceName(data.deviceName || null)
      if (data.channelId) {
        connectStream(data.channelId)
      }
    } catch (startError) {
      console.error("Start error", startError)
      setStatus("error")
      setError("Erro ao iniciar sessão")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/whatsapp/session/logout", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao desconectar")
        return
      }
      setStatus("disconnected")
      setPairedPhone(null)
      setDeviceName(null)
      setQr(null)
    } catch (logoutError) {
      console.error("Logout error", logoutError)
      setError("Erro ao desconectar")
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (!testTo.trim() || !testMessage.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/whatsapp/session/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim(), message: testMessage.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao enviar teste")
        return
      }
      setTestMessage("")
    } catch (sendError) {
      console.error("Send error", sendError)
      setError("Erro ao enviar teste")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [user])

  useEffect(() => {
    let active = true
    if (!qr) {
      setQrImage(null)
      return
    }
    QRCode.toDataURL(qr)
      .then((url) => {
        if (active) setQrImage(url)
      })
      .catch(() => {
        if (active) setQrImage(null)
      })
    return () => {
      active = false
    }
  }, [qr])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="space-y-4">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className="flex items-center gap-2 text-lg font-semibold">
                {statusIcon}
                <span>{statusLabel}</span>
              </div>
              {pairedPhone && (
                <p className="text-sm text-muted-foreground">
                  Conectado em {pairedPhone} {deviceName ? `(${deviceName})` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleStart} disabled={loading || isLoading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar QR"}
              </Button>
              <Button variant="outline" onClick={handleLogout} disabled={loading || isLoading}>
                Desconectar
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 flex items-center justify-center min-h-[220px]">
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImage} alt="QR Code WhatsApp" className="h-48 w-48" />
              ) : (
                <div className="text-center text-sm text-muted-foreground space-y-2">
                  <QrCode className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p>Seu QR aparecerá aqui</p>
                </div>
              )}
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                1. Clique em <strong>Gerar QR</strong> para iniciar a conexão.
              </p>
              <p>
                2. No WhatsApp, vá em <strong>Aparelhos conectados</strong> e leia o QR.
              </p>
              <p>
                3. Aguarde a confirmação para começar a usar o envio direto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-4">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm font-semibold">Teste rápido</p>
          <div className="space-y-2">
            <Input
              placeholder="Telefone destino (ex: 5511999999999)"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              disabled={loading || isLoading}
            />
            <Input
              placeholder="Mensagem de teste"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              disabled={loading || isLoading}
            />
            <Button onClick={handleSendTest} disabled={loading || isLoading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar teste"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
