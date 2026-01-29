"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Filter,
  Loader2,
  RotateCcw,
  User,
  Wallet,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

// Types - matching API response format
interface Payment {
  id: string;
  valor: number;
  data_pagamento: string;
  metodo: "pix" | "transferencia" | "boleto" | "cheque" | "outros";
  comprovante: string | null;
  referencia: string | null;
  registrado_por: {
    id: string;
    nome: string;
  };
  created_at: string;
  parcela: {
    id: string;
    numero_parcela: number;
    data_vencimento: string;
  } | null;
  venda: {
    id: string;
    valor_venda: number;
    cliente_nome: string;
    empreendimento: string;
    unidade: string;
    data_venda: string;
  } | null;
  beneficiario: {
    id: string;
    nome: string;
    documento: string;
    cargo: string;
  } | null;
}

interface PaymentSummary {
  total: number;
  count: number;
  byMethod: {
    pix: { total: number; count: number };
    transferencia: { total: number; count: number };
    boleto: { total: number; count: number };
    cheque: { total: number; count: number };
    outros: { total: number; count: number };
  };
}

interface Beneficiario {
  id: string;
  nome: string;
  cargo: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Period presets
const periodPresets = [
  { label: "Hoje", getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: "Esta semana", getValue: () => ({ start: startOfWeek(new Date(), { locale: ptBR }), end: endOfWeek(new Date(), { locale: ptBR }) }) },
  { label: "Este mes", getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: "Mes passado", getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Ultimos 90 dias", getValue: () => ({ start: subDays(new Date(), 90), end: new Date() }) },
];

export default function PagamentosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<string>("all");
  const [selectedMetodo, setSelectedMetodo] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Undo Payment Modal
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [undoJustification, setUndoJustification] = useState("");
  const [undoing, setUndoing] = useState(false);

  // Fetch beneficiarios (only once on mount)
  useEffect(() => {
    const fetchBeneficiarios = async () => {
      try {
        const res = await fetch("/api/intermediacao/beneficiarios?limit=100");
        if (!res.ok) {
          throw new Error("Erro ao carregar beneficiarios");
        }
        const data = await res.json();
        if (data.success && data.data) {
          setBeneficiarios(data.data.map((b: any) => ({
            id: b.id,
            nome: b.nome,
            cargo: b.cargo,
          })));
        }
      } catch (error) {
        console.error("Erro ao carregar beneficiarios:", error);
      }
    };

    fetchBeneficiarios();
  }, []);

  // Fetch pagamentos data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", itemsPerPage.toString());

        if (startDate) {
          params.set("data_inicio", startDate);
        }
        if (endDate) {
          params.set("data_fim", endDate);
        }
        if (selectedBeneficiario !== "all") {
          params.set("beneficiario_id", selectedBeneficiario);
        }
        if (selectedMetodo !== "all") {
          params.set("metodo", selectedMetodo);
        }

        const res = await fetch(`/api/intermediacao/pagamentos?${params.toString()}`);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erro ao carregar pagamentos");
        }

        const data = await res.json();

