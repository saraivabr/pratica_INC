import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#1B4332] text-white hover:bg-[#2D6A4F] shadow-sm",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border-2 border-[#E5E2DC] bg-white hover:bg-[#FAF9F7] hover:border-[#1B4332]/30",
        secondary: "bg-[#F0EDE8] text-[#1A1A1A] hover:bg-[#E5E2DC]",
        ghost: "hover:bg-[#F0EDE8]",
        link: "text-[#1B4332] underline-offset-4 hover:underline",
        accent: "bg-[#C9A962] text-white hover:bg-[#D4B978] shadow-sm",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-14 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
