"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/animated-background"
import { cn } from "@/lib/utils"
import {
  Loader2,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Monitor,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Zap,
  Shield,
  RefreshCcw,
  Copy,
  Check,
  Settings,
  Plus,
  Phone,
  Hash,
} from "lucide-react"
import Image from "next/image"

type SessionStatus = "connecting" | "qr" | "pairing" | "ready" | "disconnected" | "error"

type StatusPayload = {
  status: SessionStatus
  pairedPhone?: string
  deviceName?: string
  lastQr?: string
  pairingCode?: string
  error?: string
}

// ── Glow Button ──
function GlowButton({
  children,
  onClick,
  disabled,
  className,
  variant = "primary",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "primary" | "secondary" | "success"
}) {
  const gradients = {
    primary: "from-emerald-500 via-green-500 to-teal-500",
    secondary: "from-gray-400 via-gray-500 to-gray-600",
    success: "from-green-500 via-emerald-500 to-teal-500",
  }

  return (
    <div className="relative group">
      <div
        className={cn(
          "absolute -inset-1 bg-gradient-to-r rounded-2xl blur-lg opacity-60 transition-all duration-500",
          gradients[variant],
          disabled ? "opacity-20" : "group-hover:opacity-100 group-hover:blur-xl"
        )}
      />
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-xl opacity-0 transition-opacity duration-300",
          gradients[variant],
          !disabled && "group-hover:opacity-75"
        )}
      />
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative w-full h-14 px-8 rounded-xl font-medium text-base",
          "bg-gradient-to-r text-white shadow-lg",
          gradients[variant],
          "transform transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          !disabled && "hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]",
          className
        )}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent",
              !disabled && "group-hover:animate-shine"
            )}
          />
        </div>
      </button>
    </div>
  )
}

// ── Step Indicator ──
function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isActive = step === currentStep
  const isCompleted = step < currentStep

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
          isCompleted
            ? "bg-gradient-to-br from-emerald-500 to-green-500"
            : isActive
            ? "bg-gradient-to-br from-emerald-500 to-green-500 animate-pulse"
            : "bg-gray-200 dark:bg-gray-700"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-6 w-6 text-white" />
        ) : (
          <span className={cn("font-bold", isActive ? "text-white" : "text-gray-500")}>{step}</span>
        )}
        {isActive && (
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-lg opacity-50 animate-pulse" />
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

// ── Feature Card ──
function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="group p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-lg transition-all duration-300">
      <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-3 group-hover:bg-emerald-500 transition-colors">
        <Icon className="h-5 w-5 text-emerald-600 group-hover:text-white transition-colors" />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

// ── Format Phone ──
function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  const local = digits.startsWith("55") ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return phone
}

// ── Pairing Code Display ──
function PairingCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const part1 = code.slice(0, 4)
  const part2 = code.slice(4)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-1">
        {part1.split("").map((char, i) => (
          <span
            key={i}
            className="text-4xl sm:text-5xl font-bold font-mono bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent"
          >
            {char}
          </span>
        ))}
        <span className="text-4xl text-gray-300 mx-2">-</span>
        {part2.split("").map((char, i) => (
          <span
            key={i + 4}
            className="text-4xl sm:text-5xl font-bold font-mono bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent"
          >
            {char}
          </span>
        ))}
      </div>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-sm font-medium"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado!" : "📋 Copiar código"}
      </button>
    </div>
  )
}

