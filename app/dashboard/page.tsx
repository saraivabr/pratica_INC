"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { LayoutDashboard, Users, TrendingUp, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { user } = useAuth()

  const quickLinks = [
    { href: "/pipeline", icon: LayoutDashboard, label: "Pipeline", desc: "Funil de vendas" },
    { href: "/chat", icon: MessageSquare, label: "Chat", desc: "Conversas WhatsApp" },
    { href: "/leads", icon: Users, label: "Leads", desc: "Gestão de leads" },
    { href: "/performance", icon: TrendingUp, label: "Performance", desc: "Métricas e resultados" },
  ]

  return (
    <AppShell title="Dashboard">
      <div className="container px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {user?.nome || user?.email}!
          </h1>
          <p className="text-muted-foreground mt-2">
            {user?.role === 'admin' || user?.role === 'gerente' 
              ? 'Painel de gestão completo' 
              : 'Seu painel de vendas'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:shadow-lg transition cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{link.label}</CardTitle>
                  <link.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
