"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface RegrasConfig {
  horaLimiteCheckin?: string
  horaSorteio?: string
  metaOfertas?: number
}

/**
 * Regras do atendimento na roleta.
 * Centralizado aqui para facil manutencao/alteracao futura.
 */
export function getRegrasAtendimento(config: RegrasConfig = {}) {
  const { horaLimiteCheckin, horaSorteio, metaOfertas = 30 } = config

  return {
    titulo: "Como funciona",
    regras: [
      {
        icone: "clock",
        texto: horaLimiteCheckin
          ? `Check-in ate ${horaLimiteCheckin} - Chegue a tempo para entrar no sorteio`
          : "Faca check-in para entrar na fila",
      },
      {
        icone: "dices",
        texto: horaSorteio
          ? `Sorteio diario - A ordem da portaria e definida todo dia as ${horaSorteio}`
          : "Sorteio diario - A ordem da portaria e definida por sorteio",
      },
      {
        icone: "target",
        texto: `${metaOfertas} ofertas = Roleta de Leads - Registre suas ligacoes para receber leads externos`,
      },
      {
        icone: "star",
        texto: "Agende visitas, ganhe estrelas - 5 estrelas = R$50 via PIX",
      },
      {
        icone: "zap",
        texto: "Responda em ate 90 segundos - Leads sao redistribuidos se nao houver resposta",
      },
    ],
    aceite: "Ao entrar no plantao, voce concorda em seguir estas regras.",
  }
}

// Icones para cada regra
const iconeMap: Record<string, string> = {
  clock: "⏰",
  dices: "🎲",
  target: "🎯",
  star: "⭐",
  zap: "⚡",
}

// Manter compatibilidade com versao anterior
export const REGRAS_ATENDIMENTO = getRegrasAtendimento()

interface RulesCardProps {
  defaultOpen?: boolean
  className?: string
  horaLimiteCheckin?: string
  horaSorteio?: string
  metaOfertas?: number
}

export function RulesCard({
  defaultOpen = true,
  className,
  horaLimiteCheckin,
  horaSorteio,
  metaOfertas,
}: RulesCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const regras = getRegrasAtendimento({ horaLimiteCheckin, horaSorteio, metaOfertas })

  return (
    <Card className={cn("border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20", className)}>
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📌</span>
            {regras.titulo}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 pb-3">
          <ul className="space-y-2 text-sm">
            {regras.regras.map((regra, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="shrink-0 text-base">{iconeMap[regra.icone] || regra.icone}</span>
                <div>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {regra.texto.split(" - ")[0]}
                  </span>
                  {regra.texto.includes(" - ") && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {regra.texto.split(" - ")[1]}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <span className="text-sm">✅</span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              {regras.aceite}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