// ── Countdown Timer ──
function CountdownTimer({
  seconds,
  onExpired,
}: {
  seconds: number
  onExpired: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setRemaining(seconds)
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          onExpired()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [seconds, onExpired])

  const percentage = (remaining / seconds) * 100
  const isUrgent = remaining <= 15

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - percentage / 100)}`}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-1000",
              isUrgent ? "text-red-500" : "text-emerald-500"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "text-lg font-bold tabular-nums",
              isUrgent ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {remaining}s
          </span>
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-medium",
          isUrgent ? "text-red-500 animate-pulse" : "text-gray-500"
        )}
      >
        {remaining > 0 ? "Expira em..." : "Código expirado"}
      </span>
    </div>
  )
}

// ── Instruction Step (for mobile preparation) ──
function InstructionStep({
  number,
  icon: Icon,
  text,
  highlight,
}: {
  number: number
  icon: React.ElementType
  text: string
  highlight?: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
        <span className="text-sm font-bold text-emerald-600">{number}</span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Icon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {text}
          {highlight && (
            <span className="font-semibold text-emerald-700 dark:text-emerald-300"> {highlight}</span>
          )}
        </span>
      </div>
    </div>
  )
}

// ── Success Step (auto-redirects after 4s) ──
function SuccessStep({
  pairedPhone,
  deviceName,
  onContinue,
}: {
  pairedPhone: string | null
  deviceName: string | null
  onContinue: () => void
}) {
  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onContinue()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onContinue])

  return (
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
          WhatsApp Conectado! 🎉
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Tudo pronto! A IA já está ativa e vai atender seus leads automaticamente pelo WhatsApp.
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

      <div className="pt-4 space-y-3">
        <GlowButton onClick={onContinue} variant="success">
          Ir para o Dashboard
          <ArrowRight className="h-5 w-5" />
        </GlowButton>
        <p className="text-xs text-gray-400">
          Redirecionando em {countdown}s...
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function WhatsAppOnboardingPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  usePageTracking("onboarding-whatsapp")

  // Steps: 1=choose device, 2=prepare (mobile) / connect (desktop), 3=code shown (mobile), 4=success
  const [currentStep, setCurrentStep] = useState(1)
  const [deviceType, setDeviceType] = useState<"mobile" | "desktop" | null>(null)
  const [status, setStatus] = useState<SessionStatus>("disconnected")
  const [pairedPhone, setPairedPhone] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userPhone, setUserPhone] = useState<string | null>(null)
  const [codeExpired, setCodeExpired] = useState(false)
  const [countdownKey, setCountdownKey] = useState(0) // force re-mount countdown
  const [instanceReady, setInstanceReady] = useState(false) // instance created, waiting for user

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const qrRefreshRef = useRef<NodeJS.Timeout | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // ── Polling (2s interval for fast detection) ──
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        const data: StatusPayload & { qr?: string; lastQr?: string; profileName?: string } = await res.json()

        if (data.status) setStatus(data.status)
        if (data.pairedPhone !== undefined) setPairedPhone(data.pairedPhone || null)
        if (data.deviceName !== undefined) setDeviceName(data.deviceName || null)
        if (data.error) setError(data.error)

        // Update QR if available (desktop mode)
        const newQr = data.qr || data.lastQr
        if (newQr && deviceType === "desktop") setQr(newQr)

        // Connected! Auto-advance immediately — no extra click needed
        if (data.status === "ready") {
          setCurrentStep(4)
          stopPolling()
          stopQrRefresh()
        }
      } catch (pollError) {
        console.error("Polling error", pollError)
      }
    }, 2000) // 2s for faster detection
  }, [deviceType])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const stopQrRefresh = () => {
    if (qrRefreshRef.current) {
      clearInterval(qrRefreshRef.current)
      qrRefreshRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
      stopQrRefresh()
    }
  }, [])

  // Check initial status
  useEffect(() => {
    if (!user) return
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        const data: StatusPayload = await res.json()
        if (data.status === "ready") {
          setPairedPhone(data.pairedPhone || null)
          setDeviceName(data.deviceName || null)
          setCurrentStep(4)
          setStatus("ready")
        }
      } catch (e) {
        console.error("Status check error", e)
      }
    }
    checkStatus()
  }, [user])

  // Generate QR image
  useEffect(() => {
    let active = true
    if (!qr) {
      setQrImage(null)
      return
    }
    if (qr.startsWith("data:image")) {
      setQrImage(qr)
      return
    }
    QRCode.toDataURL(qr, { width: 320, margin: 2 })
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

  // ── Create instance (session/start) — only creates the instance, doesn't show code yet for mobile ──
  const createInstance = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/whatsapp/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freshConnection: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao iniciar sessão")
        setStatus("error")
        return false
      }

      setStatus(data.status || "connecting")
      setQr(data.qr || null)
      setPairingCode(data.pairingCode || null)
      setPairedPhone(data.pairedPhone || data.userPhone || null)
      setUserPhone(data.userPhone || null)
      setDeviceName(data.deviceName || null)
      setInstanceReady(true)

      if (data.status === "ready") {
        setCurrentStep(4)
        return true
      }

      // Start polling for connection status
      startPolling()
      return true
    } catch (startError) {
      console.error("Start error", startError)
      setStatus("error")
      setError("Erro ao iniciar sessão")
      return false
    } finally {
      setLoading(false)
    }
  }

  // ── Refresh code (doesn't recreate instance) ──
  // Anti-falha: se refresh falha, tenta recriar automaticamente
  const refreshCode = async (retryCount = 0) => {
    setLoading(true)
    setError(null)
    setCodeExpired(false)
    try {
      const res = await fetch("/api/whatsapp/session/refresh-code")
      const data = await res.json()

      if (!res.ok) {
        // If instance is dead or exhausted, recreate
        if (data.needsRecreate) {
          console.log("[Onboarding] Instance needs recreation, recreating...")
          await createInstance()
          // After recreation, the pairing code should be set by createInstance
          if (pairingCode) {
            setCountdownKey((k) => k + 1)
          }
          return
        }
        setError(data.error || "Erro ao gerar novo código")
        return
      }

      if (data.status === "ready") {
        setCurrentStep(4)
        return
      }

      if (data.pairingCode) {
        setPairingCode(data.pairingCode)
        setCountdownKey((k) => k + 1)
        setCodeExpired(false)
      } else if (!data.pairingCode && retryCount < 2) {
        // Pairing code veio null — tentar novamente após breve delay
        console.log(`[Onboarding] Pairing code null, retry ${retryCount + 1}/2...`)
        setTimeout(() => refreshCode(retryCount + 1), 2000)
        return // Don't setLoading(false) yet
      } else if (!data.pairingCode) {
        // Após 2 retries sem código, forçar recriação
        console.log("[Onboarding] Pairing code null after retries, recreating...")
        await createInstance()
        if (pairingCode) {
          setCountdownKey((k) => k + 1)
        }
        return
      }

      if (data.qr) {
        setQr(data.qr)
      }

      // Ensure polling is running
      startPolling()
    } catch (e) {
      setError("Erro ao gerar novo código. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // ── MOBILE: Choose mobile → go to preparation step ──
  const handleChooseMobile = () => {
    setDeviceType("mobile")
    setCurrentStep(2) // preparation step — no API call yet
  }

  // ── MOBILE: User says they're ready → NOW generate code ──
  // Anti-falha: se a primeira criação não retorna pairing code, tenta uma segunda vez com freshConnection
  const handleMobileReady = async () => {
    setLoading(true)
    setError(null)
    setCodeExpired(false)

    // Create instance + get pairing code
    const ok = await createInstance()
    if (ok) {
      setCurrentStep(3) // show the pairing code
      setCountdownKey((k) => k + 1)

      // Se não veio pairing code na primeira tentativa, esperar e tentar refresh
      if (!pairingCode) {
        console.log("[Onboarding] No pairing code after createInstance, trying refresh in 2s...")
        setTimeout(async () => {
          try {
            const res = await fetch("/api/whatsapp/session/refresh-code")
            const data = await res.json()
            if (data.pairingCode) {
              setPairingCode(data.pairingCode)
              setCountdownKey((k) => k + 1)
            } else if (data.needsRecreate) {
              // Force fresh recreation
              await createInstance()
            }
          } catch (e) {
            console.error("[Onboarding] Refresh fallback error:", e)
          }
        }, 2000)
      }
    }
    setLoading(false)
  }

  // ── DESKTOP: Choose desktop → create instance + show QR immediately ──
  const handleChooseDesktop = async () => {
    setDeviceType("desktop")
    setCurrentStep(2) // connect step (QR shown)
    setLoading(true)
    setError(null)

    const ok = await createInstance()
    if (!ok) return

    // Auto-refresh QR every 25 seconds for desktop
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
    qrRefreshRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/session/refresh-code")
        const data = await res.json()
        if (data.status === "ready") {
          setCurrentStep(4)
          stopQrRefresh()
          return
        }
        if (data.qr) setQr(data.qr)
        if (data.pairingCode) setPairingCode(data.pairingCode)
      } catch (e) {
        console.error("QR refresh error", e)
      }
    }, 25000)

    setLoading(false)
  }

  // ── Countdown expired handler ──
  const handleCountdownExpired = useCallback(() => {
    setCodeExpired(true)
  }, [])

  // ── Go to dashboard ──
  const handleContinue = () => {
    router.push("/dashboard")
  }

  // ── Reset to step 1 ──
  const handleBack = () => {
    stopPolling()
    stopQrRefresh()
    setCurrentStep(1)
    setDeviceType(null)
    setQr(null)
    setQrImage(null)
    setPairingCode(null)
    setError(null)
    setStatus("disconnected")
    setCodeExpired(false)
    setInstanceReady(false)
  }

  // ── Loading screen ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  // Map internal steps to visual progress steps (always 3 visual steps)
  const visualStep = currentStep === 4 ? 3 : currentStep >= 3 ? 2 : currentStep

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
      <AnimatedBackground />

      {/* Header */}
      <header className="relative z-20 p-4 sm:p-6 animate-fadeInDown">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-xl blur-lg opacity-40" />
              <Image
                src="/logo-pratica-icon.svg"
                alt="Pratica"
                width={48}
                height={48}
                className="relative h-10 sm:h-12 w-10 sm:w-12 drop-shadow-2xl"
              />
            </div>
            <div>
              <span className="font-semibold text-base sm:text-lg text-gray-800 dark:text-white">Pratica</span>
              <span className="text-emerald-600 font-semibold text-base sm:text-lg ml-1">IA</span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-gray-700"
          >
            Pular
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-4xl animate-fadeInUp">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-8">
            <StepIndicator step={1} currentStep={visualStep} label="Dispositivo" />
            <div className={cn("w-16 sm:w-24 h-1 rounded-full transition-colors duration-500", visualStep > 1 ? "bg-emerald-500" : "bg-gray-200")} />
            <StepIndicator step={2} currentStep={visualStep} label="Conectar" />
            <div className={cn("w-16 sm:w-24 h-1 rounded-full transition-colors duration-500", visualStep > 2 ? "bg-emerald-500" : "bg-gray-200")} />
            <StepIndicator step={3} currentStep={visualStep} label="Pronto!" />
          </div>

          {/* Card */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 rounded-[2rem] blur-xl opacity-20" />

            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-white/60 dark:border-gray-800/60 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 animate-gradient" />

              <div className="p-6 sm:p-8">

                {/* ═══════════════════════════════════════ */}
                {/* STEP 1: Explanation + Choose Device    */}
                {/* ═══════════════════════════════════════ */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
                        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                          <MessageSquare className="h-10 w-10 text-white" />
                          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-300 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    <div className="text-center space-y-3">
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Conecte seu WhatsApp à Pratica
                      </h1>
                      <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto text-base leading-relaxed">
                        A Pratica usa inteligência artificial para <strong>atender seus leads automaticamente pelo WhatsApp</strong>. 
                        Quando um cliente enviar mensagem, a IA responde na hora — com informações sobre imóveis, 
                        agenda visitas e qualifica o lead pra você.
                      </p>
                    </div>

                    {/* How it works */}
                    <div className="max-w-lg mx-auto bg-emerald-50/70 dark:bg-emerald-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800/50">
                      <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-3 text-sm uppercase tracking-wide">
                        Como funciona
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center mt-0.5">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">1</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Você conecta seu WhatsApp aqui — <strong>leva menos de 1 minuto</strong>
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center mt-0.5">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">2</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            A IA passa a <strong>atender seus leads automaticamente</strong> — responde perguntas, envia informações de imóveis e agenda visitas
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center mt-0.5">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">3</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Você acompanha tudo pelo painel — <strong>vê as conversas, intervém quando quiser</strong> e nunca perde um lead
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Security note */}
                    <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <Shield className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>Seguro e privado:</strong> suas mensagens pessoais continuam privadas. 
                        A IA só atende conversas de leads — seu WhatsApp pessoal funciona normalmente.
                      </p>
                    </div>

                    {/* Device choice */}
                    <div className="text-center pt-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Você está acessando pelo celular ou pelo computador?
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                      <button
                        onClick={handleChooseMobile}
                        disabled={loading}
                        className={cn(
                          "group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300",
                          "bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                          "border-gray-200 dark:border-gray-700 hover:border-emerald-400",
                          "hover:shadow-lg hover:shadow-emerald-500/10",
                          loading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                          <Smartphone className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-lg">📱 Celular</p>
                          <p className="text-xs text-gray-500 mt-1">Código de pareamento</p>
                        </div>
                      </button>

                      <button
                        onClick={handleChooseDesktop}
                        disabled={loading}
                        className={cn(
                          "group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300",
                          "bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                          "border-gray-200 dark:border-gray-700 hover:border-blue-400",
                          "hover:shadow-lg hover:shadow-blue-500/10",
                          loading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                          <Monitor className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-lg">💻 Computador</p>
                          <p className="text-xs text-gray-500 mt-1">QR Code</p>
                        </div>
                      </button>
                    </div>

                    {loading && (
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Preparando conexão...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════ */}
                {/* STEP 2 (MOBILE): Prepare WhatsApp      */}
                {/* No code generated yet!                 */}
                {/* ═══════════════════════════════════════ */}
                {currentStep === 2 && deviceType === "mobile" && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
                        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-xl">
                          <Smartphone className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Prepare seu WhatsApp
                      </h1>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        Siga os passos abaixo no seu celular. <strong>Só gere o código quando estiver pronto.</strong>
                      </p>
                    </div>

                    {/* Instructions */}
                    <div className="max-w-md mx-auto space-y-2">
                      <InstructionStep
                        number={1}
                        icon={MessageSquare}
                        text="Abra o"
                        highlight="WhatsApp no seu celular"
                      />
                      <InstructionStep
                        number={2}
                        icon={Settings}
                        text="Toque em"
                        highlight="⚙️ Configurações"
                      />
                      <InstructionStep
                        number={3}
                        icon={Smartphone}
                        text="Toque em"
                        highlight="📱 Aparelhos conectados"
                      />
                      <InstructionStep
                        number={4}
                        icon={Plus}
                        text="Toque em"
                        highlight="➕ Conectar dispositivo"
                      />
                      <InstructionStep
                        number={5}
                        icon={Phone}
                        text="Escolha"
                        highlight="'Conectar com número de telefone'"
                      />
                      <InstructionStep
                        number={6}
                        icon={Hash}
                        text="Digite seu número:"
                        highlight={formatPhone(userPhone || (user as any)?.telefone || (user as any)?.phone) || "seu número"}
                      />
                    </div>

                    {/* Important notice */}
                    <div className="max-w-md mx-auto p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-700 dark:text-amber-400 text-center">
                        ⏱️ O código expira em <strong>60 segundos</strong>. Só gere quando estiver na tela{" "}
                        <strong>&quot;Insira o código&quot;</strong> do WhatsApp.
                      </p>
                    </div>

                    {/* Ready button */}
                    <div className="max-w-md mx-auto">
                      <GlowButton onClick={handleMobileReady} disabled={loading} variant="primary">
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Gerando código...
                          </>
                        ) : (
                          <>
                            ✅ Estou na tela &quot;Insira o código&quot;
                          </>
                        )}
                      </GlowButton>
                    </div>

                    <div className="flex justify-center">
                      <Button variant="ghost" onClick={handleBack} className="text-gray-500">
                        ← Voltar
                      </Button>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════ */}
                {/* STEP 3 (MOBILE): Show Pairing Code     */}
                {/* ═══════════════════════════════════════ */}
                {currentStep === 3 && deviceType === "mobile" && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="text-center space-y-2">
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Código de Pareamento
                      </h1>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                        <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                          Aguardando conexão...
                        </span>
                      </div>
                    </div>

                    {/* Pairing Code + Countdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                      {pairingCode && !codeExpired ? (
                        <div className="flex flex-col items-center gap-6">
                          <p className="text-sm text-gray-500 font-medium">
                            Digite este código no WhatsApp:
                          </p>
                          <PairingCodeDisplay code={pairingCode} />
                          <CountdownTimer
                            key={countdownKey}
                            seconds={55}
                            onExpired={handleCountdownExpired}
                          />
                        </div>
                      ) : codeExpired ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-7 w-7 text-red-500" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900 dark:text-white">
                              Código expirado
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Gere um novo código para continuar
                            </p>
                          </div>
                          <GlowButton
                            onClick={refreshCode}
                            disabled={loading}
                            variant="primary"
                            className="max-w-xs"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                🔄 Gerar novo código
                              </>
                            )}
                          </GlowButton>
                        </div>
                      ) : loading || status === "connecting" ? (
                        <div className="py-4 space-y-3 text-center">
                          <Loader2 className="h-10 w-10 mx-auto text-emerald-500 animate-spin" />
                          <p className="text-sm text-gray-500">Gerando código de pareamento...</p>
                        </div>
                      ) : (
                        <div className="py-4 space-y-3 text-center">
                          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
                          <p className="text-sm text-gray-500">Não foi possível gerar o código</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={refreshCode}
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCcw className="h-3 w-3 mr-1" />}
                            Tentar novamente
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                      </div>
                    )}

                    {/* Back */}
                    <div className="flex justify-center">
                      <Button variant="ghost" onClick={handleBack} className="text-gray-500">
                        ← Voltar ao início
                      </Button>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════ */}
                {/* STEP 2 (DESKTOP): QR Code + Pairing    */}
                {/* ═══════════════════════════════════════ */}
                {currentStep === 2 && deviceType === "desktop" && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="text-center space-y-2">
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Escaneie o QR Code
                      </h1>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                        <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                          Aguardando conexão...
                        </span>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                      <div className="relative mx-auto w-fit">
                        <div className="rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center min-h-[280px] min-w-[280px]">
                          {qrImage ? (
                            <img src={qrImage} alt="QR Code WhatsApp" className="h-64 w-64 rounded-lg" />
                          ) : loading || status === "connecting" ? (
                            <div className="text-center space-y-3">
                              <Loader2 className="h-10 w-10 mx-auto text-emerald-500 animate-spin" />
                              <p className="text-sm text-gray-500">Gerando QR Code...</p>
                            </div>
                          ) : status === "error" ? (
                            <div className="text-center space-y-3">
                              <AlertTriangle className="h-10 w-10 mx-auto text-red-500" />
                              <p className="text-sm text-red-500">{error || "Erro ao gerar QR"}</p>
                            </div>
                          ) : (
                            <div className="text-center space-y-3">
                              <QrCode className="h-10 w-10 mx-auto text-gray-300" />
                              <p className="text-sm text-gray-400">Aguardando QR Code...</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">QR Code atualiza automaticamente a cada 25 segundos</p>
                    </div>

                    {/* Pairing code as alternative */}
                    {pairingCode && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 text-center">
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-medium">
                          Ou use o código de pareamento:
                        </p>
                        <PairingCodeDisplay code={pairingCode} />
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                      <p className="font-medium text-emerald-800 dark:text-emerald-300 mb-3 text-sm">
                        💻 Como conectar:
                      </p>
                      <ol className="space-y-2 text-sm text-emerald-700 dark:text-emerald-400">
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[20px]">1.</span>
                          <span>Abra o <strong>WhatsApp</strong> no celular</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[20px]">2.</span>
                          <span>Vá em <strong>Configurações</strong> → <strong>Aparelhos conectados</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[20px]">3.</span>
                          <span>Toque em <strong>Conectar dispositivo</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[20px]">4.</span>
                          <span>Escaneie o <strong>QR Code</strong> acima com a câmera</span>
                        </li>
                      </ol>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-center gap-4">
                      <Button variant="ghost" onClick={handleBack} className="text-gray-500">
                        ← Voltar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={refreshCode}
                        disabled={loading}
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      >
                        <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Atualizar código
                      </Button>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════ */}
                {/* STEP 4: Success (auto-redirect 4s)     */}
                {/* ═══════════════════════════════════════ */}
                {currentStep === 4 && (
                  <SuccessStep
                    pairedPhone={pairedPhone}
                    deviceName={deviceName}
                    onContinue={handleContinue}
                  />
                )}

              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-gray-400">
        Pratica Incorporadora &copy; {new Date().getFullYear()}
      </footer>

      <style jsx global>{`
        @keyframes shine {
          to {
            transform: translateX(100%);
          }
        }
        .animate-shine {
          animation: shine 0.75s ease-in-out;
        }
      `}</style>
    </div>
  )
}
