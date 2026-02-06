'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Send,
  User,
  Clock,
  Check,
  CheckCheck,
  Menu,
  X,
  Image as ImageIcon,
  FileText,
  Mic,
  Paperclip,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  Volume2,
  VolumeX,
  PanelRightClose,
  PanelRightOpen,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WhatsAppTemplatesPicker } from '@/components/whatsapp-templates-picker';
import { useWhatsAppNotifications } from '@/hooks/use-whatsapp-notifications';

// Lazy load LeadPanel
const LeadPanel = dynamic(() => import('./lead-panel').then(mod => mod.LeadPanel), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  ),
  ssr: false,
});

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: number;
  message_id: string;
  phone_number: string;
  message_text: string;
  message_type: string;
  media_url?: string;
  caption?: string;
  is_from_me: boolean;
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  contact_name?: string;
}

interface Conversation {
  phone_number: string;
  contact_name: string;
  profile_picture_url?: string;
  last_message: string;
  last_message_type?: string;
  last_message_time: string;
  is_from_me: boolean;
  unread_count: number;
  lead_id?: number;
  is_lead?: boolean;
}

interface ChatCRMProps {
  instanceName: string;
  userId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
}

function getMessagePreview(message: string, type?: string): string {
  if (type?.includes('image')) return '📷 Imagem';
  if (type?.includes('document')) return '📄 Documento';
  if (type?.includes('audio') || type?.includes('ptt')) return '🎤 Audio';
  if (type?.includes('video')) return '🎬 Video';
  if (type?.includes('sticker')) return '✨ Figurinha';
  if (type?.includes('location')) return '📍 Localizacao';
  if (type?.includes('contact')) return '👤 Contato';
  if (type?.includes('poll')) return '📊 Enquete';
  return message?.slice(0, 50) + (message?.length > 50 ? '...' : '') || '';
}

// ============================================================================
// STATUS ICON COMPONENT
// ============================================================================

function MessageStatus({ status, isFromMe }: { status?: string; isFromMe: boolean }) {
  if (!isFromMe) return null;

  switch (status) {
    case 'read':
      return <CheckCheck className="w-4 h-4 text-blue-400" />;
    case 'delivered':
      return <CheckCheck className="w-4 h-4" />;
    case 'sent':
      return <Check className="w-4 h-4" />;
    case 'pending':
      return <Clock className="w-3 h-3" />;
    case 'failed':
      return <X className="w-4 h-4 text-red-400" />;
    default:
      return <Check className="w-4 h-4" />;
  }
}

// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================

function MessageBubble({ message }: { message: Message }) {
  const isMedia = message.media_url || message.message_type?.includes('image') || message.message_type?.includes('video');

  return (
    <div className={cn('flex', message.is_from_me ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] sm:max-w-md rounded-2xl shadow-sm',
          message.is_from_me
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
        )}
      >
        {/* Media content */}
        {isMedia && message.media_url && (
          <div className="p-1">
            {message.message_type?.includes('image') ? (
              <img
                src={message.media_url}
                alt="Imagem"
                className="rounded-xl max-w-full max-h-64 object-cover"
              />
            ) : message.message_type?.includes('video') ? (
              <video
                src={message.media_url}
                controls
                className="rounded-xl max-w-full max-h-64"
              />
            ) : (
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <FileText className="w-8 h-8 text-gray-500" />
                <span className="text-sm">Abrir documento</span>
              </a>
            )}
          </div>
        )}

        {/* Text content */}
        {(message.message_text || message.caption) && (
          <div className="px-3 py-2">
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.caption || message.message_text}
            </p>
          </div>
        )}

        {/* Timestamp and status */}
        <div
          className={cn(
            'flex items-center gap-1 px-3 pb-2 text-[10px]',
            message.is_from_me ? 'text-emerald-100 justify-end' : 'text-gray-400'
          )}
        >
          <span>{formatTime(message.timestamp)}</span>
          <MessageStatus status={message.status} isFromMe={message.is_from_me} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONVERSATION LIST ITEM
