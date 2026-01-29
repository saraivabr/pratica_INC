"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Search,
  MessageSquare,
  Phone,
  Send,
  Loader2,
  Flame,
  Clock,
  Check,
  CheckCheck,
  Mic,
  Paperclip,
  Users,
  Bell,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// --- Types ---
type WhatsAppConversation = {
  phone_number: string;
  contact_name: string;
  profile_picture_url: string | null;
  last_message: string;
  last_message_type: string;
  last_message_time: string;
  is_from_me: boolean;
  unread_count: number;
  lead_id?: string;
  is_lead: boolean;
};

type WhatsAppMessage = {
  id: string;
  message_id: string;
  phone_number: string;
  contact_name?: string;
  message_text: string;
  message_type: string;
  is_from_me: boolean;
  status: string;
  timestamp: string;
  media_url?: string;
};

type FilterType = "all" | "unread" | "leads";

// --- Helpers ---
function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yy");
}

function formatChatTime(timestamp: string): string {
  return format(new Date(timestamp), "HH:mm");
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case "read":
      return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />;
    case "delivered":
      return <CheckCheck className="h-3.5 w-3.5 text-gray-400" />;
    case "sent":
      return <Check className="h-3.5 w-3.5 text-gray-400" />;
    default:
      return <Clock className="h-3 w-3 text-gray-300" />;
  }
}

function messagePreview(msg: WhatsAppConversation): string {
  if (msg.last_message_type === "image") return "📷 Foto";
  if (msg.last_message_type === "audio") return "🎵 Áudio";
  if (msg.last_message_type === "video") return "🎬 Vídeo";
  if (msg.last_message_type === "document") return "📎 Documento";
  if (msg.last_message_type === "sticker") return "🏷️ Sticker";
  return msg.last_message || "Sem mensagens";
}

