"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  CalendarDays,
  Wallet,
  FileBarChart,
  Shield,
} from "lucide-react"

const navItems = [
  {
    href: "/admin/intermediacao",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/intermediacao/vendas",
    label: "Vendas",
    icon: ShoppingCart,
  },
  {
    href: "/admin/intermediacao/beneficiarios",
    label: "Beneficiarios",
    icon: Users,
  },
  {
    href: "/admin/intermediacao/parcelas",
    label: "Parcelas",
    icon: CalendarDays,
    badge: true, // Mostrara contagem de parcelas vencidas
  },
  {
    href: "/admin/intermediacao/pagamentos",
    label: "Pagamentos",
    icon: Wallet,
  },
  {
    href: "/admin/intermediacao/relatorios",
    label: "Relatorios",
    icon: FileBarChart,
  },
  {
    href: "/admin/intermediacao/auditoria",
    label: "Auditoria",
    icon: Shield,
  },
]

interface IntermediacaoNavProps {
  className?: string
  parcelasVencidas?: number
}

export function IntermediacaoNav({
  className,
  parcelasVencidas = 0,
}: IntermediacaoNavProps) {
  const pathname = usePathname()

  return (
    <div className={cn("flex items-center gap-1 py-2 min-w-max", className)}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin/intermediacao" &&
            pathname?.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            {item.badge && parcelasVencidas > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5">
                {parcelasVencidas > 99 ? "99+" : parcelasVencidas}
              </Badge>
            )}
          </Link>
        )
      })}
    </div>
  )
}