// ============================================================================

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left',
        isSelected && 'bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.profile_picture_url} alt={conversation.contact_name} />
          <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 font-semibold">
            {conversation.contact_name?.slice(0, 2).toUpperCase() || <User className="w-6 h-6" />}
          </AvatarFallback>
        </Avatar>
        {conversation.is_lead && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">L</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
            {conversation.contact_name}
          </h3>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {formatDate(conversation.last_message_time)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 truncate flex-1">
            {conversation.is_from_me && <span className="text-gray-400">Voce: </span>}
            {getMessagePreview(conversation.last_message, conversation.last_message_type)}
          </p>
          {conversation.unread_count > 0 && (
            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// CONNECTION INDICATOR
// ============================================================================

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      connected
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    )}>
      {connected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Desconectado</span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SearchResult {
  phone_number: string;
  contact_name: string;
  last_message?: string;
  last_message_time?: string;
  is_from_me?: boolean;
}

export function ChatCRM({ instanceName, userId }: ChatCRMProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const [showLeadPanel, setShowLeadPanel] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const notifications = useWhatsAppNotifications(instanceName, {
    soundEnabled,
    pollInterval: 10000,
  });

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/whatsapp/session/status');
        const data = await res.json();
        setIsConnected(data.status === 'ready' || data.status === 'open');
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch(`/api/whatsapp/messages?instance=${instanceName}`);
      const data = await response.json();
      if (data.success) {
        setConversations((prev) => {
          // Only update if data actually changed (prevent flicker)
          const newJson = JSON.stringify(data.data.map((c: any) => c.phone_number + c.last_message_time + c.unread_count));
          const oldJson = JSON.stringify(prev.map((c: any) => c.phone_number + c.last_message_time + c.unread_count));
          if (newJson === oldJson) return prev;
          return data.data;
        });
        setTotalUnread(data.total_unread || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [instanceName]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (phone: string) => {
    try {
      const response = await fetch(
        `/api/whatsapp/messages?instance=${instanceName}&phone=${phone}`
      );
      const data = await response.json();
      if (data.success) {
        setMessages((prev) => {
          // Only update if message count or last message changed
          if (prev.length === data.data.length && prev.length > 0 &&
              prev[prev.length - 1]?.message_id === data.data[data.data.length - 1]?.message_id) {
            return prev;
          }
          setTimeout(() => scrollToBottom(), 100);
          return data.data;
        });

        // Mark as read (non-blocking, don't reload conversations)
        if (data.unread_count > 0) {
          notifications.markAsRead(phone).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  }, [instanceName, notifications]);

  // Initial load and polling (15s for conversations)
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Load messages when conversation changes (10s polling)
  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
      const interval = setInterval(() => loadMessages(selectedPhone), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedPhone, loadMessages]);

  // Server-side search (debounced 300ms)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/whatsapp/search/suggest?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data || []);
        }
      } catch {
        // Ignore search errors
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send typing indicator
  const sendTypingIndicator = async () => {
    if (!selectedPhone) return;
    try {
      await fetch('/api/whatsapp/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, phoneNumber: selectedPhone }),
      });
    } catch {
      // Ignore typing indicator errors
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPhone) return;

    setSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName,
          phoneNumber: selectedPhone,
          message: newMessage,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        await loadMessages(selectedPhone);
        await loadConversations();
        inputRef.current?.focus();
      } else {
        toast.error('Erro ao enviar mensagem: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    // On mobile, hide conversations list when selecting
    if (window.innerWidth < 1024) {
      setShowConversations(false);
    }
  };

  // Get selected conversation data
  const selectedConversation = useMemo(() =>
    conversations.find(c => c.phone_number === selectedPhone),
    [conversations, selectedPhone]
  );

  // Filter conversations by search
  const filteredConversations = useMemo(() =>
    conversations.filter(
      c =>
        c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_number.includes(searchQuery)
    ),
    [conversations, searchQuery]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
          <p className="text-gray-500 text-sm">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* ================================================================== */}
      {/* LEFT COLUMN - Conversations List (320px) */}
      {/* ================================================================== */}
      <div
        className={cn(
          'w-80 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col',
          // Mobile: absolute positioning, slide in/out
          'fixed lg:relative inset-y-0 left-0 z-30 transition-transform duration-300',
          showConversations ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-emerald-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold">Conversas</h2>
              {totalUnread > 0 && (
                <Badge className="bg-white text-emerald-600 text-xs">
                  {totalUnread}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-white/80 hover:text-white hover:bg-emerald-700 p-2 rounded-lg transition-colors"
                title={soundEnabled ? 'Silenciar sons' : 'Ativar sons'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowConversations(false)}
                className="lg:hidden text-white hover:bg-emerald-700 p-2 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection status */}
          <div className="mb-3">
            <ConnectionIndicator connected={isConnected} />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
            <Input
              type="text"
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-emerald-700/50 border-emerald-500 text-white placeholder:text-emerald-300 focus:bg-emerald-700"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 && searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma conversa</p>
              <p className="text-sm mt-1">As mensagens aparecerao aqui</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.phone_number}
                    conversation={conv}
                    isSelected={selectedPhone === conv.phone_number}
                    onClick={() => handleSelectConversation(conv.phone_number)}
                  />
                ))}
              </div>

              {/* Server-side search results */}
              {searchQuery.length >= 3 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-b border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {searchLoading ? 'Buscando...' : `Resultados da busca (${searchResults.length})`}
                    </p>
                  </div>
                  {searchLoading && (
                    <div className="p-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500" />
                    </div>
                  )}
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {searchResults
                      .filter(r => !filteredConversations.some(c => c.phone_number === r.phone_number))
                      .map((result) => (
                        <button
                          key={result.phone_number}
                          onClick={() => handleSelectConversation(result.phone_number)}
                          className={cn(
                            'w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left',
                            selectedPhone === result.phone_number && 'bg-emerald-50 dark:bg-emerald-900/20'
                          )}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-600 text-xs">
                              {result.contact_name?.slice(0, 2).toUpperCase() || <Search className="w-4 h-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{result.contact_name}</h3>
                            <p className="text-xs text-gray-500 truncate">{result.last_message}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </div>

      {/* Mobile backdrop */}
      {showConversations && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setShowConversations(false)}
        />
      )}

      {/* ================================================================== */}
      {/* CENTER COLUMN - Chat Area (flex-1) */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPhone && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <button
                onClick={() => setShowConversations(true)}
                className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedConversation.profile_picture_url} alt={selectedConversation.contact_name} />
                <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold">
                  {selectedConversation.contact_name?.slice(0, 2).toUpperCase() || <User className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {selectedConversation.contact_name}
                </h3>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedPhone}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedConversation.is_lead && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Lead
                  </Badge>
                )}

                {/* Toggle lead panel button (tablet+) */}
                <button
                  onClick={() => setShowLeadPanel(!showLeadPanel)}
                  className="hidden md:flex text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  title={showLeadPanel ? 'Ocultar painel' : 'Mostrar painel'}
                >
                  {showLeadPanel ? (
                    <PanelRightClose className="w-5 h-5" />
                  ) : (
                    <PanelRightOpen className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-gray-100 dark:bg-gray-900/50">
              <div className="space-y-3 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <WhatsAppTemplatesPicker
                  contactName={selectedConversation.contact_name}
                  onSelect={(text) => setNewMessage(text)}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-gray-700"
                  disabled
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (e.target.value.length === 1) {
                      sendTypingIndicator();
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !sending && sendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                  disabled={sending}
                />

                <Button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">Selecione uma conversa</p>
              <p className="text-sm mt-1">Escolha uma conversa ao lado para comecar</p>
              <button
                onClick={() => setShowConversations(true)}
                className="lg:hidden mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Ver conversas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* RIGHT COLUMN - Lead Panel (360px) */}
      {/* ================================================================== */}
      <div
        className={cn(
          'w-[360px] flex-shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800',
          'transition-all duration-300',
          // Desktop: show/hide based on showLeadPanel
          // Tablet: show/hide based on showLeadPanel
          // Mobile: always hidden (can be shown via toggle)
          showLeadPanel && selectedPhone ? 'hidden md:block' : 'hidden'
        )}
      >
        {selectedPhone && (
          <LeadPanel
            phone={selectedPhone}
            userId={userId}
            contactName={selectedConversation?.contact_name}
          />
        )}
      </div>
    </div>
  );
}

export default ChatCRM;