export default function AdminMensagensPage() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [instanceName, setInstanceName] = useState<string>("");

  // IA Sales Assist (invisível)
  const [leadSummary, setLeadSummary] = useState<string>("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [loadingAssist, setLoadingAssist] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Fetch instance name ---
  useEffect(() => {
    const fetchInstance = async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status");
        const data = await res.json();
        if (data.instanceName) setInstanceName(data.instanceName);
      } catch (error) {
        console.error("Error fetching instance:", error);
      }
    };
    fetchInstance();
  }, []);

  // --- Fetch conversations ---
  const fetchConversations = useCallback(async () => {
    if (!instanceName) return;
    try {
      const res = await fetch(`/api/whatsapp/messages?instance=${instanceName}`);
      const data = await res.json();
      if (data.success) setConversations(data.data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [instanceName]);

  useEffect(() => {
    if (instanceName) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [instanceName, fetchConversations]);

  // --- Fetch messages ---
  const fetchMessages = useCallback(async (phone: string) => {
    if (!instanceName) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/whatsapp/messages?instance=${instanceName}&phone=${encodeURIComponent(phone)}`
      );
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [instanceName]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
      const interval = setInterval(() => fetchMessages(selectedPhone), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedPhone, fetchMessages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // --- IA Sales Assist: busca quando muda de conversa ---
  const fetchSalesAssist = useCallback(async (phone: string, name: string, msgs: WhatsAppMessage[]) => {
    setLoadingAssist(true);
    setLeadSummary("");
    setQuickReplies([]);
    try {
      const res = await fetch("/api/ai/sales-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.slice(-20).map((m) => ({
            role: m.is_from_me ? "assistant" : "user",
            content: m.message_text || "",
          })),
          leadName: name,
          leadPhone: phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLeadSummary(data.summary || "");
        setQuickReplies(data.quickReplies || []);
      }
    } catch (error) {
      console.error("Sales assist error:", error);
    } finally {
      setLoadingAssist(false);
    }
  }, []);

  // Trigger sales assist when messages load for selected conversation
  useEffect(() => {
    if (selectedPhone && messages.length > 0) {
      const conv = conversations.find((c) => c.phone_number === selectedPhone);
      if (conv) {
        fetchSalesAssist(selectedPhone, conv.contact_name, messages);
      }
    }
  }, [selectedPhone, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Select conversation ---
  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    setLeadSummary("");
    setQuickReplies([]);
    if (instanceName) {
      fetch("/api/whatsapp/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName, phoneNumber: phone }),
      }).catch(() => {});
    }
  };

  // --- Send message ---
  const handleSendMessage = async (text?: string) => {
    const msg = text || inputMessage;
    if (!msg.trim() || !selectedPhone) return;
    setSendingMessage(true);
    try {
      const res = await fetch("/api/whatsapp/session/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: selectedPhone, message: msg }),
      });
      const data = await res.json();
      if (res.ok) {
        setInputMessage("");
        fetchMessages(selectedPhone);
        toast.success("Mensagem enviada");
      } else {
        toast.error(data.error || "Erro ao enviar");
      }
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
      inputRef.current?.focus();
    }
  };

  // --- Filters ---
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (c) => c.contact_name.toLowerCase().includes(search) || c.phone_number.includes(search)
      );
    }
    if (filter === "unread") result = result.filter((c) => c.unread_count > 0);
    if (filter === "leads") result = result.filter((c) => c.is_lead);
    return result;
  }, [conversations, searchTerm, filter]);

  const selectedConversation = conversations.find((c) => c.phone_number === selectedPhone);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* === SIDEBAR === */}
      <div className="w-[340px] flex flex-col bg-white border-r border-gray-200 shrink-0">
        {/* Header */}
        <div className="px-4 py-4 bg-gradient-to-r from-emerald-600 to-green-500 text-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Mensagens
            </h1>
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white border-none text-xs px-2">{totalUnread}</Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-200" />
            <Input
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 bg-white/20 border-white/30 text-white placeholder:text-emerald-200 focus:bg-white/30 focus:border-white/50"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
          {([
            { id: "all" as FilterType, label: "Todas", icon: <Users className="h-3.5 w-3.5" /> },
            { id: "unread" as FilterType, label: "Não lidas", icon: <Bell className="h-3.5 w-3.5" /> },
            { id: "leads" as FilterType, label: "Leads", icon: <Flame className="h-3.5 w-3.5" /> },
          ]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = selectedPhone === conv.phone_number;
              return (
                <button
                  key={conv.phone_number}
                  onClick={() => handleSelectConversation(conv.phone_number)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-gray-50 hover:bg-emerald-50/50",
                    isActive && "bg-emerald-50 border-l-4 border-l-emerald-500"
                  )}
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    {conv.profile_picture_url && <AvatarImage src={conv.profile_picture_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white text-sm font-semibold">
                      {conv.contact_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-sm text-gray-900 truncate">{conv.contact_name}</span>
                      <span className={cn("text-[11px] ml-2 whitespace-nowrap", conv.unread_count > 0 ? "text-emerald-600 font-semibold" : "text-gray-400")}>
                        {formatMessageTime(conv.last_message_time)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        {conv.is_from_me && <Check className="h-3 w-3 text-gray-400 shrink-0" />}
                        {messagePreview(conv)}
                      </p>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {conv.is_lead && <Flame className="h-3.5 w-3.5 text-orange-400" />}
                        {conv.unread_count > 0 && (
                          <Badge className="bg-emerald-500 text-white border-none text-[10px] h-5 min-w-[20px] flex items-center justify-center px-1.5">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* === CHAT AREA === */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {selectedPhone && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {selectedConversation.profile_picture_url && (
                    <AvatarImage src={selectedConversation.profile_picture_url} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white font-semibold">
                    {selectedConversation.contact_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">{selectedConversation.contact_name}</h2>
                  {/* Lead Summary — IA invisível */}
                  {loadingAssist ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      Analisando...
                    </p>
                  ) : leadSummary ? (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 truncate max-w-[300px]">
                      <Zap className="h-3 w-3 shrink-0" />
                      {leadSummary}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">{selectedConversation.phone_number}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-500 hover:text-emerald-600"
                onClick={() => window.open(`tel:${selectedConversation.phone_number.replace(/\D/g, "")}`)}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 bg-[#efeae2]">
              <div
                className="p-4 space-y-1 max-w-3xl mx-auto"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d5cfcb' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                }}
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <p className="text-sm">Nenhuma mensagem</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = msg.is_from_me;
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showDateSep =
                      !prevMsg ||
                      new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

                    return (
                      <div key={msg.id || i}>
                        {showDateSep && (
                          <div className="flex justify-center my-3">
                            <Badge variant="secondary" className="bg-white/80 text-gray-600 text-[11px] shadow-sm px-3 py-1 rounded-lg">
                              {isToday(new Date(msg.timestamp))
                                ? "Hoje"
                                : isYesterday(new Date(msg.timestamp))
                                ? "Ontem"
                                : format(new Date(msg.timestamp), "dd/MM/yyyy")}
                            </Badge>
                          </div>
                        )}
                        <div className={cn("flex mb-1", isMine ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[65%] rounded-lg px-3 py-2 shadow-sm relative",
                              isMine
                                ? "bg-[#d9fdd3] text-gray-800 rounded-tr-none"
                                : "bg-white text-gray-800 rounded-tl-none"
                            )}
                          >
                            {msg.message_type === "image" && msg.media_url && (
                              <div className="mb-1.5 rounded overflow-hidden">
                                <img src={msg.media_url} alt="Imagem" className="max-w-full h-auto" loading="lazy" />
                              </div>
                            )}
                            {msg.message_type === "audio" && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <Mic className="h-4 w-4" />
                                <span>Mensagem de áudio</span>
                              </div>
                            )}
                            {msg.message_type === "document" && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <Paperclip className="h-4 w-4" />
                                <span>Documento</span>
                              </div>
                            )}
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                              {msg.message_text}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 justify-end">
                              <span className="text-[10px] text-gray-500">{formatChatTime(msg.timestamp)}</span>
                              {isMine && <MessageStatus status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Quick Replies — IA invisível, chips prontos pra venda */}
            {quickReplies.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50/80 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-1.5" />
                {quickReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(reply)}
                    disabled={sendingMessage}
                    className="whitespace-nowrap bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 px-3 py-1.5 rounded-full text-xs text-gray-700 transition-all shadow-sm shrink-0"
                  >
                    {reply.length > 60 ? reply.slice(0, 60) + "..." : reply}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
              <div className="flex gap-2 items-center max-w-3xl mx-auto">
                <Input
                  ref={inputRef}
                  placeholder="Digite uma mensagem..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  disabled={sendingMessage}
                  className="flex-1 h-10 bg-white border-gray-300 rounded-full px-4 focus:border-emerald-500 focus:ring-emerald-500"
                />
                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  disabled={sendingMessage || !inputMessage.trim()}
                  className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-md shrink-0"
                >
                  {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center mb-4 shadow-lg">
              <MessageSquare className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-700">Mensagens</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md text-center">
              Selecione uma conversa pra começar a atender.
            </p>
            {!instanceName && (
              <Badge variant="outline" className="mt-4 border-orange-300 text-orange-600">
                ⚠️ WhatsApp não conectado
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
