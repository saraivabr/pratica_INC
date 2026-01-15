"use client"

import { LayoutGrid, Heart, User, Building } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/catalogo", icon: LayoutGrid, label: "Portfolio" },
  { href: "/espelho", icon: Building, label: "Espelho" },
  { href: "/favoritos", icon: Heart, label: "Salvos" },
  { href: "/perfil", icon: User, label: "Perfil" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[#E5E2DC] pb-safe">
      <div className="flex justify-around items-center h-18 max-w-lg mx-auto relative">
        {/* Animated Background Indicator */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#1B4332] via-[#C9A962] to-[#1B4332] rounded-full transition-all duration-500 ease-out"
          style={{
            width: '25%',
            transform: `translateX(${tabs.findIndex(t => pathname?.startsWith(t.href)) * 100}%)`,
          }}
        />
        
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center w-full py-3 relative",
                "transition-all duration-300",
                isActive ? "text-[#1B4332]" : "text-[#8A8A8A]"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center w-10 h-8 rounded-full transition-all duration-300",
                  isActive && "bg-[#1B4332]/10 scale-110"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-300",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {/* Animated Dot */}
                {isActive && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#C9A962] animate-scale-in shadow-lg" />
                )}
                
                {/* Ripple effect on active */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-[#1B4332]/10 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 tracking-wide uppercase transition-all duration-300",
                  isActive ? "font-semibold opacity-100" : "font-medium opacity-80"
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
