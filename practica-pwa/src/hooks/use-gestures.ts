import { useRef, useEffect, useCallback } from 'react'

interface GestureHandlers {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onLongPress?: () => void
  onDoubleTap?: () => void
}

const SWIPE_THRESHOLD = 50
const LONG_PRESS_DURATION = 500

export function useGestures(
  ref: React.RefObject<HTMLElement>,
  handlers: GestureHandlers
) {
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const lastTapTime = useRef(0)

  // Haptic feedback
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  // Handle swipe
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX || 0
    touchStartY.current = e.touches[0]?.clientY || 0
    touchStartTime.current = Date.now()
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touchEndX = e.changedTouches[0]?.clientX || 0
    const touchEndY = e.changedTouches[0]?.clientY || 0
    const touchDuration = Date.now() - touchStartTime.current

    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    // Long press detection
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && touchDuration > LONG_PRESS_DURATION) {
      vibrate([50, 30, 50])
      handlers.onLongPress?.()
      return
    }

    // Double tap detection
    const now = Date.now()
    if (now - lastTapTime.current < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      vibrate([100])
      handlers.onDoubleTap?.()
      lastTapTime.current = 0
      return
    }
    lastTapTime.current = now

    // Swipe detection
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        vibrate(20)
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
      }
    } else {
      if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
        vibrate(20)
        if (deltaY > 0) {
          handlers.onSwipeDown?.()
        } else {
          handlers.onSwipeUp?.()
        }
      }
    }
  }, [handlers, vibrate])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, handleTouchStart, handleTouchEnd])

  return { vibrate }
}
