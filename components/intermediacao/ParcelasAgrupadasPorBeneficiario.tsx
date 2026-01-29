'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ParcelaStatusBadge, calcularDiasParaVencimento } from './ParcelaStatusBadge'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User, Building2, Users, Handshake } from 'lucide-react'
import type { DistribuicaoComParcelas, Beneficiario, Parcela } from './types'

interface ParcelasAgrupadasPorBeneficiarioProps {
  distribuicoes: DistribuicaoComParcelas[]
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function formatarData(data: Date | string): string {
  const dataObj = typeof data === 'string' ? parseISO(data) : data
  if (!isValid(dataObj)) return '--/--/--'
  return format(dataObj, 'dd/MM/yy', { locale: ptBR })
}

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case 'corretor':
      return <User className="h-5 w-5" />
    case 'imobiliaria':
      return <Building2 className="h-5 w-5" />
    case 'parceiro':
      return <Handshake className="h-5 w-5" />
    case 'indicador':
      return <Users className="h-5 w-5" />
    default:
      return <User className="h-5 w-5" />
  }
}

function getTipoBadgeVariant(tipo: string): 'default' | 'secondary' | 'outline' {
  switch (tipo) {
    case 'corretor':
      return 'default'
    case 'imobiliaria':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case 'corretor':
      return 'Corretor'
    case 'imobiliaria':
      return 'Imobiliaria'
    case 'parceiro':
      return 'Parceiro'
    case 'indicador':
      return 'Indicador'
    case 'gerente':
      return 'Gerente'
    case 'diretor':
      return 'Diretor'
    case 'coordenador':
      return 'Coordenador'
    default:
      return tipo
  }
}

interface BeneficiarioCardProps {
  distribuicao: DistribuicaoComParcelas
}

function BeneficiarioCard({ distribuicao }: BeneficiarioCardProps) {
  const { beneficiario, parcelas, valorTotal, vendaCodigo } = distribuicao

  // Ordena parcelas por numero
  const parcelasOrdenadas = useMemo(() => {
    return [...parcelas].sort((a, b) => a.numero - b.numero)
  }, [parcelas])

  // Calcula estatisticas
  const stats = useMemo(() => {
    let pagas = 0
    let pendentes = 0
    let vencidas = 0

    parcelas.forEach((p) => {
      if (p.status === 'paga') {
        pagas++
      } else if (p.status !== 'cancelada') {
        const dias = calcularDiasParaVencimento(p.dataVencimento)
        if (dias < 0) {
          vencidas++
        } else {
          pendentes++
        }
      }
    })

    return { pagas, pendentes, vencidas }
  }, [parcelas])

  const tipo = beneficiario.cargo || 'corretor'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {getTipoIcon(tipo)}
            </div>
            <div>
              <CardTitle className="text-base">{beneficiario.nome}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getTipoBadgeVariant(tipo)} className="text-xs">
                  {getTipoLabel(tipo)}
                </Badge>
                {vendaCodigo && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {vendaCodigo}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              {formatarMoeda(valorTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {parcelas.length} parcela{parcelas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          {stats.pagas > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {stats.pagas} paga{stats.pagas !== 1 ? 's' : ''}
            </span>
          )}
          {stats.pendentes > 0 && (
            <span className="text-muted-foreground">
              {stats.pendentes} pendente{stats.pendentes !== 1 ? 's' : ''}
            </span>
          )}
          {stats.vencidas > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {stats.vencidas} vencida{stats.vencidas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <div className="space-y-2">
          {parcelasOrdenadas.map((parcela) => {
            const dias = calcularDiasParaVencimento(parcela.dataVencimento)
            const isPaga = parcela.status === 'paga'
            const isCancelada = parcela.status === 'cancelada'

            return (
              <div
                key={parcela.id}
                className={cn(
                  'flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30',
                  isPaga && 'opacity-70',
                  isCancelada && 'opacity-50 line-through'
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium w-10">
                    {parcela.numero}/{parcelas.length}
                  </span>
                  <span className="text-sm font-semibold">
                    {formatarMoeda(parcela.valor)}
                  </span>
                  <span
                    className={cn(
                      'text-sm text-muted-foreground',
                      dias < 0 && !isPaga && 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatarData(parcela.dataVencimento)}
                  </span>
                </div>
                <ParcelaStatusBadge
                  status={parcela.status}
                  diasParaVencimento={dias}
                  compact
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function ParcelasAgrupadasPorBeneficiario({
  distribuicoes,
}: ParcelasAgrupadasPorBeneficiarioProps) {
  // Ordena por valor total (maior primeiro)
  const distribuicoesOrdenadas = useMemo(() => {
    return [...distribuicoes].sort((a, b) => b.valorTotal - a.valorTotal)
  }, [distribuicoes])

  if (distribuicoes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma distribuicao encontrada
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {distribuicoesOrdenadas.map((distribuicao) => (
        <BeneficiarioCard
          key={distribuicao.id}
          distribuicao={distribuicao}
        />
      ))}
    </div>
  )
}
