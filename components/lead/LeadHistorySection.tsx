"use client";

import { useState, useMemo } from "react";
import {
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  StickyNote,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  UserPlus,
  Edit3,
  Tag,
  Filter,
  Inbox,
  Sparkles,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Interacao {
  id?: string | number;
  descricao: string;
  data_cad: string;
  tipo?: string;
}

interface LeadHistorySectionProps {
  interacoes: Interacao[];
}

type FilterType = "all" | "ligacao" | "email" | "whatsapp" | "reuniao" | "nota" | "outros";

const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "Todos", icon: Filter },
  { value: "ligacao", label: "Ligacoes", icon: Phone },
  { value: "email", label: "E-mails", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "reuniao", label: "Reunioes", icon: Video },
  { value: "nota", label: "Notas", icon: StickyNote },
  { value: "outros", label: "Outros", icon: FileText },
];

// Componente para card de interacao com truncamento inteligente
function InteractionCard({
  interacao,
  formatDate,
  getRelativeTime,
  getBadgeInfo,
  index,
}: {
  interacao: Interacao;
  formatDate: (date: string) => string;
  getRelativeTime: (date: string) => string;
  getBadgeInfo: (tipo?: string) => {
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ReactNode;
    gradient: string;
  };
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const DESCRIPTION_LIMIT = 150;

  const shouldTruncate = interacao.descricao.length > DESCRIPTION_LIMIT;
  const displayText =
    shouldTruncate && !isExpanded
      ? interacao.descricao.slice(0, DESCRIPTION_LIMIT) + "..."
      : interacao.descricao;

  const badgeInfo = getBadgeInfo(interacao.tipo);

  return (
    <div
      className={cn(
        "group relative pl-12 animate-in fade-in-0 slide-in-from-left-2",
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Timeline dot com gradiente */}
      <div
        className={cn(
          "absolute left-0 top-4 h-6 w-6 rounded-full shadow-lg ring-4 ring-background z-10",
          "flex items-center justify-center transition-all duration-300",
          "group-hover:scale-110 group-hover:ring-primary/20",
          badgeInfo.gradient
        )}
      >
        <div className="h-2 w-2 rounded-full bg-white/90" />
      </div>

      {/* Card principal */}
      <div
        className={cn(
          "relative rounded-xl border border-border/50 shadow-sm overflow-hidden",
          "bg-card/80 backdrop-blur-sm hover:shadow-lg hover:border-border",
          "transition-all duration-300"
        )}
      >
        {/* Barra de acento lateral */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", badgeInfo.gradient)} />

        <div className="p-4 pl-5">
          {/* Header do card */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Badge com icone */}
              {interacao.tipo && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm",
                    "transition-transform hover:scale-105",
                    badgeInfo.bgColor,
                    badgeInfo.textColor,
                    badgeInfo.borderColor
                  )}
                >
                  {badgeInfo.icon}
                  {interacao.tipo}
                </span>
              )}
            </div>

            {/* Data/hora */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">
                {getRelativeTime(interacao.data_cad)}
              </span>
              <span className="hidden sm:flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(interacao.data_cad)}
              </span>
            </div>
          </div>

          {/* Descricao */}
          <div className="relative">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {displayText}
            </p>

            {/* Botao "ver mais" */}
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                  "text-primary hover:text-primary/80 transition-colors"
                )}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 transition-transform" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 transition-transform" />
                    Ver mais
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadHistorySection({
  interacoes,
}: LeadHistorySectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const INITIAL_LIMIT = 5;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem.`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mes(es)`;
    return `${Math.floor(diffDays / 365)} ano(s)`;
  };

  const matchesFilter = (tipo: string | undefined, filter: FilterType): boolean => {
    if (filter === "all") return true;
    if (!tipo) return filter === "outros";

    const tipoLower = tipo.toLowerCase();
    switch (filter) {
      case "ligacao":
        return tipoLower.includes("ligacao") || tipoLower.includes("ligacao") || tipoLower.includes("call") || tipoLower.includes("telefone");
      case "email":
        return tipoLower.includes("email") || tipoLower.includes("e-mail");
      case "whatsapp":
        return tipoLower.includes("whatsapp") || tipoLower.includes("mensagem") || tipoLower.includes("sms") || tipoLower.includes("zap");
      case "reuniao":
        return tipoLower.includes("reuniao") || tipoLower.includes("reuniao") || tipoLower.includes("meeting") || tipoLower.includes("visita") || tipoLower.includes("agenda");
      case "nota":
        return tipoLower.includes("nota") || tipoLower.includes("note") || tipoLower.includes("observ");
      case "outros":
        return !matchesFilter(tipo, "ligacao") && !matchesFilter(tipo, "email") && !matchesFilter(tipo, "whatsapp") && !matchesFilter(tipo, "reuniao") && !matchesFilter(tipo, "nota");
      default:
        return true;
    }
  };

  const sortedInteracoes = useMemo(() => {
    return [...interacoes]
      .sort((a, b) => new Date(b.data_cad).getTime() - new Date(a.data_cad).getTime())
      .filter((interacao) => matchesFilter(interacao.tipo, activeFilter));
  }, [interacoes, activeFilter]);

  const displayedInteracoes = showAll
    ? sortedInteracoes
    : sortedInteracoes.slice(0, INITIAL_LIMIT);

  const hasMore = sortedInteracoes.length > INITIAL_LIMIT;

  // Count interactions by type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: interacoes.length,
      ligacao: 0,
      email: 0,
      whatsapp: 0,
      reuniao: 0,
      nota: 0,
      outros: 0,
    };

    interacoes.forEach((interacao) => {
      if (matchesFilter(interacao.tipo, "ligacao")) counts.ligacao++;
      else if (matchesFilter(interacao.tipo, "email")) counts.email++;
      else if (matchesFilter(interacao.tipo, "whatsapp")) counts.whatsapp++;
      else if (matchesFilter(interacao.tipo, "reuniao")) counts.reuniao++;
      else if (matchesFilter(interacao.tipo, "nota")) counts.nota++;
      else counts.outros++;
    });

    return counts;
  }, [interacoes]);

  const getBadgeInfo = (
    tipo?: string
  ): {
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ReactNode;
    gradient: string;
  } => {
    if (!tipo) {
      return {
        bgColor: "bg-muted dark:bg-muted/50",
        textColor: "text-muted-foreground",
        borderColor: "border-border",
        icon: <FileText className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-muted-foreground/60 to-muted-foreground/80",
      };
    }

    const tipoLower = tipo.toLowerCase();

    // Ligacoes / Calls
    if (
      tipoLower.includes("ligacao") ||
      tipoLower.includes("ligacao") ||
      tipoLower.includes("call") ||
      tipoLower.includes("telefone")
    ) {
      return {
        bgColor: "bg-blue-50 dark:bg-blue-950/50",
        textColor: "text-blue-700 dark:text-blue-400",
        borderColor: "border-blue-200 dark:border-blue-800",
        icon: <Phone className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-blue-400 to-blue-600",
      };
    }

    // Email
    if (tipoLower.includes("email") || tipoLower.includes("e-mail")) {
      return {
        bgColor: "bg-purple-50 dark:bg-purple-950/50",
        textColor: "text-purple-700 dark:text-purple-400",
        borderColor: "border-purple-200 dark:border-purple-800",
        icon: <Mail className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-purple-400 to-purple-600",
      };
    }

    // WhatsApp / Mensagens
    if (
      tipoLower.includes("whatsapp") ||
      tipoLower.includes("mensagem") ||
      tipoLower.includes("sms")
    ) {
      return {
        bgColor: "bg-green-50 dark:bg-green-950/50",
        textColor: "text-green-700 dark:text-green-400",
        borderColor: "border-green-200 dark:border-green-800",
        icon: <MessageCircle className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-green-400 to-green-600",
      };
    }

    // Reuniao / Meeting
    if (
      tipoLower.includes("reuniao") ||
      tipoLower.includes("reuniao") ||
      tipoLower.includes("meeting") ||
      tipoLower.includes("agenda")
    ) {
      return {
        bgColor: "bg-orange-50 dark:bg-orange-950/50",
        textColor: "text-orange-700 dark:text-orange-400",
        borderColor: "border-orange-200 dark:border-orange-800",
        icon: <Calendar className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-orange-400 to-orange-600",
      };
    }

    // Nota / Observacao
    if (
      tipoLower.includes("nota") ||
      tipoLower.includes("note") ||
      tipoLower.includes("observacao") ||
      tipoLower.includes("observacao")
    ) {
      return {
        bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
        textColor: "text-yellow-700 dark:text-yellow-400",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        icon: <StickyNote className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-yellow-400 to-yellow-500",
      };
    }

    // Proposta / Orcamento
    if (
      tipoLower.includes("proposta") ||
      tipoLower.includes("orcamento") ||
      tipoLower.includes("orcamento") ||
      tipoLower.includes("cotacao") ||
      tipoLower.includes("cotacao")
    ) {
      return {
        bgColor: "bg-indigo-50 dark:bg-indigo-950/50",
        textColor: "text-indigo-700 dark:text-indigo-400",
        borderColor: "border-indigo-200 dark:border-indigo-800",
        icon: <DollarSign className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-indigo-400 to-indigo-600",
      };
    }

    // Venda / Fechamento / Sucesso
    if (
      tipoLower.includes("venda") ||
      tipoLower.includes("fechamento") ||
      tipoLower.includes("sucesso") ||
      tipoLower.includes("ganho")
    ) {
      return {
        bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
        textColor: "text-emerald-700 dark:text-emerald-400",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        icon: <CheckCircle className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-emerald-400 to-emerald-600",
      };
    }

    // Perda / Cancelamento
    if (
      tipoLower.includes("perda") ||
      tipoLower.includes("perdido") ||
      tipoLower.includes("cancelado") ||
      tipoLower.includes("cancelamento")
    ) {
      return {
        bgColor: "bg-red-50 dark:bg-red-950/50",
        textColor: "text-red-700 dark:text-red-400",
        borderColor: "border-red-200 dark:border-red-800",
        icon: <XCircle className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-red-400 to-red-600",
      };
    }

    // Alerta / Urgente
    if (
      tipoLower.includes("alerta") ||
      tipoLower.includes("urgente") ||
      tipoLower.includes("importante")
    ) {
      return {
        bgColor: "bg-amber-50 dark:bg-amber-950/50",
        textColor: "text-amber-700 dark:text-amber-400",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: <AlertCircle className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-amber-400 to-amber-600",
      };
    }

    // Envio / Documento
    if (
      tipoLower.includes("envio") ||
      tipoLower.includes("documento") ||
      tipoLower.includes("arquivo")
    ) {
      return {
        bgColor: "bg-cyan-50 dark:bg-cyan-950/50",
        textColor: "text-cyan-700 dark:text-cyan-400",
        borderColor: "border-cyan-200 dark:border-cyan-800",
        icon: <Send className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-cyan-400 to-cyan-600",
      };
    }

    // Cadastro / Novo Lead
    if (
      tipoLower.includes("cadastro") ||
      tipoLower.includes("novo") ||
      tipoLower.includes("criacao") ||
      tipoLower.includes("criacao")
    ) {
      return {
        bgColor: "bg-teal-50 dark:bg-teal-950/50",
        textColor: "text-teal-700 dark:text-teal-400",
        borderColor: "border-teal-200 dark:border-teal-800",
        icon: <UserPlus className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-teal-400 to-teal-600",
      };
    }

    // Atualizacao / Edicao
    if (
      tipoLower.includes("atualizacao") ||
      tipoLower.includes("atualizacao") ||
      tipoLower.includes("edicao") ||
      tipoLower.includes("edicao") ||
      tipoLower.includes("alteracao") ||
      tipoLower.includes("alteracao")
    ) {
      return {
        bgColor: "bg-slate-50 dark:bg-slate-950/50",
        textColor: "text-slate-700 dark:text-slate-400",
        borderColor: "border-slate-200 dark:border-slate-800",
        icon: <Edit3 className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-slate-400 to-slate-600",
      };
    }

    // Tag / Categoria
    if (
      tipoLower.includes("tag") ||
      tipoLower.includes("categoria") ||
      tipoLower.includes("etiqueta")
    ) {
      return {
        bgColor: "bg-pink-50 dark:bg-pink-950/50",
        textColor: "text-pink-700 dark:text-pink-400",
        borderColor: "border-pink-200 dark:border-pink-800",
        icon: <Tag className="h-4 w-4" />,
        gradient: "bg-gradient-to-br from-pink-400 to-pink-600",
      };
    }

    // Padrao
    return {
      bgColor: "bg-muted dark:bg-muted/50",
      textColor: "text-muted-foreground",
      borderColor: "border-border",
      icon: <FileText className="h-4 w-4" />,
      gradient: "bg-gradient-to-br from-muted-foreground/60 to-muted-foreground/80",
    };
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border/30 shadow-xl overflow-hidden",
        "bg-card/80 backdrop-blur-xl",
        "dark:border-border/50 dark:shadow-2xl dark:shadow-black/20"
      )}
    >
      {/* Gradient Background Effect - Glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10 pointer-events-none" />

      {/* Header */}
      <div
        className={cn(
          "relative px-6 py-5 border-b border-border/30",
          "bg-gradient-to-r from-muted/50 to-transparent dark:from-muted/30"
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
                  "bg-gradient-to-br from-primary to-primary/80"
                )}
              >
                <MessageSquare className="h-6 w-6 text-primary-foreground" />
              </div>
              {interacoes.length > 0 && (
                <div
                  className={cn(
                    "absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full flex items-center justify-center",
                    "text-[10px] font-bold text-white shadow-md ring-2 ring-background",
                    "bg-gradient-to-r from-rose-500 to-pink-500"
                  )}
                >
                  {interacoes.length > 99 ? "99+" : interacoes.length}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Historico de Interacoes
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {interacoes.length === 0
                  ? "Nenhum registro"
                  : interacoes.length === 1
                  ? "1 interacao registrada"
                  : `${interacoes.length} interacoes registradas`}
              </p>
            </div>
          </div>

          {/* Stats Pills */}
          {interacoes.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              {typeCounts.ligacao > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                  <Phone className="h-3 w-3" />
                  {typeCounts.ligacao}
                </div>
              )}
              {typeCounts.whatsapp > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                  <MessageCircle className="h-3 w-3" />
                  {typeCounts.whatsapp}
                </div>
              )}
              {typeCounts.email > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                  <Mail className="h-3 w-3" />
                  {typeCounts.email}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Chips */}
        {interacoes.length > 0 && (
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {filterOptions.map((filter) => {
              const count = typeCounts[filter.value];
              const isActive = activeFilter === filter.value;
              const Icon = filter.icon;

              if (filter.value !== "all" && count === 0) return null;

              return (
                <button
                  key={filter.value}
                  onClick={() => {
                    setActiveFilter(filter.value);
                    setShowAll(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap border",
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-lg scale-105"
                      : "bg-background text-muted-foreground border-border hover:bg-muted hover:border-border/80 hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filter.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                        isActive
                          ? "bg-background/20"
                          : "bg-muted"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative p-6">
        {interacoes.length === 0 ? (
          /* Empty State - Moderno e Atrativo */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative mb-6">
              <div
                className={cn(
                  "h-28 w-28 rounded-3xl flex items-center justify-center shadow-inner",
                  "bg-gradient-to-br from-muted to-muted/50"
                )}
              >
                <Inbox className="h-14 w-14 text-muted-foreground/50" />
              </div>
              <div
                className={cn(
                  "absolute -bottom-2 -right-2 h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
                  "bg-gradient-to-br from-primary to-primary/80"
                )}
              >
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma interacao ainda
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
              As interacoes com este lead aparecerao aqui conforme forem registradas no sistema
            </p>
          </div>
        ) : sortedInteracoes.length === 0 ? (
          /* No results for filter */
          <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in-0 duration-300">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4 shadow-inner">
              <Filter className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Nenhum resultado
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Nenhuma interacao encontrada para este filtro
            </p>
            <button
              onClick={() => setActiveFilter("all")}
              className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Ver todas as interacoes
            </button>
          </div>
        ) : (
          <>
            {/* Timeline */}
            <div className="relative">
              {/* Timeline Line com gradiente */}
              <div
                className={cn(
                  "absolute left-3 top-6 bottom-6 w-0.5 rounded-full",
                  "bg-gradient-to-b from-primary via-primary/50 to-border"
                )}
              />

              <div
                className={cn(
                  "space-y-4 transition-all duration-500 ease-out overflow-hidden",
                  showAll ? "max-h-none" : "max-h-[800px]"
                )}
              >
                {displayedInteracoes.map((interacao, index) => (
                  <InteractionCard
                    key={interacao.id ?? index}
                    interacao={interacao}
                    formatDate={formatDate}
                    getRelativeTime={getRelativeTime}
                    getBadgeInfo={getBadgeInfo}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Show More/Less Button */}
            {hasMore && (
              <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold",
                      "bg-background border-2 border-border",
                      "text-foreground hover:text-foreground",
                      "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                      "active:scale-95 transition-all duration-300 ease-out",
                      "focus:outline-none focus:ring-4 focus:ring-primary/20"
                    )}
                  >
                    <span
                      className={cn(
                        "transition-transform duration-300",
                        showAll ? "rotate-180" : "rotate-0"
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                    {showAll
                      ? "Mostrar menos"
                      : `Ver mais ${sortedInteracoes.length - INITIAL_LIMIT} interacoes`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Export default for backward compatibility
export default LeadHistorySection;
