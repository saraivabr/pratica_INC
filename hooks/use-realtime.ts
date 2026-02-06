'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * useRealtime — connects to the SSE stream and invalidates React Query
 * cache when real-time events arrive. Falls back to polling if SSE fails.
 *
 * Events handled:
 * - new_message: invalidates conversations + messages queries
 * - connection_update: invalidates connection status query
 * - message_update: invalidates messages query for that phone
 */
export function useRealtime(instanceName: string | null) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!instanceName) return;

    function connect() {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const es = new EventSource('/api/whatsapp/session/stream');
      eventSourceRef.current = es;

      es.addEventListener('connected', () => {
        retryCountRef.current = 0;
      });

      es.addEventListener('new_message', (e) => {
        try {
          const data = JSON.parse(e.data);
          // Invalidate the specific conversation if we know the phone
          if (data.phone_number) {
            queryClient.invalidateQueries({
              queryKey: ['chat-messages', instanceName, data.phone_number],
            });
          }
          // Always invalidate conversation list
          queryClient.invalidateQueries({
            queryKey: ['chat-conversations', instanceName],
          });
        } catch {
          // Invalidate all chat queries as fallback
          queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        }
      });

      es.addEventListener('connection_update', () => {
        queryClient.invalidateQueries({
          queryKey: ['chat-connection-status'],
        });
      });

      es.addEventListener('message_update', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.phone_number) {
            queryClient.invalidateQueries({
              queryKey: ['chat-messages', instanceName, data.phone_number],
            });
          }
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 30000);

        retryTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [instanceName, queryClient]);
}
