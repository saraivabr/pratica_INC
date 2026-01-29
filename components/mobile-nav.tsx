"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, Calculator, Home, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: Home, label: "Início" },
  { href: "/empreendimentos", icon: Building2, label: "Imóveis" },
  { href: "/calculadora", icon: Calculator, label: "Calculadora" },
  { href: "/perfil", icon: User, label: "Perfil" },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn("font-medium", isActive && "text-primary")}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
