'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, Zap, Pause, MessageSquare, AlertTriangle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoletaStatus } from '@/hooks/use-roleta-status'

interface RoletaFloatingWidgetProps {
  status: RoletaStatus
  loading: boolean
}

export function RoletaFloatingWidget({ status, loading }: RoletaFloatingWidgetProps) {
  if (loading) return null

  // State 1: Not in queue - subtle invite
  if (!status.inQueue) {
    return (
      <Link href="/corretor/recepcao" className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-50 group">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-md opacity-0 group-hover:opacity-25 transition-opacity" />
          <div className="relative flex items-center gap-2 px-4 py-2.5 rounded-full border border-emerald-500/30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/15 hover:border-emerald-500/50 transition-all">
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-xs font-semibold hidden sm:inline">Entrar na Roleta</span>
          </div>
        </motion.div>
      </Link>
    )
  }

  // Determine visual state
  let icon = ClipboardCheck
  let label = ''
  let sublabel = ''
  let pillClasses = ''
  let iconClasses = ''
  let glowColor = ''
  let pulse = false

  if (status.isMyTurn) {
    icon = Zap
    label = 'SUA VEZ!'
    sublabel = status.localNome || ''
    pillClasses = 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 shadow-xl shadow-amber-500/40 border-amber-300'
    iconClasses = 'text-amber-800'
    glowColor = 'from-amber-400 to-yellow-400'
    pulse = true
  } else if (status.em_atendimento) {
    icon = MessageSquare
    label = 'Atendendo'
    pillClasses = 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-blue-400/50'
    iconClasses = 'text-blue-100'
  } else if (status.pausado) {
    icon = Pause
    label = 'Pausado'
    pillClasses = 'bg-gradient-to-r from-zinc-400 to-zinc-500 dark:from-zinc-500 dark:to-zinc-600 text-white shadow-lg border-zinc-300/50 dark:border-zinc-500/50'
    iconClasses = 'text-zinc-100'
  } else if (status.feedback_pendente) {
    icon = AlertTriangle
    label = 'Feedback'
    pillClasses = 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 border-orange-400/50'
    iconClasses = 'text-orange-100'
    glowColor = 'from-orange-400 to-amber-400'
    pulse = true
  } else {
    // In queue, waiting
    icon = Users
    label = `#${status.posicaoReal ?? status.posicao ?? '?'}`
    sublabel = status.localNome || ''
    pillClasses = 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 border-emerald-400/50'
    iconClasses = 'text-emerald-100'
    glowColor = 'from-emerald-400 to-teal-400'
  }

  const Icon = icon

  return (
    <Link href="/corretor/recepcao" className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${status.status}-${status.isMyTurn}`}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative"
        >
          {/* Glow effect */}
          {pulse && glowColor && (
            <motion.div
              className={cn("absolute inset-0 rounded-full bg-gradient-to-r blur-lg", glowColor)}
              animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {!pulse && glowColor && (
            <div className={cn("absolute inset-0 rounded-full bg-gradient-to-r blur-md opacity-20", glowColor)} />
          )}

          <div className={cn(
            'relative flex items-center gap-2.5 px-4 py-2.5 rounded-full border backdrop-blur-lg transition-all',
            pillClasses
          )}>
            <Icon className={cn('h-4 w-4 shrink-0', iconClasses)} />

            {/* Desktop: full info */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-bold whitespace-nowrap">{label}</span>
              {sublabel && (
                <>
                  <span className="opacity-40">|</span>
                  <span className="text-[11px] font-medium opacity-75 truncate max-w-[100px]">{sublabel}</span>
                </>
              )}
            </div>

            {/* Mobile: compact */}
            <span className="sm:hidden text-sm font-bold whitespace-nowrap">
              {label}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </Link>
  )
}
