"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { GlowButton } from "@/components/ui/glow-button"
import { cn } from "@/lib/utils"
import {
  Loader2,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  RefreshCcw,
  Bot,
  Brain,
  Zap,
  WifiOff,
} from "lucide-react"

type SessionStatus = "connecting" | "qr" | "pairing" | "ready" | "disconnected" | "error"

type StatusPayload = {
  status: SessionStatus
  pairedPhone?: string
  deviceName?: string
  lastQr?: string
  error?: string
  qr?: string
}

interface WhatsAppConnectProps {
  onConnected?: () => void
}

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isActive = step === currentStep
  const isCompleted = step < currentStep

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
          isCompleted
            ? "bg-gradient-to-br from-emerald-500 to-green-500"
            : isActive
            ? "bg-gradient-to-br from-emerald-500 to-green-500 animate-pulse"
            : "bg-gray-200 dark:bg-gray-700"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-white" />
        ) : (
          <span className={cn("font-bold text-sm", isActive ? "text-white" : "text-gray-500")}>{step}</span>
        )}
      </div>
      <span
        className={cn(
          "text-xs font-medium text-center max-w-[80px]",
          isActive || isCompleted ? "text-emerald-600" : "text-gray-400"
        )}
      >
        {label}
      </span>
    </div>
  )
}

