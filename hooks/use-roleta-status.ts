'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface RoletaStatus {
  inQueue: boolean
  plantao_ativo: boolean
  isMyTurn: boolean
  status: string | null
  posicao: number | null
  posicaoReal: number | null
  localNome: string | null
  em_atendimento: boolean
  pausado: boolean
  feedback_pendente: boolean
  leads_ativos: number
  qualificado: boolean
  total_ofertas: number
  meta_ofertas: number
  sorteio_realizado: boolean
}

const defaultStatus: RoletaStatus = {
  inQueue: false,
  plantao_ativo: false,
  isMyTurn: false,
  status: null,
  posicao: null,
  posicaoReal: null,
  localNome: null,
  em_atendimento: false,
  pausado: false,
  feedback_pendente: false,
  leads_ativos: 0,
  qualificado: false,
  total_ofertas: 0,
  meta_ofertas: 30,
  sorteio_realizado: false,
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)

    // Two-tone notification beep
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)

    // Cleanup
    setTimeout(() => ctx.close(), 500)
  } catch {
    // Ignore audio errors (user hasn't interacted yet, etc.)
  }
}

function showBrowserNotification(localNome: string | null) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (!document.hidden) return // Only notify when tab is not focused

  const notification = new Notification('Sua vez na Roleta!', {
    body: localNome
      ? `Você é o próximo no plantão - ${localNome}`
      : 'Você é o próximo da fila!',
    icon: '/logo-pratica-icon.svg',
    tag: 'roleta-sua-vez',
    renotify: true,
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }

  setTimeout(() => notification.close(), 8000)
}

export function useRoletaStatus(enabled: boolean = true) {
  const [data, setData] = useState<RoletaStatus>(defaultStatus)
  const [loading, setLoading] = useState(true)
  const wasMyTurnRef = useRef(false)
  const hasRequestedPermission = useRef(false)

  // Request notification permission once
  useEffect(() => {
    if (!enabled || hasRequestedPermission.current) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      hasRequestedPermission.current = true
      Notification.requestPermission()
    }
  }, [enabled])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/recepcao/meu-status')
      if (!res.ok) return
      const json = await res.json()

      setData(prev => {
        const newIsMyTurn = json.isMyTurn === true

        // Detect transition: was NOT my turn -> IS my turn
        if (newIsMyTurn && !wasMyTurnRef.current) {
          playBeep()
          showBrowserNotification(json.localNome)
        }
        wasMyTurnRef.current = newIsMyTurn

        return {
          inQueue: json.inQueue ?? false,
          plantao_ativo: json.plantao_ativo ?? false,
          isMyTurn: newIsMyTurn,
          status: json.status ?? null,
          posicao: json.posicao ?? null,
          posicaoReal: json.posicaoReal ?? null,
          localNome: json.localNome ?? null,
          em_atendimento: json.em_atendimento ?? false,
          pausado: json.pausado ?? false,
          feedback_pendente: json.feedback_pendente ?? false,
          leads_ativos: json.leads_ativos ?? 0,
          qualificado: json.qualificado ?? false,
          total_ofertas: json.total_ofertas ?? 0,
          meta_ofertas: json.meta_ofertas ?? 30,
          sorteio_realizado: json.sorteio_realizado ?? false,
        }
      })
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setData(defaultStatus)
      setLoading(false)
      return
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [enabled, fetchStatus])

  return { ...data, loading, refetch: fetchStatus }
}
