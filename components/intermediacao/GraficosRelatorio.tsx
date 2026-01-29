'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  DadosEvolucaoMensal,
  DadosDistribuicao,
  DadosStatusParcelas,
  DadosComparativos,
} from './types';

// Cores padrao para graficos
const CORES = {
  primary: '#1e3a5f',
  secondary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  muted: '#94a3b8',
};

const CORES_ARRAY = [
  '#1e3a5f',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

const CORES_STATUS = {
  pendente: '#f59e0b',
  paga: '#22c55e',
  vencida: '#ef4444',
  cancelada: '#94a3b8',
};

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
  }).format(valor);
}

function formatarMoedaCompleta(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function formatarPercentual(valor: number): string {
  return `${valor.toFixed(1)}%`;
}

// Custom Tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  formatValue?: (value: number) => string;
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue = formatarMoedaCompleta,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2"
          style={{ color: item.color }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.name}:</span>
          <span className="font-medium">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

// === Grafico de Evolucao Mensal ===
interface GraficoEvolucaoMensalProps {
  dados: DadosEvolucaoMensal[];
  titulo?: string;
  descricao?: string;
  mostrarVendas?: boolean;
  mostrarComissoes?: boolean;
  mostrarPagamentos?: boolean;
  altura?: number;
  className?: string;
  tipo?: 'linha' | 'barra' | 'area';
}

export function GraficoEvolucaoMensal({
  dados,
  titulo = 'Evolucao Mensal',
  descricao = 'Acompanhamento de vendas, comissoes e pagamentos',
  mostrarVendas = true,
  mostrarComissoes = true,
  mostrarPagamentos = true,
  altura = 300,
  className,
  tipo = 'linha',
}: GraficoEvolucaoMensalProps) {
  if (!dados || dados.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: altura }}
          >
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = tipo === 'barra' ? BarChart : LineChart;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={altura}>
          <ChartComponent data={dados} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis
              tickFormatter={formatarMoeda}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {mostrarVendas && (
              tipo === 'barra' ? (
                <Bar
                  dataKey="vendas"
                  name="Vendas"
                  fill={CORES.primary}
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="vendas"
                  name="Vendas"
                  stroke={CORES.primary}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )
            )}

            {mostrarComissoes && (
              tipo === 'barra' ? (
                <Bar
                  dataKey="comissoes"
                  name="Comissoes"
                  fill={CORES.secondary}
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="comissoes"
                  name="Comissoes"
                  stroke={CORES.secondary}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )
            )}

            {mostrarPagamentos && (
              tipo === 'barra' ? (
                <Bar
                  dataKey="pagamentos"
                  name="Pagamentos"
                  fill={CORES.success}
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="pagamentos"
                  name="Pagamentos"
                  stroke={CORES.success}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// === Grafico de Distribuicao (Pie/Donut) ===
interface GraficoDistribuicaoProps {
  dados: DadosDistribuicao[];
  titulo?: string;
  descricao?: string;
  altura?: number;
  className?: string;
  tipo?: 'pie' | 'donut';
  mostrarLegenda?: boolean;
  mostrarValores?: boolean;
}

export function GraficoDistribuicao({
  dados,
  titulo = 'Distribuicao',
  descricao,
  altura = 300,
  className,
  tipo = 'donut',
  mostrarLegenda = true,
  mostrarValores = true,
}: GraficoDistribuicaoProps) {
  if (!dados || dados.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: altura }}
          >
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  const innerRadius = tipo === 'donut' ? 60 : 0;
  const total = dados.reduce((sum, item) => sum + item.valor, 0);

  // Adicionar cores se nao existirem
  const dadosComCores = dados.map((item, index) => ({
    ...item,
    cor: item.cor || CORES_ARRAY[index % CORES_ARRAY.length],
  }));

  const CustomPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    name: string;
  }) => {
    if (!mostrarValores) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Nao mostrar labels muito pequenos

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {descricao && <CardDescription>{descricao}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={altura}>
          <PieChart>
            <Pie
              data={dadosComCores}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomPieLabel}
              outerRadius={80}
              innerRadius={innerRadius}
              fill="#8884d8"
              dataKey="valor"
              nameKey="nome"
            >
              {dadosComCores.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as DadosDistribuicao;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-medium">{data.nome}</p>
                    <p>{formatarMoedaCompleta(data.valor)}</p>
                    <p className="text-muted-foreground">
                      {formatarPercentual(data.percentual || (data.valor / total) * 100)}
                    </p>
                  </div>
                );
              }}
            />
            {mostrarLegenda && <Legend />}
          </PieChart>
        </ResponsiveContainer>

        {/* Lista de valores abaixo do grafico */}
        <div className="mt-4 space-y-2">
          {dadosComCores.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.cor }}
                />
                <span className="truncate max-w-[150px]">{item.nome}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {formatarPercentual(item.percentual || (item.valor / total) * 100)}
                </span>
                <span className="font-medium">{formatarMoeda(item.valor)}</span>
              </div>
            </div>
          ))}
          {dadosComCores.length > 5 && (
            <div className="text-xs text-muted-foreground text-center">
              + {dadosComCores.length - 5} outros
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// === Grafico de Status de Parcelas ===
interface GraficoStatusParcelasProps {
  dados: DadosStatusParcelas[];
  titulo?: string;
  descricao?: string;
  altura?: number;
  className?: string;
}

export function GraficoStatusParcelas({
  dados,
  titulo = 'Status das Parcelas',
  descricao = 'Distribuicao por status de pagamento',
  altura = 250,
  className,
}: GraficoStatusParcelasProps) {
  if (!dados || dados.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: altura }}
          >
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = dados.reduce((sum, item) => sum + item.quantidade, 0);
  const totalValor = dados.reduce((sum, item) => sum + item.valor, 0);

  // Usar cores de status
  const dadosComCores = dados.map(item => ({
    ...item,
    cor: item.cor || CORES_STATUS[item.status as keyof typeof CORES_STATUS] || CORES.muted,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Donut chart */}
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height={altura}>
              <PieChart>
                <Pie
                  data={dadosComCores}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="quantidade"
                  nameKey="status"
                >
                  {dadosComCores.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload as DadosStatusParcelas;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-medium capitalize">{data.status}</p>
                        <p>{data.quantidade} parcela(s)</p>
                        <p>{formatarMoedaCompleta(data.valor)}</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda e valores */}
          <div className="w-1/2 flex flex-col justify-center space-y-3">
            {dadosComCores.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="text-sm capitalize">{item.status}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {item.quantidade}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {((item.quantidade / total) * 100).toFixed(0)}% das parcelas
                  </span>
                  <span>{formatarMoeda(item.valor)}</span>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Total</span>
                <span>{total} parcelas</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Valor total</span>
                <span>{formatarMoedaCompleta(totalValor)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === Grafico de Comparativos (Bar Horizontal) ===
interface GraficoComparativosProps {
  dados: DadosComparativos[];
  titulo?: string;
  descricao?: string;
  altura?: number;
  className?: string;
  maxItens?: number;
  cor?: string;
  mostrarPercentual?: boolean;
}

export function GraficoComparativos({
  dados,
  titulo = 'Comparativo',
  descricao,
  altura = 300,
  className,
  maxItens = 10,
  cor = CORES.primary,
  mostrarPercentual = true,
}: GraficoComparativosProps) {
  if (!dados || dados.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: altura }}
          >
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar e limitar
  const dadosOrdenados = [...dados]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, maxItens);

  const maiorValor = Math.max(...dadosOrdenados.map(d => d.valor));

  // Calcular percentuais se nao existirem
  const dadosComPercentual = dadosOrdenados.map(item => ({
    ...item,
    percentual: item.percentual ?? (item.valor / maiorValor) * 100,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {descricao && <CardDescription>{descricao}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={altura}>
          <BarChart
            data={dadosComPercentual}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatarMoeda}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis
              type="category"
              dataKey="nome"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="valor" fill={cor} radius={[0, 4, 4, 0]} barSize={20}>
              {dadosComPercentual.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CORES_ARRAY[index % CORES_ARRAY.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Lista com valores */}
        {mostrarPercentual && (
          <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
            {dadosComPercentual.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-6 text-right">
                    {index + 1}.
                  </span>
                  <span className="truncate max-w-[200px]">{item.nome}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {formatarPercentual(item.percentual)}
                  </span>
                  <span className="font-medium">{formatarMoeda(item.valor)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default {
  GraficoEvolucaoMensal,
  GraficoDistribuicao,
  GraficoStatusParcelas,
  GraficoComparativos,
};
