"use client"

import { AppShell } from "@/components/app-shell"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react"

export default function AgendaPage() {
  const { user } = useAuth()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgendamentos()
  }, [date])

  async function fetchAgendamentos() {
    try {
      setLoading(true)
      const res = await fetch(`/api/agendamentos?date=${date?.toISOString()}`)
      if (res.ok) {
        const data = await res.json()
        setAgendamentos(data.agendamentos || [])
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Agenda">
      <div className="container px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground mt-2">
            {user?.role === 'admin' || user?.role === 'gerente' 
              ? 'Agendamentos de toda a equipe' 
              : 'Seus agendamentos e compromissos'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : agendamentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum agendamento para esta data
                </div>
              ) : (
                <div className="space-y-3">
                  {agendamentos.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{agendamento.titulo || 'Agendamento'}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {agendamento.lead_nome || agendamento.cliente}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(agendamento.data_hora).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          agendamento.status === 'confirmado' 
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-yellow-500/10 text-yellow-600'
                        }`}>
                          {agendamento.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
