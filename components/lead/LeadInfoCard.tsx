"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const leadInfoCardVariants = cva(
  "group relative flex items-center gap-3 rounded-xl transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "bg-card border border-border/50 hover:border-border hover:shadow-sm dark:hover:shadow-none dark:hover:border-border/80",
        outlined:
          "bg-transparent border-2 border-border/60 hover:border-primary/50 hover:bg-accent/30 dark:border-border/40 dark:hover:border-primary/40",
        filled:
          "bg-accent/50 border border-transparent hover:bg-accent/80 dark:bg-accent/30 dark:hover:bg-accent/50",
        gradient:
          "bg-gradient-to-br from-card via-card to-accent/20 border border-border/30 hover:shadow-md hover:border-border/50 dark:from-card dark:to-accent/10",
        glass:
          "bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 shadow-sm",
      },
      size: {
        sm: "p-2 gap-2",
        md: "p-3 gap-3",
        lg: "p-4 gap-3",
      },
      interactive: {
        true: "cursor-pointer active:scale-[0.98]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      interactive: false,
    },
  }
)

const iconContainerVariants = cva(
  "flex shrink-0 items-center justify-center rounded-lg transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary group-hover:bg-primary/15 dark:bg-primary/20 dark:group-hover:bg-primary/25",
        outlined:
          "bg-primary/5 text-primary group-hover:bg-primary/10 dark:bg-primary/10 dark:group-hover:bg-primary/20",
        filled:
          "bg-primary/15 text-primary group-hover:bg-primary/20 dark:bg-primary/25 dark:group-hover:bg-primary/30",
        gradient:
          "bg-gradient-to-br from-primary/20 to-primary/5 text-primary group-hover:from-primary/25 group-hover:to-primary/10",
        glass:
          "bg-primary/10 text-primary backdrop-blur-sm group-hover:bg-primary/15",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

const iconVariants = cva("transition-transform duration-300 group-hover:scale-105", {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

const labelVariants = cva(
  "font-medium uppercase tracking-wider text-muted-foreground transition-colors duration-300",
  {
    variants: {
      size: {
        sm: "text-[10px]",
        md: "text-xs",
        lg: "text-xs",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const valueVariants = cva(
  "font-semibold text-foreground transition-colors duration-300 group-hover:text-foreground/90",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

interface LeadInfoCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onCopy">,
    VariantProps<typeof leadInfoCardVariants> {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  placeholder?: string
  loading?: boolean
  copyable?: boolean
  truncate?: boolean
  maxWidth?: string
  iconColor?: string
  iconBgColor?: string
  onClick?: () => void
  onCopy?: (value: string) => void
}

export function LeadInfoCard({
  icon: Icon,
  label,
  value,
  placeholder = "Nao informado",
  variant,
  size,
  loading = false,
  copyable = false,
  truncate = true,
  maxWidth,
  iconColor,
  iconBgColor,
  onClick,
  onCopy,
  className,
  ...props
}: LeadInfoCardProps) {
  const [copied, setCopied] = React.useState(false)
  const [isTruncated, setIsTruncated] = React.useState(false)
  const valueRef = React.useRef<HTMLParagraphElement>(null)

  const displayValue = value || placeholder
  const hasValue = Boolean(value)
  const isInteractive = Boolean(onClick)

  // Check if text is truncated
  React.useEffect(() => {
    const element = valueRef.current
    if (element && truncate) {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }
  }, [displayValue, truncate])

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopy?.(value)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onClick?.()
    }
  }

  if (loading) {
    return (
      <div
        className={cn(
          leadInfoCardVariants({ variant, size }),
          "pointer-events-none",
          className
        )}
        {...props}
      >
        <Skeleton
          className={cn(
            "rounded-lg",
            size === "sm" && "h-8 w-8",
            size === "md" && "h-10 w-10",
            size === "lg" && "h-12 w-12"
          )}
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton
            className={cn(
              "rounded",
              size === "sm" && "h-2.5 w-16",
              size === "md" && "h-3 w-20",
              size === "lg" && "h-3 w-24"
            )}
          />
          <Skeleton
            className={cn(
              "rounded",
              size === "sm" && "h-4 w-28",
              size === "md" && "h-5 w-36",
              size === "lg" && "h-6 w-44"
            )}
          />
        </div>
      </div>
    )
  }

  const CardContent = (
    <>
      {/* Icon Container */}
      <div
        className={cn(iconContainerVariants({ variant, size }))}
        style={{
          backgroundColor: iconBgColor,
          color: iconColor,
        }}
      >
        <Icon className={cn(iconVariants({ size }))} style={{ color: iconColor }} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn(labelVariants({ size }))}>{label}</p>
        <div className="flex items-center gap-2">
          <p
            ref={valueRef}
            className={cn(
              valueVariants({ size }),
              truncate && "truncate",
              !hasValue && "text-muted-foreground/60 italic"
            )}
            style={{ maxWidth: maxWidth }}
          >
            {displayValue}
          </p>

          {/* Copy Button */}
          {copyable && hasValue && (
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-md p-1.5",
                "text-muted-foreground/60 hover:text-muted-foreground",
                "bg-transparent hover:bg-accent/80",
                "opacity-0 transition-all duration-200 group-hover:opacity-100",
                "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                copied && "text-emerald-500 hover:text-emerald-500"
              )}
              aria-label={copied ? "Copiado!" : "Copiar valor"}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </>
  )

  const cardElement = (
    <div
      className={cn(
        leadInfoCardVariants({ variant, size, interactive: isInteractive }),
        className
      )}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      {...props}
    >
      {CardContent}
    </div>
  )

  // Wrap with tooltip if truncated
  if (truncate && isTruncated && hasValue) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{cardElement}</TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs break-words"
            sideOffset={8}
          >
            <p className="text-sm">{value}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardElement
}

// Export variants for external use
export { leadInfoCardVariants }
