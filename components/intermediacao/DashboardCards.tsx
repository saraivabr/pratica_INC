'use client';

import * as React from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  ShoppingCart,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DadosConsolidados } from './types';

// Formatadores
function formatarMoeda(valor: number): string {
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`;
  }
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatarMoedaCompleta(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function formatarVariacao(valor: number): string {
  const sinal = valor >= 0 ? '+' : '';
  return `${sinal}${valor.toFixed(1)}%`;
}

function formatarPercentual(valor: number): string {
  return `${valor.toFixed(0)}%`;
}

// Tipos de card
type CardType = 'vendas' | 'comissoes' | 'pago' | 'pendente';

interface KPICardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  variacao?: number;
  icone?: React.ReactNode;
  tipo?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

function KPICard({
  titulo,
  valor,
  subtitulo,
  variacao,
  icone,
  tipo = 'default',
  loading = false,
  onClick,
  className,
}: KPICardProps) {
  const variacaoPositiva = variacao !== undefined && variacao >= 0;

  const corVariacao = variacaoPositiva
    ? 'text-emerald-600 bg-emerald-50'
    : 'text-red-600 bg-red-50';

  const corIcone = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
        className
      )}
      onClick={onClick}
    >
      {/* Decoracao de fundo */}
      <div
        className={cn(
          'absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-8 translate-x-8',
          tipo === 'success' && 'bg-emerald-500',
          tipo === 'warning' && 'bg-amber-500',
          tipo === 'danger' && 'bg-red-500',
          tipo === 'info' && 'bg-blue-500',
          tipo === 'default' && 'bg-primary'
        )}
      />

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
        {icone && (
          <div className={cn('p-2 rounded-lg', corIcone[tipo])}>
            {loading ? <Skeleton className="h-4 w-4" /> : icone}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-4 w-20" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{valor}</div>
            <div className="flex items-center gap-2 mt-1">
              {subtitulo && (
                <span className="text-xs text-muted-foreground">{subtitulo}</span>
              )}
              {variacao !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
                    corVariacao
                  )}
                >
                  {variacaoPositiva ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatarVariacao(variacao)}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Componente Skeleton para loading
function DashboardCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface DashboardCardsProps {
  dados: DadosConsolidados;
  loading?: boolean;
  onCardClick?: (tipo: CardType) => void;
  className?: string;
  layout?: 'horizontal' | 'grid';
}

export function DashboardCards({
  dados,
  loading = false,
  onCardClick,
  className,
  layout = 'grid',
}: DashboardCardsProps) {
  if (loading) {
    return <DashboardCardsSkeleton />;
  }

  const cards = [
    {
      tipo: 'vendas' as CardType,
      titulo: 'Total Vendas',
      valor: formatarMoeda(dados.totalVendas),
      subtitulo: `${dados.quantidadeVendas} venda${dados.quantidadeVendas !== 1 ? 's' : ''}`,
      variacao: dados.variacaoVendas,
      icone: <ShoppingCart className="h-4 w-4" />,
      corTipo: 'info' as const,
    },
    {
      tipo: 'comissoes' as CardType,
      titulo: 'Comissoes Geradas',
      valor: formatarMoeda(dados.totalComissoes),
      subtitulo: 'no periodo',
      variacao: dados.variacaoComissoes,
      icone: <Percent className="h-4 w-4" />,
      corTipo: 'default' as const,
    },
    {
      tipo: 'pago' as CardType,
      titulo: 'Valor Pago',
      valor: formatarMoeda(dados.totalPago),
      subtitulo: formatarPercentual(dados.percentualPago),
      icone: <CheckCircle className="h-4 w-4" />,
      corTipo: 'success' as const,
    },
    {
      tipo: 'pendente' as CardType,
      titulo: 'Valor Pendente',
      valor: formatarMoeda(dados.totalPendente),
      subtitulo: formatarPercentual(dados.percentualPendente),
      icone: <Clock className="h-4 w-4" />,
      corTipo: dados.percentualPendente > 50 ? 'warning' as const : 'default' as const,
    },
  ];

  return (
    <div
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
          : 'flex flex-wrap gap-4',
        className
      )}
    >
      {cards.map(card => (
        <KPICard
          key={card.tipo}
          titulo={card.titulo}
          valor={card.valor}
          subtitulo={card.subtitulo}
          variacao={card.variacao}
          icone={card.icone}
          tipo={card.corTipo}
          onClick={onCardClick ? () => onCardClick(card.tipo) : undefined}
          className={layout === 'horizontal' ? 'flex-1 min-w-[200px]' : undefined}
        />
      ))}
    </div>
  );
}

// Cards adicionais para detalhes
interface DashboardCardDetalhadoProps {
  titulo: string;
  valorPrincipal: number;
  valorSecundario?: number;
  labelPrincipal?: string;
  labelSecundario?: string;
  progresso?: number;
  detalhes?: Array<{ label: string; valor: string | number }>;
  loading?: boolean;
  className?: string;
}

export function DashboardCardDetalhado({
  titulo,
  valorPrincipal,
  valorSecundario,
  labelPrincipal = 'Total',
  labelSecundario,
  progresso,
  detalhes,
  loading = false,
  className,
}: DashboardCardDetalhadoProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valores principais */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold">
              {formatarMoedaCompleta(valorPrincipal)}
            </div>
            <div className="text-sm text-muted-foreground">{labelPrincipal}</div>
          </div>
          {valorSecundario !== undefined && (
            <div className="text-right">
              <div className="text-xl font-semibold text-muted-foreground">
                {formatarMoedaCompleta(valorSecundario)}
              </div>
              {labelSecundario && (
                <div className="text-xs text-muted-foreground">
                  {labelSecundario}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        {progresso !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{formatarPercentual(progresso)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progresso >= 75
                    ? 'bg-emerald-500'
                    : progresso >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${Math.min(progresso, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Detalhes adicionais */}
        {detalhes && detalhes.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            {detalhes.map((detalhe, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{detalhe.label}</span>
                <span className="font-medium">
                  {typeof detalhe.valor === 'number'
                    ? formatarMoedaCompleta(detalhe.valor)
                    : detalhe.valor}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini cards para estatisticas rapidas
interface MiniStatCardProps {
  label: string;
  valor: string | number;
  icone?: React.ReactNode;
  cor?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function MiniStatCard({
  label,
  valor,
  icone,
  cor = 'default',
  className,
}: MiniStatCardProps) {
  const cores = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-muted/50',
        className
      )}
    >
      {icone && (
        <div className={cn('p-2 rounded-lg', cores[cor])}>{icone}</div>
      )}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">
          {typeof valor === 'number' ? formatarMoedaCompleta(valor) : valor}
        </div>
      </div>
    </div>
  );
}

// Grid de mini stats
interface MiniStatsGridProps {
  stats: Array<{
    label: string;
    valor: string | number;
    icone?: React.ReactNode;
    cor?: 'default' | 'success' | 'warning' | 'danger';
  }>;
  className?: string;
}

export function MiniStatsGrid({ stats, className }: MiniStatsGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-4 gap-3',
        className
      )}
    >
      {stats.map((stat, index) => (
        <MiniStatCard key={index} {...stat} />
      ))}
    </div>
  );
}

export default DashboardCards;
