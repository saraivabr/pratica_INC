/**
 * SSE Pub/Sub — Redis-based real-time event notification.
 *
 * Uses a dedicated Redis subscriber connection (ioredis requires separate
 * connections for pub/sub). Publisher reuses the main Redis connection.
 *
 * Channel pattern: sse:whatsapp:{instanceName}
 *
 * Memory leak prevention:
 * - Tracks active subscribers per channel with lastActivity timestamps
 * - Auto-cleanup after 60s of inactivity (missed heartbeats)
 * - Max 50 subscribers per channel to prevent resource exhaustion
 */

import Redis from 'ioredis';

// Dedicated subscriber connection (separate from main getRedis() client)
let subscriberClient: Redis | null = null;
let subscriberFailed = false;

// Track active subscriptions for leak detection
interface SubscriberEntry {
  channel: string;
  cleanup: () => void;
  lastActivity: number;
}
const activeSubscribers = new Map<number, SubscriberEntry>();
let subscriberCounter = 0;
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupInterval() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of activeSubscribers.entries()) {
      // Auto-cleanup if no activity for 60 seconds (4 missed heartbeats)
      if (now - entry.lastActivity > 60_000) {
        console.warn(`[SSE-Sub] Auto-cleanup stale subscriber ${id} on ${entry.channel}`);
        entry.cleanup();
        activeSubscribers.delete(id);
      }
    }
    // Stop interval if no subscribers
    if (activeSubscribers.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 30_000); // Check every 30s
}

function countSubscribersForChannel(channel: string): number {
  let count = 0;
  for (const entry of activeSubscribers.values()) {
    if (entry.channel === channel) count++;
  }
  return count;
}

function getSubscriber(): Redis | null {
  if (subscriberFailed) return null;

  if (!subscriberClient) {
    const url = process.env.SCALINGO_REDIS_URL;
    if (!url) return null;

    try {
      subscriberClient = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) {
            subscriberFailed = true;
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      subscriberClient.on('error', (err) => {
        console.error('[SSE-Sub] Redis error:', err.message);
      });

      subscriberClient.on('connect', () => {
        subscriberFailed = false;
      });
    } catch {
      subscriberFailed = true;
      return null;
    }
  }

  return subscriberClient;
}

/**
 * Channel name for a WhatsApp instance
 */
export function sseChannel(instanceName: string): string {
  return `sse:whatsapp:${instanceName}`;
}

/**
 * Publish an event to an instance's SSE channel.
 * Uses the main Redis connection (not subscriber).
 */
export async function publishEvent(
  instanceName: string,
  event: { type: string; data?: Record<string, any> }
): Promise<void> {
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    if (!redis) return;

    await redis.publish(
      sseChannel(instanceName),
      JSON.stringify({ ...event, ts: Date.now() })
    );
  } catch {
    // Non-critical — client will fallback to polling
  }
}

/**
 * Subscribe to an instance's SSE channel.
 * Returns an async iterable that yields events.
 * Call cleanup() when done to unsubscribe.
 */
export function subscribeToInstance(instanceName: string): {
  events: AsyncGenerator<string, void, unknown>;
  cleanup: () => void;
} {
  const sub = getSubscriber();
  const channel = sseChannel(instanceName);

  // Enforce max subscribers per channel
  if (countSubscribersForChannel(channel) >= 50) {
    console.warn(`[SSE-Sub] Max subscribers (50) reached for ${channel}, rejecting`);
    const cleanup = () => {};
    async function* emptyGen(): AsyncGenerator<string, void, unknown> {
      // Yield a single heartbeat then stop
      yield '';
    }
    return { events: emptyGen(), cleanup };
  }

  let resolver: ((value: string | null) => void) | null = null;
  let closed = false;
  const queue: string[] = [];
  const subId = ++subscriberCounter;

  if (sub) {
    sub.subscribe(channel).catch(() => {});

    const handler = (ch: string, message: string) => {
      if (ch !== channel) return;
      // Update activity timestamp
      const entry = activeSubscribers.get(subId);
      if (entry) entry.lastActivity = Date.now();

      if (resolver) {
        const r = resolver;
        resolver = null;
        r(message);
      } else {
        queue.push(message);
      }
    };

    sub.on('message', handler);

    const cleanup = () => {
      if (closed) return; // Prevent double-cleanup
      closed = true;
      activeSubscribers.delete(subId);
      sub.unsubscribe(channel).catch(() => {});
      sub.removeListener('message', handler);
      if (resolver) {
        resolver(null);
        resolver = null;
      }
    };

    // Register for tracking
    activeSubscribers.set(subId, { channel, cleanup, lastActivity: Date.now() });
    startCleanupInterval();

    async function* eventGenerator(): AsyncGenerator<string, void, unknown> {
      try {
        while (!closed) {
          if (queue.length > 0) {
            yield queue.shift()!;
          } else {
            const msg = await new Promise<string | null>((resolve) => {
              resolver = resolve;
              // Timeout: send heartbeat every 15s to keep connection alive
              setTimeout(() => {
                if (resolver === resolve) {
                  resolver = null;
                  resolve(null);
                }
              }, 15000);
            });

            // Update activity on heartbeat too
            const entry = activeSubscribers.get(subId);
            if (entry) entry.lastActivity = Date.now();

            if (msg === null) {
              // Heartbeat (null = timeout, not a real message)
              yield '';
            } else {
              yield msg;
            }
          }
        }
      } finally {
        // Ensure cleanup even if generator is abandoned via return/break
        cleanup();
      }
    }

    return { events: eventGenerator(), cleanup };
  }

  // Fallback: no Redis — yield heartbeats only
  const cleanup = () => { closed = true; };
  async function* fallbackGenerator(): AsyncGenerator<string, void, unknown> {
    while (!closed) {
      await new Promise((r) => setTimeout(r, 15000));
      yield '';
    }
  }

  return { events: fallbackGenerator(), cleanup };
}

/**
 * Get count of active SSE subscribers (for monitoring).
 */
export function getActiveSubscriberCount(): number {
  return activeSubscribers.size;
}
