"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cva, type VariantProps } from "class-variance-authority"

const infoCardVariants = cva(
  "group relative rounded-xl border transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "border-border/50 bg-card/80 hover:border-border hover:bg-card hover:shadow-md dark:bg-card/60 dark:hover:bg-card/80",
        elevated:
          "border-border/40 bg-gradient-to-br from-card to-muted/20 shadow-sm hover:shadow-lg hover:border-primary/20 dark:from-card/80 dark:to-muted/30",
        outlined:
          "border-border bg-transparent hover:bg-muted/30 hover:border-primary/30 dark:hover:bg-muted/20",
        filled:
          "border-transparent bg-muted/50 hover:bg-muted/70 dark:bg-muted/30 dark:hover:bg-muted/50",
      },
      size: {
        sm: "p-2.5",
        default: "p-3",
        lg: "p-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const copyButtonVariants = cva(
  "absolute flex items-center justify-center rounded-md transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  {
    variants: {
      size: {
        sm: "top-1.5 right-1.5 h-6 w-6",
        default: "top-2 right-2 h-7 w-7",
        lg: "top-2.5 right-2.5 h-8 w-8",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const iconContainerVariants = cva(
  "flex items-center justify-center rounded-lg transition-colors duration-200",
  {
    variants: {
      size: {
        sm: "h-5 w-5",
        default: "h-6 w-6",
        lg: "h-7 w-7",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface InfoCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof infoCardVariants> {
  /** Icon component to display */
  icon: React.ElementType
  /** Label text */
  label: string
  /** Value to display */
  value: string | null | undefined
  /** Callback when copy button is clicked */
  onCopy?: () => void
  /** Whether the value was recently copied */
  copied?: boolean
  /** Show loading skeleton */
  loading?: boolean
  /** Custom icon color class */
  iconColor?: string
  /** Whether the card is interactive (adds hover pointer) */
  interactive?: boolean
}

function InfoCard({
  icon: Icon,
  label,
  value,
  onCopy,
  copied = false,
  loading = false,
  variant,
  size,
  iconColor = "text-muted-foreground",
  interactive = false,
  className,
  ...props
}: InfoCardProps) {
  const [showCopiedFeedback, setShowCopiedFeedback] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)

  // Sync copied prop with internal state for animation
  React.useEffect(() => {
    if (copied) {
      setShowCopiedFeedback(true)
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setShowCopiedFeedback(false)
    }
  }, [copied])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCopy && value) {
      onCopy()
      setIsAnimating(true)
      setShowCopiedFeedback(true)
    }
  }

  const iconSizeClass = {
    sm: "h-3 w-3",
    default: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }[size || "default"]

  const labelSizeClass = {
    sm: "text-[10px]",
    default: "text-xs",
    lg: "text-sm",
  }[size || "default"]

  const valueSizeClass = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-base",
  }[size || "default"]

  const copyIconSize = {
    sm: "h-3 w-3",
    default: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }[size || "default"]

  if (loading) {
    return (
      <div className={cn(infoCardVariants({ variant, size }), className)} {...props}>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className={cn("rounded-md", iconSizeClass === "h-3 w-3" ? "h-5 w-5" : iconSizeClass === "h-4 w-4" ? "h-7 w-7" : "h-6 w-6")} />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className={cn("h-4 w-3/4", size === "lg" && "h-5")} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        infoCardVariants({ variant, size }),
        interactive && "cursor-pointer",
        className
      )}
      {...props}
    >
      {/* Header with icon and label */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={cn(
            iconContainerVariants({ size }),
            "bg-muted/50 group-hover:bg-primary/10 dark:bg-muted/30 dark:group-hover:bg-primary/20"
          )}
        >
          <Icon
            className={cn(
              iconSizeClass,
              iconColor,
              "transition-colors duration-200 group-hover:text-primary"
            )}
          />
        </div>
        <span
          className={cn(
            labelSizeClass,
            "text-muted-foreground font-medium uppercase tracking-wide"
          )}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <p
        className={cn(
          valueSizeClass,
          "font-semibold truncate pr-8 transition-colors duration-200",
          value
            ? "text-foreground"
            : "text-muted-foreground/40"
        )}
        title={value || undefined}
      >
        {value || <span className="font-normal italic">--</span>}
      </p>

      {/* Copy button */}
      {value && onCopy && (
        <button
          onClick={handleCopy}
          className={cn(
            copyButtonVariants({ size }),
            "opacity-0 group-hover:opacity-100",
            "bg-transparent hover:bg-muted/80 active:bg-muted",
            "dark:hover:bg-muted/50 dark:active:bg-muted/70",
            showCopiedFeedback && "opacity-100 bg-emerald-100 dark:bg-emerald-900/30"
          )}
          aria-label={showCopiedFeedback ? "Copiado" : "Copiar"}
        >
          <span className="relative flex items-center justify-center">
            {/* Copy icon with animation */}
            <Copy
              className={cn(
                copyIconSize,
                "text-muted-foreground transition-all duration-300",
                "hover:text-foreground",
                showCopiedFeedback && "scale-0 opacity-0"
              )}
            />
            {/* Check icon with animation */}
            <Check
              className={cn(
                copyIconSize,
                "absolute text-emerald-600 dark:text-emerald-400 transition-all duration-300",
                showCopiedFeedback
                  ? cn("scale-100 opacity-100", isAnimating && "animate-bounce")
                  : "scale-0 opacity-0"
              )}
            />
          </span>
        </button>
      )}

      {/* Subtle gradient overlay on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
          "bg-gradient-to-br from-primary/[0.02] to-transparent"
        )}
      />
    </div>
  )
}

// Skeleton component specifically for InfoCard
function InfoCardSkeleton({
  variant,
  size,
  className,
}: VariantProps<typeof infoCardVariants> & { className?: string }) {
  const labelSizeClass = {
    sm: "h-3 w-10",
    default: "h-3 w-12",
    lg: "h-4 w-14",
  }[size || "default"]

  const valueSizeClass = {
    sm: "h-4 w-20",
    default: "h-4 w-24",
    lg: "h-5 w-28",
  }[size || "default"]

  const iconSizeClass = {
    sm: "h-5 w-5",
    default: "h-6 w-6",
    lg: "h-7 w-7",
  }[size || "default"]

  return (
    <div className={cn(infoCardVariants({ variant, size }), className)}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className={cn("rounded-lg", iconSizeClass)} />
        <Skeleton className={labelSizeClass} />
      </div>
      <Skeleton className={valueSizeClass} />
    </div>
  )
}

export { InfoCard, InfoCardSkeleton, infoCardVariants }
