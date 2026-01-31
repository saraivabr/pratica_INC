"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
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
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

type PeriodoPreset = "7d" | "30d" | "90d" | "mes_atual" | "mes_anterior" | "personalizado";

interface DateRange {
  from: Date;
  to: Date;
}

// API Response interfaces
interface ConsolidadoResponse {
  success: boolean;
  data: {
    periodo: { tipo: string; data_inicio: string; data_fim: string };
    resumo: {
      total_vendas: number;
      valor_total_vendas: number;
      total_comissoes: number;
      total_pago: number;
      total_pendente: number;
      total_em_atraso: number;
      parcelas: { pagas: number; pendentes: number; atrasadas: number };
    };
    comparativo_periodo_anterior: {
      variacao: { vendas: number; valor: number; comissoes: number };
    };
    evolucao_mensal: Array<{
      mes: string;
      mes_formatado: string;
      vendas: number;
      valor_vendas: number;
      valor_comissoes: number;
      valor_pago: number;
    }>;
    por_empreendimento: Array<{
      empreendimento: string;
      vendas: number;
      valor_total: number;
      valor_comissao: number;
    }>;
    por_beneficiario: Array<{
      id: number;
      nome: string;
      cargo: string;
      vendas: number;
      valor_comissao: number;
      valor_pago: number;
      valor_pendente: number;
    }>;
    por_status: Array<{ status: string; quantidade: number; valor: number }>;
  };
}

interface VendasResponse {
  success: boolean;
  data: {
    vendas: Array<{
      id: number;
      codigo: string;
      valor_total: number;
      percentual_intermediacao: number;
      valor_comissao: number;
      data_venda: string;
      status: string;
      cliente: { nome: string; cpf_cnpj: string };
      unidade: string;
      empreendimento: string;
    }>;
    totais: {
      total_vendas: number;
      valor_total_vendas: number;
      valor_total_comissoes: number;
      por_empreendimento: Array<{ empreendimento: string; quantidade: number; valor_total: number }>;
    };
  };
}

interface ComissoesResponse {
  success: boolean;
  data: {
    beneficiarios: Array<{
      id: number;
      nome: string;
      documento: string;
      cargo: string;
      email: string;
      vendas: Array<any>;
      totais: {
        total_comissoes: number;
        total_pago: number;
        total_pendente: number;
        total_atrasado: number;
        quantidade_vendas: number;
      };
    }>;
    totais: {
      total_beneficiarios: number;
      total_comissoes: number;
      total_pago: number;
      total_pendente: number;
      total_atrasado: number;
      total_vendas: number;
    };
  };
}

interface ParcelasResponse {
  success: boolean;
  data: {
    parcelas: Array<{
      id: number;
      numero_parcela: number;
      valor: number;
      data_vencimento: string;
      status: string;
      dias_atraso: number;
      data_pagamento: string | null;
      metodo_pagamento: string | null;
      beneficiario: { id: number; nome: string; documento: string };
      venda: { id: number; codigo: string; valor: number; data: string; cliente: string; empreendimento: string };
    }>;
    totais: {
      total_parcelas: number;
      valor_total: number;
      pagas: { quantidade: number; valor: number };
      pendentes: { quantidade: number; valor: number };
      atrasadas: { quantidade: number; valor: number; media_dias_atraso: number };
    };
    agrupamentos: {
      por_status: Array<{ status: string; quantidade: number; valor: number }>;
      por_beneficiario: Array<{ beneficiario_id: string; beneficiario_nome: string; quantidade: number; valor_total: number; valor_atrasado: number }>;
    };
  };
}