        if (data.success) {
          setPayments(data.data || []);
          setPagination(data.pagination || {
            total: 0,
            page: 1,
            limit: itemsPerPage,
            totalPages: 0,
          });
        } else {
          throw new Error(data.error || "Erro ao carregar pagamentos");
        }
      } catch (error: any) {
        console.error("Erro ao carregar pagamentos:", error);
        setError(error.message);
        toast.error(error.message || "Erro ao carregar pagamentos");
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedBeneficiario, selectedMetodo, currentPage]);

  // Payments are now filtered server-side
  const filteredPayments = payments;

  // Calculate summary
  const summary: PaymentSummary = useMemo(() => {
    const result: PaymentSummary = {
      total: 0,
      count: 0,
      byMethod: {
        pix: { total: 0, count: 0 },
        transferencia: { total: 0, count: 0 },
        boleto: { total: 0, count: 0 },
        cheque: { total: 0, count: 0 },
        outros: { total: 0, count: 0 },
      },
    };

    filteredPayments.forEach((payment) => {
      result.total += payment.valor;
      result.count++;
      result.byMethod[payment.metodo].total += payment.valor;
      result.byMethod[payment.metodo].count++;
    });

    return result;
  }, [filteredPayments]);

  // Pagination is now handled server-side
  const totalPages = pagination.totalPages;
  const paginatedPayments = filteredPayments;

  // Apply period preset
  const applyPeriodPreset = (preset: typeof periodPresets[0]) => {
    const { start, end } = preset.getValue();
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
    setCurrentPage(1);
  };

  // Handle undo payment
  const handleUndoPayment = async () => {
    if (!selectedPayment || !undoJustification.trim()) {
      toast.error("Informe a justificativa para desfazer o pagamento");
      return;
    }

    if (undoJustification.trim().length < 10) {
      toast.error("Justificativa deve ter no minimo 10 caracteres");
      return;
    }

    setUndoing(true);
    try {
      const res = await fetch(`/api/intermediacao/pagamentos/${selectedPayment.id}/desfazer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: undoJustification.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao desfazer pagamento");
      }

      if (data.success) {
        toast.success(data.message || "Pagamento desfeito com sucesso");
        // Remove payment from local state
        setPayments((prev) => prev.filter((p) => p.id !== selectedPayment.id));
        // Update pagination total
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
        setUndoModalOpen(false);
        setSelectedPayment(null);
        setUndoJustification("");
      } else {
        throw new Error(data.error || "Erro ao desfazer pagamento");
      }
    } catch (error: any) {
      console.error("Erro ao desfazer pagamento:", error);
      toast.error(error.message || "Erro ao desfazer pagamento");
    } finally {
      setUndoing(false);
    }
  };

  // Export to Excel (client-side generation)
  const handleExportExcel = async () => {
    if (filteredPayments.length === 0) {
      toast.error("Nenhum pagamento para exportar");
      return;
    }

    toast.info("Exportando para Excel...");

    try {
      // Dynamically import xlsx library
      const XLSX = await import("xlsx");

      // Prepare data for export
      const exportData = filteredPayments.map((payment) => ({
        "Data Pagamento": payment.data_pagamento
          ? format(new Date(payment.data_pagamento), "dd/MM/yyyy", { locale: ptBR })
          : "-",
        "Beneficiario": payment.beneficiario?.nome || "-",
        "Cargo": payment.beneficiario?.cargo || "-",
        "Cliente": payment.venda?.cliente_nome || "-",
        "Empreendimento": payment.venda?.empreendimento || "-",
        "Unidade": payment.venda?.unidade || "-",
        "Parcela": payment.parcela?.numero_parcela || "-",
        "Valor (R$)": payment.valor,
        "Metodo": payment.metodo.toUpperCase(),
        "Referencia": payment.referencia || "-",
        "Registrado Por": payment.registrado_por?.nome || "-",
        "Data Registro": payment.created_at
          ? format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : "-",
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws["!cols"] = [
        { wch: 15 }, // Data Pagamento
        { wch: 25 }, // Beneficiario
        { wch: 15 }, // Cargo
        { wch: 25 }, // Cliente
        { wch: 20 }, // Empreendimento
        { wch: 12 }, // Unidade
        { wch: 10 }, // Parcela
        { wch: 15 }, // Valor
        { wch: 15 }, // Metodo
        { wch: 25 }, // Referencia
        { wch: 20 }, // Registrado Por
        { wch: 18 }, // Data Registro
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Pagamentos");

      // Generate filename with date range
      const filename = `pagamentos_${startDate}_a_${endDate}.xlsx`;

      // Write and download
      XLSX.writeFile(wb, filename);
      toast.success("Arquivo exportado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar arquivo");
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Get method badge
  const getMethodBadge = (method: Payment["metodo"]) => {
    const config = {
      pix: { label: "PIX", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
      transferencia: { label: "Transferencia", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
      boleto: { label: "Boleto", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
      cheque: { label: "Cheque", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
      outros: { label: "Outros", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
    };
    const { label, className } = config[method];
    return <Badge className={cn("border-0", className)}>{label}</Badge>;
  };

  // Calculate percentages
  const getMethodPercentage = (methodTotal: number) => {
    if (summary.total === 0) return 0;
    return Math.round((methodTotal / summary.total) * 100);
  };

  return (
    <AppShell title="Pagamentos">
      <div className="container px-4 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
            <p className="text-muted-foreground">
              Gerencie os pagamentos de comissoes do sistema de intermediacao
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Period */}
              <div className="sm:col-span-2 lg:col-span-2">
                <Label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Periodo
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-[140px]"
                  />
                  <span className="text-muted-foreground">a</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-[140px]"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Filter className="h-3.5 w-3.5" />
                        Presets
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="space-y-1">
                        {periodPresets.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => applyPeriodPreset(preset)}
                            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Beneficiario */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Beneficiario
                </Label>
                <Select
                  value={selectedBeneficiario}
                  onValueChange={(value) => {
                    setSelectedBeneficiario(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {beneficiarios.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Metodo */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Metodo
                </Label>
                <Select
                  value={selectedMetodo}
                  onValueChange={(value) => {
                    setSelectedMetodo(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total */}
          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pago</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(summary.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary.count} pagamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transferencia */}
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transferencia</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(summary.byMethod.transferencia.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getMethodPercentage(summary.byMethod.transferencia.total)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PIX */}
          <Card className="border-0 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/50 dark:to-teal-950/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PIX</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(summary.byMethod.pix.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getMethodPercentage(summary.byMethod.pix.total)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outros */}
          <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outros</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(
                      summary.byMethod.boleto.total +
                        summary.byMethod.cheque.total +
                        summary.byMethod.outros.total
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getMethodPercentage(
                      summary.byMethod.boleto.total +
                        summary.byMethod.cheque.total +
                        summary.byMethod.outros.total
                    )}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg">Historico de Pagamentos</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Erro ao carregar pagamentos</p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum pagamento encontrado para o periodo selecionado</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Beneficiario</TableHead>
                        <TableHead>Venda</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Metodo</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(payment.data_pagamento), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {payment.beneficiario ? (
                              <Link
                                href={`/admin/intermediacao/beneficiarios/${payment.beneficiario.id}`}
                                className="text-primary hover:underline"
                              >
                                {payment.beneficiario.nome}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {payment.venda ? (
                              <Link
                                href={`/admin/intermediacao/vendas/${payment.venda.id}`}
                                className="text-primary hover:underline text-xs"
                              >
                                {payment.venda.cliente_nome}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {payment.parcela ? payment.parcela.numero_parcela : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {formatCurrency(payment.valor)}
                          </TableCell>
                          <TableCell>{getMethodBadge(payment.metodo)}</TableCell>
                          <TableCell className="max-w-[120px] truncate font-mono text-xs text-muted-foreground">
                            {payment.referencia || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/admin/intermediacao/pagamentos/${payment.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setUndoModalOpen(true);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {pagination.total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                    {Math.min(currentPage * itemsPerPage, pagination.total)} de{" "}
                    {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentPage} / {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Undo Payment Modal */}
        <Dialog open={undoModalOpen} onOpenChange={setUndoModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <RotateCcw className="h-5 w-5" />
                Desfazer Pagamento
              </DialogTitle>
              <DialogDescription>
                Esta acao e irreversivel e sera registrada na auditoria.
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono">{selectedPayment.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">{formatCurrency(selectedPayment.valor)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Beneficiario:</span>
                    <span>{selectedPayment.beneficiario?.nome || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data:</span>
                    <span>{format(new Date(selectedPayment.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justification">
                    Justificativa <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="justification"
                    placeholder="Descreva o motivo para desfazer este pagamento..."
                    value={undoJustification}
                    onChange={(e) => setUndoJustification(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUndoModalOpen(false);
                  setSelectedPayment(null);
                  setUndoJustification("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleUndoPayment}
                disabled={undoing || !undoJustification.trim()}
              >
                {undoing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Desfazer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
