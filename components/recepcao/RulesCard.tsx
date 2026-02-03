"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Regras do atendimento na roleta.
 * Centralizado aqui para fácil manutenção/alteração futura.
 */
export const REGRAS_ATENDIMENTO = {
  titulo: "Regras do Atendimento",
  regras: [
    { icone: "⏱️", texto: "Você tem até 90 segundos para responder o lead" },
    { icone: "💬", texto: "Responder significa iniciar conversa (não apenas \"Olá\")" },
    { icone: "🔁", texto: "Inatividade após o primeiro contato redistribui o lead" },
    { icone: "📉", texto: "Baixa consistência reduz sua prioridade na fila" },
    { icone: "🚫", texto: "Leads fora do sistema não geram comissão" },
  ],
  aceite: "Ao permanecer no plantão, você concorda com estas regras.",
}

interface RulesCardProps {
  defaultOpen?: boolean
  className?: string
}

export function RulesCard({ defaultOpen = true, className }: RulesCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className={cn("border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20", className)}>
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📌</span>
            {REGRAS_ATENDIMENTO.titulo}
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
          <ul className="space-y-1.5 text-sm">
            {REGRAS_ATENDIMENTO.regras.map((regra, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="shrink-0">{regra.icone}</span>
                <span className="text-zinc-700 dark:text-zinc-300">{regra.texto}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 pt-2 border-t border-amber-200 dark:border-amber-800 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            {REGRAS_ATENDIMENTO.aceite}
          </p>
        </CardContent>
      )}
    </Card>
  )
}
