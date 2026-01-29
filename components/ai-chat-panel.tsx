"use client";

import { useState, useEffect, useRef } from "react";
import {
  Brain,
  Sparkles,
  MessageCircle,
  Send,
  Loader2,
  X,
  Search,
  FileText,
  Target,
  Zap,
  ChevronDown,
  Bot,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// --- Types ---
type AIModel = {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  icon: string;
  tier: "economy" | "premium";
  price: string;
  description: string;
};

type AIAction = "analyze" | "suggest_reply" | "summarize" | "identify_intent" | "custom";

type HistoryEntry = {
  id: string;
  action: AIAction | string;
  model: string;
  question?: string;
  result: string;
  timestamp: string;
};

type Message = {
  role: string;
  content: string;
  timestamp?: string;
};

type LeadContext = {
  name?: string;
  phone?: string;
  tags?: string[];
  stage?: string;
};

interface AIChatPanelProps {
  messages: Message[];
  leadContext?: LeadContext;
  onClose?: () => void;
  embedded?: boolean;
  className?: string;
}

const MODEL_ICONS: Record<string, React.ReactNode> = {
  brain: <Brain className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  "message-circle": <MessageCircle className="h-4 w-4" />,
};

const ACTION_CONFIG: Record<AIAction, { label: string; icon: React.ReactNode; description: string }> = {
  analyze: {
    label: "Analisar Conversa",
    icon: <Search className="h-4 w-4" />,
    description: "Analisa interesse, objeções e oportunidades",
  },
  suggest_reply: {
    label: "Sugerir Resposta",
    icon: <MessageCircle className="h-4 w-4" />,
    description: "Gera 3 sugestões de resposta",
  },
  summarize: {
    label: "Resumir",
    icon: <FileText className="h-4 w-4" />,
    description: "Resume os pontos principais",
  },
  identify_intent: {
    label: "Identificar Intenção",
    icon: <Target className="h-4 w-4" />,
    description: "Identifica intenção e temperatura do lead",
  },
};

export function AIChatPanel({
  messages,
  leadContext,
  onClose,
  embedded = false,
  className,
}: AIChatPanelProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.0-flash");
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/ai/models");
        const data = await res.json();
        if (data.success && data.models) {
          setModels(data.models);
          // Default: first available economy model (cheapest)
          const firstEconomy = data.models.find((m: AIModel) => m.available && m.tier === "economy");
          const firstAvailable = firstEconomy || data.models.find((m: AIModel) => m.available);
          if (firstAvailable) setSelectedModel(firstAvailable.id);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history]);

  const currentModel = models.find((m) => m.id === selectedModel);

  const callAI = async (action: AIAction, customPrompt?: string) => {
    if (messages.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai/multi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          action,
          context: leadContext,
          customPrompt,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          action,
          model: selectedModel,
          question: customPrompt,
          result: data.result,
          timestamp: data.timestamp,
        };
        setHistory((prev) => [...prev, entry]);
      } else {
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          action: "error",
          model: selectedModel,
          result: `❌ Erro: ${data.error}`,
          timestamp: new Date().toISOString(),
        };
        setHistory((prev) => [...prev, entry]);
      }
    } catch (error: any) {
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        action: "error",
        model: selectedModel,
        result: `❌ Erro de conexão: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [...prev, entry]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomQuery = () => {
    if (!customInput.trim()) return;
    callAI("custom", customInput);
    setCustomInput("");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getActionLabel = (action: string) => {
    if (action === "error") return "Erro";
    if (action === "custom") return "Pergunta";
    return ACTION_CONFIG[action as AIAction]?.label || action;
  };

  const getModelBadgeColor = (modelId: string) => {
    if (modelId.startsWith("gpt")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (modelId.startsWith("gemini")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (modelId.startsWith("claude")) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const economyModels = models.filter((m) => m.tier === "economy");
  const premiumModels = models.filter((m) => m.tier === "premium");

  return (
    <div
      className={cn(
        "flex flex-col bg-white h-full",
        !embedded && "border-l border-gray-200 shadow-lg",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h3 className="font-semibold text-sm">Assistente IA</h3>
        </div>
        <div className="flex items-center gap-2">
          {currentModel && (
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-white/30 text-[10px] hover:bg-white/30"
            >
              {currentModel.name} · {currentModel.price}
            </Badge>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Model Selector */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
        <button
          onClick={() => setShowModelSelector(!showModelSelector)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-purple-300 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            {currentModel && MODEL_ICONS[currentModel.icon]}
            <span className="font-medium text-gray-700">
              {loadingModels ? "Carregando..." : currentModel?.name || "Selecione um modelo"}
            </span>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 text-gray-400 transition-transform", showModelSelector && "rotate-180")}
          />
        </button>

        {showModelSelector && (
          <div className="mt-2 space-y-1">
            {/* 💰 Economy tier */}
            <div className="px-2 pt-1 pb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                💰 Econômicos
              </span>
            </div>
            {economyModels.map((model) => (
              <button
                key={model.id}
                disabled={!model.available}
                onClick={() => {
                  if (model.available) {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  model.available
                    ? model.id === selectedModel
                      ? "bg-purple-100 border border-purple-300 text-purple-700"
                      : "hover:bg-gray-100 text-gray-700"
                    : "opacity-40 cursor-not-allowed text-gray-400"
                )}
              >
                {MODEL_ICONS[model.icon]}
                <div className="flex-1 text-left">
                  <div className="font-medium flex items-center gap-1.5">
                    {model.name}
                    <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {model.price}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500">{model.provider} · {model.description}</div>
                </div>
                {!model.available && (
                  <Badge variant="outline" className="text-[9px] px-1.5 border-red-200 text-red-500 shrink-0">
                    Sem chave
                  </Badge>
                )}
                {model.available && model.id === selectedModel && (
                  <Check className="h-4 w-4 text-purple-600 shrink-0" />
                )}
              </button>
            ))}

            {/* 🚀 Premium tier */}
            <div className="px-2 pt-2 pb-0.5 border-t border-gray-100 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                🚀 Premium
              </span>
            </div>
            {premiumModels.map((model) => (
              <button
                key={model.id}
                disabled={!model.available}
                onClick={() => {
                  if (model.available) {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  model.available
                    ? model.id === selectedModel
                      ? "bg-purple-100 border border-purple-300 text-purple-700"
                      : "hover:bg-gray-100 text-gray-700"
                    : "opacity-40 cursor-not-allowed text-gray-400"
                )}
              >
                {MODEL_ICONS[model.icon]}
                <div className="flex-1 text-left">
                  <div className="font-medium flex items-center gap-1.5">
                    {model.name}
                    <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {model.price}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500">{model.provider} · {model.description}</div>
                </div>
                {!model.available && (
                  <Badge variant="outline" className="text-[9px] px-1.5 border-red-200 text-red-500 shrink-0">
                    Sem chave
                  </Badge>
                )}
                {model.available && model.id === selectedModel && (
                  <Check className="h-4 w-4 text-purple-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-gray-200 shrink-0">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Ações Rápidas
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(ACTION_CONFIG) as AIAction[]).map((action) => {
            const config = ACTION_CONFIG[action];
            return (
              <button
                key={action}
                disabled={loading || messages.length === 0}
                onClick={() => callAI(action)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all",
                  "bg-gray-50 hover:bg-purple-50 hover:text-purple-700 border border-gray-200 hover:border-purple-300",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {config.icon}
                <span className="truncate">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results / History */}
      <ScrollArea className="flex-1 px-3 py-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-400">
            <Bot className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma análise ainda</p>
            <p className="text-xs mt-1">
              {messages.length === 0
                ? "Selecione uma conversa para começar"
                : "Use as ações rápidas ou faça uma pergunta"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Entry Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-gray-700">
                      {getActionLabel(entry.action)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] px-1.5 h-4", getModelBadgeColor(entry.model))}
                    >
                      {models.find((m) => m.id === entry.model)?.name || entry.model}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() => handleCopy(entry.result, entry.id)}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {copiedId === entry.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Entry Question (if custom) */}
                {entry.question && (
                  <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
                    <p className="text-xs text-purple-700">
                      <span className="font-semibold">Pergunta:</span> {entry.question}
                    </p>
                  </div>
                )}

                {/* Entry Result */}
                <div className="px-3 py-2.5">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                    {entry.result}
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Loading indicator */}
      {loading && (
        <div className="px-3 py-2 border-t border-gray-200 bg-purple-50 shrink-0">
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processando com {currentModel?.name || "IA"}...</span>
          </div>
        </div>
      )}

      {/* Custom Input */}
      <div className="px-3 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Pergunte algo sobre a conversa..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomQuery()}
            disabled={loading || messages.length === 0}
            className="flex-1 h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
          />
          <Button
            size="icon"
            onClick={handleCustomQuery}
            disabled={loading || !customInput.trim() || messages.length === 0}
            className="h-9 w-9 bg-purple-600 hover:bg-purple-700 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
