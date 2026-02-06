"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  Sparkles,
  MapPin,
  Target,
  Users,
  ClipboardList,
  MessageSquare,
  Star,
  Gift,
  ArrowRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OnboardingTourProps {
  open: boolean
  onComplete: () => void
}

const steps = [
  {
    icon: Sparkles,
    glow: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    headline: "Bem-vindo a CorretorParceria",
    copy: "Aqui voce recebe leads exclusivos, gerencia atendimentos e ganha premios reais. Uma plataforma feita para o corretor parceiro vender mais.",
  },
  {
    icon: MapPin,
    glow: "bg-blue-500/20",
    iconColor: "text-blue-400",
    headline: "Faca check-in no plantao",
    copy: "Chegou no stand? Registre presenca via GPS, QR Code ou manual. A ordem da fila e definida por sorteio diario — todo mundo tem chance igual.",
  },
  {
    icon: Target,
    glow: "bg-violet-500/20",
    iconColor: "text-violet-400",
    headline: "Registre ofertas e qualifique-se",
    copy: "Cada ligacao ou atendimento que voce faz conta como oferta. Bata a meta do dia e desbloqueie a Roleta de Leads — leads de Facebook, portais e ligacoes chegam direto pra voce.",
  },
  {
    icon: Users,
    glow: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
    headline: "Duas filas, mais oportunidades",
    copy: "Fila da Portaria: leads presenciais do stand. Roleta de Leads: leads digitais para quem qualificou. Voce participa das duas ao mesmo tempo.",
  },
  {
    icon: ClipboardList,
    glow: "bg-primary/20",
    iconColor: "text-primary",
    headline: "Puxe leads quando estiver pronto",
    copy: "Sem fila confusa, sem disputas. Quando for sua vez, puxe o proximo lead com um toque. Receba o nome, telefone e historico — tudo na mao.",
  },
  {
    icon: MessageSquare,
    glow: "bg-green-500/20",
    iconColor: "text-green-400",
    headline: "Atenda, anote e agende",
    copy: "Ligue ou mande WhatsApp direto pelo app. Anote cada interacao e agende follow-ups. Corretor organizado nao perde negocio.",
  },
  {
    icon: Star,
    SecondaryIcon: Gift,
    glow: "bg-amber-500/20",
    iconColor: "text-amber-400",
    headline: "Feedback rapido = premios",
    copy: "Deu feedback do atendimento? Ganhou estrela. Acumule 5 estrelas e receba R$50 no PIX. Quanto mais voce atende, mais ganha.",
  },
]

export function OnboardingTour({ open, onComplete }: OnboardingTourProps) {
  const [current, setCurrent] = useState(0)

  const fireConfetti = useCallback(() => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"],
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
  }, [])

  useEffect(() => {
    if (open && current === steps.length - 1) {
      const cleanup = fireConfetti()
      return cleanup
    }
  }, [open, current, fireConfetti])

  // Reset on open
  useEffect(() => {
    if (open) setCurrent(0)
  }, [open])

  if (!open) return null

  const step = steps[current]
  const isLast = current === steps.length - 1
  const Icon = step.icon
  const SecondaryIcon = (step as any).SecondaryIcon

  const progress = ((current + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark premium background */}
      <div
        className="absolute inset-0 bg-black/95"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 z-10 flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors"
      >
        Pular
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Step counter */}
      <div className="absolute top-4 left-4 text-xs text-white/40 font-medium">
        {current + 1} / {steps.length}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            {/* Icon with glow */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className="relative mb-8"
            >
              <div
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center",
                  step.glow,
                  "animate-pulse"
                )}
              >
                <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Icon className={cn("h-10 w-10", step.iconColor)} />
                </div>
              </div>
              {SecondaryIcon && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500/20 border border-white/10 flex items-center justify-center">
                  <SecondaryIcon className="h-4 w-4 text-amber-400" />
                </div>
              )}
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="text-2xl font-bold text-white mb-3"
            >
              {step.headline}
            </motion.h2>

            {/* Copy */}
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="text-white/60 leading-relaxed text-[15px]"
            >
              {step.copy}
            </motion.p>

            {/* Dots */}
            <div className="flex gap-2 mt-8">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === current
                      ? "w-6 bg-gradient-to-r from-emerald-400 to-primary"
                      : "w-2 bg-white/20 hover:bg-white/30"
                  )}
                />
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="mt-8 w-full"
            >
              {isLast ? (
                <Button
                  onClick={onComplete}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/25 border-0"
                  size="lg"
                >
                  Bora comecar!
                  <Sparkles className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrent(current + 1)}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-primary hover:from-emerald-400 hover:to-primary/90 text-white shadow-lg shadow-emerald-500/25 border-0"
                  size="lg"
                >
                  Proximo
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
