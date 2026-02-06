"use client"

import React from "react"
import { cn } from "@/lib/utils"

const variantStyles = {
  primary: {
    outer: "from-emerald-500 via-green-500 to-teal-500",
    inner: "from-emerald-400 via-green-400 to-teal-400",
    button: "from-emerald-500 via-green-500 to-emerald-600",
    shadow: "hover:shadow-emerald-500/25",
  },
  secondary: {
    outer: "from-gray-400 via-gray-500 to-gray-600",
    inner: "from-gray-300 via-gray-400 to-gray-500",
    button: "from-gray-600 via-gray-700 to-gray-800",
    shadow: "hover:shadow-gray-500/25",
  },
  amber: {
    outer: "from-amber-500 via-orange-500 to-yellow-500",
    inner: "from-amber-400 via-orange-400 to-yellow-400",
    button: "from-amber-500 via-orange-500 to-amber-600",
    shadow: "hover:shadow-amber-500/25",
  },
  red: {
    outer: "from-red-500 via-rose-500 to-pink-500",
    inner: "from-red-400 via-rose-400 to-pink-400",
    button: "from-red-500 via-rose-500 to-red-600",
    shadow: "hover:shadow-red-500/25",
  },
  danger: {
    outer: "from-red-500 via-rose-500 to-pink-500",
    inner: "from-red-400 via-rose-400 to-pink-400",
    button: "from-red-500 via-rose-500 to-red-600",
    shadow: "hover:shadow-red-500/25",
  },
  success: {
    outer: "from-green-500 via-emerald-500 to-teal-500",
    inner: "from-green-400 via-emerald-400 to-teal-400",
    button: "from-green-500 via-emerald-500 to-teal-600",
    shadow: "hover:shadow-green-500/25",
  },
} as const

const sizeStyles = {
  sm: {
    button: "h-10 px-4 rounded-lg text-sm",
    outer: "rounded-xl",
    inner: "rounded-lg",
    shine: "rounded-lg",
  },
  md: {
    button: "h-12 px-6 rounded-xl text-sm",
    outer: "rounded-2xl",
    inner: "rounded-xl",
    shine: "rounded-xl",
  },
  lg: {
    button: "h-14 px-8 rounded-xl text-base",
    outer: "rounded-2xl",
    inner: "rounded-xl",
    shine: "rounded-xl",
  },
} as const

type GlowButtonVariant = keyof typeof variantStyles
type GlowButtonSize = keyof typeof sizeStyles

interface GlowButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
  variant?: GlowButtonVariant
  size?: GlowButtonSize
}

export function GlowButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
  variant = "primary",
  size = "lg",
}: GlowButtonProps) {
  const colors = variantStyles[variant]
  const sizing = sizeStyles[size]

  return (
    <div className="relative group">
      {/* Outer glow */}
      <div
        className={cn(
          "absolute -inset-1 bg-gradient-to-r blur-lg opacity-60 transition-all duration-500",
          sizing.outer,
          colors.outer,
          disabled ? "opacity-20" : "group-hover:opacity-100 group-hover:blur-xl"
        )}
      />

      {/* Inner glow ring */}
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r opacity-0 transition-opacity duration-300",
          sizing.inner,
          colors.inner,
          !disabled && "group-hover:opacity-75"
        )}
      />

      {/* Button */}
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative w-full font-medium",
          sizing.button,
          "bg-gradient-to-r",
          colors.button,
          "text-white shadow-lg",
          "transform transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          !disabled &&
            `hover:scale-[1.02] hover:shadow-2xl ${colors.shadow} active:scale-[0.98]`,
          className
        )}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>

        {/* Shine effect */}
        <div className={cn("absolute inset-0 overflow-hidden", sizing.shine)}>
          <div
            className={cn(
              "absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent",
              !disabled && "group-hover:animate-shine"
            )}
          />
        </div>
      </button>
    </div>
  )
}
