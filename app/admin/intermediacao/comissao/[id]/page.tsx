"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Download,
  RefreshCw,
  Play,
  Send,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import {
  useComissaoVenda,
  useComissaoCorretores,
  useComissaoParcelas,
  useComissaoMatriz,
  useCalcularMatriz,
  useMarcarEnviadoPagadoria,
} from "@/lib/comissao/hooks";
import { comissaoApi } from "@/lib/comissao/api";
import {
  COMISSAO_VENDA_STATUS_LABELS,
  COMISSAO_PARCELA_STATUS_LABELS,
} from "@/lib/comissao/types";
import type { ComissaoVendaStatus, ComissaoParcelaStatus } from "@/lib/comissao/types";
import { formatarMoeda, formatarPercentual } from "@/lib/comissao/calculations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pt-BR");
};

const getStatusBadgeClass = (status: ComissaoVendaStatus) => {
  const colors: Record<ComissaoVendaStatus, string> = {
    ativa: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    calculada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    enviada: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    cancelada: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return colors[status] || colors.ativa;
};

const getParcelaStatusBadgeClass = (status: ComissaoParcelaStatus) => {
  const colors: Record<ComissaoParcelaStatus, string> = {
    prevista: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    recebida: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelada: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return colors[status] || colors.prevista;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function ComissaoDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const resolvedParams = use(params);
  const vendaId = parseInt(resolvedParams.id);

  // Fetch data
  const { venda, loading: loadingVenda, refetch: refetchVenda } = useComissaoVenda(vendaId);
  const { corretores, loading: loadingCorretores } = useComissaoCorretores(vendaId);
  const { parcelas, loading: loadingParcelas } = useComissaoParcelas(vendaId);
  const { matriz, loading: loadingMatriz, refetch: refetchMatriz } = useComissaoMatriz(vendaId);

  // Mutations
  const calcularMatriz = useCalcularMatriz();
  const marcarEnviado = useMarcarEnviadoPagadoria();

  const loading = loadingVenda || loadingCorretores || loadingParcelas;

  const hasAccess = user && (user.role === "admin" || user.role === "gerente");

  const handleCalcular = async () => {
    try {
      await calcularMatriz.mutateAsync(vendaId);
      toast.success("Matriz calculada com sucesso!");
      refetchVenda();
      refetchMatriz();
    } catch (error: any) {
      toast.error(error.message || "Erro ao calcular matriz");
    }
  };

  const handleMarcarEnviado = async (parcelaIds: number[]) => {
    try {
      await marcarEnviado.mutateAsync({ vendaId, parcelaIds });
      toast.success("Parcela(s) marcada(s) como enviada(s)");
      refetchMatriz();
      refetchVenda();
    } catch (error: any) {
      toast.error(error.message || "Erro ao marcar como enviado");
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await comissaoApi.exportar.excel(vendaId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comissao-${venda?.codigo || vendaId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo exportado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao exportar");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-14 w-14 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <Button onClick={() => router.push("/empreendimentos")}>Voltar</Button>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/intermediacao/comissao")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Venda nao encontrada</h1>
        </div>
      </div>
    );
  }

  const canCalculate = venda.status === "ativa" && corretores.length > 0 && parcelas.length > 0;
  const isCalculated = venda.status === "calculada" || venda.status === "enviada";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/intermediacao/comissao")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{venda.codigo}</h1>
                <Badge className={getStatusBadgeClass(venda.status)}>
                  {COMISSAO_VENDA_STATUS_LABELS[venda.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {venda.empreendimento} {venda.unidade && `- ${venda.unidade}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCalculate && (
            <Button
              onClick={handleCalcular}
              disabled={calcularMatriz.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {calcularMatriz.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Calcular Matriz
            </Button>
          )}
          {isCalculated && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              refetchVenda();
              refetchMatriz();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Valor Venda</span>
            </div>
            <p className="text-xl font-bold">{formatarMoeda(venda.valor_venda)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calculator className="h-4 w-4" />
              <span className="text-xs">Comissao ({formatarPercentual(venda.percentual_comissao)})</span>
            </div>
            <p className="text-xl font-bold text-indigo-600">
              {formatarMoeda(venda.valor_comissao_total)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Corretores</span>
            </div>
            <p className="text-xl font-bold">{corretores.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Parcelas</span>
            </div>
            <p className="text-xl font-bold">{parcelas.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Data Venda</span>
            </div>
            <p className="text-xl font-bold">{formatDate(venda.data_venda)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Alerts */}
      {venda.status === "ativa" && (
        <div className="space-y-2">
          {corretores.length === 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Adicione corretores para poder calcular a matriz</span>
            </div>
          )}
          {parcelas.length === 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Adicione parcelas para poder calcular a matriz</span>
            </div>
          )}
        </div>
      )}

      {/* Matrix Table */}
      {isCalculated && matriz && (
        <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                Matriz de Distribuicao
              </CardTitle>
              {venda.status === "calculada" && (
                <Button
                  size="sm"
                  onClick={() => handleMarcarEnviado(parcelas.map((p) => p.id))}
                  disabled={marcarEnviado.isPending}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Marcar Todas Enviadas
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white dark:bg-gray-900 z-10">
                      Corretor
                    </TableHead>
                    <TableHead className="text-right">Participacao</TableHead>
                    {matriz.parcelas.map((parcela) => (
                      <TableHead key={parcela.id} className="text-center min-w-32">
                        <div>
                          <p>{parcela.descricao || `Parcela ${parcela.numero}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(parcela.data_prevista)}
                          </p>
                          <Badge className={getParcelaStatusBadgeClass(parcela.status)} variant="outline">
                            {COMISSAO_PARCELA_STATUS_LABELS[parcela.status]}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matriz.matriz.map((row) => (
                    <TableRow key={row.corretor_id}>
                      <TableCell className="sticky left-0 bg-white dark:bg-gray-900 z-10 font-medium">
                        {row.corretor_nome}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatarPercentual(row.percentual_participacao)}
                      </TableCell>
                      {row.valores_por_parcela.map((valor, i) => (
                        <TableCell key={i} className="text-center font-medium">
                          {formatarMoeda(valor)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold text-indigo-600">
                        {formatarMoeda(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                    <TableCell className="sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10">
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right">100%</TableCell>
                    {matriz.totais_parcela.map((total, i) => (
                      <TableCell key={i} className="text-center">
                        {formatarMoeda(total)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-indigo-600">
                      {formatarMoeda(matriz.total_geral)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Corretores and Parcelas Lists (when not calculated) */}
      {!isCalculated && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Corretores */}
          <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                Corretores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {corretores.length > 0 ? (
                <div className="space-y-3">
                  {corretores.map((corretor) => (
                    <div
                      key={corretor.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div>
                        <p className="font-medium">{corretor.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatarPercentual(corretor.percentual_participacao)}
                        </p>
                      </div>
                      <p className="font-bold text-indigo-600">
                        {formatarMoeda(corretor.valor_comissao)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum corretor cadastrado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Parcelas */}
          <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Parcelas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parcelas.length > 0 ? (
                <div className="space-y-3">
                  {parcelas.map((parcela) => (
                    <div
                      key={parcela.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div>
                        <p className="font-medium">
                          {parcela.descricao || `Parcela ${parcela.numero}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(parcela.data_prevista)} |{" "}
                          {formatarPercentual(parcela.percentual_comissao)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">
                          {formatarMoeda(parcela.valor_parcela)}
                        </p>
                        <Badge className={getParcelaStatusBadgeClass(parcela.status)} variant="outline">
                          {COMISSAO_PARCELA_STATUS_LABELS[parcela.status]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma parcela cadastrada
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Info */}
      <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informacoes Adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{venda.cliente_nome || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CPF</p>
              <p className="font-medium">{venda.cliente_cpf || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="font-medium">
                {new Date(venda.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Atualizado em</p>
              <p className="font-medium">
                {new Date(venda.updated_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          {venda.observacoes && (
            <div className="mt-4">
              <p className="text-muted-foreground text-sm">Observacoes</p>
              <p className="mt-1">{venda.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
