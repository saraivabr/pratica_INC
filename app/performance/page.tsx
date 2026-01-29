"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { Loader2, TrendingUp, Users, DollarSign, Target } from "lucide-react"

export default function PerformancePage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/corretor/performance')
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Erro ao buscar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Performance">
      <div className="container px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground mt-2">
            {user?.role === 'admin' || user?.role === 'gerente' 
              ? 'Métricas e resultados da equipe' 
              : 'Suas métricas e resultados'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Conversão</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.taxa_conversao ? `${metrics.taxa_conversao.toFixed(1)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa de fechamento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.total_leads || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de leads
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Vendas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.total_vendas || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vendas concluídas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.valor_total 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.valor_total)
                    : 'R$ 0,00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vendas realizadas
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}
