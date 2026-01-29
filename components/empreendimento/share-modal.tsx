"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Table2,
  Calculator,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  Home,
  BarChart3,
  Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  formatResumoExecutivo,
  formatCondicoesPagamento,
  formatSimulacao,
  formatUnidade,
  formatBookCompleto,
  EmpreendimentoData as FormatterEmpreendimentoData,
  UnidadeData as FormatterUnidadeData,
  SimulacaoData,
} from "@/lib/whatsapp-formatter";

type MaterialType = "book" | "condicoes" | "espelho" | "simulacao" | "resumo" | "unidade";
type Status = "idle" | "loading" | "success" | "error";

interface EmpreendimentoData {
  id: string;
  nome: string;
  cidade?: string;
  bairro?: string;
  construtora?: string;
  previsaoEntrega?: string;
  tipo?: string;
  descricao?: string;
  diferenciais?: string[];
  imagemPrincipal?: string;
  precoMinimo?: number;
  precoMaximo?: number;
}

interface UnidadeData {
  id: string;
  tipo: string;
  metragem: number;
  valor: number;
  status: string;
  quartos: number;
  vagas: number;
  andar?: number;
  final?: string;
}

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empreendimento: EmpreendimentoData;
  unidades: UnidadeData[];
  series?: any[];
  simulacao?: {
    valorImovel: number;
    entrada: number;
    percentualEntrada: number;
    valorFinanciado: number;
    prazoMeses: number;
    taxaAnual: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
  };
  unidade?: UnidadeData;
  preSelectedType?: MaterialType;
}

const materialOptions: Array<{
  type: MaterialType;
  icon: typeof BookOpen;
  title: string;
  description: string;
  requiresSimulacao?: boolean;
  requiresUnidade?: boolean;
  requiresSeries?: boolean;
}> = [
  {
    type: "resumo",
    icon: FileText,
    title: "Resumo Executivo",
    description: "Principais informações em 1 mensagem",
  },
  {
    type: "book",
    icon: BookOpen,
    title: "Book Completo",
    description: "Fotos, descrição, diferenciais e valores",
  },
  {
    type: "condicoes",
    icon: Table2,
    title: "Condições de Pagamento",
    description: "Tabela de formas de pagamento formatada",
    requiresSeries: true,
  },
  {
    type: "espelho",
    icon: BarChart3,
    title: "Espelho de Disponibilidade",
    description: "Todas as unidades e situações",
  },
  {
    type: "simulacao",
    icon: Calculator,
    title: "Simulação Financeira",
    description: "Cálculo financeiro que você fez",
    requiresSimulacao: true,
  },
  {
    type: "unidade",
    icon: Home,
    title: "Unidade Específica",
    description: "Detalhes de uma unidade selecionada",
    requiresUnidade: true,
  },
];

