"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type StatusTipo = "venda" | "parcela" | "beneficiario" | "pagamento"

interface StatusBadgeProps {
  status: string
  tipo: StatusTipo
  className?: string
}

// Configuracao de cores para cada status por tipo
const statusConfig: Record<StatusTipo, Record<string, { label: string; className: string }>> = {
  venda: {
    rascunho: {
      label: "Rascunho",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600",
    },
    em_processamento: {
      label: "Em Processamento",
      className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    },
    concluida: {
      label: "Concluida",
      className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700",
    },
    paga: {
      label: "Paga",
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
    },
    cancelada: {
      label: "Cancelada",
      className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700",
    },
  },
  parcela: {
    pendente: {
      label: "Pendente",
      className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    },
    vencida: {
      label: "Vencida",
      className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700",
    },
    paga: {
      label: "Paga",
      className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700",
    },
    cancelada: {
      label: "Cancelada",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600",
    },
    parcial: {
      label: "Parcial",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    },
  },
  beneficiario: {
    ativo: {
      label: "Ativo",
      className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700",
    },
    inativo: {
      label: "Inativo",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600",
    },
    pendente_documentacao: {
      label: "Pendente Docs",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    },
    bloqueado: {
      label: "Bloqueado",
      className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700",
    },
  },
  pagamento: {
    pendente: {
      label: "Pendente",
      className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    },
    processando: {
      label: "Processando",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    },
    realizado: {
      label: "Realizado",
      className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700",
    },
    erro: {
      label: "Erro",
      className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700",
    },
    estornado: {
      label: "Estornado",
      className: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700",
    },
  },
}

export function StatusBadge({ status, tipo, className }: StatusBadgeProps) {
  const config = statusConfig[tipo]?.[status]

  if (!config) {
    // Fallback para status desconhecido
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
          className
        )}
      >
        {status}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

/**
 * Retorna a configuracao de um status especifico
 */
export function getStatusConfig(tipo: StatusTipo, status: string) {
  return statusConfig[tipo]?.[status] || null
}

/**
 * Retorna todos os status disponiveis para um tipo
 */
export function getStatusOptions(tipo: StatusTipo) {
  return Object.entries(statusConfig[tipo] || {}).map(([value, config]) => ({
    value,
    label: config.label,
  }))
}
