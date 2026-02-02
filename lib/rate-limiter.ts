/**
 * Rate Limiter Implementation
 * Protects API endpoints from brute force and DoS attacks
 *
 * Uses Redis for distributed rate limiting across multiple instances.
 * Falls back to in-memory storage when Redis is unavailable.
 */

import { getRedis } from './redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Fallback in-memory store
const memoryStore: Map<string, { count: number; resetTime: number }> = new Map();

class RateLimiter {
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async check(key: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const redis = getRedis();

    if (redis) {
      return this.checkRedis(redis, key, config);
    }

    return this.checkMemory(key, config);
  }

  private async checkRedis(
    redis: import('ioredis').default,
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const redisKey = `ratelimit:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      const multi = redis.multi();
      multi.zremrangebyscore(redisKey, 0, windowStart);
      multi.zcard(redisKey);
      multi.zadd(redisKey, now, `${now}-${Math.random()}`);
      multi.pexpire(redisKey, config.windowMs);

      const results = await multi.exec();

      if (!results) {
        return this.checkMemory(key, config);
      }

      const count = (results[1][1] as number) + 1;
      const resetTime = now + config.windowMs;

      if (count > config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil(config.windowMs / 1000),
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - count,
        resetTime,
      };
    } catch (error) {
      console.error('[RateLimiter] Redis error, falling back to memory:', error);
      return this.checkMemory(key, config);
    }
  }

  private checkMemory(key: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const record = memoryStore.get(key);

    if (!record || now >= record.resetTime) {
      const resetTime = now + config.windowMs;
      memoryStore.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    if (record.count < config.maxRequests) {
      record.count++;
      memoryStore.set(key, record);
      return {
        allowed: true,
        remaining: config.maxRequests - record.count,
        resetTime: record.resetTime,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  async reset(key: string): Promise<void> {
    const redis = getRedis();
    if (redis) {
      await redis.del(`ratelimit:${key}`);
    }
    memoryStore.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now >= record.resetTime) {
        memoryStore.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    memoryStore.clear();
  }
}

const rateLimiter = new RateLimiter();

export const RateLimitConfigs = {
  OTP_SEND: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  OTP_VERIFY: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  WHATSAPP_SEND: { windowMs: 60 * 1000, maxRequests: 20 },
  API_GENERAL: { windowMs: 60 * 1000, maxRequests: 100 },
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  AI_ENDPOINT: { windowMs: 60 * 1000, maxRequests: 10 },
  WEBHOOK: { windowMs: 60 * 1000, maxRequests: 200 },
  SYNC: { windowMs: 5 * 60 * 1000, maxRequests: 3 },
  CPF_SCORE: { windowMs: 60 * 1000, maxRequests: 5 },
  PDF_GENERATE: { windowMs: 60 * 1000, maxRequests: 10 },
  ADMIN_ACTION: { windowMs: 60 * 1000, maxRequests: 30 },
  NOTIFICATION: { windowMs: 60 * 1000, maxRequests: 50 },
  PUBLIC_API: { windowMs: 60 * 1000, maxRequests: 50 },
};

export default rateLimiter;
