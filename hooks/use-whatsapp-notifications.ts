'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface NotificationOptions {
  soundEnabled?: boolean;
  browserNotifications?: boolean;
  pollInterval?: number;
}

interface UnreadState {
  total: number;
  byConversation: Record<string, number>;
}

/**
 * Hook para gerenciar notificações do WhatsApp
 * - Som de notificação para novas mensagens
 * - Notificações do browser (se permitido)
 * - Polling automático para verificar novas mensagens
 */
export function useWhatsAppNotifications(
  instanceName: string | null,
  options: NotificationOptions = {}
) {
  const {
    soundEnabled = true,
    browserNotifications = true,
    pollInterval = 5000,
  } = options;

  const [unread, setUnread] = useState<UnreadState>({ total: 0, byConversation: {} });
  const [hasPermission, setHasPermission] = useState(false);
  const previousUnreadRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializar áudio
  useEffect(() => {
    if (typeof window !== 'undefined' && soundEnabled) {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      // Only keep reference if audio can load
      audio.addEventListener('canplaythrough', () => { audioRef.current = audio; }, { once: true });
      audio.addEventListener('error', () => { audioRef.current = null; }, { once: true });
    }

    return () => {
      audioRef.current = null;
    };
  }, [soundEnabled]);

  // Solicitar permissão para notificações do browser
  useEffect(() => {
    if (browserNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasPermission(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          setHasPermission(permission === 'granted');
        });
      }
    }
  }, [browserNotifications]);

  // Tocar som de notificação
  const playSound = useCallback(() => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignorar erros de autoplay (browser pode bloquear)
      });
    }
  }, [soundEnabled]);

  // Mostrar notificação do browser
  const showBrowserNotification = useCallback(
    (title: string, body: string, icon?: string) => {
      if (hasPermission && browserNotifications && document.hidden) {
        const notification = new Notification(title, {
          body,
          icon: icon || '/logo-pratica-icon.svg',
          tag: 'whatsapp-message',
          renotify: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-fechar após 5 segundos
        setTimeout(() => notification.close(), 5000);
      }
    },
    [hasPermission, browserNotifications]
  );

  // Verificar novas mensagens
  const checkNewMessages = useCallback(async () => {
    if (!instanceName) return;

    try {
      const response = await fetch(`/api/whatsapp/messages?instance=${instanceName}`);
      const data = await response.json();

      if (data.success) {
        const totalUnread = data.total_unread || 0;
        const byConversation: Record<string, number> = {};

        data.data?.forEach((conv: any) => {
          if (conv.unread_count > 0) {
            byConversation[conv.phone_number] = conv.unread_count;
          }
        });

        // Verificar se há novas mensagens
        if (totalUnread > previousUnreadRef.current) {
          const newMessages = totalUnread - previousUnreadRef.current;

          // Tocar som
          playSound();

          // Mostrar notificação do browser
          if (newMessages === 1) {
            const newConv = data.data?.find(
              (c: any) => c.unread_count > 0 && !c.is_from_me
            );
            if (newConv) {
              showBrowserNotification(
                newConv.contact_name || 'Nova mensagem',
                newConv.last_message || 'Você recebeu uma nova mensagem',
                newConv.profile_picture_url
              );
            }
          } else {
            showBrowserNotification(
              'Novas mensagens',
              `Você tem ${newMessages} nova(s) mensagem(ns)`
            );
          }
        }

        previousUnreadRef.current = totalUnread;
        setUnread({ total: totalUnread, byConversation });
      }
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  }, [instanceName, playSound, showBrowserNotification]);

  // Polling para verificar novas mensagens
  useEffect(() => {
    if (!instanceName) return;

    // Verificar imediatamente
    checkNewMessages();

    // Polling
    const interval = setInterval(checkNewMessages, pollInterval);
    return () => clearInterval(interval);
  }, [instanceName, pollInterval, checkNewMessages]);

  // Marcar conversa como lida
  const markAsRead = useCallback(
    async (phoneNumber: string) => {
      if (!instanceName) return;

      try {
        await fetch('/api/whatsapp/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName, phoneNumber }),
        });

        // Atualizar estado local
        setUnread((prev) => {
          const newByConversation = { ...prev.byConversation };
          const readCount = newByConversation[phoneNumber] || 0;
          delete newByConversation[phoneNumber];

          return {
            total: Math.max(0, prev.total - readCount),
            byConversation: newByConversation,
          };
        });

        previousUnreadRef.current = Math.max(
          0,
          previousUnreadRef.current - (unread.byConversation[phoneNumber] || 0)
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    },
    [instanceName, unread.byConversation]
  );

  return {
    unread,
    totalUnread: unread.total,
    hasPermission,
    playSound,
    showBrowserNotification,
    markAsRead,
    checkNewMessages,
  };
}

export default useWhatsAppNotifications;
