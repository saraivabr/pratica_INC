"use client"

import { MoreVertical, Share2, Trash2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Proposta {
  id: string
  clienteNome: string
  empreendimento: string
  unidade: string
  valor: number
  status: "ativa" | "pendente" | "concluida" | "cancelada"
  criadoEm: Date
}

interface PropostaCardProps {
  proposta: Proposta
  onShare?: (id: string) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

const statusConfig = {
  ativa: {
    label: "Ativa",
    icon: "🔥",
    backgroundColor: "bg-orange-500/20",
    textColor: "text-orange-600",
    badgeColor: "bg-orange-500/90 text-white"
  },
  pendente: {
    label: "Pendente",
    icon: "⏳",
    backgroundColor: "bg-yellow-500/20",
    textColor: "text-yellow-600",
    badgeColor: "bg-yellow-500/90 text-white"
  },
  concluida: {
    label: "Concluída",
    icon: "✅",
    backgroundColor: "bg-green-500/20",
    textColor: "text-green-600",
    badgeColor: "bg-green-500/90 text-white"
  },
  cancelada: {
    label: "Cancelada",
    icon: "❌",
    backgroundColor: "bg-gray-500/20",
    textColor: "text-gray-600",
    badgeColor: "bg-gray-500/90 text-white"
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `há ${diffMins}m`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays < 7) return `há ${diffDays}d`
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)}w`
  return `há ${Math.floor(diffDays / 30)}mo`
}

export function PropostaCard({
  proposta,
  onShare,
  onDelete,
  compact = false
}: PropostaCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const status = statusConfig[proposta.status]
  const timeAgo = getTimeAgo(proposta.criadoEm)

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (compact) {
    return (
      <div className="bg-[#1A1F2E] border border-[#2A3142] rounded-xl overflow-hidden hover:border-[#3A4152] transition-colors group">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-gray-400 truncate">
                {proposta.empreendimento}
              </p>
              <h3 className="text-[14px] font-semibold text-white truncate">
                {proposta.clienteNome}
              </h3>
              <p className="text-[11px] text-gray-500 truncate">
                {proposta.unidade}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <span className={cn(
              "px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap",
              status.badgeColor
            )}>
              {status.icon} {status.label}
            </span>
            <span className="text-[13px] font-bold text-[#4ECDC4] whitespace-nowrap">
              R$ {formatValue(proposta.valor).split(' ')[1]}
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-[#1A1F2E] border border-[#2A3142] rounded-2xl overflow-hidden",
      "hover:border-[#3A4152] transition-all duration-300 hover:shadow-lg hover:shadow-black/30",
      "group"
    )}>
      {/* Header with Status Badge */}
      <div className="relative p-6 pb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <span className={cn(
              "inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3",
              status.badgeColor
            )}>
              {status.icon} {status.label}
            </span>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full hover:bg-[#2A3142] flex items-center justify-center transition-colors text-gray-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-[#242A3B] border border-[#2A3142] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    onShare?.(proposta.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#2A3142] transition-colors text-gray-300 hover:text-white text-sm"
                >
                  <Share2 className="w-4 h-4" strokeWidth={1.5} />
                  <span>Compartilhar</span>
                </button>
                <button
                  onClick={() => {
                    onDelete?.(proposta.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-gray-300 hover:text-red-400 text-sm border-t border-[#2A3142]"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  <span>Deletar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cliente Name */}
        <h2 className="text-[22px] font-bold text-white mb-1 leading-tight">
          {proposta.clienteNome}
        </h2>

        {/* Empreendimento e Unidade */}
        <p className="text-[13px] text-gray-400">
          {proposta.empreendimento} • Unidade {proposta.unidade}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-[#2A3142] via-[#2A3142] to-transparent" />

      {/* Value Section */}
      <div className="p-6 pb-4">
        <p className="text-[11px] text-gray-500 uppercase tracking-widest font-medium mb-2">
          Valor da Proposta
        </p>
        <p className="text-[36px] font-bold text-[#4ECDC4] leading-tight">
          {formatValue(proposta.valor)}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-[#2A3142] via-[#2A3142] to-transparent" />

      {/* Footer */}
      <div className="p-6 pt-4 flex items-center justify-between">
        <span className="text-[12px] text-gray-500">
          {timeAgo}
        </span>
        <button
          onClick={() => onShare?.(proposta.id)}
          className="px-4 py-2 bg-[#4ECDC4] hover:bg-[#3DB5AC] text-[#1A1F2E] text-sm font-semibold rounded-lg transition-colors duration-200 hover:shadow-lg hover:shadow-[#4ECDC4]/20"
        >
          Compartilhar
        </button>
      </div>

      {/* Hover accent line */}
      <div className="absolute top-0 left-0 w-0 h-1 bg-[#4ECDC4] group-hover:w-full transition-all duration-500" />
    </div>
  )
}