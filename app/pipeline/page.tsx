"use client"

import { AppShell } from "@/components/app-shell"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function PipelinePage() {
  const { user } = useAuth()
  const [stages, setStages] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPipelineData()
  }, [])

  async function fetchPipelineData() {
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        fetch('/api/crm/stages'),
        fetch('/api/crm/leads')
      ])

      if (stagesRes.ok) {
        const stagesData = await stagesRes.json()
        setStages(stagesData.stages || [])
      }

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setLeads(leadsData.leads || [])
      }
    } catch (error) {
      console.error('Erro ao buscar dados do pipeline:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Pipeline de Vendas">
      <div className="container px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-muted-foreground mt-2">
            {user?.role === 'admin' || user?.role === 'gerente' 
              ? 'Gerencie todos os leads do time' 
              : 'Gerencie seus leads'}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <KanbanBoard 
            initialStages={stages} 
            initialLeads={leads}
            onRefresh={fetchPipelineData}
          />
        )}
      </div>
    </AppShell>
  )
}
