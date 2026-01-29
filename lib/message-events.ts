/**
 * Simple in-memory event emitter for real-time message updates
 * Uses Server-Sent Events (SSE) pattern
 * 
 * Flow:
 * 1. Evolution webhook receives message → saves to DB → calls emitNewMessage()
 * 2. SSE endpoint streams events to connected clients
 * 3. Frontend ChatCRM listens via EventSource and updates UI instantly
 */

type MessageEventListener = (data: any) => void;

class MessageEventBus {
  private listeners: Map<string, Set<MessageEventListener>> = new Map();

  /**
   * Subscribe to messages for a specific instance
   */
  subscribe(instanceName: string, listener: MessageEventListener): () => void {
    if (!this.listeners.has(instanceName)) {
      this.listeners.set(instanceName, new Set());
    }
    this.listeners.get(instanceName)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(instanceName)?.delete(listener);
      if (this.listeners.get(instanceName)?.size === 0) {
        this.listeners.delete(instanceName);
      }
    };
  }

  /**
   * Emit a new message event to all listeners for an instance
   */
  emit(instanceName: string, data: any): void {
    const listeners = this.listeners.get(instanceName);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (err) {
          console.error('[MessageEventBus] Listener error:', err);
        }
      }
    }
  }

  /**
   * Get count of active listeners
   */
  getListenerCount(instanceName?: string): number {
    if (instanceName) {
      return this.listeners.get(instanceName)?.size || 0;
    }
    let total = 0;
    for (const set of this.listeners.values()) {
      total += set.size;
    }
    return total;
  }
}

// Singleton
export const messageEvents = new MessageEventBus();

/**
 * Helper: emit a new message event (call from webhook handler)
 */
export function emitNewMessage(instanceName: string, message: {
  phone_number: string;
  contact_name?: string;
  message_text?: string;
  message_type?: string;
  is_from_me: boolean;
  timestamp: string;
  status?: string;
}) {
  messageEvents.emit(instanceName, {
    type: 'new_message',
    ...message,
  });
}

/**
 * Helper: emit connection status change
 */
export function emitConnectionUpdate(instanceName: string, status: string) {
  messageEvents.emit(instanceName, {
    type: 'connection_update',
    status,
  });
}
