'use client'

import { useEffect, useRef } from 'react'
import { triggerHaptic } from '@/lib/haptics'

interface GestureHandlers {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: () => void
  onDoubleTap?: () => void
}

export function useGestures(handlers: GestureHandlers, element?: React.RefObject<HTMLElement>) {
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const lastTapTime = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const target = element?.current || window

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX

      longPressTimer.current = setTimeout(() => {
        triggerHaptic('medium')
        handlers.onLongPress?.()
      }, 500)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)

      const touchEndY = e.changedTouches[0].clientY
      const touchEndX = e.changedTouches[0].clientX
      const diffY = touchStartY.current - touchEndY
      const diffX = Math.abs(touchStartX.current - touchEndX)

      if (diffY > 50 && diffX < 50) {
        triggerHaptic('light')
        handlers.onSwipeUp?.()
      }

      if (diffY < -50 && diffX < 50) {
        triggerHaptic('light')
        handlers.onSwipeDown?.()
      }

      const now = Date.now()
      if (now - lastTapTime.current < 300) {
        triggerHaptic('medium')
        handlers.onDoubleTap?.()
      }
      lastTapTime.current = now
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }

    target.addEventListener('touchstart', handleTouchStart as EventListener)
    target.addEventListener('touchend', handleTouchEnd as EventListener)
    target.addEventListener('touchmove', handleTouchMove as EventListener)

    return () => {
      target.removeEventListener('touchstart', handleTouchStart as EventListener)
      target.removeEventListener('touchend', handleTouchEnd as EventListener)
      target.removeEventListener('touchmove', handleTouchMove as EventListener)
    }
  }, [handlers, element])
}