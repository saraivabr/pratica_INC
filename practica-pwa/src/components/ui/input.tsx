import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-[#E5E2DC] bg-white px-4 py-2 text-base text-[#1A1A1A] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8A8A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]/30 focus-visible:border-[#1B4332] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
