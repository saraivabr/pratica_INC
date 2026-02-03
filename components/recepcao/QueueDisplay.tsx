"use client"

import {
  AlertCircle,
  CheckCircle,
  PauseCircle,
  Phone,
  PhoneCall,
  UserMinus,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export interface QueueItem {
  presenca_id: string
  user_id: string
  corretor_nome: string
  corretor_telefone: string
  corretor_avatar: string | null
  posicao_fila: number
  checkin_at: string
  checkin_method: string
  em_atendimento: boolean
  pausado: boolean
  feedback_pendente: boolean
  status_legivel: string
  disponivel: boolean
}

interface QueueDisplayProps {
  items: QueueItem[]
  onItemClick?: (item: QueueItem) => void
  className?: string
}

export function QueueDisplay({ items, onItemClick, className }: QueueDisplayProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum corretor na fila
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <QueueItemCard
          key={item.presenca_id}
          item={item}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
        />
      ))}
    </div>
  )
}

interface QueueItemCardProps {
  item: QueueItem
  onClick?: () => void
}

function QueueItemCard({ item, onClick }: QueueItemCardProps) {
  const statusIcon = getStatusIcon(item)
  const statusColor = getStatusColor(item)

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-colors",
        statusColor,
        onClick && "cursor-pointer hover:opacity-80"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border text-sm font-bold">
            {item.posicao_fila}
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage src={item.corretor_avatar || undefined} />
            <AvatarFallback>
              {item.corretor_nome?.slice(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{item.corretor_nome}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {item.corretor_telefone}
              </span>
              <span>•</span>
              <span>Check-in: {format(new Date(item.checkin_at), "HH:mm")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {statusIcon}
            <span className="text-sm font-medium">{item.status_legivel}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {item.checkin_method}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function getStatusIcon(item: QueueItem) {
  if (item.em_atendimento) return <PhoneCall className="h-4 w-4 text-blue-600" />
  if (item.pausado) return <PauseCircle className="h-4 w-4 text-amber-600" />
  if (item.feedback_pendente) return <AlertCircle className="h-4 w-4 text-orange-600" />
  if (item.disponivel) return <CheckCircle className="h-4 w-4 text-emerald-600" />
  return <UserMinus className="h-4 w-4 text-zinc-400" />
}

function getStatusColor(item: QueueItem) {
  if (item.em_atendimento) return "border-blue-200 bg-blue-50"
  if (item.pausado) return "border-amber-200 bg-amber-50"
  if (item.feedback_pendente) return "border-orange-200 bg-orange-50"
  if (item.disponivel) return "border-emerald-200 bg-emerald-50"
  return "border-zinc-200 bg-zinc-50"
}

export { getStatusIcon, getStatusColor }
