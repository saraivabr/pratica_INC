"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Clock,
  Phone,
  MessageSquare,
  Building2,
  TrendingUp,
  ChevronRight,
  RefreshCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LeadAlert } from "@/lib/lead-alerts"
import { getUrgencyColor, getUrgencyLabel, getTimeDescription } from "@/lib/lead-alerts"

interface UrgentLeadsQueueProps {
  corretorId?: string
  maxDisplay?: number
  autoRefresh?: boolean
  refreshInterval?: number // in seconds
}

export function UrgentLeadsQueue({
  corretorId,
  maxDisplay = 5,
  autoRefresh = true,
  refreshInterval = 60,
}: UrgentLeadsQueueProps) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<LeadAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchUrgentLeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (corretorId) {
        params.append('corretorId', corretorId)
      }

      const response = await fetch(`/api/leads/urgent?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch urgent leads')
      }

      const data = await response.json()
      setAlerts(data.alerts || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching urgent leads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUrgentLeads()

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchUrgentLeads, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [corretorId, autoRefresh, refreshInterval])

  const displayedAlerts = alerts.slice(0, maxDisplay)
  const remainingCount = Math.max(0, alerts.length - maxDisplay)

  const handleLeadClick = (leadId: string) => {
    // Open lead detail or contact action
    router.push(`/leads?leadId=${leadId}`)
  }

  const handleWhatsAppContact = (phone: string, name: string) => {
    const message = encodeURIComponent(
      `Olá ${name}! Vi seu interesse no nosso empreendimento. Como posso ajudar?`
    )
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank')
  }

  if (loading && alerts.length === 0) {
    return (
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center animate-pulse">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">⚡ Leads Urgentes</CardTitle>
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">✅ Todos os Leads em Dia</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Nenhum lead urgente no momento
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchUrgentLeads}
              className="h-8 w-8"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const criticalCount = alerts.filter((a) => a.urgencyLevel === 'critical').length
  const urgentCount = alerts.filter((a) => a.urgencyLevel === 'urgent').length

  return (
    <Card className="border-red-200 dark:border-red-800 shadow-lg">
      {/* Animated gradient border */}
      <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 animate-gradient" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Pulsing glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-orange-500 rounded-lg blur-md opacity-50 animate-pulse" />
              <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">⚡ Leads Urgentes</CardTitle>
                <Badge variant="destructive" className="font-bold">
                  {alerts.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {criticalCount > 0 && `${criticalCount} críticos`}
                {criticalCount > 0 && urgentCount > 0 && ', '}
                {urgentCount > 0 && `${urgentCount} urgentes`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchUrgentLeads}
            className="h-8 w-8"
            disabled={loading}
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {displayedAlerts.map((alert, index) => {
          const colors = getUrgencyColor(alert.urgencyLevel)
          const urgencyLabel = getUrgencyLabel(alert.urgencyLevel)
          const timeDesc = getTimeDescription(alert)

          return (
            <div
              key={alert.leadId}
              className={cn(
                "relative group rounded-lg border-2 p-3 transition-all duration-200",
                "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
                colors.border,
                colors.bg
              )}
              onClick={() => handleLeadClick(alert.leadId)}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Urgency indicator line */}
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r",
                  colors.gradient
                )}
              />

              <div className="space-y-2 pt-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm truncate">
                        {alert.leadName}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-bold", colors.text, colors.border)}
                      >
                        {urgencyLabel}
                      </Badge>
                    </div>
                    <p className={cn("text-xs font-medium mt-0.5", colors.text)}>
                      {timeDesc}
                    </p>
                  </div>

                  {/* Score badge */}
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {alert.leadScore}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  {alert.leadPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      <span className="truncate">{alert.leadPhone}</span>
                    </div>
                  )}
                  {alert.empreendimento && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{alert.empreendimento}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-7 text-xs gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (alert.leadPhone) {
                        handleWhatsAppContact(alert.leadPhone, alert.leadName)
                      }
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (alert.leadPhone) {
                        window.location.href = `tel:${alert.leadPhone}`
                      }
                    }}
                  >
                    <Phone className="h-3 w-3" />
                    Ligar
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {/* View all button */}
        {remainingCount > 0 && (
          <Button
            variant="ghost"
            className="w-full h-8 text-xs mt-2"
            onClick={() => router.push('/leads?filter=urgent')}
          >
            Ver mais {remainingCount} leads urgentes
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}

        {/* Last update indicator */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
          </div>
          {autoRefresh && (
            <span className="text-xs">
              Auto-refresh: {refreshInterval}s
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
