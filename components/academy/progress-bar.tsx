'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const progressBarVariants = cva(
  'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
  {
    variants: {
      size: {
        default: 'h-2',
        sm: 'h-1.5',
        lg: 'h-3',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

const progressFillVariants = cva(
  'h-full transition-all duration-500 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        success: 'bg-emerald-500 dark:bg-emerald-400',
        warning: 'bg-amber-500 dark:bg-amber-400',
        gradient: 'bg-gradient-to-r from-primary to-primary/60',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants>,
    VariantProps<typeof progressFillVariants> {
  value: number
  max?: number
  showPercentage?: boolean
  percentagePosition?: 'inside' | 'outside' | 'hidden'
  animate?: boolean
}

function ProgressBar({
  className,
  value,
  max = 100,
  size,
  variant,
  showPercentage = false,
  percentagePosition = 'outside',
  animate = true,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const isComplete = percentage === 100
  const effectiveVariant = isComplete ? 'success' : variant

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <div
        data-slot="progress-bar"
        className={cn(progressBarVariants({ size }))}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          data-slot="progress-fill"
          className={cn(
            progressFillVariants({ variant: effectiveVariant }),
            animate && 'animate-in slide-in-from-left-full'
          )}
          style={{ width: `${percentage}%` }}
        />
        {showPercentage && percentagePosition === 'inside' && percentage > 15 && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      {showPercentage && percentagePosition === 'outside' && (
        <span
          data-slot="progress-percentage"
          className={cn(
            'text-xs font-medium tabular-nums',
            isComplete
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground'
          )}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

export { ProgressBar, progressBarVariants, progressFillVariants }
