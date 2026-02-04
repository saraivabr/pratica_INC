"use client"

import { useState, useEffect } from "react"
import { Star, Gift, Sparkles, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StarProgressProps {
  estrelasDisponiveis: number
  totalEstrelas?: number // Total acumulado historicamente
  podeResgatar: boolean
  onResgatar: () => void
  onVerHistorico: () => void
  isLoading?: boolean
  className?: string
}

/**
 * Componente de progresso de estrelas com gamificacao
 */
export function StarProgress({
  estrelasDisponiveis,
  totalEstrelas = 0,
  podeResgatar,
  onResgatar,
  onVerHistorico,
  isLoading = false,
  className,
}: StarProgressProps) {
  const [animatedStars, setAnimatedStars] = useState(0)

  // Animar as estrelas aparecendo
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedStars(estrelasDisponiveis)
    }, 100)
    return () => clearTimeout(timer)
  }, [estrelasDisponiveis])

  const estrelasParaProximoPix = 5 - (estrelasDisponiveis % 5)
  const proximoPix = estrelasParaProximoPix === 5 ? 0 : estrelasParaProximoPix

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        podeResgatar
          ? "border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
          : "border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:from-yellow-950/20 dark:to-amber-950/20",
        className
      )}
    >
      {/* Shimmer effect quando pode resgatar */}
      {podeResgatar && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]" />
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span>SUAS ESTRELAS</span>
          {podeResgatar && (
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 flex items-center gap-1">
              <Gift className="h-3 w-3" />
              Resgate disponivel!
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Visualizacao das 5 estrelas */}
        <div className="flex justify-center items-center gap-2">
          {[1, 2, 3, 4, 5].map((index) => {
            const isActive = index <= (estrelasDisponiveis % 5 || (podeResgatar ? 5 : 0))
            const isAnimating = index <= animatedStars % 5 || (podeResgatar && index <= 5)

            return (
              <div
                key={index}
                className={cn(
                  "relative transition-all duration-300",
                  isActive && "scale-110",
                  isAnimating && isActive && "animate-[pop_0.3s_ease-out]"
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-all duration-300",
                    isActive
                      ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                      : "text-zinc-300 dark:text-zinc-600"
                  )}
                />
                {isActive && (
                  <Sparkles
                    className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Contador */}
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {estrelasDisponiveis} <span className="text-base font-normal text-muted-foreground">de 5</span>
          </p>
          {!podeResgatar && proximoPix > 0 && (
            <p className="text-sm text-muted-foreground">
              Mais {proximoPix} visita{proximoPix > 1 ? "s" : ""} agendada{proximoPix > 1 ? "s" : ""} e voce ganha R$50!
            </p>
          )}
          {podeResgatar && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Voce pode resgatar R$50 via PIX!
            </p>
          )}
        </div>

        {/* Como ganhar */}
        <div className="text-xs space-y-1 p-2 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">Como ganhar:</p>
          <ul className="space-y-0.5 text-yellow-700 dark:text-yellow-300">
            <li className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" /> Agende uma visita = +1 estrela
            </li>
            <li className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" /> Feche negocio = +2 estrelas
            </li>
            <li className="flex items-center gap-1">
              <Gift className="h-3 w-3" /> 5 estrelas = R$50 via PIX
            </li>
          </ul>
        </div>

        {/* Botoes */}
        <div className="space-y-2">
          {podeResgatar && (
            <Button
              onClick={onResgatar}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 gap-2"
              size="lg"
            >
              <Gift className="h-4 w-4" />
              Resgatar R$50 PIX
              <Sparkles className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={onVerHistorico}
            className="w-full text-sm text-muted-foreground hover:text-foreground gap-1"
            size="sm"
          >
            Ver meu historico
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1.1); }
        }
      `}</style>
    </Card>
  )
}
