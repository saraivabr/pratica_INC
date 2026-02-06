/**
 * SSE Pub/Sub — Redis-based real-time event notification.
 *
 * Uses a dedicated Redis subscriber connection (ioredis requires separate
 * connections for pub/sub). Publisher reuses the main Redis connection.
 *
 * Channel pattern: sse:whatsapp:{instanceName}
 */

import Redis from 'ioredis';

// Dedicated subscriber connection (separate from main getRedis() client)
let subscriberClient: Redis | null = null;
let subscriberFailed = false;

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
  let resolver: ((value: string | null) => void) | null = null;
  let closed = false;
  const queue: string[] = [];

  if (sub) {
    sub.subscribe(channel).catch(() => {});

    const handler = (ch: string, message: string) => {
      if (ch !== channel) return;
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
      closed = true;
      sub.unsubscribe(channel).catch(() => {});
      sub.removeListener('message', handler);
      if (resolver) {
        resolver(null);
        resolver = null;
      }
    };

    async function* eventGenerator(): AsyncGenerator<string, void, unknown> {
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
          if (msg === null) {
            // Heartbeat (null = timeout, not a real message)
            yield '';
          } else {
            yield msg;
          }
        }
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
