'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Conversation, Message, SearchResult } from '@/components/corretor/chat/types';

// ============================================================================
// useConversations — polls every 15s, smart diff via structuralSharing
// ============================================================================

export function useConversations(instanceName: string) {
  const { data, isLoading } = useQuery<{ conversations: Conversation[]; totalUnread: number }>({
    queryKey: ['chat-conversations', instanceName],
    queryFn: async () => {
      const res = await fetch(`/api/whatsapp/messages?instance=${instanceName}`);
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load conversations');
      return {
        conversations: json.data as Conversation[],
        totalUnread: json.total_unread || 0,
      };
    },
    refetchInterval: 15000,
    enabled: !!instanceName,
  });

  return {
    conversations: data?.conversations ?? [],
    totalUnread: data?.totalUnread ?? 0,
    isLoading,
  };
}

// ============================================================================
// useMessages — polls every 10s for the selected conversation
// ============================================================================

export function useMessages(instanceName: string, phone: string | null) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef(0);

  const { data, isLoading } = useQuery<{ messages: Message[]; aiAnalysis: any; unreadCount: number }>({
    queryKey: ['chat-messages', instanceName, phone],
    queryFn: async () => {
      const res = await fetch(
        `/api/whatsapp/messages?instance=${instanceName}&phone=${phone}`
      );
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load messages');
      return {
        messages: json.data as Message[],
        aiAnalysis: json.ai_analysis || null,
        unreadCount: json.unread_count || 0,
      };
    },
    refetchInterval: 10000,
    enabled: !!instanceName && !!phone,
  });

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const count = data?.messages?.length ?? 0;
    if (count > prevCountRef.current && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    prevCountRef.current = count;
  }, [data?.messages?.length]);

  return {
    messages: data?.messages ?? [],
    aiAnalysis: data?.aiAnalysis ?? null,
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    scrollRef,
  };
}

// ============================================================================
// useConnectionStatus — polls every 30s
// ============================================================================

export function useConnectionStatus() {
  const { data } = useQuery<boolean>({
    queryKey: ['chat-connection-status'],
    queryFn: async () => {
      const res = await fetch('/api/whatsapp/session/status');
      const json = await res.json();
      return json.status === 'ready' || json.status === 'open';
    },
    refetchInterval: 30000,
    initialData: false,
  });

  return { isConnected: data ?? false };
}

// ============================================================================
// useSendMessage — mutation that invalidates conversations + messages
// ============================================================================

export function useSendMessage(instanceName: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName,
          phoneNumber: phone,
          message,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erro ao enviar');
      return json;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', instanceName, variables.phone] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', instanceName] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });

  return {
    send: mutation.mutateAsync,
    isSending: mutation.isPending,
  };
}

// ============================================================================
// useServerSearch — debounced search with React Query
// ============================================================================

export function useServerSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    if (query.length < 3) {
      setDebouncedQuery('');
      return;
    }
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, isLoading } = useQuery<SearchResult[]>({
    queryKey: ['chat-search', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/whatsapp/search/suggest?q=${encodeURIComponent(debouncedQuery)}`);
      const json = await res.json();
      return json.success ? (json.data || []) : [];
    },
    enabled: debouncedQuery.length >= 3,
    placeholderData: (prev) => prev,
  });

  return {
    results: data ?? [],
    isSearching: isLoading && debouncedQuery.length >= 3,
  };
}

// ============================================================================
// useSendTyping — fire-and-forget typing indicator
// ============================================================================

export function useSendTyping(instanceName: string) {
  const lastSentRef = useRef(0);

  const sendTyping = useCallback(async (phone: string) => {
    // Throttle: at most once every 5s
    const now = Date.now();
    if (now - lastSentRef.current < 5000) return;
    lastSentRef.current = now;

    try {
      await fetch('/api/whatsapp/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, phoneNumber: phone }),
      });
    } catch {
      // Ignore typing indicator errors
    }
  }, [instanceName]);

  return sendTyping;
}