export function ShareModal({
  open,
  onOpenChange,
  empreendimento,
  unidades,
  series,
  simulacao,
  unidade,
  preSelectedType,
}: ShareModalProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<MaterialType | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [leadNome, setLeadNome] = useState("");
  const [leadTelefone, setLeadTelefone] = useState("");
  const [notasInternas, setNotasInternas] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Quando abrir com tipo pré-selecionado
  useEffect(() => {
    if (open && preSelectedType && !selectedType) {
      handleSelectMaterial(preSelectedType);
    }
  }, [open, preSelectedType]);

  // Reset quando fechar
  useEffect(() => {
    if (!open) {
      setSelectedType(null);
      setPreview("");
      setLeadNome("");
      setLeadTelefone("");
      setNotasInternas("");
      setStatus("idle");
      setError("");
    }
  }, [open]);

  // Gera preview da mensagem
  const generatePreview = (type: MaterialType) => {
    const formatterEmp: FormatterEmpreendimentoData = {
      id: empreendimento.id,
      nome: empreendimento.nome,
      cidade: empreendimento.cidade,
      bairro: empreendimento.bairro,
      construtora: empreendimento.construtora,
      previsaoEntrega: empreendimento.previsaoEntrega,
      tipo: empreendimento.tipo,
      descricao: empreendimento.descricao,
      diferenciais: empreendimento.diferenciais,
      precoMinimo: empreendimento.precoMinimo,
      precoMaximo: empreendimento.precoMaximo,
    };

    const formatterUnidades: FormatterUnidadeData[] = unidades.map(u => ({
      id: u.id,
      tipo: u.tipo,
      metragem: u.metragem,
      valor: u.valor,
      status: u.status,
      quartos: u.quartos,
      vagas: u.vagas,
      andar: u.andar,
      final: u.final,
    }));

    switch (type) {
      case "resumo":
        return formatResumoExecutivo(formatterEmp, formatterUnidades);
      case "book":
        return formatBookCompleto(formatterEmp, formatterUnidades);
      case "condicoes":
        return formatCondicoesPagamento(formatterEmp, series || []);
      case "espelho":
        return `📊 *Espelho de Disponibilidade*\n${empreendimento.nome}\n\n${unidades.length} unidades\n\n📲 Veja o espelho completo!`;
      case "simulacao":
        if (simulacao) {
          const formatterSim: SimulacaoData = {
            valorImovel: simulacao.valorImovel,
            entrada: simulacao.entrada,
            percentualEntrada: simulacao.percentualEntrada,
            valorFinanciado: simulacao.valorFinanciado,
            prazoMeses: simulacao.prazoMeses,
            taxaAnual: simulacao.taxaAnual,
            parcelaMensal: simulacao.parcelaMensal,
            totalPago: simulacao.totalPago,
            totalJuros: simulacao.totalJuros,
          };
          return formatSimulacao(
            formatterEmp,
            formatterSim,
            unidade ? { numero: unidade.final || unidade.id, tipo: unidade.tipo } : undefined
          );
        }
        return "";
      case "unidade":
        if (unidade) {
          const formatterUnidade: FormatterUnidadeData = {
            id: unidade.id,
            tipo: unidade.tipo,
            metragem: unidade.metragem,
            valor: unidade.valor,
            status: unidade.status,
            quartos: unidade.quartos,
            vagas: unidade.vagas,
            andar: unidade.andar,
            final: unidade.final,
          };
          return formatUnidade(formatterEmp, formatterUnidade);
        }
        return "";
      default:
        return "";
    }
  };

  // Selecionar material
  const handleSelectMaterial = (type: MaterialType) => {
    setSelectedType(type);
    setPreview(generatePreview(type));
    setStatus("idle");
    setError("");
  };

  // Voltar para seleção
  const handleBack = () => {
    setSelectedType(null);
    setPreview("");
    setStatus("idle");
    setError("");
  };

  // Enviar material
  const handleSend = async () => {
    if (!user?.id) {
      setStatus("error");
      setError("Faça login primeiro");
      return;
    }

    if (!selectedType) return;

    if (status === "loading") return;

    setStatus("loading");
    setError("");

    try {
      // Registrar interação
      const interacaoRes = await fetch("/api/interacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretor_id: user.id,
          empreendimento_id: empreendimento.id,
          empreendimento_nome: empreendimento.nome,
          tipo_material: selectedType,
          lead_nome: leadNome || undefined,
          lead_telefone: leadTelefone || undefined,
          unidade_id: unidade?.id || undefined,
          simulacao_data: selectedType === "simulacao" ? simulacao : undefined,
          notas_internas: notasInternas || undefined,
          mensagem_enviada: preview,
        }),
      });

      if (!interacaoRes.ok) {
        const data = await interacaoRes.json();
        throw new Error(data.error || "Erro ao registrar compartilhamento");
      }

      // Enviar via WhatsApp (usando API existente ou apenas abrir WhatsApp Web)
      const message = encodeURIComponent(preview);
      const whatsappUrl = `https://wa.me/?text=${message}`;
      window.open(whatsappUrl, "_blank");

      setStatus("success");
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erro ao compartilhar");
    }
  };

  // Verificar se material está disponível
  const isMaterialAvailable = (option: typeof materialOptions[0]) => {
    if (option.requiresSimulacao && !simulacao) return false;
    if (option.requiresUnidade && !unidade) return false;
    if (option.requiresSeries && (!series || series.length === 0)) return false;
    return true;
  };

  // Renderizar seleção de material ou preview
  const renderContent = () => {
    if (!selectedType) {
      // Tela de seleção de material
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Compartilhar Material
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Escolha o tipo de material para <strong>{empreendimento.nome}</strong>
            </p>
          </DialogHeader>

          <div className="py-3 space-y-2">
            {materialOptions.map((option) => {
              const Icon = option.icon;
              const isAvailable = isMaterialAvailable(option);

              return (
                <button
                  key={option.type}
                  onClick={() => isAvailable && handleSelectMaterial(option.type)}
                  disabled={!isAvailable}
                  className={cn(
                    "group relative w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                    "border-border/50 bg-background/50 hover:bg-background hover:border-primary/50 hover:-translate-y-[1px] hover:shadow-md",
                    !isAvailable && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    isAvailable ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Icon className={cn("w-5 h-5", isAvailable ? "text-primary" : "text-muted-foreground")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{option.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {!isAvailable && option.requiresSimulacao && "Faça uma simulação primeiro"}
                      {!isAvailable && option.requiresUnidade && "Selecione uma unidade primeiro"}
                      {!isAvailable && option.requiresSeries && "Condições não disponíveis"}
                      {isAvailable && option.description}
                    </p>
                  </div>

                  {isAvailable && (
                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </>
      );
    }

    // Tela de preview e envio
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Preview da Mensagem
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Revise e personalize antes de enviar
          </p>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Preview da mensagem</Label>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 max-h-48 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap font-sans">{preview}</pre>
            </div>
          </div>

          {/* Lead Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-nome" className="text-xs">Nome do Lead (opcional)</Label>
              <Input
                id="lead-nome"
                placeholder="Ex: João Silva"
                value={leadNome}
                onChange={(e) => setLeadNome(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-telefone" className="text-xs">Telefone (opcional)</Label>
              <Input
                id="lead-telefone"
                placeholder="(11) 99999-9999"
                value={leadTelefone}
                onChange={(e) => setLeadTelefone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Notas Internas */}
          <div className="space-y-1.5">
            <Label htmlFor="notas" className="text-xs">Notas Internas (não vai no WhatsApp)</Label>
            <Textarea
              id="notas"
              placeholder="Ex: Cliente quer 2 vagas, orçamento até 500k"
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              className="h-20 text-sm resize-none"
            />
          </div>

          {/* Error Message */}
          {status === "error" && error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {status === "success" && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm text-green-700 dark:text-green-400">Compartilhado com sucesso!</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={handleBack} disabled={status === "loading"}>
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={status === "loading"}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={status === "loading" || status === "success"}>
              {status === "loading" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {status === "success" ? "Enviado!" : "Enviar WhatsApp"}
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
        </div>

        <div className="relative">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
