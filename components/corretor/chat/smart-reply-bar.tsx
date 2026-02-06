'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartReplyBarProps {
  phoneNumber: string;
  lastMessageIsFromMe: boolean;
  onSend: (message: string) => void;
}

export function SmartReplyBar({ phoneNumber, lastMessageIsFromMe, onSend }: SmartReplyBarProps) {
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastPhoneRef = useRef('');

  const fetchSuggestions = useCallback(async (phone: string) => {
    if (!phone || lastMessageIsFromMe) return;

    // Abort previous request to prevent race condition
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          context_messages: 5,
          mode: 'quick',
        }),
        signal: controller.signal,
      });
      if (res.ok) {
        const json = await res.json();
        // Only set if this request wasn't aborted
        if (!controller.signal.aborted) {
          setReplies((json.suggestions || []).slice(0, 3));
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Silently fail non-abort errors
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [lastMessageIsFromMe]);

  // Fetch when phone changes or when last message is from client
  useEffect(() => {
    if (phoneNumber !== lastPhoneRef.current) {
      lastPhoneRef.current = phoneNumber;
      setDismissed(false);
      setReplies([]);
    }
    if (!lastMessageIsFromMe && !dismissed) {
      fetchSuggestions(phoneNumber);
    }

    return () => {
      abortRef.current?.abort();
    };
  }, [phoneNumber, lastMessageIsFromMe, dismissed, fetchSuggestions]);

  // Don't render if dismissed, no suggestions, or last message is from corretor
  if (dismissed || lastMessageIsFromMe || (replies.length === 0 && !loading)) {
    return null;
  }

  const handleSend = async (reply: string, index: number) => {
    setSendingIndex(index);
    try {
      onSend(reply);
      setReplies([]);
      setDismissed(true);
    } finally {
      setSendingIndex(null);
    }
  };

  return (
    <div className="px-3 pt-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 text-purple-500" />
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Respostas rapidas
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-auto text-gray-400 hover:text-gray-600 p-0.5 rounded"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 pb-2">
        {loading ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Gerando sugestoes...
          </div>
        ) : (
          replies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(reply, i)}
              disabled={sendingIndex !== null}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border transition-all',
                'bg-purple-50 border-purple-200 text-purple-700',
                'hover:bg-purple-100 hover:border-purple-300',
                'dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300',
                'disabled:opacity-50 max-w-[280px] truncate',
                sendingIndex === i && 'animate-pulse'
              )}
            >
              {sendingIndex === i ? (
                <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
              ) : null}
              {reply}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
