// lib/redis.ts
import Redis from 'ioredis';

let redisClient: Redis | null = null;
let connectionFailed = false;

export function getRedis(): Redis | null {
  if (connectionFailed) return null;

  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.warn('[Redis] REDIS_URL não configurada');
      connectionFailed = true;
      return null;
    }

    try {
      redisClient = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) {
            connectionFailed = true;
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      redisClient.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
      });

      redisClient.on('connect', () => {
        console.log('[Redis] Connected');
        connectionFailed = false;
      });
    } catch (err) {
      console.error('[Redis] Failed to create client:', err);
      connectionFailed = true;
      return null;
    }
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
