"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  User,
  Wallet,
  Clock,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import Image from "next/image";

// Types matching API response from /api/intermediacao/pagamentos/[id]
interface PaymentDetail {
  id: string;
  valor: number;
  data_pagamento: string;
  metodo: "pix" | "transferencia" | "boleto" | "cheque" | "outros";
  comprovante: string | null;
  referencia: string | null;
  registrado_por: {
    id: string;
    nome: string;
    email: string;
  };
  created_at: string;
  parcela: {
    id: string;
    numero_parcela: number;
    valor: number;
    data_vencimento: string;
    status: string;
  } | null;
  venda: {
    id: string;
    valor_venda: number;
    cliente_nome: string;
    empreendimento: string;
    unidade: string;
    data_venda: string;
    percentual_intermediacao: number;
    valor_comissao_total: number;
    status: string;
  } | null;
  beneficiario: {
    id: string;
    nome: string;
    documento: string;
    cargo: string | null;
    email: string | null;
    telefone: string | null;
  } | null;
  distribuicao: {
    percentual: number;
    valor: number;
  };
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Undo Payment Modal
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [undoJustification, setUndoJustification] = useState("");
  const [undoing, setUndoing] = useState(false);

  // Comprovante Modal
  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);

  // Fetch payment data
  useEffect(() => {
    const fetchPayment = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/intermediacao/pagamentos/${params.id}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Pagamento nao encontrado");
        }

        setPayment(result.data);
      } catch (error) {
        console.error("Erro ao carregar pagamento:", error);
        toast.error(error instanceof Error ? error.message : "Erro ao carregar pagamento");
        router.push("/admin/intermediacao/pagamentos");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPayment();
    }
  }, [params.id, router]);

  // Handle undo payment
  const handleUndoPayment = async () => {
    if (!payment || !undoJustification.trim()) {
      toast.error("Informe a justificativa para desfazer o pagamento");
      return;
    }

    if (undoJustification.trim().length < 10) {
      toast.error("Justificativa deve ter no minimo 10 caracteres");
      return;
    }

    setUndoing(true);
    try {
      const response = await fetch(`/api/intermediacao/pagamentos/${payment.id}/desfazer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: undoJustification.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao desfazer pagamento");
      }

      toast.success(result.message || "Pagamento desfeito com sucesso");
      router.push("/admin/intermediacao/pagamentos");
    } catch (error) {
      console.error("Erro ao desfazer pagamento:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao desfazer pagamento");
    } finally {
      setUndoing(false);
    }
  };

  // Download comprovante
  const handleDownloadComprovante = () => {
    if (!payment?.comprovante) return;
    window.open(payment.comprovante, "_blank");
  };

  // Detect comprovante type from URL
  const getComprovanteType = (url: string | null): "image" | "pdf" | null => {
    if (!url) return null;
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)) return "image";
    if (lowerUrl.match(/\.pdf(\?|$)/)) return "pdf";
    // Default to image for unknown types
    return "image";
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Get method label and icon
  const getMethodInfo = (method: PaymentDetail["metodo"]) => {
    const config = {
      pix: {
        label: "PIX",
        icon: CreditCard,
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      },
      transferencia: {
        label: "Transferencia Bancaria",
        icon: Wallet,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
      boleto: {
        label: "Boleto Bancario",
        icon: FileText,
        className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      },
      cheque: {
        label: "Cheque",
        icon: FileText,
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      },
      outros: {
        label: "Outros",
        icon: CreditCard,
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      },
    };
    return config[method];
  };


  if (loading) {
    return (
      <AppShell title="Carregando...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!payment) {
    return (
      <AppShell title="Pagamento nao encontrado">
        <div className="container px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Pagamento nao encontrado</p>
          <Button onClick={() => router.push("/admin/intermediacao/pagamentos")}>
            Voltar para lista
          </Button>
        </div>
      </AppShell>
    );
  }

  const methodInfo = getMethodInfo(payment.metodo);

  return (
    <AppShell title={`Pagamento #${payment.id}`}>
      <div className="container px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/intermediacao/pagamentos")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pagamento #{payment.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">Detalhes do pagamento</p>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive gap-2"
              onClick={() => setUndoModalOpen(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Desfazer Pagamento
            </Button>
          )}
        </div>

        {/* Informacoes do Pagamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informacoes do Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data do Pagamento
                </p>
                <p className="font-medium">
                  {format(new Date(payment.data_pagamento), "dd 'de' MMMM 'de' yyyy 'as' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Metodo de Pagamento
                </p>
                <Badge className={cn("border-0", methodInfo.className)}>{methodInfo.label}</Badge>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Referencia</p>
                <p className="font-mono text-sm">{payment.referencia || "-"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Comprovante</p>
                {payment.comprovante ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setComprovanteModalOpen(true)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver anexo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={handleDownloadComprovante}
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum comprovante anexado</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parcela Relacionada */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Parcela Relacionada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {payment.venda && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Venda</p>
                  <Link
                    href={`/admin/intermediacao/vendas/${payment.venda.id}`}
                    className="text-primary hover:underline flex items-center gap-1 font-mono"
                  >
                    {payment.venda.cliente_nome}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {payment.beneficiario && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Beneficiario</p>
                  <Link
                    href={`/admin/intermediacao/beneficiarios/${payment.beneficiario.id}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {payment.beneficiario.nome}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {payment.beneficiario.cargo && (
                    <p className="text-xs text-muted-foreground">
                      {payment.beneficiario.cargo}
                    </p>
                  )}
                </div>
              )}

              {payment.parcela && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Parcela</p>
                  <p className="font-medium">
                    Parcela {payment.parcela.numero_parcela}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(payment.valor)}
                </p>
              </div>

              {payment.parcela && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vencimento Original</p>
                  <p className="font-medium">
                    {format(new Date(payment.parcela.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}

              {payment.venda && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Empreendimento</p>
                  <p className="font-medium">{payment.venda.empreendimento}</p>
                  <p className="text-xs text-muted-foreground">{payment.venda.unidade}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registrado Por */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Registrado Por
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Usuario</p>
                <p className="font-medium">
                  {payment.registrado_por.nome} ({payment.registrado_por.email})
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data/Hora do Registro
                </p>
                <p className="font-medium">
                  {format(new Date(payment.created_at), "dd/MM/yyyy 'as' HH:mm:ss", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Beneficiario */}
        {payment.beneficiario && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Dados do Beneficiario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-mono">{payment.beneficiario.documento}</p>
                </div>

                {payment.beneficiario.cargo && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="font-medium">{payment.beneficiario.cargo}</p>
                  </div>
                )}

                {payment.beneficiario.email && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-mono text-sm">{payment.beneficiario.email}</p>
                  </div>
                )}

                {payment.beneficiario.telefone && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-mono">{payment.beneficiario.telefone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Undo Payment Modal */}
        <Dialog open={undoModalOpen} onOpenChange={setUndoModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Desfazer Pagamento
              </DialogTitle>
              <DialogDescription>
                Esta acao e irreversivel e sera registrada na auditoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento:</span>
                  <span className="font-mono">#{payment.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium">{formatCurrency(payment.valor)}</span>
                </div>
                {payment.beneficiario && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Beneficiario:</span>
                    <span>{payment.beneficiario.nome}</span>
                  </div>
                )}
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

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUndoModalOpen(false);
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

        {/* Comprovante Modal */}
        <Dialog open={comprovanteModalOpen} onOpenChange={setComprovanteModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Comprovante de Pagamento
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {getComprovanteType(payment.comprovante) === "image" ? (
                <div className="relative aspect-[3/4] w-full bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={payment.comprovante || ""}
                    alt="Comprovante de pagamento"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : getComprovanteType(payment.comprovante) === "pdf" ? (
                <div className="aspect-[3/4] w-full bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Arquivo PDF</p>
                    <Button onClick={handleDownloadComprovante} className="gap-2">
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] w-full bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Comprovante nao disponivel</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setComprovanteModalOpen(false)}>
                Fechar
              </Button>
              {payment.comprovante && (
                <Button onClick={handleDownloadComprovante} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
