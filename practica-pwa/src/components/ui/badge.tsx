import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#1B4332]/10 text-[#1B4332]",
        secondary: "bg-[#F0EDE8] text-[#5C5C5C]",
        destructive: "bg-red-100 text-red-700",
        outline: "border border-[#E5E2DC] text-[#5C5C5C]",
        success: "bg-[#E8F5E9] text-[#2E7D32]",
        warning: "bg-[#C9A962]/20 text-[#8B7355]",
        info: "bg-[#1B4332] text-white",
        accent: "bg-[#C9A962] text-white",
        lancamento: "bg-[#1B4332] text-white font-semibold tracking-wider uppercase text-[10px]",
        construcao: "bg-[#C9A962] text-[#1B4332] font-semibold tracking-wider uppercase text-[10px]",
        pronto: "bg-[#E8F5E9] text-[#2E7D32] font-semibold tracking-wider uppercase text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
