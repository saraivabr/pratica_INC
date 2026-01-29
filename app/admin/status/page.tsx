"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Server,
  Clock,
  Database,
  Loader2,
  ShieldAlert,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface EndpointStatus {
  name: string
  endpoint: string
  token: string
  status: 'ok' | 'error' | 'no_token'
  statusCode?: number
  message?: string
  recordCount?: number
  responseTime?: number
}

interface StatusData {
  summary: {
    total: number
    ok: number
    error: number
    noToken: number
    timestamp: string
    baseUrl: string
    email: string
  }
  endpoints: EndpointStatus[]
}

export default function StatusPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTracking("admin-status")

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/status')
      if (!res.ok) throw new Error('Falha ao buscar status')
      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasAccess) {
      fetchStatus()
    }
  }, [hasAccess])

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Esta área é exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'no_token':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Funcionando</Badge>
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Erro</Badge>
      case 'no_token':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Sem Token</Badge>
      default:
        return null
    }
  }

  return (
    <AppShell title="Status das APIs">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Status das APIs</h1>
            <p className="text-muted-foreground">Validação de conexão com CV CRM</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchStatus}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Testar Novamente
          </Button>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <Server className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.summary.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.summary.ok}</p>
                    <p className="text-sm text-muted-foreground">Funcionando</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.summary.error}</p>
                    <p className="text-sm text-muted-foreground">Com Erro</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-yellow-500/10">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.summary.noToken}</p>
                    <p className="text-sm text-muted-foreground">Sem Token</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Config Info */}
        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base URL</p>
                  <p className="font-mono">{data.summary.baseUrl}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-mono">{data.summary.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última verificação</p>
                  <p className="font-mono">{new Date(data.summary.timestamp).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Endpoints Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Endpoints CV CRM
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                <XCircle className="h-12 w-12 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : data ? (
              <div className="space-y-3">
                {data.endpoints.map((ep) => (
                  <div
                    key={ep.endpoint}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border",
                      ep.status === 'ok' && "bg-green-500/5 border-green-500/20",
                      ep.status === 'error' && "bg-red-500/5 border-red-500/20",
                      ep.status === 'no_token' && "bg-yellow-500/5 border-yellow-500/20"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(ep.status)}
                      <div>
                        <p className="font-medium">{ep.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{ep.endpoint}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {ep.responseTime && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {ep.responseTime}ms
                        </div>
                      )}
                      {ep.recordCount !== undefined && ep.status === 'ok' && (
                        <Badge variant="outline">
                          {ep.recordCount} registros
                        </Badge>
                      )}
                      {getStatusBadge(ep.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Token Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tokens Necessários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure os seguintes tokens no arquivo <code className="bg-secondary px-1 rounded">.env.local</code>:
            </p>
            <div className="bg-secondary/50 p-4 rounded-lg font-mono text-sm space-y-1">
              <p>CVCRM_BASE_URL=https://pratica.cvcrm.com.br</p>
              <p>CVCRM_EMAIL=seu-email@empresa.com</p>
              <p>CVCRM_TOKEN_EMPREENDIMENTO=xxx</p>
              <p>CVCRM_TOKEN_CORRETOR=xxx</p>
              <p>CVCRM_TOKEN_LEAD=xxx</p>
              <p>CVCRM_TOKEN_RESERVA=xxx</p>
              <p>CVCRM_TOKEN_UNIDADE=xxx</p>
              <p>CVCRM_TOKEN_SERIE=xxx</p>
              <p>CVCRM_TOKEN_IMOBILIARIA=xxx</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
