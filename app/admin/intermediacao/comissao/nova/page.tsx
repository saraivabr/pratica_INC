"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  Users,
  ClipboardList,
  Check,
  Plus,
  Trash2,
  Search,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import {
  useCreateComissaoVendaCompleta,
  useBuscarEmpreendimentos,
  useBuscarUnidades,
  useBuscarCorretores,
} from "@/lib/comissao/hooks";
import {
  recalcularValoresCorretores,
  recalcularValoresParcelas,
  validarSomaPercentuais,
  gerarParcelasPadrao,
  arredondarValor,
  formatarMoeda,
} from "@/lib/comissao/calculations";
import type {
  CorretorEqualizadorItem,
  ParcelaFormItem,
  EmpreendimentoBusca,
  UnidadeBusca,
  CorretorBusca,
} from "@/lib/comissao/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Steps
const STEPS = [
  { id: 1, title: "Dados da Venda", icon: Building2 },
  { id: 2, title: "Corretores", icon: Users },
  { id: 3, title: "Parcelas", icon: ClipboardList },
  { id: 4, title: "Revisao", icon: Check },
];

export default function NovaComissaoPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [empreendimento, setEmpreendimento] = useState<EmpreendimentoBusca | null>(null);
  const [unidade, setUnidade] = useState<UnidadeBusca | null>(null);
  const [valorTabela, setValorTabela] = useState<number>(0);
  const [valorVenda, setValorVenda] = useState<number>(0);
  const [percentualComissao, setPercentualComissao] = useState<number>(5);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCpf, setClienteCpf] = useState("");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split("T")[0]);
  const [observacoes, setObservacoes] = useState("");

  // Corretores (equalizador)
  const [corretores, setCorretores] = useState<CorretorEqualizadorItem[]>([]);
  const [buscaCorretorOpen, setBuscaCorretorOpen] = useState(false);
  const [buscaCorretorTerm, setBuscaCorretorTerm] = useState("");

  // Parcelas
  const [parcelas, setParcelas] = useState<ParcelaFormItem[]>([]);

  // Search hooks
  const [empSearchTerm, setEmpSearchTerm] = useState("");
  const { empreendimentos, loading: loadingEmps } = useBuscarEmpreendimentos(empSearchTerm, empSearchTerm.length >= 1);
  const { unidades, loading: loadingUnidades } = useBuscarUnidades(empreendimento?.id || 0, "", !!empreendimento);
  const { corretores: corretoresBusca, loading: loadingCorretores } = useBuscarCorretores(buscaCorretorTerm, buscaCorretorTerm.length >= 2);

  // Mutation
  const createVenda = useCreateComissaoVendaCompleta();

  // Calculated values
  const comissaoTotal = useMemo(() => {
    return arredondarValor(valorVenda * (percentualComissao / 100));
  }, [valorVenda, percentualComissao]);

  const validacaoCorretores = useMemo(() => {
    return validarSomaPercentuais(corretores);
  }, [corretores]);

  const validacaoParcelas = useMemo(() => {
    const soma = parcelas.reduce((acc, p) => acc + p.percentual, 0);
    return {
      valido: Math.abs(soma - 100) < 0.01,
      soma: arredondarValor(soma),
      diferenca: arredondarValor(100 - soma),
    };
  }, [parcelas]);

  // Handlers
  const handleSelectEmpreendimento = (emp: EmpreendimentoBusca) => {
    setEmpreendimento(emp);
    setUnidade(null);
    setValorTabela(0);
  };

  const handleSelectUnidade = (uni: UnidadeBusca) => {
    setUnidade(uni);
    if (uni.valor_tabela) {
      setValorTabela(uni.valor_tabela);
      if (!valorVenda) {
        setValorVenda(uni.valor_tabela);
      }
    }
  };

  const handleAddCorretor = (corretor: CorretorBusca) => {
    // Check if already added
    if (corretores.some((c) => c.cpf === corretor.cpf || c.nome === corretor.nome)) {
      toast.error("Corretor ja adicionado");
      return;
    }

    const novoPercentual = corretores.length === 0 ? 100 : 0;
    const novoCorretor: CorretorEqualizadorItem = {
      beneficiario_id: corretor.fonte === "beneficiario" ? corretor.id : undefined,
      nome: corretor.nome,
      cpf: corretor.cpf,
      percentual: novoPercentual,
      valor: arredondarValor(comissaoTotal * (novoPercentual / 100)),
      imobiliaria_nome: corretor.imobiliaria_nome,
      creci: corretor.creci,
    };

    setCorretores([...corretores, novoCorretor]);
    setBuscaCorretorOpen(false);
    setBuscaCorretorTerm("");
  };

  const handleAddCorretorManual = () => {
    const novoPercentual = corretores.length === 0 ? 100 : 0;
    const novoCorretor: CorretorEqualizadorItem = {
      nome: "",
      cpf: "",
      percentual: novoPercentual,
      valor: arredondarValor(comissaoTotal * (novoPercentual / 100)),
    };
    setCorretores([...corretores, novoCorretor]);
  };

  const handleRemoveCorretor = (index: number) => {
    const novosCorretores = corretores.filter((_, i) => i !== index);
    setCorretores(novosCorretores);
  };

  const handleCorretorPercentualChange = (index: number, percentual: number) => {
    const novosCorretores = [...corretores];
    novosCorretores[index] = {
      ...novosCorretores[index],
      percentual,
      valor: arredondarValor(comissaoTotal * (percentual / 100)),
    };
    setCorretores(novosCorretores);
  };

  const handleCorretorNomeChange = (index: number, nome: string) => {
    const novosCorretores = [...corretores];
    novosCorretores[index] = { ...novosCorretores[index], nome };
    setCorretores(novosCorretores);
  };

  const handleResetCorretores = () => {
    if (corretores.length === 0) return;
    const percentualCada = arredondarValor(100 / corretores.length);
    const novosCorretores = corretores.map((c, i) => {
      const perc = i === 0 ? 100 - percentualCada * (corretores.length - 1) : percentualCada;
      return {
        ...c,
        percentual: perc,
        valor: arredondarValor(comissaoTotal * (perc / 100)),
      };
    });
    setCorretores(novosCorretores);
  };

  const handleGerarParcelasPadrao = () => {
    const novasParcelas = gerarParcelasPadrao(comissaoTotal, new Date(dataVenda));
    setParcelas(novasParcelas);
  };

  const handleAddParcela = () => {
    const novasParcelas: ParcelaFormItem = {
      numero: parcelas.length + 1,
      descricao: `Parcela ${parcelas.length + 1}`,
      percentual: 0,
      valor: 0,
      data_prevista: new Date().toISOString().split("T")[0],
    };
    setParcelas([...parcelas, novasParcelas]);
  };

  const handleRemoveParcela = (index: number) => {
    const novasParcelas = parcelas.filter((_, i) => i !== index);
    // Renumerar
    setParcelas(novasParcelas.map((p, i) => ({ ...p, numero: i + 1 })));
  };

  const handleParcelaChange = (index: number, field: keyof ParcelaFormItem, value: any) => {
    const novasParcelas = [...parcelas];
    novasParcelas[index] = { ...novasParcelas[index], [field]: value };

    if (field === "percentual") {
      novasParcelas[index].valor = arredondarValor(comissaoTotal * (value / 100));
    }

    setParcelas(novasParcelas);
  };

  const handleSubmit = async () => {
    if (!validacaoCorretores.valido) {
      toast.error("Soma dos percentuais dos corretores deve ser 100%");
      return;
    }

    if (!validacaoParcelas.valido) {
      toast.error("Soma dos percentuais das parcelas deve ser 100%");
      return;
    }

    try {
      await createVenda.mutateAsync({
        venda: {
          valor_venda: valorVenda,
          percentual_comissao: percentualComissao / 100,
          empreendimento: empreendimento?.nome || "",
          unidade: unidade?.codigo || "",
          cliente_nome: clienteNome,
          cliente_cpf: clienteCpf,
          data_venda: dataVenda,
          observacoes,
        },
        corretores: corretores.map((c) => ({
          beneficiario_id: c.beneficiario_id,
          nome: c.nome,
          cpf: c.cpf,
          percentual_participacao: c.percentual / 100,
          valor_comissao: c.valor,
          prioridade: 0,
        })),
        parcelas: parcelas.map((p) => ({
          numero: p.numero,
          descricao: p.descricao,
          valor_parcela: p.valor,
          percentual_comissao: p.percentual / 100,
          data_prevista: p.data_prevista,
        })),
      });

      toast.success("Venda cadastrada com sucesso!");
      router.push("/admin/intermediacao/comissao");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar venda");
    }
  };

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
      <AppShell title="Acesso Negado">
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <Button onClick={() => router.push("/empreendimentos")}>Voltar</Button>
        </div>
      </AppShell>
    );
  }

  const canProceedStep1 = valorVenda > 0 && percentualComissao > 0 && dataVenda;
  const canProceedStep2 = corretores.length > 0 && validacaoCorretores.valido;
  const canProceedStep3 = parcelas.length > 0 && validacaoParcelas.valido;

  return (
    <div className="space-y-6">
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
            <h1 className="text-2xl font-bold">Nova Venda para Calculo</h1>
            <p className="text-sm text-muted-foreground">
              Cadastre a venda, corretores e parcelas
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
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
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                  isActive && "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
                  isCompleted && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                  !isActive && !isCompleted && "text-gray-400"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  currentStep > step.id ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-0 bg-white/80 dark:bg-gray-900/80">
        <CardContent className="p-6">
          {/* Step 1: Dados da Venda */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Empreendimento */}
                <div className="space-y-2">
                  <Label>Empreendimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        {empreendimento?.nome || "Selecione o empreendimento..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar empreendimento..."
                          value={empSearchTerm}
                          onValueChange={setEmpSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum empreendimento encontrado.</CommandEmpty>
                          <CommandGroup>
                            {empreendimentos.map((emp) => (
                              <CommandItem
                                key={emp.id}
                                onSelect={() => handleSelectEmpreendimento(emp)}
                              >
                                <Building2 className="mr-2 h-4 w-4" />
                                <div>
                                  <p className="font-medium">{emp.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {emp.cidade} - {emp.uf}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Unidade */}
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={unidade?.id?.toString() || ""}
                    onValueChange={(val) => {
                      const uni = unidades.find((u) => u.id.toString() === val);
                      if (uni) handleSelectUnidade(uni);
                    }}
                    disabled={!empreendimento}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((uni) => (
                        <SelectItem key={uni.id} value={uni.id.toString()}>
                          {uni.codigo} {uni.bloco && `- Bloco ${uni.bloco}`}
                          {uni.valor_tabela && ` - ${formatarMoeda(uni.valor_tabela)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor Tabela */}
                <div className="space-y-2">
                  <Label>Valor de Tabela</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      value={valorTabela || ""}
                      onChange={(e) => setValorTabela(parseFloat(e.target.value) || 0)}
                      className="pl-10"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Valor Venda */}
                <div className="space-y-2">
                  <Label>Valor da Venda *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      value={valorVenda || ""}
                      onChange={(e) => setValorVenda(parseFloat(e.target.value) || 0)}
                      className="pl-10"
                      placeholder="0,00"
                    />
                  </div>
                  {valorTabela > 0 && valorVenda > 0 && valorVenda !== valorTabela && (
                    <p className="text-xs text-muted-foreground">
                      Desconto: {formatarMoeda(valorTabela - valorVenda)} (
                      {(((valorTabela - valorVenda) / valorTabela) * 100).toFixed(2)}%)
                    </p>
                  )}
                </div>

                {/* Percentual Comissao */}
                <div className="space-y-2">
                  <Label>% Comissao *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={percentualComissao || ""}
                      onChange={(e) => setPercentualComissao(parseFloat(e.target.value) || 0)}
                      className="pr-8"
                      placeholder="5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                {/* Valor Comissao */}
                <div className="space-y-2">
                  <Label>Valor da Comissao</Label>
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                    {formatarMoeda(comissaoTotal)}
                  </div>
                </div>

                {/* Cliente Nome */}
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="pl-10"
                      placeholder="Nome completo"
                    />
                  </div>
                </div>

                {/* Cliente CPF */}
                <div className="space-y-2">
                  <Label>CPF do Cliente</Label>
                  <Input
                    value={clienteCpf}
                    onChange={(e) => setClienteCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                {/* Data Venda */}
                <div className="space-y-2">
                  <Label>Data da Venda *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dataVenda}
                      onChange={(e) => setDataVenda(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Observacoes */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Observacoes</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observacoes sobre a venda..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Corretores (Equalizador) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Equalizador de Comissoes</h3>
                  <p className="text-sm text-muted-foreground">
                    Comissao total: {formatarMoeda(comissaoTotal)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={buscaCorretorOpen} onOpenChange={setBuscaCorretorOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Corretor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Buscar Corretor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Digite o nome do corretor..."
                          value={buscaCorretorTerm}
                          onChange={(e) => setBuscaCorretorTerm(e.target.value)}
                        />
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {loadingCorretores && <p className="text-sm text-muted-foreground">Buscando...</p>}
                          {corretoresBusca.map((corretor) => (
                            <div
                              key={`${corretor.fonte}-${corretor.id}`}
                              className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                              onClick={() => handleAddCorretor(corretor)}
                            >
                              <p className="font-medium">{corretor.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {corretor.cpf} {corretor.creci && `| CRECI: ${corretor.creci}`}
                                {corretor.imobiliaria_nome && ` | ${corretor.imobiliaria_nome}`}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {corretor.fonte === "cvcrm" ? "CV CRM" : "Beneficiario"}
                              </Badge>
                            </div>
                          ))}
                          {buscaCorretorTerm.length >= 2 && corretoresBusca.length === 0 && !loadingCorretores && (
                            <p className="text-sm text-muted-foreground">Nenhum corretor encontrado</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={handleAddCorretorManual}>
                          <Plus className="h-4 w-4 mr-2" />
                          Cadastrar Manual
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={handleResetCorretores}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Igualar
                  </Button>
                </div>
              </div>

              {/* Validation Status */}
              <div className={cn(
                "p-3 rounded-lg flex items-center gap-2",
                validacaoCorretores.valido
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
              )}>
                {validacaoCorretores.valido ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Total: {validacaoCorretores.soma.toFixed(1)}% - OK</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Total: {validacaoCorretores.soma.toFixed(1)}% -{" "}
                      {validacaoCorretores.diferenca > 0 ? `Faltam ${validacaoCorretores.diferenca.toFixed(1)}%` : `Excede ${Math.abs(validacaoCorretores.diferenca).toFixed(1)}%`}
                    </span>
                  </>
                )}
              </div>

              {/* Corretores List */}
              <div className="space-y-4">
                {corretores.map((corretor, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={corretor.nome}
                          onChange={(e) => handleCorretorNomeChange(index, e.target.value)}
                          placeholder="Nome do corretor"
                          className="font-medium"
                        />
                        {corretor.imobiliaria_nome && (
                          <p className="text-xs text-muted-foreground">{corretor.imobiliaria_nome}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCorretor(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Slider
                          value={[corretor.percentual]}
                          onValueChange={([val]) => handleCorretorPercentualChange(index, val)}
                          max={100}
                          step={0.5}
                          className="w-full"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          value={corretor.percentual}
                          onChange={(e) => handleCorretorPercentualChange(index, parseFloat(e.target.value) || 0)}
                          className="text-right"
                          step="0.5"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-4">%</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valor:</span>
                      <span className="font-bold text-indigo-600">{formatarMoeda(corretor.valor)}</span>
                    </div>
                  </div>
                ))}

                {corretores.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum corretor adicionado</p>
                    <p className="text-sm">Busque ou cadastre corretores para distribuir a comissao</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Parcelas */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Cronograma de Parcelas</h3>
                  <p className="text-sm text-muted-foreground">
                    Defina quando a comissao sera recebida
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleGerarParcelasPadrao}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Gerar Padrao
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAddParcela}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Validation Status */}
              <div className={cn(
                "p-3 rounded-lg flex items-center gap-2",
                validacaoParcelas.valido
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
              )}>
                {validacaoParcelas.valido ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Total: {validacaoParcelas.soma.toFixed(1)}% - OK</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Total: {validacaoParcelas.soma.toFixed(1)}% -{" "}
                      {validacaoParcelas.diferenca > 0 ? `Faltam ${validacaoParcelas.diferenca.toFixed(1)}%` : `Excede ${Math.abs(validacaoParcelas.diferenca).toFixed(1)}%`}
                    </span>
                  </>
                )}
              </div>

              {/* Parcelas List */}
              <div className="space-y-3">
                {parcelas.map((parcela, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-1 text-center font-bold text-lg text-muted-foreground">
                        #{parcela.numero}
                      </div>
                      <div className="col-span-3">
                        <Input
                          value={parcela.descricao}
                          onChange={(e) => handleParcelaChange(index, "descricao", e.target.value)}
                          placeholder="Descricao"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={parcela.percentual}
                            onChange={(e) => handleParcelaChange(index, "percentual", parseFloat(e.target.value) || 0)}
                            className="text-right"
                            step="0.5"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="font-bold text-indigo-600 text-right">
                          {formatarMoeda(parcela.valor)}
                        </p>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="date"
                          value={parcela.data_prevista}
                          onChange={(e) => handleParcelaChange(index, "data_prevista", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParcela(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {parcelas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma parcela definida</p>
                    <p className="text-sm">Clique em "Gerar Padrao" para criar parcelas automaticamente</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Revisao */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Revisao Final</h3>

              {/* Dados da Venda */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dados da Venda</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Empreendimento</p>
                    <p className="font-medium">{empreendimento?.nome || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unidade</p>
                    <p className="font-medium">{unidade?.codigo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{clienteNome || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor da Venda</p>
                    <p className="font-medium">{formatarMoeda(valorVenda)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">% Comissao</p>
                    <p className="font-medium">{percentualComissao}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Comissao</p>
                    <p className="font-bold text-indigo-600">{formatarMoeda(comissaoTotal)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Corretores */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Corretores ({corretores.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {corretores.map((c, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">{c.percentual}%</p>
                        </div>
                        <p className="font-bold text-indigo-600">{formatarMoeda(c.valor)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Parcelas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Parcelas ({parcelas.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {parcelas.map((p, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{p.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.data_prevista).toLocaleDateString("pt-BR")} | {p.percentual}%
                          </p>
                        </div>
                        <p className="font-bold text-indigo-600">{formatarMoeda(p.valor)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2) ||
                (currentStep === 3 && !canProceedStep3)
              }
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              Proximo
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
