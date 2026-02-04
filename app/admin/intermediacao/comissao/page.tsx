"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  FileSpreadsheet,
  Download,
  Filter,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, usePageTracking } from "@/lib/auth-context";
import { useComissaoVendas } from "@/lib/comissao/hooks";
import {
  COMISSAO_VENDA_STATUS_LABELS,
  COMISSAO_VENDA_STATUS_COLORS,
} from "@/lib/comissao/types";
import type { ComissaoVendaStatus } from "@/lib/comissao/types";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

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

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function ComissaoListPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  usePageTracking("admin-intermediacao-comissao");

  const { vendas, total, loading, refetch } = useComissaoVendas({
    status: statusFilter !== "all" ? [statusFilter as ComissaoVendaStatus] : undefined,
    pageSize: 50,
  });

  const hasAccess = user && (user.role === "admin" || user.role === "gerente");

  // Filter vendas by search term locally
  const filteredVendas = vendas.filter((venda) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      venda.codigo?.toLowerCase().includes(term) ||
      venda.empreendimento?.toLowerCase().includes(term) ||
      venda.unidade?.toLowerCase().includes(term) ||
      venda.cliente_nome?.toLowerCase().includes(term)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-14 w-14 rounded-full border-4 border-emerald-100 dark:border-emerald-900 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Esta area e exclusiva para gerentes e administradores.
          </p>
          <Button onClick={() => router.push("/empreendimentos")}>Voltar</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Planilha de Comissao</h1>
            <p className="text-sm text-muted-foreground">
              Calcule e organize comissoes para a pagadoria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => router.push("/admin/intermediacao/comissao/nova")}
            className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Venda
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{total}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total de Vendas</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {vendas.filter((v) => v.status === "calculada").length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Calculadas</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {vendas.filter((v) => v.status === "enviada").length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enviadas</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">
              {vendas.filter((v) => v.status === "ativa").length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por codigo, empreendimento, unidade ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="calculada">Calculada</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendas Table */}
      <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            Vendas para Calculo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : filteredVendas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Empreendimento / Unidade</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-right">Comissao</TableHead>
                    <TableHead className="text-center">Corretores</TableHead>
                    <TableHead className="text-center">Parcelas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.map((venda) => (
                    <TableRow
                      key={venda.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      onClick={() =>
                        router.push(`/admin/intermediacao/comissao/${venda.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {venda.codigo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{venda.empreendimento || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {venda.unidade || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{venda.cliente_nome || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(venda.valor_venda)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-indigo-600">
                        {formatCurrency(venda.valor_comissao_total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {(venda as any).total_corretores || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {(venda as any).total_parcelas || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClass(venda.status)}>
                          {COMISSAO_VENDA_STATUS_LABELS[venda.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/admin/intermediacao/comissao/${venda.id}`
                            );
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Calculator className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-1">Nenhuma venda encontrada</p>
              <p className="text-sm text-gray-400 mb-4">
                Cadastre uma nova venda para comecar a calcular comissoes
              </p>
              <Button
                onClick={() => router.push("/admin/intermediacao/comissao/nova")}
                className="bg-gradient-to-r from-indigo-500 to-purple-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Venda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
