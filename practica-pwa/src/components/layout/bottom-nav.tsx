"use client"

import { LayoutGrid, Heart, User, Building, FileText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/catalogo", icon: LayoutGrid, label: "Portfólio" },
  { href: "/espelho", icon: Building, label: "Espelho" },
  { href: "/pre-reservas", icon: FileText, label: "Pré-Reservas" },
  { href: "/perfil", icon: User, label: "Perfil" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#fbfbfd]/90 backdrop-blur-xl border-t border-[#d2d2d7]/50 pb-safe">
      <div className="flex justify-around items-center h-[60px] max-w-lg mx-auto px-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2",
                "transition-all duration-200",
                isActive ? "text-[#0071e3]" : "text-[#86868b]"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    isActive && "scale-105"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 transition-all",
                  isActive ? "font-semibold" : "font-medium"
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