export function WhatsAppConnect({ onConnected }: WhatsAppConnectProps) {
  const { user } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [status, setStatus] = useState<SessionStatus>("disconnected")
  const [pairedPhone, setPairedPhone] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        const data: StatusPayload = await res.json()

        if (data.status) setStatus(data.status)
        if (data.pairedPhone !== undefined) setPairedPhone(data.pairedPhone || null)
        if (data.deviceName !== undefined) setDeviceName(data.deviceName || null)
        if (data.error) setError(data.error)
        if (data.qr || data.lastQr) setQr(data.qr || data.lastQr || null)

        if (data.status === "ready") {
          setCurrentStep(3)
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        }
      } catch (pollError) {
        console.error("Polling error", pollError)
      }
    }, 2000)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
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
        if (data.status === "ready") setCurrentStep(3)
      }
    } catch (e) {
      console.error("Status error", e)
    }
  }

  const handleStart = async (freshConnection = false) => {
    if (!user) return
    setLoading(true)
    setError(null)
    setCurrentStep(2)
    try {
      const res = await fetch("/api/whatsapp/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freshConnection }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao iniciar sessão")
        setStatus("error")
        return
      }
      setStatus(data.status || "connecting")
      setQr(data.qr || null)
      setPairingCode(data.pairingCode || null)
      setPairedPhone(data.pairedPhone || data.userPhone || null)
      setDeviceName(data.deviceName || null)
      startPolling()
      if (data.status === "ready") setCurrentStep(3)
    } catch (e) {
      console.error("Start error", e)
      setStatus("error")
      setError("Erro ao iniciar sessão")
    } finally {
      setLoading(false)
    }
  }

  const handleFreshConnection = () => handleStart(true)

  useEffect(() => {
    fetchStatus()
    return () => stopPolling()
  }, [user])

  useEffect(() => {
    let active = true
    if (!qr) { setQrImage(null); return }
    QRCode.toDataURL(qr, { width: 280, margin: 2 })
      .then((url) => { if (active) setQrImage(url) })
      .catch(() => { if (active) setQrImage(null) })
    return () => { active = false }
  }, [qr])

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      {/* Progress Steps — only visible during connection flow */}
      {currentStep > 1 && (
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-8">
          <StepIndicator step={2} currentStep={currentStep} label="Conectar" />
          <div className={cn("w-16 sm:w-24 h-1 rounded-full transition-colors duration-500", currentStep > 2 ? "bg-emerald-500" : "bg-gray-200")} />
          <StepIndicator step={3} currentStep={currentStep} label="Pronto!" />
        </div>
      )}

      {/* Card */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 rounded-[2rem] blur-xl opacity-20" />

        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-white/60 dark:border-gray-800/60 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400" />

          <div className="p-6 sm:p-8">
            {/* Step 1: Conectar WhatsApp */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fadeInUp">
                {/* Status + CTA — always visible without scrolling */}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
                      <WifiOff className="h-8 w-8 text-red-500" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      WhatsApp desconectado
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Conecte para acessar conversas, automações e IA
                    </p>
                  </div>

                  <GlowButton onClick={() => handleStart(false)} disabled={loading} size="md">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Smartphone className="h-5 w-5" />
                        Conectar meu WhatsApp
                      </>
                    )}
                  </GlowButton>
                </div>

                {/* Benefits — secondary, compact */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center mb-3">
                    O que você ganha
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { icon: Bot, label: "Follow-up automático" },
                      { icon: Brain, label: "Análise com IA" },
                      { icon: Zap, label: "Chat no painel" },
                      { icon: RefreshCcw, label: "Sync com CRM" },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <Icon className="h-5 w-5 text-emerald-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: QR Code + Pairing Code */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeInUp">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Conecte seu WhatsApp
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400">
                    Escolha como você prefere conectar
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-pulse">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      Aguardando conexão...
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* QR CODE */}
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-2xl blur-lg opacity-20" />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-full">
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                          <QrCode className="h-4 w-4" />
                          QR Code
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">Recomendado</span>
                        </div>

                        <div className="relative mx-auto w-fit">
                          <div className="rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gray-50 dark:bg-gray-900 p-3 flex items-center justify-center min-h-[200px] min-w-[200px]">
                            {(status === "connecting" || status === "pairing") && !qrImage && (
                              <div className="text-center space-y-3">
                                <Loader2 className="h-10 w-10 mx-auto text-emerald-500 animate-spin" />
                                <p className="text-sm text-gray-500">Gerando...</p>
                              </div>
                            )}
                            {qrImage && (
                              <img src={qrImage} alt="QR Code WhatsApp" className="h-48 w-48 rounded-lg" />
                            )}
                            {status === "error" && (
                              <div className="text-center space-y-3">
                                <AlertTriangle className="h-10 w-10 mx-auto text-red-500" />
                                <p className="text-sm text-red-500">{error || "Erro"}</p>
                              </div>
                            )}
                            {!qrImage && status === "disconnected" && (
                              <div className="text-center space-y-3">
                                <QrCode className="h-10 w-10 mx-auto text-gray-300" />
                                <p className="text-sm text-gray-400">Aguardando...</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left space-y-2 text-sm">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Como usar:</p>
                          <ol className="space-y-1 text-gray-500 dark:text-gray-400 text-xs">
                            <li>1. Abra o WhatsApp</li>
                            <li>2. Vá em Configurações → Aparelhos conectados</li>
                            <li>3. Escaneie o código acima</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PAIRING CODE */}
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur-lg opacity-20" />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-full">
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium">
                          <Smartphone className="h-4 w-4" />
                          Código de Pareamento
                          <span className="text-[10px] opacity-75">(1ª vez)</span>
                        </div>

                        <div className="py-4">
                          {pairingCode && pairingCode.length === 8 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-center gap-1">
                                {pairingCode.slice(0, 4).split("").map((char, i) => (
                                  <span key={i} className="text-3xl sm:text-4xl font-bold font-mono bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    {char}
                                  </span>
                                ))}
                                <span className="text-3xl text-gray-300 mx-2">-</span>
                                {pairingCode.slice(4).split("").map((char, i) => (
                                  <span key={i + 4} className="text-3xl sm:text-4xl font-bold font-mono bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    {char}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400">Expira em 60 segundos</p>
                            </div>
                          ) : (
                            <div className="py-6 space-y-3">
                              {loading || status === "connecting" ? (
                                <>
                                  <Loader2 className="h-10 w-10 mx-auto text-blue-500 animate-spin" />
                                  <p className="text-sm text-gray-500">Gerando código...</p>
                                </>
                              ) : (
                                <>
                                  <div className="relative mx-auto w-fit">
                                    <Smartphone className="h-10 w-10 text-gray-300" />
                                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-100 flex items-center justify-center">
                                      <span className="text-amber-600 text-xs font-bold">!</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                      Reconexão detectada
                                    </p>
                                    <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
                                      Para usar código de pareamento, crie uma nova conexão
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                      onClick={handleFreshConnection}
                                      disabled={loading}
                                    >
                                      {loading ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <RefreshCcw className="h-3 w-3 mr-1" />
                                      )}
                                      Nova conexão
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-left space-y-2 text-sm">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Como usar:</p>
                          <ol className="space-y-1 text-gray-500 dark:text-gray-400 text-xs">
                            <li>1. Abra o WhatsApp</li>
                            <li>2. Vá em Configurações → Aparelhos conectados</li>
                            <li>3. Toque em &quot;Conectar com número&quot;</li>
                            <li>4. Digite o código acima</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => handleStart(false)} disabled={loading}>
                    <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Gerar novo código
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeInUp text-center">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl">
                      <CheckCircle2 className="h-14 w-14 text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-green-600">
                    WhatsApp Conectado!
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Sua secretária digital está pronta. Agora você pode ver conversas, enviar mensagens e ativar automações.
                  </p>
                </div>

                {pairedPhone && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                      Conectado: {pairedPhone} {deviceName && `(${deviceName})`}
                    </span>
                  </div>
                )}

                <div className="pt-4">
                  <GlowButton onClick={onConnected} variant="success">
                    Começar a usar
                  </GlowButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
