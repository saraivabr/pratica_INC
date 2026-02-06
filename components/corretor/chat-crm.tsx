'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  Volume2,
  VolumeX,
  X,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useWhatsAppNotifications } from '@/hooks/use-whatsapp-notifications';
import {
  useConversations,
  useMessages,
  useConnectionStatus,
  useSendMessage,
  useServerSearch,
  useSendTyping,
} from '@/hooks/use-chat';
import { MessageBubble } from './chat/message-bubble';
import { ConversationItem } from './chat/conversation-item';
import { ConnectionIndicator } from './chat/connection-indicator';
import { ChatHeader } from './chat/chat-header';
import { ChatInput } from './chat/chat-input';

// Lazy load LeadPanel
const LeadPanel = dynamic(() => import('./lead-panel').then(mod => mod.LeadPanel), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  ),
  ssr: false,
});

interface ChatCRMProps {
  instanceName: string;
  userId: string;
}

export function ChatCRM({ instanceName, userId }: ChatCRMProps) {
  // UI state only
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(true);
  const [showLeadPanel, setShowLeadPanel] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data hooks
  const { conversations, totalUnread, isLoading } = useConversations(instanceName);
  const { messages, scrollRef } = useMessages(instanceName, selectedPhone);
  const { isConnected } = useConnectionStatus();
  const { send, isSending } = useSendMessage(instanceName);
  const { results: searchResults, isSearching } = useServerSearch(searchQuery);
  const sendTyping = useSendTyping(instanceName);

  // Notifications
  const notifications = useWhatsAppNotifications(instanceName, {
    soundEnabled,
    pollInterval: 10000,
  });

  // Derived state
  const selectedConversation = useMemo(() =>
    conversations.find(c => c.phone_number === selectedPhone),
    [conversations, selectedPhone]
  );

  const filteredConversations = useMemo(() =>
    conversations.filter(
      c =>
        c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_number.includes(searchQuery)
    ),
    [conversations, searchQuery]
  );

  // Handlers
  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    if (window.innerWidth < 768) {
      setShowConversations(false);
    }
  };

  const handleSend = async (message: string) => {
    if (!selectedPhone) return;
    await send({ phone: selectedPhone, message });
  };

  const handleTyping = () => {
    if (selectedPhone) sendTyping(selectedPhone);
  };

  // Loading state
  if (isLoading) {
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
          'fixed md:relative inset-y-0 left-0 z-30 transition-transform duration-300',
          showConversations ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
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
                className="md:hidden text-white hover:bg-emerald-700 p-2 rounded-lg"
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
                      {isSearching ? 'Buscando...' : `Resultados da busca (${searchResults.length})`}
                    </p>
                  </div>
                  {isSearching && (
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
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setShowConversations(false)}
        />
      )}

      {/* ================================================================== */}
      {/* CENTER COLUMN - Chat Area (flex-1) */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPhone && selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              phone={selectedPhone}
              showLeadPanel={showLeadPanel}
              onToggleConversations={() => setShowConversations(true)}
              onToggleLeadPanel={() => setShowLeadPanel(!showLeadPanel)}
            />

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-gray-100 dark:bg-gray-900/50">
              <div className="space-y-3 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <ChatInput
              contactName={selectedConversation.contact_name}
              isSending={isSending}
              onSend={handleSend}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">Selecione uma conversa</p>
              <p className="text-sm mt-1">Escolha uma conversa ao lado para comecar</p>
              <button
                onClick={() => setShowConversations(true)}
                className="md:hidden mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
