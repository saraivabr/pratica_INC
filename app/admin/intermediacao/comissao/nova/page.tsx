"use client";

/**
 * Nova Venda para Cálculo de Comissões - VERSÃO INTELIGENTE
 * Baseado no SOP - Sistema de Controle de Comissões e Fluxo de Caixa
 *
 * Melhorias implementadas:
 * 1. Importar venda do CV CRM
 * 2. Templates de parcelas
 * 3. Auto-distribuir corretores
 * 4. Busca inteligente de cliente por CPF
 * 5. Comissão sugerida por empreendimento
 * 6. Validações e avisos inteligentes
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Users,
  ClipboardList,
  Check,
  Plus,
  Trash2,
  Search,
  RotateCcw,
  AlertCircle,
  DollarSign,
  Percent,
  FileText,
  Download,
  Loader2,
  Import,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  UserPlus,
  LayoutTemplate,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import {
  useCreateComissaoVendaCompleta,
  useBuscarCorretores,
  useBuscarReservas,
  useBuscarClientePorCpf,
} from "@/lib/comissao/hooks";
import { arredondarValor, formatarMoeda } from "@/lib/comissao/calculations";
import type { CorretorBusca, ReservaBusca, ValidacaoInteligente, TemplateParcelas } from "@/lib/comissao/types";
import { TEMPLATES_PARCELAS, LIMITES_VALIDACAO } from "@/lib/comissao/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Steps conforme SOP
const STEPS = [
  { id: 1, title: "Imóvel e Cliente", icon: Building2 },
  { id: 2, title: "Proposta Cliente", icon: FileText },
  { id: 3, title: "Autônomos", icon: Users },
  { id: 4, title: "Pagamentos", icon: DollarSign },
  { id: 5, title: "Resumo", icon: Check },
];

// Tipos de parcela da proposta do cliente
type TipoParcela = "ato" | "mensal" | "anual" | "financiamento" | "entrada";

interface ParcelaCliente {
  id: string;
  tipo: TipoParcela;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  dataVencimento: string;
}

interface Autonomo {
  id: string;
  nome: string;
  cpf?: string;
  percentual: number;
  valorComissao: number;
  creci?: string;
  imobiliaria?: string;
  corretorId?: number; // ID do corretor no CV CRM
}

interface PagamentoRateio {
  id: string;
  data: string;
  tipo: TipoParcela;
  valorRecebido: number;
  valorRateio: number;
  pagamentos: { autonomoId: string; percentual: number; valor: number }[];
}

// Cores por tipo de parcela
const TIPO_PARCELA_CONFIG: Record<TipoParcela, { label: string; color: string; bgColor: string; borderColor: string }> = {
  ato: { label: "Ato", color: "text-emerald-700", bgColor: "bg-emerald-50 dark:bg-emerald-900/30", borderColor: "border-emerald-300" },
  entrada: { label: "Entrada", color: "text-teal-700", bgColor: "bg-teal-50 dark:bg-teal-900/30", borderColor: "border-teal-300" },
  mensal: { label: "Mensal", color: "text-blue-700", bgColor: "bg-blue-50 dark:bg-blue-900/30", borderColor: "border-blue-300" },
  anual: { label: "Anual", color: "text-purple-700", bgColor: "bg-purple-50 dark:bg-purple-900/30", borderColor: "border-purple-300" },
  financiamento: { label: "Financ.", color: "text-amber-700", bgColor: "bg-amber-50 dark:bg-amber-900/30", borderColor: "border-amber-300" },
};

export default function NovaComissaoPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // ========================================
  // SEÇÃO 1: Dados do Imóvel e Cliente
  // ========================================
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCpf, setClienteCpf] = useState("");
  const [nomeProduto, setNomeProduto] = useState("");
  const [numeroImovel, setNumeroImovel] = useState("");
  const [torre, setTorre] = useState("");
  const [valorImovel, setValorImovel] = useState<number>(0);
  const [percentualComissao, setPercentualComissao] = useState<number>(6);
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split("T")[0]);

  // Dados importados do CV CRM
  const [reservaImportada, setReservaImportada] = useState<ReservaBusca | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [buscaReserva, setBuscaReserva] = useState("");
  const [tipoBuscaReserva, setTipoBuscaReserva] = useState<'cliente' | 'codigo' | 'unidade' | 'cpf' | undefined>();

  // Hook de busca de reservas
  const { reservas: reservasBusca, loading: loadingReservas } = useBuscarReservas(
    buscaReserva,
    tipoBuscaReserva,
    buscaReserva.length >= 2
  );

  // Hook de busca de cliente por CPF
  const { cliente: clienteBuscaCpf, loading: loadingClienteCpf } = useBuscarClientePorCpf(
    clienteCpf,
    clienteCpf.replace(/\D/g, "").length >= 11
  );

  // Auto-preenche nome do cliente quando encontrado por CPF
  useEffect(() => {
    if (clienteBuscaCpf.encontrado && clienteBuscaCpf.nome && !clienteNome) {
      setClienteNome(clienteBuscaCpf.nome);
      toast.success("Cliente encontrado no CV CRM!");
    }
  }, [clienteBuscaCpf, clienteNome]);

  // Função para importar reserva do CV CRM
  const handleImportarReserva = useCallback((reserva: ReservaBusca) => {
    setReservaImportada(reserva);
    setNomeProduto(reserva.empreendimento_nome);
    setNumeroImovel(reserva.unidade_codigo);
    setClienteNome(reserva.cliente_nome);
    setClienteCpf(reserva.cliente_cpf);
    setValorImovel(reserva.valor_total);
    if (reserva.data_reserva) {
      setDataVenda(reserva.data_reserva.split("T")[0]);
    }
    // Adiciona o corretor da reserva como autônomo
    if (reserva.corretor_id && reserva.corretor_nome) {
      const corretorAutonomo: Autonomo = {
        id: Date.now().toString(),
        nome: reserva.corretor_nome,
        percentual: 100,
        valorComissao: 0, // Será calculado depois
        corretorId: reserva.corretor_id,
      };
      setAutonomos([corretorAutonomo]);
    }
    setImportModalOpen(false);
    setBuscaReserva("");
    toast.success("Venda importada do CV CRM com sucesso!");
  }, []);

  // Comissão total calculada
  const comissaoTotal = useMemo(() => {
    return arredondarValor(valorImovel * (percentualComissao / 100));
  }, [valorImovel, percentualComissao]);

  // ========================================
  // SEÇÃO 2: Proposta do Cliente
  // ========================================
  const [parcelasCliente, setParcelasCliente] = useState<ParcelaCliente[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateParcelas | null>(null);

  const totalProposta = useMemo(() => {
    return parcelasCliente.reduce((sum, p) => sum + p.valorTotal, 0);
  }, [parcelasCliente]);

  const handleAddParcelaCliente = () => {
    const novaParcela: ParcelaCliente = {
      id: Date.now().toString(),
      tipo: "mensal",
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0,
      dataVencimento: new Date().toISOString().split("T")[0],
    };
    setParcelasCliente([...parcelasCliente, novaParcela]);
  };

  const handleParcelaClienteChange = (id: string, field: keyof ParcelaCliente, value: any) => {
    setParcelasCliente(parcelasCliente.map(p => {
      if (p.id !== id) return p;

      const updated = { ...p, [field]: value };

      if (field === "quantidade" || field === "valorUnitario") {
        updated.valorTotal = arredondarValor(updated.quantidade * updated.valorUnitario);
      }

      return updated;
    }));
  };

  const handleRemoveParcelaCliente = (id: string) => {
    setParcelasCliente(parcelasCliente.filter(p => p.id !== id));
  };

  // Aplicar template de parcelas
  const handleAplicarTemplate = useCallback((template: TemplateParcelas) => {
    if (valorImovel <= 0) {
      toast.error("Defina o valor do imóvel antes de aplicar o template");
      return;
    }

    const novasParcelas: ParcelaCliente[] = [];
    const dataBase = new Date(dataVenda);
    let parcelaIndex = 0;

    template.parcelas.forEach((item) => {
      if (item.quantidade && item.percentualTotal) {
        // Múltiplas parcelas (ex: 12 mensais)
        const valorPorParcela = arredondarValor((valorImovel * (item.percentualTotal / 100)) / item.quantidade);

        for (let i = 0; i < item.quantidade; i++) {
          const dataParcela = new Date(dataBase);

          if (item.tipo === "mensal") {
            dataParcela.setMonth(dataParcela.getMonth() + i + 1);
          } else if (item.tipo === "anual") {
            dataParcela.setFullYear(dataParcela.getFullYear() + i + 1);
          }

          novasParcelas.push({
            id: `${Date.now()}-${parcelaIndex++}`,
            tipo: item.tipo,
            quantidade: 1,
            valorUnitario: valorPorParcela,
            valorTotal: valorPorParcela,
            dataVencimento: dataParcela.toISOString().split("T")[0],
          });
        }
      } else if (item.percentual) {
        // Parcela única (ex: ato 10%)
        const valorParcela = arredondarValor(valorImovel * (item.percentual / 100));

        novasParcelas.push({
          id: `${Date.now()}-${parcelaIndex++}`,
          tipo: item.tipo,
          quantidade: 1,
          valorUnitario: valorParcela,
          valorTotal: valorParcela,
          dataVencimento: dataBase.toISOString().split("T")[0],
        });
      }
    });

    setParcelasCliente(novasParcelas);
    setTemplateModalOpen(false);
    toast.success(`Template "${template.nome}" aplicado!`);
  }, [valorImovel, dataVenda]);

  // ========================================
  // SEÇÃO 3: Autônomos (Comissionados)
  // ========================================
  const [autonomos, setAutonomos] = useState<Autonomo[]>([]);
  const [buscaAutonomoOpen, setBuscaAutonomoOpen] = useState(false);
  const [buscaAutonomoTerm, setBuscaAutonomoTerm] = useState("");

  const { corretores: corretoresBusca, loading: loadingCorretores } = useBuscarCorretores(
    buscaAutonomoTerm,
    buscaAutonomoTerm.length >= 2
  );

  const totalComissoesAutonomos = useMemo(() => {
    return autonomos.reduce((sum, a) => sum + a.valorComissao, 0);
  }, [autonomos]);

  // Recalcula valores quando comissaoTotal muda
  useEffect(() => {
    if (comissaoTotal > 0 && autonomos.length > 0) {
      setAutonomos(autonomos.map(a => ({
        ...a,
        valorComissao: arredondarValor(comissaoTotal * (a.percentual / 100)),
      })));
    }
  }, [comissaoTotal]);

  const handleAddAutonomo = (corretor?: CorretorBusca) => {
    const novoAutonomo: Autonomo = {
      id: Date.now().toString(),
      nome: corretor?.nome || "",
      cpf: corretor?.cpf || "",
      percentual: 0,
      valorComissao: 0,
      creci: corretor?.creci || "",
      imobiliaria: corretor?.imobiliaria_nome || "",
      corretorId: corretor?.cvcrm_id,
    };
    setAutonomos([...autonomos, novoAutonomo]);
    setBuscaAutonomoOpen(false);
    setBuscaAutonomoTerm("");
  };

  const handleAutonomoChange = (id: string, field: keyof Autonomo, value: any) => {
    setAutonomos(autonomos.map(a => {
      if (a.id !== id) return a;

      const updated = { ...a, [field]: value };

      if (field === "percentual" && comissaoTotal > 0) {
        updated.valorComissao = arredondarValor(comissaoTotal * (value / 100));
      }
      if (field === "valorComissao" && comissaoTotal > 0) {
        updated.percentual = arredondarValor((value / comissaoTotal) * 100);
      }

      return updated;
    }));
  };

  const handleRemoveAutonomo = (id: string) => {
    setAutonomos(autonomos.filter(a => a.id !== id));
  };

  // Dividir comissão igualmente entre corretores
  const handleDividirIgual = useCallback(() => {
    if (autonomos.length === 0) {
      toast.error("Adicione pelo menos um corretor");
      return;
    }

    const percentualCada = arredondarValor(100 / autonomos.length);
    const valorCada = arredondarValor(comissaoTotal / autonomos.length);

    setAutonomos(autonomos.map((a, i) => ({
      ...a,
      percentual: i === 0 ? 100 - (percentualCada * (autonomos.length - 1)) : percentualCada,
      valorComissao: i === 0 ? comissaoTotal - (valorCada * (autonomos.length - 1)) : valorCada,
    })));

    toast.success("Comissão dividida igualmente!");
  }, [autonomos, comissaoTotal]);

  // Trazer corretor da reserva
  const handleTrazerCorretorReserva = useCallback(() => {
    if (!reservaImportada || !reservaImportada.corretor_id) {
      toast.error("Nenhuma reserva importada ou sem corretor vinculado");
      return;
    }

    // Verifica se já existe
    const jaExiste = autonomos.some(a => a.corretorId === reservaImportada.corretor_id);
    if (jaExiste) {
      toast.info("Corretor já está na lista");
      return;
    }

    const novoAutonomo: Autonomo = {
      id: Date.now().toString(),
      nome: reservaImportada.corretor_nome,
      percentual: autonomos.length === 0 ? 100 : 0,
      valorComissao: autonomos.length === 0 ? comissaoTotal : 0,
      corretorId: reservaImportada.corretor_id,
    };

    setAutonomos([...autonomos, novoAutonomo]);
    toast.success("Corretor da reserva adicionado!");
  }, [reservaImportada, autonomos, comissaoTotal]);

  // ========================================
  // VALIDAÇÕES INTELIGENTES
  // ========================================
  const validacoes = useMemo<ValidacaoInteligente[]>(() => {
    const msgs: ValidacaoInteligente[] = [];

    // Validação de % comissão
    if (percentualComissao > 0 && percentualComissao < LIMITES_VALIDACAO.comissao_minima) {
      msgs.push({
        tipo: "warning",
        mensagem: `Comissão abaixo de ${LIMITES_VALIDACAO.comissao_minima}% - verificar se está correto`,
        campo: "percentualComissao",
      });
    }
    if (percentualComissao > LIMITES_VALIDACAO.comissao_maxima) {
      msgs.push({
        tipo: "warning",
        mensagem: `Comissão acima de ${LIMITES_VALIDACAO.comissao_maxima}% - verificar se está correto`,
        campo: "percentualComissao",
      });
    }

    // Validação de valores dos corretores
    autonomos.forEach(a => {
      if (a.valorComissao > 0 && a.valorComissao < LIMITES_VALIDACAO.valor_minimo_corretor) {
        msgs.push({
          tipo: "warning",
          mensagem: `${a.nome || "Corretor"} receberá menos de ${formatarMoeda(LIMITES_VALIDACAO.valor_minimo_corretor)} - valor baixo`,
          campo: "autonomos",
        });
      }
    });

    // Validação soma percentuais = 100%
    const somaPercentuais = autonomos.reduce((sum, a) => sum + a.percentual, 0);
    if (autonomos.length > 0 && Math.abs(somaPercentuais - 100) > 0.1) {
      msgs.push({
        tipo: "error",
        mensagem: `Soma dos percentuais é ${arredondarValor(somaPercentuais)}% (deve ser 100%)`,
        campo: "autonomos",
      });
    }

    // Validação do ato
    const parcelaAto = parcelasCliente.find(p => p.tipo === "ato");
    if (parcelaAto && valorImovel > 0) {
      const percentualAto = (parcelaAto.valorTotal / valorImovel) * 100;
      if (percentualAto < LIMITES_VALIDACAO.percentual_ato_minimo) {
        msgs.push({
          tipo: "warning",
          mensagem: `Ato representa apenas ${arredondarValor(percentualAto)}% do valor - confirmar se é intencional`,
          campo: "parcelas",
        });
      }
    }

    // Sucesso se não houver erros e tiver dados
    if (msgs.filter(m => m.tipo === "error").length === 0 && autonomos.length > 0 && parcelasCliente.length > 0) {
      msgs.push({
        tipo: "success",
        mensagem: "Valores dentro do padrão esperado",
      });
    }

    return msgs;
  }, [percentualComissao, autonomos, parcelasCliente, valorImovel]);

  // ========================================
  // SEÇÃO 4: Controle de Pagamentos
  // ========================================
  const [percentualRateio, setPercentualRateio] = useState(60);
  const [percentuaisPersonalizados, setPercentuaisPersonalizados] = useState<Record<string, number>>({});

  const parcelasExpandidas = useMemo(() => {
    const resultado: { id: string; data: string; valor: number; tipo: TipoParcela }[] = [];

    parcelasCliente.forEach((parcela, parcelaIdx) => {
      const dataBase = new Date(parcela.dataVencimento);

      for (let i = 0; i < parcela.quantidade; i++) {
        const data = new Date(dataBase);

        if (parcela.tipo === "mensal" && i > 0) {
          data.setMonth(data.getMonth() + i);
        } else if (parcela.tipo === "anual" && i > 0) {
          data.setFullYear(data.getFullYear() + i);
        }

        resultado.push({
          id: `${parcelaIdx}-${i}`,
          data: data.toISOString().split("T")[0],
          valor: parcela.valorUnitario,
          tipo: parcela.tipo,
        });
      }
    });

    resultado.sort((a, b) => a.data.localeCompare(b.data));
    return resultado;
  }, [parcelasCliente]);

  const matrizRateio = useMemo(() => {
    if (parcelasExpandidas.length === 0 || autonomos.length === 0) return null;

    const rateios: PagamentoRateio[] = parcelasExpandidas.map(parcela => {
      const valorRateio = arredondarValor(parcela.valor * (percentualRateio / 100));

      const temPersonalizado = autonomos.some(a =>
        percentuaisPersonalizados[`${parcela.id}-${a.id}`] !== undefined
      );

      const pagamentos = autonomos.map(autonomo => {
        let percentual: number;

        if (temPersonalizado && percentuaisPersonalizados[`${parcela.id}-${autonomo.id}`] !== undefined) {
          percentual = percentuaisPersonalizados[`${parcela.id}-${autonomo.id}`];
        } else {
          percentual = totalComissoesAutonomos > 0
            ? (autonomo.valorComissao / totalComissoesAutonomos) * 100
            : 0;
        }

        return {
          autonomoId: autonomo.id,
          percentual: arredondarValor(percentual),
          valor: arredondarValor(valorRateio * (percentual / 100)),
        };
      });

      return {
        id: parcela.id,
        data: parcela.data,
        tipo: parcela.tipo,
        valorRecebido: parcela.valor,
        valorRateio,
        pagamentos,
      };
    });

    return rateios;
  }, [parcelasExpandidas, autonomos, percentualRateio, totalComissoesAutonomos, percentuaisPersonalizados]);

  const handlePercentualChange = (parcelaId: string, autonomoId: string, novoPercentual: number) => {
    if (!matrizRateio) return;

    const parcela = matrizRateio.find(p => p.id === parcelaId);
    if (!parcela) return;

    const outrosAutonomos = parcela.pagamentos.filter(p => p.autonomoId !== autonomoId);
    const totalOutros = outrosAutonomos.reduce((sum, p) => sum + p.percentual, 0);

    const percentualAjustado = Math.min(Math.max(0, novoPercentual), 100);

    const novoTotalComEste = totalOutros + percentualAjustado;

    const novosPercentuais = { ...percentuaisPersonalizados };

    if (novoTotalComEste > 100 && totalOutros > 0) {
      const fatorReducao = (100 - percentualAjustado) / totalOutros;
      outrosAutonomos.forEach(outro => {
        novosPercentuais[`${parcelaId}-${outro.autonomoId}`] = arredondarValor(outro.percentual * fatorReducao);
      });
    }

    novosPercentuais[`${parcelaId}-${autonomoId}`] = percentualAjustado;
    setPercentuaisPersonalizados(novosPercentuais);
  };

  const resetPercentuaisParcela = (parcelaId: string) => {
    const novos = { ...percentuaisPersonalizados };
    autonomos.forEach(a => {
      delete novos[`${parcelaId}-${a.id}`];
    });
    setPercentuaisPersonalizados(novos);
  };

  const totaisPorAutonomo = useMemo(() => {
    if (!matrizRateio) return {};

    const totais: Record<string, number> = {};
    autonomos.forEach(a => { totais[a.id] = 0; });

    matrizRateio.forEach(rateio => {
      rateio.pagamentos.forEach(pag => {
        totais[pag.autonomoId] = (totais[pag.autonomoId] || 0) + pag.valor;
      });
    });

    return totais;
  }, [matrizRateio, autonomos]);

  // ========================================
  // SEÇÃO 5: Resumo Financeiro
  // ========================================
  const valorContrato = useMemo(() => {
    return arredondarValor(totalProposta - totalComissoesAutonomos);
  }, [totalProposta, totalComissoesAutonomos]);

  const [geratingPDF, setGeratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!matrizRateio) {
      toast.error("Configure a matriz de rateio antes de gerar o PDF");
      return;
    }

    setGeratingPDF(true);
    try {
      const response = await fetch("/api/comissao/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeProduto,
          numeroImovel,
          torre,
          valorImovel,
          percentualComissao,
          comissaoTotal,
          dataVenda,
          clienteNome,
          clienteCpf,
          autonomos,
          matrizRateio,
          totaisPorAutonomo,
          totalProposta,
          valorContrato,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comissao-${nomeProduto || "venda"}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeratingPDF(false);
    }
  };

  // ========================================
  // Validações
  // ========================================
  const canProceedStep1 = valorImovel > 0 && percentualComissao > 0 && dataVenda;
  const canProceedStep2 = parcelasCliente.length > 0 && totalProposta > 0;
  const canProceedStep3 = autonomos.length > 0 && totalComissoesAutonomos > 0;
  const canProceedStep4 = matrizRateio && matrizRateio.length > 0;

  // ========================================
  // Submit
  // ========================================
  const createVenda = useCreateComissaoVendaCompleta();

  const handleSubmit = async () => {
    try {
      await createVenda.mutateAsync({
        venda: {
          valor_venda: valorImovel,
          percentual_comissao: percentualComissao / 100,
          empreendimento: nomeProduto,
          unidade: `${numeroImovel}${torre ? ` - ${torre}` : ""}`,
          cliente_nome: clienteNome,
          cliente_cpf: clienteCpf,
          data_venda: dataVenda,
          observacoes: `Rateio: ${percentualRateio}%${reservaImportada ? ` | Reserva CV CRM: ${reservaImportada.codigo}` : ""}`,
        },
        corretores: autonomos.map((a, i) => ({
          nome: a.nome,
          cpf: a.cpf,
          percentual_participacao: a.percentual / 100,
          valor_comissao: a.valorComissao,
          prioridade: i,
        })),
        parcelas: parcelasCliente.map((p, i) => ({
          numero: i + 1,
          descricao: `${p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)} (${p.quantidade}x)`,
          valor_parcela: p.valorTotal,
          percentual_comissao: totalProposta > 0 ? (p.valorTotal / totalProposta) : 0,
          data_prevista: p.dataVencimento,
        })),
      });

      toast.success("Venda cadastrada com sucesso!");
      router.push("/admin/intermediacao/comissao");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar venda");
    }
  };

  // ========================================
  // Verificação de acesso
  // ========================================
  const hasAccess = user && (user.role === "admin" || user.role === "gerente");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-14 w-14 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <Button onClick={() => router.push("/admin")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
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
            <h1 className="text-2xl font-bold">Nova Venda</h1>
            <p className="text-sm text-muted-foreground">
              Sistema Inteligente de Comissões
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                  isActive && "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
                  isCompleted && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                  !isActive && !isCompleted && "text-gray-400"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium hidden sm:inline">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-6 h-0.5 mx-1",
                  currentStep > step.id ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Validações Inteligentes - mostrar apenas se houver alertas */}
      {validacoes.length > 0 && currentStep >= 3 && (
        <div className="space-y-2">
          {validacoes.map((v, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                v.tipo === "error" && "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                v.tipo === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                v.tipo === "info" && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                v.tipo === "success" && "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              )}
            >
              {v.tipo === "error" && <AlertCircle className="h-4 w-4" />}
              {v.tipo === "warning" && <AlertTriangle className="h-4 w-4" />}
              {v.tipo === "info" && <Info className="h-4 w-4" />}
              {v.tipo === "success" && <CheckCircle2 className="h-4 w-4" />}
              {v.mensagem}
            </div>
          ))}
        </div>
      )}

      {/* Step Content */}
      <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
        <CardContent className="p-6">

          {/* ========================================
              STEP 1: Dados do Imóvel e Cliente
              ======================================== */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">1. Dados do Imóvel e Cliente</h3>
                  <p className="text-sm text-muted-foreground">
                    Informações básicas da venda
                  </p>
                </div>

                {/* Botão Importar do CV CRM */}
                <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 gap-2">
                      <Import className="h-4 w-4" />
                      Importar do CV CRM
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Importar Venda do CV CRM
                      </DialogTitle>
                      <DialogDescription>
                        Busque uma reserva/venda existente para preencher automaticamente os dados
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Select
                          value={tipoBuscaReserva || "todos"}
                          onValueChange={(v) => setTipoBuscaReserva(v === "todos" ? undefined : v as any)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Buscar por" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                            <SelectItem value="codigo">Código</SelectItem>
                            <SelectItem value="cpf">CPF</SelectItem>
                            <SelectItem value="unidade">Unidade</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Digite para buscar..."
                          value={buscaReserva}
                          onChange={(e) => setBuscaReserva(e.target.value)}
                          className="flex-1"
                        />
                      </div>

                      <div className="max-h-80 overflow-y-auto space-y-2">
                        {loadingReservas && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                          </div>
                        )}
                        {!loadingReservas && buscaReserva.length >= 2 && reservasBusca.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhuma reserva encontrada
                          </p>
                        )}
                        {reservasBusca.map((reserva) => (
                          <div
                            key={reserva.reserva_id}
                            className="p-4 rounded-lg border hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                            onClick={() => handleImportarReserva(reserva)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{reserva.cliente_nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  {reserva.empreendimento_nome} - Unidade {reserva.unidade_codigo}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-indigo-600">{formatarMoeda(reserva.valor_total)}</p>
                                <Badge variant="outline" className="text-xs">
                                  {reserva.codigo}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Corretor: {reserva.corretor_nome}</span>
                              <span>Status: {reserva.situacao}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Indicador de reserva importada */}
              {reservaImportada && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Importado: Reserva {reservaImportada.codigo} - {reservaImportada.cliente_nome}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReservaImportada(null)}
                    className="ml-auto h-7 text-xs"
                  >
                    Limpar
                  </Button>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <div className="relative">
                    <Input
                      value={clienteCpf}
                      onChange={(e) => setClienteCpf(e.target.value)}
                      placeholder="00000000000"
                    />
                    {loadingClienteCpf && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {clienteBuscaCpf.encontrado && !loadingClienteCpf && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {clienteBuscaCpf.encontrado && (
                    <p className="text-xs text-green-600">Cliente encontrado no CV CRM</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Input
                    type="date"
                    value={dataVenda}
                    onChange={(e) => setDataVenda(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome do Produto (Imóvel)</Label>
                  <Input
                    value={nomeProduto}
                    onChange={(e) => setNomeProduto(e.target.value)}
                    placeholder="Ex: Alta Vista, Parque das Flores"
                  />
                </div>

                <div className="space-y-2">
                  <Label>N° Imóvel</Label>
                  <Input
                    value={numeroImovel}
                    onChange={(e) => setNumeroImovel(e.target.value)}
                    placeholder="Ex: 2204"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Torre (opcional)</Label>
                  <Input
                    value={torre}
                    onChange={(e) => setTorre(e.target.value)}
                    placeholder="Ex: A, B, Norte"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Total do Imóvel *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="number"
                      value={valorImovel || ""}
                      onChange={(e) => setValorImovel(parseFloat(e.target.value) || 0)}
                      className="pl-10"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>% Total de Comissão *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={percentualComissao || ""}
                      onChange={(e) => setPercentualComissao(parseFloat(e.target.value) || 0)}
                      className="pr-8"
                      placeholder="6.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>R$ Total de Comissão</Label>
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                    {formatarMoeda(comissaoTotal)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================
              STEP 2: Proposta do Cliente
              ======================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">2. Proposta do Cliente</h3>
                  <p className="text-sm text-muted-foreground">
                    Como o cliente vai pagar o imóvel
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Modelos Rápidos */}
                  <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        Modelos Rápidos
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <LayoutTemplate className="h-5 w-5 text-indigo-500" />
                          Templates de Parcelas
                        </DialogTitle>
                        <DialogDescription>
                          Escolha um modelo para preencher as parcelas automaticamente
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {TEMPLATES_PARCELAS.map((template) => (
                          <div
                            key={template.id}
                            className="p-4 rounded-lg border hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                            onClick={() => handleAplicarTemplate(template)}
                          >
                            <p className="font-medium">{template.nome}</p>
                            <p className="text-sm text-muted-foreground">{template.descricao}</p>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button onClick={handleAddParcelaCliente} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Parcela
                  </Button>
                </div>
              </div>

              {parcelasCliente.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma parcela adicionada</p>
                  <p className="text-sm">Use um modelo rápido ou adicione manualmente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2">Qtde</div>
                    <div className="col-span-3">Valor Unitário</div>
                    <div className="col-span-2">Valor Total</div>
                    <div className="col-span-2">Data</div>
                    <div className="col-span-1"></div>
                  </div>

                  {parcelasCliente.map((parcela) => (
                    <div key={parcela.id} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
                      <div className="col-span-2">
                        <Select
                          value={parcela.tipo}
                          onValueChange={(v) => handleParcelaClienteChange(parcela.id, "tipo", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ato">Ato</SelectItem>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                            <SelectItem value="financiamento">Financiamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={parcela.quantidade}
                          onChange={(e) => handleParcelaClienteChange(parcela.id, "quantidade", parseInt(e.target.value) || 1)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            value={parcela.valorUnitario || ""}
                            onChange={(e) => handleParcelaClienteChange(parcela.id, "valorUnitario", parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-bold text-indigo-600">
                          {formatarMoeda(parcela.valorTotal)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="date"
                          value={parcela.dataVencimento}
                          onChange={(e) => handleParcelaClienteChange(parcela.id, "dataVencimento", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParcelaCliente(parcela.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    <span className="font-semibold">Total da Proposta:</span>
                    <span className="text-xl font-bold text-indigo-600">{formatarMoeda(totalProposta)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================
              STEP 3: Autônomos (Comissionados)
              ======================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">3. Autônomos (Comissionados)</h3>
                  <p className="text-sm text-muted-foreground">
                    Corretores e intermediários que receberão comissão
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Botão trazer da reserva */}
                  {reservaImportada && reservaImportada.corretor_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTrazerCorretorReserva}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Da Reserva
                    </Button>
                  )}

                  {/* Botão dividir igual */}
                  {autonomos.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDividirIgual}
                      className="gap-2"
                    >
                      <Scale className="h-4 w-4" />
                      Dividir Igual
                    </Button>
                  )}

                  <Dialog open={buscaAutonomoOpen} onOpenChange={setBuscaAutonomoOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Buscar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Buscar Corretor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Digite o nome..."
                          value={buscaAutonomoTerm}
                          onChange={(e) => setBuscaAutonomoTerm(e.target.value)}
                        />
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {loadingCorretores && <p className="text-sm text-muted-foreground">Buscando...</p>}
                          {corretoresBusca.map((corretor) => (
                            <div
                              key={corretor.id}
                              className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                              onClick={() => handleAddAutonomo(corretor)}
                            >
                              <p className="font-medium">{corretor.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {corretor.cpf} {corretor.creci && `| CRECI: ${corretor.creci}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => handleAddAutonomo()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Manual
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => handleAddAutonomo()} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-sm">
                <span className="text-muted-foreground">Comissão total disponível:</span>
                <span className="font-bold text-indigo-600 ml-2">{formatarMoeda(comissaoTotal)}</span>
              </div>

              {autonomos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum autônomo adicionado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
                    <div className="col-span-4">Nome</div>
                    <div className="col-span-3">% Comissão</div>
                    <div className="col-span-4">Valor da Comissão</div>
                    <div className="col-span-1"></div>
                  </div>

                  {autonomos.map((autonomo) => (
                    <div key={autonomo.id} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
                      <div className="col-span-4">
                        <Input
                          value={autonomo.nome}
                          onChange={(e) => handleAutonomoChange(autonomo.id, "nome", e.target.value)}
                          placeholder="Nome do corretor"
                          className="h-9"
                        />
                        {autonomo.corretorId && (
                          <span className="text-[10px] text-green-600">CV CRM #{autonomo.corretorId}</span>
                        )}
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={autonomo.percentual || ""}
                            onChange={(e) => handleAutonomoChange(autonomo.id, "percentual", parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="col-span-4">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            value={autonomo.valorComissao || ""}
                            onChange={(e) => handleAutonomoChange(autonomo.id, "valorComissao", parseFloat(e.target.value) || 0)}
                            className="h-9 font-bold text-indigo-600"
                          />
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAutonomo(autonomo.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="font-semibold">Total das comissões:</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-indigo-600">{formatarMoeda(totalComissoesAutonomos)}</span>
                      {totalComissoesAutonomos > comissaoTotal && (
                        <p className="text-xs text-red-500">Excede a comissão total!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================
              STEP 4: Controle de Pagamentos
              ======================================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">4. Controle de Pagamentos de Comissões</h3>
                  <p className="text-sm text-muted-foreground">
                    Matriz de rateio baseada no fluxo de caixa
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <Label className="whitespace-nowrap">% da parcela usada para comissões:</Label>
                  <div className="flex-1 max-w-xs">
                    <Slider
                      value={[percentualRateio]}
                      onValueChange={([v]) => setPercentualRateio(v)}
                      min={10}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={percentualRateio}
                      onChange={(e) => setPercentualRateio(parseInt(e.target.value) || 60)}
                      className="w-20 h-9"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {matrizRateio && matrizRateio.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-medium">Legenda:</span>
                    {Object.entries(TIPO_PARCELA_CONFIG).map(([tipo, config]) => (
                      <Badge key={tipo} variant="outline" className={cn(config.bgColor, config.borderColor, config.color)}>
                        {config.label}
                      </Badge>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="text-left p-3 font-semibold border-r sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">Autônomo</th>
                          <th className="text-right p-3 font-semibold border-r bg-indigo-50 dark:bg-indigo-900/30">Total</th>
                          {matrizRateio.map((r, i) => {
                            const config = TIPO_PARCELA_CONFIG[r.tipo];
                            return (
                              <th key={i} className={cn("p-2 min-w-[130px] border-l", config.bgColor)}>
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.borderColor, config.color)}>
                                    {config.label}
                                  </Badge>
                                  <span className="text-xs font-medium">
                                    {new Date(r.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatarMoeda(r.valorRecebido)}
                                  </span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {autonomos.map((autonomo) => (
                          <tr key={autonomo.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-3 border-r sticky left-0 bg-white dark:bg-gray-950 z-10">
                              <div className="font-medium">{autonomo.nome || "Sem nome"}</div>
                              <div className="text-xs text-muted-foreground">{autonomo.percentual}%</div>
                            </td>
                            <td className="text-right p-3 border-r font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30">
                              {formatarMoeda(totaisPorAutonomo[autonomo.id] || 0)}
                            </td>
                            {matrizRateio.map((rateio, i) => {
                              const pag = rateio.pagamentos.find(p => p.autonomoId === autonomo.id);
                              const config = TIPO_PARCELA_CONFIG[rateio.tipo];
                              const temPersonalizado = percentuaisPersonalizados[`${rateio.id}-${autonomo.id}`] !== undefined;
                              return (
                                <td key={i} className={cn("p-2 border-l", config.bgColor, "bg-opacity-30")}>
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={pag?.percentual || 0}
                                        onChange={(e) => handlePercentualChange(rateio.id, autonomo.id, parseFloat(e.target.value) || 0)}
                                        className={cn(
                                          "w-14 h-6 text-xs text-center p-1",
                                          temPersonalizado && "border-amber-400 bg-amber-50"
                                        )}
                                        min={0}
                                        max={100}
                                        step={0.5}
                                      />
                                      <span className="text-[10px] text-muted-foreground">%</span>
                                    </div>
                                    <span className="font-mono text-xs font-medium">
                                      {pag && pag.valor > 0 ? formatarMoeda(pag.valor) : "-"}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-800 font-semibold border-t">
                          <td className="p-3 border-r sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">Total rateio</td>
                          <td className="text-right p-3 border-r font-bold text-white bg-indigo-600">
                            {formatarMoeda(Object.values(totaisPorAutonomo).reduce((a, b) => a + b, 0))}
                          </td>
                          {matrizRateio.map((rateio, i) => {
                            const config = TIPO_PARCELA_CONFIG[rateio.tipo];
                            const totalParcela = rateio.pagamentos.reduce((sum, p) => sum + p.valor, 0);
                            const totalPercentual = rateio.pagamentos.reduce((sum, p) => sum + p.percentual, 0);
                            return (
                              <td key={i} className={cn("p-2 border-l text-center", config.bgColor)}>
                                <div className="flex flex-col items-center">
                                  <span className={cn("text-[10px]", totalPercentual !== 100 && "text-red-600 font-bold")}>
                                    {arredondarValor(totalPercentual)}%
                                  </span>
                                  <span className="font-mono text-xs">{formatarMoeda(totalParcela)}</span>
                                  {Object.keys(percentuaisPersonalizados).some(k => k.startsWith(`${rateio.id}-`)) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-[10px] px-1 mt-1"
                                      onClick={() => resetPercentuaisParcela(rateio.id)}
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Reset
                                    </Button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique nos campos de percentual para ajustar a distribuição. Os outros valores serão recalculados automaticamente.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure as parcelas e autônomos para ver a matriz de rateio</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================
              STEP 5: Resumo Financeiro
              ======================================== */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">5. Resumo Financeiro</h3>
                <p className="text-sm text-muted-foreground">
                  Confirmação dos valores antes de salvar
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="pt-6">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Valor total da proposta</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatarMoeda(totalProposta)}</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                  <CardContent className="pt-6">
                    <p className="text-sm text-purple-600 dark:text-purple-400">Valor total das comissões</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatarMoeda(totalComissoesAutonomos)}</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CardContent className="pt-6">
                    <p className="text-sm text-green-600 dark:text-green-400">Valor de contrato (líquido)</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatarMoeda(valorContrato)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dados da Venda</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{clienteNome || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium">{clienteCpf || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data da Venda</p>
                    <p className="font-medium">{new Date(dataVenda).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Imóvel</p>
                    <p className="font-medium">{nomeProduto || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">N° / Torre</p>
                    <p className="font-medium">{numeroImovel}{torre && ` - ${torre}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor do Imóvel</p>
                    <p className="font-medium">{formatarMoeda(valorImovel)}</p>
                  </div>
                  {reservaImportada && (
                    <div>
                      <p className="text-muted-foreground">Reserva CV CRM</p>
                      <p className="font-medium text-green-600">{reservaImportada.codigo}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Autônomos ({autonomos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {autonomos.map((a) => (
                      <div key={a.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{a.nome}</p>
                          <p className="text-xs text-muted-foreground">{a.percentual}% da comissão</p>
                        </div>
                        <p className="font-bold text-indigo-600">{formatarMoeda(totaisPorAutonomo[a.id] || a.valorComissao)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDownloadPDF}
                  disabled={geratingPDF || !matrizRateio}
                  className="gap-2"
                >
                  {geratingPDF ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Baixar PDF Analítico
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Navigation Buttons */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2) ||
                (currentStep === 3 && !canProceedStep3) ||
                (currentStep === 4 && !canProceedStep4)
              }
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              Próximo
              <Check className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createVenda.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {createVenda.isPending ? "Salvando..." : "Salvar Venda"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
