"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Search,
  MessageSquare,
  User,
  Phone,
  Mail,
  Tag,
  Workflow,
  Sparkles,
  Send,
  Loader2,
  MoreVertical,
  ChevronRight,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  Calendar,
  FileText,
  ExternalLink,
  Copy,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types ---
type Conversation = {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  contact_role: string;
  messages: any[];
  context: any;
  updated_at: string;
  lead_data?: {
    tags?: string[];
    stage?: string;
    temperature?: "hot" | "warm" | "cold";
    activities?: { icon: string; text: string; time: string }[];
  };
};

type AISuggestion = {
  type: "profissional" | "pessoal" | "cta";
  text: string;
};

const PIPELINE_STAGES = [
  { id: "novo", name: "Novo Lead", color: "#6366F1" },
  { id: "contato_realizado", name: "Contato Realizado", color: "#22C55E" },
  { id: "qualificado", name: "Qualificado", color: "#F59E0B" },
  { id: "visita_agendada", name: "Visita Agendada", color: "#3B82F6" },
  { id: "proposta", name: "Proposta Enviada", color: "#8B5CF6" },
  { id: "negociacao", name: "Em Negociação", color: "#EC4899" },
  { id: "fechado", name: "Fechado", color: "#10B981" },
  { id: "perdido", name: "Perdido", color: "#EF4444" },
];

