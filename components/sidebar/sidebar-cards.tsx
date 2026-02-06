'use client'

import Link from 'next/link'
import {
  ClipboardCheck,
  Smartphone,
  Contact,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RoletaStatus } from '@/hooks/use-roleta-status'

// ============================================================================
// Helper: format currency abbreviation (1200000 → "1.2M", 350000 → "350k")
// ============================================================================
function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(0)}k`
  }
  return String(Math.round(value))
}

// ============================================================================
// RoletaCard — 3 states: in queue, YOUR TURN, out of queue
// ============================================================================
interface RoletaCardProps {
  status: RoletaStatus & { loading: boolean }
  collapsed: boolean
  isActive: boolean
}

export function RoletaCard({ status, collapsed, isActive }: RoletaCardProps) {
  const { inQueue, isMyTurn, posicaoReal, posicao, loading } = status
  const position = posicaoReal ?? posicao

  // Determine state
  const state = isMyTurn ? 'my-turn' : inQueue ? 'in-queue' : 'out'

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href="/corretor/recepcao"
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-xl transition-all relative mx-auto',
              state === 'my-turn' && 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30',
              state === 'in-queue' && 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25',
              state === 'out' && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            )}
          >
            {state === 'my-turn' && (
              <span className="absolute inset-0 rounded-xl bg-amber-400/30 animate-ping pointer-events-none" />
            )}
            <ClipboardCheck className="h-4.5 w-4.5 relative z-10" />
            {state === 'in-queue' && position && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold shadow-sm border border-emerald-200 dark:border-emerald-800">
                {position}
              </span>
            )}
            {state === 'my-turn' && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold shadow-sm animate-pulse">
                !
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          {state === 'my-turn' ? 'SUA VEZ na Roleta!' : state === 'in-queue' ? `Roleta - Posição #${position}` : 'Roleta - Fora da fila'}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href="/corretor/recepcao"
      className={cn(
        'group/card block rounded-xl p-3 transition-all relative overflow-hidden border',
        state === 'my-turn' && 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-300 dark:border-amber-700/60 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm shadow-amber-500/10',
        state === 'in-queue' && 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm shadow-emerald-500/10',
        state === 'out' && 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600',
        isActive && 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900',
        isActive && state === 'my-turn' && 'ring-amber-400',
        isActive && state === 'in-queue' && 'ring-emerald-400',
        isActive && state === 'out' && 'ring-zinc-400',
      )}
    >
      {state === 'my-turn' && (
        <span className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-orange-400/10 animate-pulse pointer-events-none" />
      )}
      <div className="flex items-center gap-3 relative z-10">
        <div className={cn(
          'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
          state === 'my-turn' && 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
          state === 'in-queue' && 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
          state === 'out' && 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500',
        )}>
          {state === 'in-queue' && position ? (
            <span className="text-lg font-bold leading-none">{position}</span>
          ) : (
            <ClipboardCheck className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-[13px] font-semibold leading-tight',
            state === 'my-turn' && 'text-amber-800 dark:text-amber-200',
            state === 'in-queue' && 'text-emerald-800 dark:text-emerald-200',
            state === 'out' && 'text-zinc-500 dark:text-zinc-400',
          )}>
            {state === 'my-turn' ? 'SUA VEZ!' : state === 'in-queue' ? 'Roleta' : 'Roleta'}
          </p>
          <p className={cn(
            'text-[11px] leading-tight mt-0.5',
            state === 'my-turn' && 'text-amber-600 dark:text-amber-300',
            state === 'in-queue' && 'text-emerald-600 dark:text-emerald-400',
            state === 'out' && 'text-zinc-400 dark:text-zinc-500',
          )}>
            {state === 'my-turn'
              ? 'Clique para atender'
              : state === 'in-queue'
                ? `Posição #${position} na fila`
                : 'Entrar na fila'
            }
          </p>
        </div>
        {state === 'in-queue' && position && (
          <div className="flex items-center gap-0.5 shrink-0">
            {Array.from({ length: Math.min(position, 8) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i === 0 ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-600',
                )}
              />
            ))}
            {position > 8 && (
              <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-medium ml-0.5">
                +{position - 8}
              </span>
            )}
          </div>
        )}
        {state === 'my-turn' && (
          <span className="h-3 w-3 rounded-full bg-amber-500 animate-ping shrink-0" />
        )}
      </div>
    </Link>
  )
}

// ============================================================================
// WhatsAppCard — connected/disconnected + unread count
// ============================================================================
interface WhatsAppCardProps {
  isConnected: boolean
  unreadCount: number
  collapsed: boolean
  isActive: boolean
}