interface BeneficiariosResponse {
  success: boolean;
  data: Array<{
    id: number;
    codigo: string;
    nome: string;
    cargo: string;
  }>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pago: { label: "Pago", variant: "default" },
    pendente: { label: "Pendente", variant: "secondary" },
    parcial: { label: "Parcial", variant: "outline" },
    atrasado: { label: "Atrasado", variant: "destructive" },
    a_vencer: { label: "A Vencer", variant: "outline" },
  };
  const config = statusMap[status] || { label: status, variant: "secondary" };
  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.variant === "default" && "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        config.variant === "destructive" && "bg-red-500/10 text-red-600 border-red-200",
        config.variant === "outline" && status === "a_vencer" && "bg-amber-500/10 text-amber-600 border-amber-200"
      )}
    >
      {config.label}
    </Badge>
  );
}

// Loading Skeleton component
function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
      ))}
    </div>
  );
}

// KPI Card component
function KPICard({ title, value, icon: Icon, trend, trendLabel, className, loading }: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  className?: string;
  loading?: boolean;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-32 bg-muted/50 rounded animate-pulse mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold mt-1">{value}</p>
                {trend !== undefined && (
                  <p className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    trend >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    <TrendingUp className={cn("h-3 w-3", trend < 0 && "rotate-180")} />
                    {trend >= 0 ? "+" : ""}{trend.toFixed(1)}% {trendLabel}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Date Range Picker component
function DateRangePicker({ dateRange, onDateRangeChange, periodoPreset, onPeriodoPresetChange }: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  periodoPreset: PeriodoPreset;
  onPeriodoPresetChange: (preset: PeriodoPreset) => void;
}) {
  const handlePresetChange = (preset: PeriodoPreset) => {
    onPeriodoPresetChange(preset);
    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (preset) {
      case "7d":
        from = subDays(today, 7);
        break;
      case "30d":
        from = subDays(today, 30);
        break;
      case "90d":
        from = subDays(today, 90);
        break;
      case "mes_atual":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "mes_anterior":
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      default:
        return;
    }
    onDateRangeChange({ from, to });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Periodo:</Label>
        <Select value={periodoPreset} onValueChange={(v) => handlePresetChange(v as PeriodoPreset)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Ultimos 7 dias</SelectItem>
            <SelectItem value="30d">Ultimos 30 dias</SelectItem>
            <SelectItem value="90d">Ultimos 90 dias</SelectItem>
            <SelectItem value="mes_atual">Mes atual</SelectItem>
            <SelectItem value="mes_anterior">Mes anterior</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={format(dateRange.from, "yyyy-MM-dd")}
          onChange={(e) => onDateRangeChange({ ...dateRange, from: new Date(e.target.value) })}
          className="w-[140px]"
        />
        <span className="text-muted-foreground">a</span>
        <Input
          type="date"
          value={format(dateRange.to, "yyyy-MM-dd")}
          onChange={(e) => onDateRangeChange({ ...dateRange, to: new Date(e.target.value) })}
          className="w-[140px]"
        />
      </div>
    </div>
  );
}

// Dashboard Tab
function DashboardTab() {
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConsolidadoResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        data_inicio: format(dateRange.from, "yyyy-MM-dd"),
        data_fim: format(dateRange.to, "yyyy-MM-dd"),
      });
      const response = await fetch(`/api/intermediacao/relatorios/consolidado?${params}`);
      const result: ConsolidadoResponse = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError("Erro ao carregar dados do dashboard");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = data?.resumo || {
    valor_total_vendas: 0,
    total_comissoes: 0,
    total_pago: 0,
    total_em_atraso: 0,
  };

  const variacao = data?.comparativo_periodo_anterior?.variacao || {
    valor: 0,
    comissoes: 0,
  };

  // Transform data for charts
  const evolucaoMensal = useMemo(() => {
    if (!data?.evolucao_mensal) return [];
    return data.evolucao_mensal.map(item => ({
      mes: item.mes_formatado?.split(" ")[0]?.substring(0, 3) || "",
      vendas: item.valor_vendas,
      comissoes: item.valor_comissoes,
    }));
  }, [data]);

  const comissoesPorBeneficiario = useMemo(() => {
    if (!data?.por_beneficiario) return [];
    return data.por_beneficiario.slice(0, 5).map(item => ({
      name: item.nome,
      value: item.valor_comissao,
    }));
  }, [data]);

  const porEmpreendimento = useMemo(() => {
    if (!data?.por_empreendimento) return [];
    return data.por_empreendimento.slice(0, 5).map(item => ({
      name: item.empreendimento,
      vendas: item.valor_total,
      comissoes: item.valor_comissao,
    }));
  }, [data]);

  const statusParcelas = useMemo(() => {
    if (!data?.resumo?.parcelas) return [];
    const { pagas, pendentes, atrasadas } = data.resumo.parcelas;
    const pago = data.resumo.total_pago;
    const pendente = data.resumo.total_pendente;
    const emAtraso = data.resumo.total_em_atraso;
    return [
      { name: "Pago", value: pago },
      { name: "Pendente", value: pendente },
      { name: "Atrasado", value: emAtraso },
    ].filter(item => item.value > 0);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            periodoPreset={periodoPreset}
            onPeriodoPresetChange={setPeriodoPreset}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Vendas"
          value={formatCurrency(kpis.valor_total_vendas)}
          icon={TrendingUp}
          trend={variacao.valor}
          trendLabel="vs periodo anterior"
          loading={loading}
        />
        <KPICard
          title="Comissoes"
          value={formatCurrency(kpis.total_comissoes)}
          icon={DollarSign}
          trend={variacao.comissoes}
          trendLabel="vs periodo anterior"
          loading={loading}
        />
        <KPICard
          title="Pago"
          value={formatCurrency(kpis.total_pago)}
          icon={CreditCard}
          loading={loading}
        />
        <KPICard
          title="Em Atraso"
          value={formatCurrency(kpis.total_em_atraso)}
          icon={AlertTriangle}
          className="border-red-200 dark:border-red-900"
          loading={loading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Evolucao Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolucao Mensal</CardTitle>
            <CardDescription>Vendas vs Comissoes no periodo</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : evolucaoMensal.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "vendas" ? "Vendas" : "Comissoes"
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="vendas"
                      name="Vendas"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="comissoes"
                      name="Comissoes"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados no periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comissoes por Beneficiario */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comissoes por Beneficiario</CardTitle>
            <CardDescription>Top 5 beneficiarios por valor de comissao</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : comissoesPorBeneficiario.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={comissoesPorBeneficiario}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {comissoesPorBeneficiario.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados no periodo
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Por Empreendimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Empreendimento</CardTitle>
            <CardDescription>Vendas e comissoes por empreendimento</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : porEmpreendimento.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porEmpreendimento} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#88888820" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="vendas" name="Vendas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="comissoes" name="Comissoes" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados no periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status de Parcelas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status de Parcelas</CardTitle>
            <CardDescription>Distribuicao de parcelas por status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : statusParcelas.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusParcelas}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusParcelas.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados no periodo
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" className="gap-2" disabled={loading}>
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
        <Button variant="outline" className="gap-2" disabled={loading}>
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>
    </div>
  );
}

// Vendas Tab
function VendasTab() {
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [empreendimento, setEmpreendimento] = useState<string>("todos");
  const [status, setStatus] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VendasResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        data_inicio: format(dateRange.from, "yyyy-MM-dd"),
        data_fim: format(dateRange.to, "yyyy-MM-dd"),
      });
      if (empreendimento !== "todos") {
        params.append("empreendimento", empreendimento);
      }
      if (status !== "todos") {
        params.append("status", status);
      }
      const response = await fetch(`/api/intermediacao/relatorios/vendas?${params}`);
      const result: VendasResponse = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError("Erro ao carregar dados de vendas");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }, [dateRange, empreendimento, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const vendas = data?.vendas || [];
  const totais = data?.totais || { valor_total_vendas: 0, valor_total_comissoes: 0 };

  const empreendimentos = useMemo(() => {
    if (!data?.totais?.por_empreendimento) return [];
    return data.totais.por_empreendimento.map(e => e.empreendimento);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            periodoPreset={periodoPreset}
            onPeriodoPresetChange={setPeriodoPreset}
          />
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Empreendimento:</Label>
              <Select value={empreendimento} onValueChange={setEmpreendimento}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {empreendimentos.map((emp) => (
                    <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Status:</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : vendas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Comissao</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-medium">{venda.codigo}</TableCell>
                    <TableCell>{venda.cliente?.nome}</TableCell>
                    <TableCell>{venda.empreendimento}</TableCell>
                    <TableCell className="text-right">{formatCurrency(venda.valor_total)}</TableCell>
                    <TableCell className="text-center">{venda.percentual_intermediacao}%</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(venda.valor_comissao)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(venda.status)}</TableCell>
                    <TableCell>{formatDate(venda.data_venda)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totais.valor_total_vendas)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totais.valor_total_comissoes)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda encontrada no periodo
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          className="gap-2"
          disabled={loading}
          onClick={() => {
            const params = new URLSearchParams({
              data_inicio: format(dateRange.from, "yyyy-MM-dd"),
              data_fim: format(dateRange.to, "yyyy-MM-dd"),
              formato: "xlsx",
            });
            window.open(`/api/intermediacao/relatorios/vendas?${params}`, "_blank");
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
        <Button variant="outline" className="gap-2" disabled={loading}>
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}

// Comissoes Tab
function ComissoesTab() {
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [beneficiario, setBeneficiario] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [agruparPor, setAgruparPor] = useState<string>("beneficiario");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComissoesResponse["data"] | null>(null);
  const [beneficiariosLista, setBeneficiariosLista] = useState<BeneficiariosResponse["data"]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch beneficiarios list
  useEffect(() => {
    const fetchBeneficiarios = async () => {
      try {
        const response = await fetch("/api/intermediacao/beneficiarios?limit=100");
        const result: BeneficiariosResponse = await response.json();
        if (result.success) {
          setBeneficiariosLista(result.data);
        }
      } catch (err) {
        console.error("Erro ao carregar beneficiarios:", err);
      }
    };
    fetchBeneficiarios();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        data_inicio: format(dateRange.from, "yyyy-MM-dd"),
        data_fim: format(dateRange.to, "yyyy-MM-dd"),
      });
      if (beneficiario !== "todos") {
        params.append("beneficiario_id", beneficiario);
      }
      const response = await fetch(`/api/intermediacao/relatorios/comissoes?${params}`);
      const result: ComissoesResponse = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError("Erro ao carregar dados de comissoes");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }, [dateRange, beneficiario]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const beneficiarios = data?.beneficiarios || [];
  const totais = data?.totais || { total_vendas: 0, total_comissoes: 0, total_pago: 0, total_pendente: 0, total_atrasado: 0 };

  // Transform data for table display
  const comissoesTabela = useMemo(() => {
    return beneficiarios.map(b => ({
      beneficiario: b.nome,
      cargo: b.cargo || "N/A",
      vendas: b.totais.quantidade_vendas,
      totalComissao: b.totais.total_comissoes,
      pago: b.totais.total_pago,
      pendente: b.totais.total_pendente,
      aVencer: b.totais.total_atrasado,
    }));
  }, [beneficiarios]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            periodoPreset={periodoPreset}
            onPeriodoPresetChange={setPeriodoPreset}
          />
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Beneficiario:</Label>
              <Select value={beneficiario} onValueChange={setBeneficiario}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {beneficiariosLista.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Agrupar por:</Label>
              <Select value={agruparPor} onValueChange={setAgruparPor}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beneficiario">Beneficiario</SelectItem>
                  <SelectItem value="cargo">Cargo</SelectItem>
                  <SelectItem value="empreendimento">Empreendimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : comissoesTabela.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">Total Comissao</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                  <TableHead className="text-right">Em Atraso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesTabela.map((comissao, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{comissao.beneficiario}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{comissao.cargo}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{comissao.vendas}</TableCell>
                    <TableCell className="text-right">{formatCurrency(comissao.totalComissao)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(comissao.pago)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatCurrency(comissao.pendente)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(comissao.aVencer)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total</TableCell>
                  <TableCell className="text-center font-bold">{totais.total_vendas}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totais.total_comissoes)}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(totais.total_pago)}</TableCell>
                  <TableCell className="text-right font-bold text-amber-600">{formatCurrency(totais.total_pendente)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(totais.total_atrasado)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma comissao encontrada no periodo
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          className="gap-2"
          disabled={loading}
          onClick={() => {
            const params = new URLSearchParams({
              data_inicio: format(dateRange.from, "yyyy-MM-dd"),
              data_fim: format(dateRange.to, "yyyy-MM-dd"),
              formato: "xlsx",
            });
            window.open(`/api/intermediacao/relatorios/comissoes?${params}`, "_blank");
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
        <Button variant="outline" className="gap-2" disabled={loading}>
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}

// Parcelas Tab
function ParcelasTab() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [beneficiario, setBeneficiario] = useState<string>("todos");
  const [status, setStatus] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ParcelasResponse["data"] | null>(null);
  const [beneficiariosLista, setBeneficiariosLista] = useState<BeneficiariosResponse["data"]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch beneficiarios list
  useEffect(() => {
    const fetchBeneficiarios = async () => {
      try {
        const response = await fetch("/api/intermediacao/beneficiarios?limit=100");
        const result: BeneficiariosResponse = await response.json();
        if (result.success) {
          setBeneficiariosLista(result.data);
        }
      } catch (err) {
        console.error("Erro ao carregar beneficiarios:", err);
      }
    };
    fetchBeneficiarios();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        data_vencimento_inicio: format(dateRange.from, "yyyy-MM-dd"),
        data_vencimento_fim: format(dateRange.to, "yyyy-MM-dd"),
      });
      if (beneficiario !== "todos") {
        params.append("beneficiario_id", beneficiario);
      }
      if (status !== "todos") {
        params.append("status", status);
      }
      const response = await fetch(`/api/intermediacao/relatorios/parcelas?${params}`);
      const result: ParcelasResponse = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError("Erro ao carregar dados de parcelas");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }, [dateRange, beneficiario, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const parcelas = data?.parcelas || [];
  const totais = data?.totais || {
    total_parcelas: 0,
    valor_total: 0,
    pagas: { quantidade: 0, valor: 0 },
    pendentes: { quantidade: 0, valor: 0 },
    atrasadas: { quantidade: 0, valor: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Vencimento:</Label>
              <Input
                type="date"
                value={format(dateRange.from, "yyyy-MM-dd")}
                onChange={(e) => setDateRange({ ...dateRange, from: new Date(e.target.value) })}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="date"
                value={format(dateRange.to, "yyyy-MM-dd")}
                onChange={(e) => setDateRange({ ...dateRange, to: new Date(e.target.value) })}
                className="w-[140px]"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Beneficiario:</Label>
              <Select value={beneficiario} onValueChange={setBeneficiario}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {beneficiariosLista.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Status:</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : parcelas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venda</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead className="text-center">Parcela</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((parcela) => (
                  <TableRow key={parcela.id}>
                    <TableCell className="font-medium">{parcela.venda.codigo}</TableCell>
                    <TableCell>{parcela.beneficiario.nome}</TableCell>
                    <TableCell className="text-center">{parcela.numero_parcela}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parcela.valor)}</TableCell>
                    <TableCell>{formatDate(parcela.data_vencimento)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(parcela.status)}</TableCell>
                    <TableCell>{formatDate(parcela.data_pagamento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">Totais por Status</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totais.valor_total)}</TableCell>
                  <TableCell colSpan={3}>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {totais.pagas.valor > 0 && <span className="text-emerald-600">Pago: {formatCurrency(totais.pagas.valor)}</span>}
                      {totais.pendentes.valor > 0 && <span className="text-amber-600">Pendente: {formatCurrency(totais.pendentes.valor)}</span>}
                      {totais.atrasadas.valor > 0 && <span className="text-red-600">Atrasado: {formatCurrency(totais.atrasadas.valor)}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma parcela encontrada no periodo
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          className="gap-2"
          disabled={loading}
          onClick={() => {
            const params = new URLSearchParams({
              data_vencimento_inicio: format(dateRange.from, "yyyy-MM-dd"),
              data_vencimento_fim: format(dateRange.to, "yyyy-MM-dd"),
              formato: "xlsx",
            });
            window.open(`/api/intermediacao/relatorios/parcelas?${params}`, "_blank");
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>
    </div>
  );
}

// Analitico Tab
function AnaliticoTab() {
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "codigo", "cliente", "empreendimento", "valor", "percentual", "comissao", "status", "data",
    "beneficiario", "cargo", "parcela", "vencimento"
  ]);
  const [exportFormat, setExportFormat] = useState<string>("xlsx");
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<BeneficiariosResponse["data"]>([]);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState("todos");
  const [selectedBeneficiario, setSelectedBeneficiario] = useState("todos");
  const [selectedStatus, setSelectedStatus] = useState("todos");

  const allColumns = [
    { id: "codigo", label: "Codigo da Venda" },
    { id: "cliente", label: "Cliente" },
    { id: "empreendimento", label: "Empreendimento" },
    { id: "valor", label: "Valor da Venda" },
    { id: "percentual", label: "Percentual Comissao" },
    { id: "comissao", label: "Valor Comissao" },
    { id: "status", label: "Status Venda" },
    { id: "data", label: "Data Venda" },
    { id: "beneficiario", label: "Beneficiario" },
    { id: "cargo", label: "Cargo" },
    { id: "parcela", label: "Parcela" },
    { id: "valor_parcela", label: "Valor Parcela" },
    { id: "vencimento", label: "Vencimento" },
    { id: "status_parcela", label: "Status Parcela" },
    { id: "data_pagamento", label: "Data Pagamento" },
  ];

  // Fetch beneficiarios and empreendimentos
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch beneficiarios
        const benefResponse = await fetch("/api/intermediacao/beneficiarios?limit=100");
        const benefResult: BeneficiariosResponse = await benefResponse.json();
        if (benefResult.success) {
          setBeneficiarios(benefResult.data);
        }

        // Fetch empreendimentos from vendas report
        const params = new URLSearchParams({
          data_inicio: format(dateRange.from, "yyyy-MM-dd"),
          data_fim: format(dateRange.to, "yyyy-MM-dd"),
        });
        const vendasResponse = await fetch(`/api/intermediacao/relatorios/vendas?${params}`);
        const vendasResult: VendasResponse = await vendasResponse.json();
        if (vendasResult.success && vendasResult.data.totais.por_empreendimento) {
          setEmpreendimentos(vendasResult.data.totais.por_empreendimento.map(e => e.empreendimento));
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };
    fetchData();
  }, [dateRange]);

  // Fetch preview data
  const fetchPreviewData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        data_inicio: format(dateRange.from, "yyyy-MM-dd"),
        data_fim: format(dateRange.to, "yyyy-MM-dd"),
      });
      if (selectedEmpreendimento !== "todos") {
        params.append("empreendimento", selectedEmpreendimento);
      }
      if (selectedStatus !== "todos") {
        params.append("status", selectedStatus);
      }

      // Fetch vendas for preview
      const vendasResponse = await fetch(`/api/intermediacao/relatorios/vendas?${params}`);
      const vendasResult: VendasResponse = await vendasResponse.json();

      if (vendasResult.success) {
        // Transform for preview (first 5 records)
        const vendas = vendasResult.data.vendas.slice(0, 5);
        setTotalRecords(vendasResult.data.vendas.length);

        const preview = vendas.map((venda) => ({
          codigo: venda.codigo,
          cliente: venda.cliente?.nome,
          empreendimento: venda.empreendimento,
          valor: formatCurrency(venda.valor_total),
          percentual: `${venda.percentual_intermediacao}%`,
          comissao: formatCurrency(venda.valor_comissao),
          status: venda.status,
          data: formatDate(venda.data_venda),
          beneficiario: "-",
          cargo: "-",
          parcela: "-",
          valor_parcela: "-",
          vencimento: "-",
          status_parcela: "-",
          data_pagamento: "-",
        }));
        setPreviewData(preview);
      }
    } catch (err) {
      console.error("Erro ao carregar preview:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedEmpreendimento, selectedStatus]);

  useEffect(() => {
    fetchPreviewData();
  }, [fetchPreviewData]);

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((c) => c !== columnId)
        : [...prev, columnId]
    );
  };

  const selectAll = () => {
    setSelectedColumns(allColumns.map((c) => c.id));
  };

  const clearAll = () => {
    setSelectedColumns([]);
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      data_inicio: format(dateRange.from, "yyyy-MM-dd"),
      data_fim: format(dateRange.to, "yyyy-MM-dd"),
      formato: exportFormat,
    });
    if (selectedEmpreendimento !== "todos") {
      params.append("empreendimento", selectedEmpreendimento);
    }
    if (selectedStatus !== "todos") {
      params.append("status", selectedStatus);
    }
    window.open(`/api/intermediacao/relatorios/vendas?${params}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Configure os filtros para o relatorio analitico</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            periodoPreset={periodoPreset}
            onPeriodoPresetChange={setPeriodoPreset}
          />
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Empreendimento:</Label>
              <Select value={selectedEmpreendimento} onValueChange={setSelectedEmpreendimento}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {empreendimentos.map((emp) => (
                    <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Beneficiario:</Label>
              <Select value={selectedBeneficiario} onValueChange={setSelectedBeneficiario}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {beneficiarios.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Status:</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Colunas para Exportacao</CardTitle>
              <CardDescription>Selecione as colunas que deseja incluir no relatorio</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar Todas
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={selectedColumns.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                />
                <label
                  htmlFor={column.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {column.label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview dos Dados</CardTitle>
          <CardDescription>Primeiros 5 registros com as colunas selecionadas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : previewData.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {allColumns
                        .filter((c) => selectedColumns.includes(c.id))
                        .map((column) => (
                          <TableHead key={column.id} className="whitespace-nowrap">
                            {column.label}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        {allColumns
                          .filter((c) => selectedColumns.includes(c.id))
                          .map((column) => (
                            <TableCell key={column.id} className="whitespace-nowrap">
                              {row[column.id as keyof typeof row]}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Mostrando 5 de {totalRecords} registros totais
              </p>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado no periodo
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar</CardTitle>
          <CardDescription>Escolha o formato de exportacao</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Formato:</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="gap-2" onClick={handleExport} disabled={loading}>
              <Download className="h-4 w-4" />
              Exportar Relatorio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Page Component
export default function RelatoriosIntermediaçãoPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <AppShell title="Relatorios - Intermediacao">
      <div className="container px-0 sm:px-4 py-6 space-y-6 animate-page-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatorios</h1>
            <p className="text-muted-foreground">Sistema de Intermediacao Imobiliaria</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 sm:px-0">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="vendas" className="text-xs sm:text-sm py-2">
                Vendas
              </TabsTrigger>
              <TabsTrigger value="comissoes" className="text-xs sm:text-sm py-2">
                Comissoes
              </TabsTrigger>
              <TabsTrigger value="parcelas" className="text-xs sm:text-sm py-2">
                Parcelas
              </TabsTrigger>
              <TabsTrigger value="analitico" className="text-xs sm:text-sm py-2">
                Analitico
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 sm:px-0 mt-6">
            <TabsContent value="dashboard">
              <DashboardTab />
            </TabsContent>

            <TabsContent value="vendas">
              <VendasTab />
            </TabsContent>

            <TabsContent value="comissoes">
              <ComissoesTab />
            </TabsContent>

            <TabsContent value="parcelas">
              <ParcelasTab />
            </TabsContent>

            <TabsContent value="analitico">
              <AnaliticoTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppShell>
  );
}
