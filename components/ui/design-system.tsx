"use client";

import { cn } from "@/lib/utils";
import React from "react";

/**
 * Design System Components
 * 
 * Shared components with the modern design from login page:
 * - Animated backgrounds with gradient blobs
 * - Glow buttons with hover effects
 * - Animated cards with glow effects
 * - Smooth transitions and animations
 */

// ============================================
// ANIMATED BACKGROUND BLOBS
// ============================================

export function AnimatedBackground({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none", className)}>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-300/40 to-green-400/40 rounded-full blur-3xl animate-blob will-change-transform" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-gradient-to-br from-green-300/30 to-teal-400/30 rounded-full blur-3xl animate-blob animation-delay-2000 will-change-transform" />
      <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-cyan-300/30 rounded-full blur-3xl animate-blob animation-delay-4000 will-change-transform" />
    </div>
  );
}

// ============================================
// GLOW BUTTON
// ============================================

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
}

export function GlowButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
  variant = "primary",
}: GlowButtonProps) {
  const isPrimary = variant === "primary";
  
  return (
    <div className="relative group">
      {/* Outer glow */}
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl blur-lg transition-all duration-500",
          isPrimary
            ? "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 opacity-60"
            : "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 opacity-40",
          disabled ? "opacity-20" : "group-hover:opacity-100 group-hover:blur-xl"
        )}
      />

      {/* Inner glow ring */}
      <div
        className={cn(
          "absolute -inset-0.5 rounded-xl opacity-0 transition-opacity duration-300",
          isPrimary
            ? "bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400"
            : "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500",
          !disabled && "group-hover:opacity-75"
        )}
      />

      {/* Button */}
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative w-full h-14 px-8 rounded-xl font-medium text-base",
          isPrimary
            ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600"
            : "bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800",
          "text-white shadow-lg",
          "transform transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          !disabled && "hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/25 active:scale-[0.98]",
          className
        )}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>

        {/* Shine effect */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent",
              !disabled && "group-hover:animate-shine"
            )}
          />
        </div>
      </button>
    </div>
  );
}

// ============================================
// GLOW CARD
// ============================================

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "emerald" | "blue" | "purple" | "orange";
  hover?: boolean;
}

export function GlowCard({
  children,
  className,
  glowColor = "emerald",
  hover = true,
}: GlowCardProps) {
  const glowColors = {
    emerald: "from-emerald-400 via-green-400 to-teal-400",
    blue: "from-blue-400 via-cyan-400 to-teal-400",
    purple: "from-purple-400 via-pink-400 to-rose-400",
    orange: "from-orange-400 via-amber-400 to-yellow-400",
  };

  return (
    <div className={cn("relative group", className)}>
      {/* Card glow effect */}
      <div
        className={cn(
          "absolute -inset-1 bg-gradient-to-r rounded-[2rem] blur-xl opacity-20 transition-opacity duration-300",
          glowColors[glowColor],
          hover && "group-hover:opacity-30"
        )}
      />

      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-900/10 dark:shadow-emerald-400/5 border border-white/60 dark:border-gray-800/60 overflow-hidden">
        {/* Animated top border */}
        <div className={cn("h-1 bg-gradient-to-r animate-gradient", glowColors[glowColor])} />

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// PAGE CONTAINER
// ============================================

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  showBackground?: boolean;
}

export function PageContainer({
  children,
  className,
  showBackground = true,
}: PageContainerProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50",
      "dark:from-gray-950 dark:via-gray-900 dark:to-gray-950",
      className
    )}>
      {showBackground && <AnimatedBackground />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ============================================
// ICON CONTAINER WITH GLOW
// ============================================

interface IconGlowProps {
  children: React.ReactNode;
  color?: "emerald" | "blue" | "purple" | "orange" | "amber";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IconGlow({
  children,
  color = "emerald",
  size = "md",
  className,
}: IconGlowProps) {
  const colors = {
    emerald: "from-emerald-400 to-green-500",
    blue: "from-blue-400 to-cyan-500",
    purple: "from-purple-400 to-pink-500",
    orange: "from-orange-400 to-red-500",
    amber: "from-amber-400 to-orange-500",
  };

  const sizes = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br rounded-2xl blur-xl opacity-50",
            colors[color]
          )}
        />
        <div
          className={cn(
            "relative rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-2xl",
            colors[color],
            sizes[size]
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANIMATIONS STYLES (inject globally)
// ============================================

export function DesignSystemStyles() {
  return (
    <style jsx global>{`
      @keyframes blob {
        0%, 100% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(20px, -30px) scale(1.1); }
        50% { transform: translate(-20px, 20px) scale(0.9); }
        75% { transform: translate(30px, 10px) scale(1.05); }
      }

      @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes shine {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }

      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes fadeInLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes fadeInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
      }

      @keyframes pulse-glow {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .animate-blob { animation: blob 12s infinite ease-in-out; }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-4000 { animation-delay: 4s; }

      .animate-gradient {
        background-size: 200% 200%;
        animation: gradient 3s ease infinite;
      }

      .animate-shine { animation: shine 1.5s ease-in-out; }
      .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; }
      .animate-fadeInDown { animation: fadeInDown 0.5s ease-out forwards; }
      .animate-fadeInLeft { animation: fadeInLeft 0.5s ease-out forwards; }
      .animate-fadeInRight { animation: fadeInRight 0.5s ease-out forwards; }
      .animate-shake { animation: shake 0.5s ease-in-out; }
      .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
    `}</style>
  );
}
