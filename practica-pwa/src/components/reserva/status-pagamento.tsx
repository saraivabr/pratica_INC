"use client"

import { Check, Clock, AlertCircle, XCircle } from "lucide-react"
import { Parcela, PreReserva } from "@/types/pagamento"

interface StatusPagamentoProps {
  status: Parcela["status"]
  size?: "sm" | "md"
}

export function StatusPagamento({ status, size = "md" }: StatusPagamentoProps) {
  const config = {
    pendente: {
      icon: Clock,
      label: "Pendente",
      bg: "bg-[#ff9500]/10",
      text: "text-[#ff9500]"
    },
    pago: {
      icon: Check,
      label: "Pago",
      bg: "bg-[#34c759]/10",
      text: "text-[#34c759]"
    },
    vencido: {
      icon: AlertCircle,
      label: "Vencido",
      bg: "bg-[#ff3b30]/10",
      text: "text-[#ff3b30]"
    }
  }

  const { icon: Icon, label, bg, text } = config[status]
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"
  const padding = size === "sm" ? "px-2 py-1" : "px-3 py-1.5"
  const textSize = size === "sm" ? "text-[10px]" : "text-[12px]"

  return (
    <span className={`inline-flex items-center gap-1 ${padding} ${bg} rounded-full`}>
      <Icon className={`${iconSize} ${text}`} />
      <span className={`${textSize} font-medium ${text}`}>{label}</span>
    </span>
  )
}

interface StatusPreReservaProps {
  status: PreReserva["status"]
  size?: "sm" | "md"
}

export function StatusPreReserva({ status, size = "md" }: StatusPreReservaProps) {
  const config = {
    pendente: {
      icon: Clock,
      label: "Pendente",
      bg: "bg-[#ff9500]/10",
      text: "text-[#ff9500]"
    },
    ativa: {
      icon: Check,
      label: "Ativa",
      bg: "bg-[#34c759]/10",
      text: "text-[#34c759]"
    },
    cancelada: {
      icon: XCircle,
      label: "Cancelada",
      bg: "bg-[#ff3b30]/10",
      text: "text-[#ff3b30]"
    },
    concluida: {
      icon: Check,
      label: "Concluída",
      bg: "bg-[#0071e3]/10",
      text: "text-[#0071e3]"
    }
  }

  const { icon: Icon, label, bg, text } = config[status]
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"
  const padding = size === "sm" ? "px-2 py-1" : "px-3 py-1.5"
  const textSize = size === "sm" ? "text-[10px]" : "text-[12px]"

  return (
    <span className={`inline-flex items-center gap-1 ${padding} ${bg} rounded-full`}>
      <Icon className={`${iconSize} ${text}`} />
      <span className={`${textSize} font-medium ${text}`}>{label}</span>
    </span>
  )
}

// Alias para compatibilidade
export const StatusReserva = StatusPreReserva
