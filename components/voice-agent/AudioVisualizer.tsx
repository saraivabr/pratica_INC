'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AudioVisualizerProps {
  audioLevel: number // 0-1
  isActive: boolean
  className?: string
  barCount?: number
}

export function AudioVisualizer({
  audioLevel,
  isActive,
  className,
  barCount = 5
}: AudioVisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([])

  // Pre-calculate random multipliers for each bar (consistent across renders)
  const multipliersRef = useRef<number[]>([])
  if (multipliersRef.current.length !== barCount) {
    multipliersRef.current = Array.from({ length: barCount }, () => 0.5 + Math.random() * 0.5)
  }

  const calculateBarHeight = (index: number, level: number, active: boolean): string => {
    const minHeight = 4 // minimum height in pixels
    const maxHeight = 32 // maximum height in pixels
    const multiplier = multipliersRef.current[index] || 0.75

    if (!active) {
      // Idle state: small constant height with slight variation
      const idleHeight = minHeight + (index % 2 === 0 ? 2 : 0)
      return `${idleHeight}px`
    }

    // Active state: respond to audio level
    const variation = multiplier * (0.8 + 0.4 * Math.sin(index * 1.5))
    const height = minHeight + level * (maxHeight - minHeight) * variation
    return `${Math.max(minHeight, Math.min(maxHeight, height))}px`
  }

  // Animation effect for idle pulse
  useEffect(() => {
    if (isActive) return

    let animationId: number
    let phase = 0

    const animate = () => {
      phase += 0.05
      barsRef.current.forEach((bar, index) => {
        if (bar) {
          const pulseOffset = Math.sin(phase + index * 0.5) * 2
          const baseHeight = 4 + (index % 2 === 0 ? 2 : 0)
          bar.style.height = `${baseHeight + pulseOffset}px`
        }
      })
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isActive])

  // Update bar heights when active and audioLevel changes
  useEffect(() => {
    if (!isActive) return

    barsRef.current.forEach((bar, index) => {
      if (bar) {
        bar.style.height = calculateBarHeight(index, audioLevel, isActive)
      }
    })
  }, [audioLevel, isActive])

  return (
    <div
      className={cn(
        'flex items-end justify-center gap-1 h-8',
        className
      )}
      role="img"
      aria-label={isActive ? 'Audio visualizer active' : 'Audio visualizer idle'}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barsRef.current[i] = el
          }}
          className={cn(
            'w-1 rounded-full transition-all duration-75 ease-out',
            'bg-gradient-to-t from-emerald-500 to-green-400',
            !isActive && 'opacity-50'
          )}
          style={{
            height: calculateBarHeight(i, audioLevel, isActive),
            minWidth: '4px'
          }}
        />
      ))}
    </div>
  )
}
