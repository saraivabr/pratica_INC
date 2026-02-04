"use client"

import { useState, useEffect } from "react"
import { Target, TrendingUp, CheckCircle2, Phone, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface QualificationProgressProps {
  totalOfertas: number
  metaOfertas: number
  qualificado: boolean
  onRegisterClick: () => void
  className?: string
}

/**
 * Mensagens motivacionais baseadas no progresso
 */
function getMensagemMotivacional(total: number, meta: number, qualificado: boolean): string {
  if (qualificado) return "Voce esta na Roleta de Leads!"

  const faltam = meta - total
  const progresso = total / meta

  if (progresso >= 0.9) return `Quase la! So mais ${faltam}!`
  if (progresso >= 0.66) return `Metade do caminho! Continue assim.`
  if (progresso >= 0.33) return `Bom progresso! So mais ${faltam} ofertas.`
  return "Comece forte! Cada oferta te aproxima dos leads."
}

export function QualificationProgress({
  totalOfertas,
  metaOfertas,
  qualificado,
  onRegisterClick,
  className,
}: QualificationProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [isNearGoal, setIsNearGoal] = useState(false)

  const progresso = Math.min((totalOfertas / metaOfertas) * 100, 100)
  const faltam = Math.max(metaOfertas - totalOfertas, 0)
  const mensagem = getMensagemMotivacional(totalOfertas, metaOfertas, qualificado)

  // Animar a barra de progresso
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progresso)
    }, 100)
    return () => clearTimeout(timer)
  }, [progresso])

  // Detectar proximidade do objetivo para animacao pulse
  useEffect(() => {
    setIsNearGoal(progresso >= 80 && !qualificado)
  }, [progresso, qualificado])

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        qualificado
          ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30"
          : "border-blue-200 dark:border-blue-800",
        isNearGoal && "animate-pulse",
        className
      )}
    >
      {/* Shine effect quando qualificado */}
      {qualificado && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shine_3s_ease-in-out_infinite]" />
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className={cn("h-4 w-4", qualificado ? "text-yellow-500" : "text-blue-500")} />
          <span>SUA META DO DIA</span>
          {qualificado && (
            <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
              Qualificado
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="relative">
            <Progress
              value={animatedProgress}
              className={cn(
                "h-4 transition-all duration-500",
                qualificado
                  ? "[&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-amber-500"
                  : "[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-emerald-500"
              )}
            />
            {/* Milestone markers */}
            <div className="absolute top-0 left-0 w-full h-full flex items-center pointer-events-none">
              {[10, 20, 30].map((milestone) => {
                const position = (milestone / metaOfertas) * 100
                if (position > 100) return null
                return (
                  <div
                    key={milestone}
                    className={cn(
                      "absolute w-0.5 h-2 bg-white/50 top-1",
                      totalOfertas >= milestone && "bg-white/80"
                    )}
                    style={{ left: `${position}%` }}
                  />
                )
              })}
            </div>
          </div>

          {/* Contador grande */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-3xl font-bold tabular-nums transition-all duration-300",
                  qualificado ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"
                )}
              >
                {totalOfertas}
              </span>
              <span className="text-lg text-muted-foreground">/{metaOfertas}</span>
              <span className="text-sm text-muted-foreground ml-1">ofertas</span>
            </div>
            {qualificado ? (
              <CheckCircle2 className="h-6 w-6 text-yellow-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Mensagem motivacional */}
        <p
          className={cn(
            "text-sm font-medium",
            qualificado ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
          )}
        >
          {qualificado ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {mensagem}
            </span>
          ) : (
            <>
              &quot;{mensagem}&quot;
            </>
          )}
        </p>

        {/* Botao CTA */}
        {!qualificado && (
          <Button
            onClick={onRegisterClick}
            className={cn(
              "w-full gap-2 transition-all",
              isNearGoal
                ? "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                : ""
            )}
            size="lg"
          >
            <Plus className="h-4 w-4" />
            Registrar Oferta
            {faltam <= 5 && faltam > 0 && (
              <span className="ml-1 text-xs opacity-80">({faltam} restantes)</span>
            )}
          </Button>
        )}

        {qualificado && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <Phone className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              Leads de Facebook, QR Code e ligacoes chegam automaticamente para voce
            </span>
          </div>
        )}
      </CardContent>

      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(100%); }
        }
      `}</style>
    </Card>
  )
}