export function WhatsAppCard({ isConnected, unreadCount, collapsed, isActive }: WhatsAppCardProps) {
  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href="/corretor/whatsapp"
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-xl transition-all relative mx-auto',
              'bg-white dark:bg-zinc-800/50 border',
              isConnected
                ? 'border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                : 'border-red-200 dark:border-red-800/50 text-red-500 dark:text-red-400',
            )}
          >
            <Smartphone className="h-4.5 w-4.5" />
            {/* Connection dot */}
            <span className={cn(
              'absolute top-1 right-1 h-2 w-2 rounded-full',
              isConnected ? 'bg-emerald-500' : 'bg-red-500',
            )} />
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          WhatsApp {isConnected ? 'conectado' : 'desconectado'}
          {unreadCount > 0 && ` - ${unreadCount} não lidas`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href="/corretor/whatsapp"
      className={cn(
        'group/card flex items-center gap-3 rounded-xl p-2.5 transition-all border',
        'bg-white dark:bg-zinc-800/50 hover:shadow-sm',
        isConnected
          ? 'border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600'
          : 'border-red-200/80 dark:border-red-800/40 hover:border-red-300 dark:hover:border-red-700',
        isActive && 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-400',
      )}
    >
      <div className={cn(
        'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
        isConnected
          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400',
      )}>
        <Smartphone className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            isConnected ? 'bg-emerald-500' : 'bg-red-500',
          )} />
          <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
            WhatsApp
          </p>
        </div>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
          {!isConnected
            ? 'Desconectado'
            : unreadCount > 0
              ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
              : 'Tudo em dia'
          }
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

// ============================================================================
// LeadsCard — total leads + new today badge
// ============================================================================
interface LeadsCardProps {
  total: number
  newToday: number
  collapsed: boolean
  isActive: boolean
}

export function LeadsCard({ total, newToday, collapsed, isActive }: LeadsCardProps) {
  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href="/corretor/clientes"
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-xl transition-all relative mx-auto',
              'bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50',
              'text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
            )}
          >
            <Contact className="h-4.5 w-4.5" />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900 text-[9px] font-bold shadow-sm">
                {total > 999 ? '999+' : total}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          {total} leads{newToday > 0 && ` (+${newToday} hoje)`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href="/corretor/clientes"
      className={cn(
        'group/card flex items-center gap-3 rounded-xl p-2.5 transition-all border',
        'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50',
        'hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm',
        isActive && 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-400',
      )}
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
        <Contact className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Leads
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          {total} ativo{total !== 1 ? 's' : ''}
        </p>
      </div>
      {newToday > 0 && (
        <span className="flex items-center justify-center h-5 px-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold shrink-0">
          +{newToday}
        </span>
      )}
    </Link>
  )
}

// ============================================================================
// PainelCard — goal % + revenue + mini progress bar
// ============================================================================
interface PainelCardProps {
  overallProgress: number
  currentRevenue: number
  collapsed: boolean
  isActive: boolean
}

export function PainelCard({ overallProgress, currentRevenue, collapsed, isActive }: PainelCardProps) {
  const progressColor = overallProgress >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : overallProgress >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-500 dark:text-red-400'

  const barColor = overallProgress >= 80
    ? 'bg-emerald-500'
    : overallProgress >= 50
      ? 'bg-amber-500'
      : 'bg-red-500'

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href="/corretor"
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-xl transition-all relative mx-auto',
              'bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50',
              'text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
            )}
          >
            <Gauge className="h-4.5 w-4.5" />
            <span className={cn(
              'absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold shadow-sm',
              overallProgress >= 80 && 'bg-emerald-500 text-white',
              overallProgress >= 50 && overallProgress < 80 && 'bg-amber-500 text-white',
              overallProgress < 50 && 'bg-red-500 text-white',
            )}>
              {overallProgress}%
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          Meta: {overallProgress}% — R$ {formatCurrency(currentRevenue)}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href="/corretor"
      className={cn(
        'group/card block rounded-xl p-2.5 transition-all border',
        'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50',
        'hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm',
        isActive && 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-400',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 shrink-0">
          <Gauge className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Painel
            </p>
            <span className={cn('text-[11px] font-bold', progressColor)}>
              {overallProgress}%
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
            R$ {formatCurrency(currentRevenue)}
          </p>
        </div>
      </div>
      {/* Mini progress bar */}
      <div className="mt-2 h-1 rounded-full bg-zinc-100 dark:bg-zinc-700/50 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(overallProgress, 100)}%` }}
        />
      </div>
    </Link>
  )
}
