"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  ShoppingCart,
  Calculator,
  Users,
  CalendarDays,
  Wallet,
  FileBarChart,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const sidebarItems = [
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
    href: "/admin/intermediacao/comissao",
    label: "Planilha Comissao",
    icon: Calculator,
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
    badge: true,
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

interface IntermediacaoSidebarProps {
  className?: string
  parcelasVencidas?: number
}

export function IntermediacaoSidebar({
  className,
  parcelasVencidas = 0,
}: IntermediacaoSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-muted/30 transition-all duration-300",
        collapsed ? "w-16" : "w-56",
        className
      )}
    >
      <div className="flex-1 py-4">
        <nav className="flex flex-col gap-1 px-2">
          {sidebarItems.map((item) => {
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && parcelasVencidas > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-[20px] px-1.5"
                      >
                        {parcelasVencidas > 99 ? "99+" : parcelasVencidas}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && item.badge && parcelasVencidas > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Botao para colapsar/expandir */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
