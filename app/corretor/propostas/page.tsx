"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  FileText,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Proposta {
  id: string
  lead_nome: string
  empreendimento_nome: string
  valor_proposta: number
  valor_entrada: number
  prazo_meses: number
  status: string
  created_at: string
  enviada_em?: string
  respondida_em?: string
}

export default function PropostasPage() {
  const [loading, setLoading] = useState(true)
  const [propostas, setPropostas] = useState<Proposta[]>([])

  useEffect(() => {
    async function fetchPropostas() {
      try {
        const res = await fetch("/api/corretor/propostas")
        const data = await res.json()
        
        if (data.success) {
          setPropostas(data.propostas)
        }
      } catch (error) {
        console.error("Erro ao carregar propostas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPropostas()
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    )
  }

  const rascunhos = propostas.filter(p => p.status === 'rascunho')
  const enviadas = propostas.filter(p => p.status === 'enviada')
  const aceitas = propostas.filter(p => p.status === 'aceita')
  const recusadas = propostas.filter(p => p.status === 'recusada')

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Propostas</h1>
            <p className="text-slate-500">Gerencie suas propostas comerciais</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Rascunhos"
            value={rascunhos.length}
            color="slate"
          />
          <StatCard
            icon={<Send className="h-5 w-5" />}
            label="Enviadas"
            value={enviadas.length}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Aceitas"
            value={aceitas.length}
            color="emerald"
          />
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Recusadas"
            value={recusadas.length}
            color="red"
          />
        </div>

        {/* Lista de propostas */}
        <div className="space-y-4">
          {propostas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500 text-center">
                  Nenhuma proposta criada ainda
                </p>
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeira Proposta
                </Button>
              </CardContent>
            </Card>
          ) : (
            propostas.map((proposta) => (
              <PropostaCard key={proposta.id} proposta={proposta} />
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2 rounded-lg", colors[color as keyof typeof colors])}>
            {icon}
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function PropostaCard({ proposta }: { proposta: Proposta }) {
  const statusConfig = {
    rascunho: { label: "Rascunho", color: "bg-slate-100 text-slate-700" },
    enviada: { label: "Enviada", color: "bg-blue-100 text-blue-700" },
    aceita: { label: "Aceita", color: "bg-emerald-100 text-emerald-700" },
    recusada: { label: "Recusada", color: "bg-red-100 text-red-700" }
  }

  const config = statusConfig[proposta.status as keyof typeof statusConfig] || statusConfig.rascunho

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg">{proposta.lead_nome}</h3>
              <span className={cn("px-2 py-1 rounded text-xs font-medium", config.color)}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-3">{proposta.empreendimento_nome}</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Valor Total</p>
                <p className="font-bold text-emerald-600">
                  R$ {proposta.valor_proposta?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Entrada</p>
                <p className="font-medium">
                  R$ {proposta.valor_entrada?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Prazo</p>
                <p className="font-medium">{proposta.prazo_meses || 0} meses</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">Editar</Button>
            {proposta.status === 'rascunho' && (
              <Button size="sm" className="gap-2">
                <Send className="h-4 w-4" />
                Enviar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
