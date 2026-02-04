"use client"

import { useEffect, useCallback } from "react"
import confetti from "canvas-confetti"
import { Star, Gift, Target, CheckCircle2, X, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CelebrationType = "star" | "qualification" | "pix" | "goal"

interface CelebrationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: CelebrationType
  data?: {
    // Para estrela
    leadNome?: string
    totalEstrelas?: number
    estrelasParaPix?: number
    // Para qualificacao
    totalOfertas?: number
    // Para PIX
    valorPix?: number
    referencia?: string
    // Generico
    mensagem?: string
  }
}

const celebrationConfig: Record<
  CelebrationType,
  {
    icon: React.ElementType
    title: string
    iconColor: string
    bgColor: string
    confettiColors: string[]
  }
> = {
  star: {
    icon: Star,
    title: "Voce ganhou uma estrela!",
    iconColor: "text-yellow-400 fill-yellow-400",
    bgColor: "from-yellow-50 to-amber-100 dark:from-yellow-950/50 dark:to-amber-950/50",
    confettiColors: ["#fbbf24", "#f59e0b", "#d97706", "#fef3c7"],
  },
  qualification: {
    icon: Target,
    title: "Voce esta qualificado!",
    iconColor: "text-emerald-500",
    bgColor: "from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-950/50",
    confettiColors: ["#10b981", "#059669", "#34d399", "#6ee7b7"],
  },
  pix: {
    icon: Gift,
    title: "Parabens! R$50 a caminho!",
    iconColor: "text-green-500",
    bgColor: "from-green-50 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50",
    confettiColors: ["#22c55e", "#16a34a", "#4ade80", "#86efac"],
  },
  goal: {
    icon: CheckCircle2,
    title: "Meta atingida!",
    iconColor: "text-blue-500",
    bgColor: "from-blue-50 to-cyan-100 dark:from-blue-950/50 dark:to-cyan-950/50",
    confettiColors: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd"],
  },
}

export function CelebrationModal({
  open,
  onOpenChange,
  type,
  data = {},
}: CelebrationModalProps) {
  const config = celebrationConfig[type]
  const Icon = config.icon

  // Dispara confetti quando abre
  const fireConfetti = useCallback(() => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: config.confettiColors,
    }

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)

    return () => clearInterval(interval)
  }, [config.confettiColors])

  useEffect(() => {
    if (open) {
      const cleanup = fireConfetti()
      return cleanup
    }
  }, [open, fireConfetti])

  const renderContent = () => {
    switch (type) {
      case "star":
        return (
          <>
            <div className="relative">
              <Star className={cn("h-20 w-20 mx-auto", config.iconColor, "animate-bounce")} />
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-300 animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-2 h-5 w-5 text-yellow-300 animate-pulse delay-100" />
            </div>
            {data.leadNome && (
              <p className="text-muted-foreground text-center">
                Agendamento confirmado com <strong>{data.leadNome}</strong>
              </p>
            )}
            <p className="text-lg font-medium text-center">
              Agora voce tem <span className="text-yellow-600">{data.totalEstrelas} estrelas</span>!
            </p>
            {data.estrelasParaPix && data.estrelasParaPix > 0 && data.estrelasParaPix <= 5 && (
              <p className="text-sm text-muted-foreground text-center">
                So mais {data.estrelasParaPix} para ganhar R$50
              </p>
            )}
            {data.estrelasParaPix === 0 && (
              <p className="text-sm font-medium text-green-600 text-center">
                Voce pode resgatar R$50 agora!
              </p>
            )}
          </>
        )

      case "qualification":
        return (
          <>
            <div className="relative">
              <Target className={cn("h-20 w-20 mx-auto", config.iconColor, "animate-bounce")} />
              <CheckCircle2 className="absolute -top-1 -right-1 h-8 w-8 text-emerald-500 animate-pulse" />
            </div>
            <p className="text-lg font-medium text-center">
              Voce completou <span className="text-emerald-600">{data.totalOfertas} ofertas</span>!
            </p>
            <p className="text-muted-foreground text-center">
              Agora voce esta na Roleta de Leads. Leads de Facebook, QR Code e ligacoes chegam automaticamente para voce.
            </p>
          </>
        )

      case "pix":
        return (
          <>
            <div className="relative flex justify-center">
              <div className="relative">
                <Gift className={cn("h-20 w-20", config.iconColor, "animate-bounce")} />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-3xl">💰</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 text-center">R$50</p>
            <p className="text-muted-foreground text-center">
              Voce completou 5 estrelas. O PIX sera enviado em ate 24h.
            </p>
            {data.referencia && (
              <p className="text-xs text-center text-muted-foreground">
                Numero de referencia: #{data.referencia}
              </p>
            )}
          </>
        )

      case "goal":
        return (
          <>
            <div className="relative">
              <CheckCircle2 className={cn("h-20 w-20 mx-auto", config.iconColor, "animate-bounce")} />
            </div>
            <p className="text-lg font-medium text-center">
              {data.mensagem || "Parabens! Voce atingiu sua meta!"}
            </p>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md bg-gradient-to-br",
          config.bgColor,
          "border-0"
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>

        <DialogHeader className="sr-only">
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>Celebracao de conquista</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <h2 className="text-xl font-bold text-center">{config.title}</h2>
          {renderContent()}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
            size="lg"
          >
            Continuar
          </Button>
          {type === "star" && data.estrelasParaPix === 0 && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                // TODO: Navegar para resgate
              }}
              className="w-full"
            >
              Resgatar agora
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
