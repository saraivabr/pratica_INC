"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Activity,
  PlusCircle,
  Pencil,
  Trash2,
  Users,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { AuditoriaStats as AuditoriaStatsType } from "./types"

interface AuditoriaStatsProps {
  periodo: { inicio: Date; fim: Date }
  stats?: AuditoriaStatsType
  loading?: boolean
}

function StatCard({
  icon: Icon,
  title,
  value,
  description,
  iconClassName,
  loading = false,
}: {
  icon: typeof Activity
  title: string
  value: string | number
  description?: string
  iconClassName?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            iconClassName || "bg-muted"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MiniPieChart({
  data,
  loading = false,
}: {
  data: { label: string; value: number; color: string }[]
  loading?: boolean
}) {
  const total = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data])

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
        Sem dados
      </div>
    )
  }

  // Calcular angulos para o pie chart
  let currentAngle = 0
  const segments = data.map((item) => {
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    currentAngle += angle
    return {
      ...item,
      startAngle,
      endAngle: currentAngle,
      percentage: ((item.value / total) * 100).toFixed(0),
    }
  })

  // Criar path SVG para cada segmento
  const createArcPath = (startAngle: number, endAngle: number) => {
    const radius = 40
    const centerX = 50
    const centerY = 50

    const startRad = ((startAngle - 90) * Math.PI) / 180
    const endRad = ((endAngle - 90) * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArcPath(segment.startAngle, segment.endAngle)}
            fill={segment.color}
            className="transition-opacity hover:opacity-80"
          />
        ))}
        {/* Centro branco */}
        <circle cx="50" cy="50" r="25" fill="var(--background)" />
      </svg>
      <div className="space-y-1 min-w-0">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground truncate">
              {segment.label}
            </span>
            <span className="font-medium">{segment.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HorariosPicoChart({
  data,
  loading = false,
}: {
  data: { hora: number; quantidade: number }[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-end gap-1 h-12">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-full" />
        ))}
      </div>
    )
  }

  const maxQuantidade = Math.max(...data.map((d) => d.quantidade), 1)

  // Criar array de 24 horas
  const horasCompletas = Array.from({ length: 24 }).map((_, hora) => {
    const dado = data.find((d) => d.hora === hora)
    return {
      hora,
      quantidade: dado?.quantidade || 0,
    }
  })

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5 h-12">
        {horasCompletas.map(({ hora, quantidade }) => {
          const height = (quantidade / maxQuantidade) * 100
          return (
            <div
              key={hora}
              className={cn(
                "flex-1 rounded-t-sm transition-colors cursor-help",
                quantidade > 0
                  ? "bg-primary/60 hover:bg-primary"
                  : "bg-muted"
              )}
              style={{ height: `${Math.max(height, 4)}%` }}
              title={`${hora}h: ${quantidade} operacao${quantidade !== 1 ? "oes" : ""}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  )
}

export function AuditoriaStats({
  periodo,
  stats,
  loading = false,
}: AuditoriaStatsProps) {
  const periodoFormatado = useMemo(() => {
    return `${format(periodo.inicio, "dd/MM", { locale: ptBR })} - ${format(
      periodo.fim,
      "dd/MM/yyyy",
      { locale: ptBR }
    )}`
  }, [periodo])

  const pieData = useMemo(() => {
    if (!stats) return []
    return [
      { label: "Criacao", value: stats.porTipo.create, color: "#22c55e" },
      { label: "Atualizacao", value: stats.porTipo.update, color: "#3b82f6" },
      { label: "Remocao", value: stats.porTipo.delete, color: "#ef4444" },
    ]
  }, [stats])

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Estatisticas do periodo: {periodoFormatado}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total de operacoes */}
        <StatCard
          icon={Activity}
          title="Total de Operacoes"
          value={stats?.totalOperacoes ?? "-"}
          description="No periodo selecionado"
          iconClassName="bg-primary/10 text-primary"
          loading={loading}
        />

        {/* Por tipo (mini pizza) */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MiniPieChart data={pieData} loading={loading} />
          </CardContent>
        </Card>

        {/* Usuarios ativos */}
        <StatCard
          icon={Users}
          title="Usuarios Ativos"
          value={stats?.usuariosAtivos ?? "-"}
          description="Realizaram operacoes"
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          loading={loading}
        />

        {/* Horarios de pico */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horarios de Pico
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <HorariosPicoChart
              data={stats?.horariosPico || []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Cards de detalhe por operacao */}
      {stats && !loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <PlusCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.porTipo.create}</div>
                  <div className="text-xs text-muted-foreground">
                    Registros criados
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Pencil className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.porTipo.update}</div>
                  <div className="text-xs text-muted-foreground">
                    Registros atualizados
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.porTipo.delete}</div>
                  <div className="text-xs text-muted-foreground">
                    Registros removidos
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