type WhatsAppSession = {
  status: string;
  instanceName?: string;
  error?: string;
};

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch WhatsApp session status on mount
  useEffect(() => {
    const fetchWhatsAppStatus = async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status");
        const data = await res.json();
        setWhatsappSession({
          status: data.status || "disconnected",
          instanceName: data.instanceName,
          error: data.error,
        });
      } catch (error) {
        console.error("Error fetching WhatsApp status:", error);
        setWhatsappSession({ status: "error", error: "Erro ao verificar WhatsApp" });
      }
    };
    fetchWhatsAppStatus();
  }, []);

  // --- Data Fetching ---
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/conversations");
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erro ao carregar conversas");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConv?.messages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setSuggestions([]);
    fetchAISuggestions(conv.id);
  };

  const fetchAISuggestions = async (id: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/crm/ai-suggestions", {
        method: "POST",
        body: JSON.stringify({ conversationId: id }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Suggestions error", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Helper function to send WhatsApp message using user's connected instance
  const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
    // Check if WhatsApp is connected
    if (whatsappSession?.status !== "ready") {
      toast.error("WhatsApp não está conectado. Conecte seu WhatsApp primeiro.");
      return false;
    }

    const response = await fetch("/api/whatsapp/session/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber,
        message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao enviar mensagem");
    }

    return true;
  };

  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || inputMessage;
    if (!messageToSend.trim() || !selectedConv) return;

    setSendingMessage(true);
    try {
      await sendWhatsAppMessage(selectedConv.contact_phone, messageToSend);

      // Atualizar estado local com a mensagem enviada
      const newMessage = {
        role: "assistant",
        content: messageToSend,
        timestamp: new Date().toISOString(),
      };

      const updatedConv = {
        ...selectedConv,
        messages: [...selectedConv.messages, newMessage],
      };

      setSelectedConv(updatedConv);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? updatedConv : c));
      setInputMessage("");

      toast.success("Mensagem enviada via WhatsApp");
    } catch (error) {
      console.error("Send message error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  const applySuggestion = (text: string) => {
    setInputMessage(text);
  };

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const search = searchTerm.toLowerCase();
    return conversations.filter((conv) =>
      conv.contact_name.toLowerCase().includes(search) ||
      conv.contact_phone.includes(search) ||
      conv.contact_role.toLowerCase().includes(search)
    );
  }, [conversations, searchTerm]);

  // Get current stage info
  const getCurrentStage = () => {
    const stageId = selectedConv?.lead_data?.stage || "contato_realizado";
    return PIPELINE_STAGES.find((s) => s.id === stageId) || PIPELINE_STAGES[1];
  };

  // Handle stage change
  const handleStageChange = async () => {
    if (!selectedConv || !selectedStage) return;

    try {
      // Chamar API para persistir mudança
      const response = await fetch(`/api/leads/${selectedConv.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: selectedStage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar etapa');
      }

      // Atualizar estado local
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id
          ? { ...c, lead_data: { ...c.lead_data, stage: selectedStage } }
          : c
      ));
      setSelectedConv(prev => prev ? { ...prev, lead_data: { ...prev.lead_data, stage: selectedStage } } : null);
      toast.success("Etapa atualizada com sucesso");
      setShowStageDialog(false);
    } catch (error) {
      console.error("Stage change error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar etapa");
    }
  };

  // Handle schedule visit
  const handleScheduleVisit = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Preencha data e horário");
      return;
    }

    if (!selectedConv) {
      toast.error("Selecione uma conversa");
      return;
    }

    try {
      // Chamar API para criar agendamento
      const response = await fetch(`/api/leads/${selectedConv.id}/schedule-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: scheduleDate,
          time: scheduleTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao agendar visita');
      }

      const result = await response.json();

      // Atualizar estágio local para visita_agendada
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id
          ? { ...c, lead_data: { ...c.lead_data, stage: 'visita_agendada' } }
          : c
      ));
      setSelectedConv(prev => prev ? { ...prev, lead_data: { ...prev.lead_data, stage: 'visita_agendada' } } : null);

      const notifyMsg = result.notification_sent ? ' Corretor notificado!' : '';
      toast.success(`Visita agendada para ${scheduleDate} às ${scheduleTime}.${notifyMsg}`);
      setShowScheduleDialog(false);
      setScheduleDate("");
      setScheduleTime("");
    } catch (error) {
      console.error("Schedule visit error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao agendar visita");
    }
  };

  // Handle send simulation
  const handleSendSimulation = async () => {
    if (!selectedConv) return;

    const simulationMessage = `Olá ${selectedConv.contact_name}! 🏠

Preparamos uma simulação personalizada para você:

📊 *Simulação de Financiamento*
━━━━━━━━━━━━━━━━━━━━━
• Valor do Imóvel: R$ 450.000,00
• Entrada (20%): R$ 90.000,00
• Valor Financiado: R$ 360.000,00
• Prazo: 360 meses
• Taxa: 9,99% a.a.
• Parcela estimada: R$ 3.200,00

💡 Essa é uma simulação inicial. Podemos ajustar conforme seu perfil!

Quer agendar uma visita para conhecer o imóvel? 🗓️`;

    setSendingMessage(true);
    try {
      await sendWhatsAppMessage(selectedConv.contact_phone, simulationMessage);

      // Atualizar estado local
      const newMessage = {
        role: "assistant",
        content: simulationMessage,
        timestamp: new Date().toISOString(),
      };

      const updatedConv = {
        ...selectedConv,
        messages: [...selectedConv.messages, newMessage],
      };

      setSelectedConv(updatedConv);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? updatedConv : c));

      toast.success("Simulação enviada via WhatsApp");
    } catch (error) {
      console.error("Send simulation error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar simulação");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle request documentation
  const handleRequestDocumentation = async () => {
    if (!selectedConv) return;

    const documentMessage = `Olá ${selectedConv.contact_name}! 📋

Para darmos continuidade ao seu atendimento, precisamos dos seguintes documentos:

📄 *Documentos Pessoais*
• RG e CPF (ou CNH)
• Comprovante de estado civil

📄 *Comprovante de Residência*
• Conta de luz, água ou telefone (últimos 3 meses)

📄 *Comprovante de Renda*
• Holerites (últimos 3 meses) ou
• Declaração de IR completa ou
• Extrato bancário (últimos 3 meses)

Pode nos enviar por aqui mesmo! 📲
Qualquer dúvida, estou à disposição!`;

    setSendingMessage(true);
    try {
      await sendWhatsAppMessage(selectedConv.contact_phone, documentMessage);

      // Atualizar estado local
      const newMessage = {
        role: "assistant",
        content: documentMessage,
        timestamp: new Date().toISOString(),
      };

      const updatedConv = {
        ...selectedConv,
        messages: [...selectedConv.messages, newMessage],
      };

      setSelectedConv(updatedConv);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? updatedConv : c));

      toast.success("Solicitação de documentos enviada via WhatsApp");
    } catch (error) {
      console.error("Send documentation request error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar solicitação");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle phone call
  const handlePhoneCall = () => {
    if (!selectedConv?.contact_phone) return;
    const phone = selectedConv.contact_phone.replace(/\D/g, "");
    window.open(`tel:${phone}`, "_self");
  };

  // Copy phone to clipboard
  const handleCopyPhone = () => {
    if (!selectedConv?.contact_phone) return;
    navigator.clipboard.writeText(selectedConv.contact_phone);
    toast.success("Telefone copiado");
  };

  // Send quick WhatsApp greeting
  const handleQuickGreeting = async () => {
    if (!selectedConv) return;

    const greetingMessage = `Olá ${selectedConv.contact_name}! 👋

Tudo bem? Sou da equipe Prática e estou à disposição para ajudar.

Como posso te auxiliar hoje?`;

    setSendingMessage(true);
    try {
      await sendWhatsAppMessage(selectedConv.contact_phone, greetingMessage);

      const newMessage = {
        role: "assistant",
        content: greetingMessage,
        timestamp: new Date().toISOString(),
      };

      const updatedConv = {
        ...selectedConv,
        messages: [...selectedConv.messages, newMessage],
      };

      setSelectedConv(updatedConv);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? updatedConv : c));

      toast.success("Mensagem enviada via WhatsApp");
    } catch (error) {
      console.error("Send greeting error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 overflow-hidden">
        
        {/* --- Sidebar: Contact List --- */}
        <div className="w-[380px] flex flex-col bg-white border-r border-gray-200 shadow-lg">
          {/* Header with logo/title */}
          <div className="px-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Chat de Atendimento
            </h1>
            {/* WhatsApp Status Indicator */}
            <div className="flex items-center gap-2 mt-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                whatsappSession?.status === "ready" ? "bg-green-300" :
                whatsappSession?.status === "connecting" ? "bg-yellow-300 animate-pulse" :
                "bg-red-300"
              )} />
              <span className="text-xs text-green-100">
                {whatsappSession?.status === "ready" ? "WhatsApp Conectado" :
                 whatsappSession?.status === "connecting" ? "Conectando..." :
                 "WhatsApp Desconectado"}
              </span>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 bg-white">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                {searchTerm ? "Nenhuma conversa encontrada para essa busca." : "Nenhuma conversa encontrada."}
              </div>
            ) : (
              <div>
                {filteredConversations.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const isActive = selectedConv?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "w-full px-4 py-3 flex gap-3 text-left transition-all duration-200 hover:bg-green-50 border-b border-gray-100",
                        isActive && "bg-green-100 border-l-4 border-green-600"
                      )}
                    >
                      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-green-200">
                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white font-semibold">
                          {conv.contact_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm text-gray-900 truncate">{conv.contact_name}</span>
                          <span className="text-[11px] text-gray-500 whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(conv.updated_at), { locale: ptBR, addSuffix: false })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {lastMsg?.content || "Sem mensagens"}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                           <Badge variant="outline" className="text-[10px] h-4 px-1.5 lowercase bg-gray-100 text-gray-700 border-gray-300">
                             {conv.contact_role}
                           </Badge>
                           {conv.context?.flow && (
                             <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 border-none">
                               {conv.context.flow}
                             </Badge>
                           )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* --- Main Area: Chat Window --- */}
        <div className="flex-1 flex flex-col bg-white shadow-xl">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 ring-2 ring-white">
                    <AvatarFallback className="bg-white text-green-600 font-bold">
                      {selectedConv.contact_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-base">{selectedConv.contact_name}</h2>
                    <div className="flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-green-300" />
                       <span className="text-xs text-green-100">Online</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20">
                        <Phone className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handlePhoneCall}>
                        <Phone className="h-4 w-4 mr-2" />
                        Ligar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleQuickGreeting} disabled={sendingMessage}>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Saudação
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyPhone}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Número
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowStageDialog(true)}>
                        <Workflow className="h-4 w-4 mr-2" />
                        Mover Etapa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowScheduleDialog(true)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Agendar Visita
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSendSimulation}>
                        <FileText className="h-4 w-4 mr-2" />
                        Enviar Simulação
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRequestDocumentation}>
                        <Mail className="h-4 w-4 mr-2" />
                        Pedir Documentação
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {selectedConv.messages.map((msg, i) => {
                    const isSystem = msg.role === "assistant";
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          isSystem ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-3 shadow-md",
                            isSystem
                              ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-sm"
                              : "bg-white text-gray-800 rounded-tl-sm border border-gray-200"
                          )}
                        >
                          <p className="text-[15px] leading-relaxed">{msg.content}</p>
                          <p className={cn(
                            "text-[11px] mt-1.5 text-right",
                            isSystem ? "text-green-100" : "text-gray-500"
                          )}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Suggestions Panel */}
              {suggestions.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Sugestões Sofia
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => applySuggestion(s.text)}
                        className="whitespace-nowrap bg-white border border-purple-200 hover:border-purple-400 hover:shadow-md px-3 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 group"
                      >
                        <span className="capitalize font-semibold text-purple-600">{s.type}:</span>
                        <span className="text-gray-700 group-hover:text-gray-900 truncate max-w-[200px]">{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-3 items-center">
                  <Input
                    placeholder="Digite sua mensagem..."
                    className="flex-1 h-11 bg-gray-50 border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-full px-5"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button 
                    size="icon" 
                    onClick={() => handleSendMessage()} 
                    disabled={sendingMessage}
                    className="h-11 w-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mb-4 shadow-lg">
                <MessageSquare className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Sua Central de Atendimento</h3>
              <p className="max-w-md mt-3 text-base text-gray-600">
                Selecione uma conversa ao lado para visualizar o histórico e responder com ajuda da IA.
              </p>
            </div>
          )}
        </div>

        {/* --- Right Panel: Lead Details --- */}
        <div className="w-[360px] flex flex-col bg-white border-l border-gray-200 shadow-lg">
          {selectedConv ? (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Profile Section */}
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto ring-4 ring-green-100 mb-4 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white text-2xl font-bold">
                      {selectedConv.contact_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-xl text-gray-900">{selectedConv.contact_name}</h3>
                  <p className="text-sm text-gray-600 capitalize mt-1">{selectedConv.contact_role}</p>
                  
                  <div className="flex justify-center gap-2 mt-4">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none gap-1 py-1.5 px-3">
                      <Flame className="h-3.5 w-3.5" /> Quente
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 border-none gap-1 py-1.5 px-3">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Qualificado
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Informações de Contato</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Phone className="h-4 w-4 text-green-600" />
                      <button
                        className="hover:text-green-600 hover:underline"
                        onClick={handleCopyPhone}
                      >
                        {selectedConv.contact_phone}
                      </button>
                    </div>
                    {selectedConv.contact_email && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <Mail className="h-4 w-4 text-green-600" />
                        <a
                          href={`mailto:${selectedConv.contact_email}`}
                          className="truncate hover:text-green-600 hover:underline"
                        >
                          {selectedConv.contact_email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Tag className="h-4 w-4 text-green-600" />
                      <div className="flex flex-wrap gap-1">
                        {(selectedConv.lead_data?.tags || [selectedConv.contact_role]).map((tag, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] px-2 font-normal bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                {/* Sales Pipeline Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Pipeline de Vendas</h4>
                    <Workflow className="h-4 w-4 text-green-600" />
                  </div>
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
                    <CardContent className="p-4">
                      <p className="text-[11px] text-gray-600 mb-1 font-medium">Etapa Atual</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: getCurrentStage().color }}
                          />
                          <span className="font-semibold text-sm text-gray-900">{getCurrentStage().name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] flex-1 border-green-300 text-green-700 hover:bg-green-100"
                          onClick={() => {
                            setSelectedStage(getCurrentStage().id);
                            setShowStageDialog(true);
                          }}
                        >
                          Mover Etapa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Next Steps / Suggestions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Próximos Passos</h4>
                  <div className="space-y-2">
                     <Button
                       variant="ghost"
                       className="w-full justify-start text-sm h-10 gap-2 text-gray-700 hover:bg-green-50 hover:text-green-700"
                       onClick={() => setShowScheduleDialog(true)}
                     >
                        <Calendar className="h-4 w-4" />
                        Agendar Visita
                     </Button>
                     <Button
                       variant="ghost"
                       className="w-full justify-start text-sm h-10 gap-2 text-gray-700 hover:bg-green-50 hover:text-green-700"
                       onClick={handleSendSimulation}
                     >
                        <FileText className="h-4 w-4" />
                        Enviar Simulação
                     </Button>
                     <Button
                       variant="ghost"
                       className="w-full justify-start text-sm h-10 gap-2 text-gray-700 hover:bg-green-50 hover:text-green-700"
                       onClick={handleRequestDocumentation}
                     >
                        <Mail className="h-4 w-4" />
                        Pedir Documentação
                     </Button>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                {/* Activity Log Preview */}
                <div className="space-y-3">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Atividade Recente</h4>
                   <div className="space-y-3">
                      {[
                        { Icon: Clock, text: "Abriu tabela de preços", time: "2h atrás" },
                        { Icon: Search, text: "Pesquisou por 'Pratica Sul'", time: "Ontem" },
                      ].map((act, i) => {
                        const IconComponent = act.Icon;
                        return (
                          <div key={i} className="flex gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shrink-0">
                              <IconComponent className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{act.text}</p>
                              <p className="text-xs text-gray-500">{act.time}</p>
                            </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
             <div className="h-full flex items-center justify-center p-8 text-center text-gray-500">
               <div className="space-y-3">
                 <div className="h-16 w-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                   <Info className="h-8 w-8 text-gray-400" />
                 </div>
                 <p className="text-sm font-medium text-gray-600">Selecione uma conversa para ver os detalhes do lead.</p>
               </div>
             </div>
          )}
        </div>

        {/* Dialog: Mover Etapa */}
        <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mover Lead de Etapa</DialogTitle>
              <DialogDescription>
                Selecione a nova etapa do pipeline para {selectedConv?.contact_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStageDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStageChange} className="bg-green-600 hover:bg-green-700">
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Agendar Visita */}
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agendar Visita</DialogTitle>
              <DialogDescription>
                Agende uma visita para {selectedConv?.contact_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data</label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Horário</label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleScheduleVisit} className="bg-green-600 hover:bg-green-700">
                Agendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}

