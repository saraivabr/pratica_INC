"use client"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { Loader2, Smartphone, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function WhatsAppPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [instances, setInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInstances()
  }, [])

  async function fetchInstances() {
    try {
      const res = await fetch('/api/whatsapp/instances')
      if (res.ok) {
        const data = await res.json()
        setInstances(data.instances || [])
      }
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="WhatsApp">
      <div className="container px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas instâncias WhatsApp
            </p>
          </div>
          <Button onClick={fetchInstances} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : instances.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma instância configurada</h3>
              <p className="text-muted-foreground mb-4">
                Configure uma instância WhatsApp para começar
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instances.map((instance: any) => (
              <Card key={instance.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    {instance.instance_name || 'WhatsApp'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <div className="flex items-center gap-2">
                        {instance.connected ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">Conectado</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">Desconectado</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {instance.phone_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Número</span>
                        <span className="text-sm font-medium">{instance.phone_number}</span>
                      </div>
                    )}

                    <Button 
                      className="w-full mt-4" 
                      variant={instance.connected ? "outline" : "default"}
                      onClick={() => router.push(`/chat`)}
                    >
                      {instance.connected ? 'Abrir Chat' : 'Configurar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
