// lib/cache.ts
import { getRedis } from './redis';

interface CacheOptions {
  ttlSeconds: number;
  prefix?: string;
}

export class Cache {
  private prefix: string;
  private ttlSeconds: number;
  private memoryCache: Map<string, { value: string; expiresAt: number }> = new Map();

  constructor(options: CacheOptions) {
    this.prefix = options.prefix || 'cache';
    this.ttlSeconds = options.ttlSeconds;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const redis = getRedis();

    if (redis) {
      try {
        const value = await redis.get(fullKey);
        if (value) {
          return JSON.parse(value) as T;
        }
      } catch (error) {
        console.error('[Cache] Redis get error:', error);
      }
    }

    const cached = this.memoryCache.get(fullKey);
    if (cached && cached.expiresAt > Date.now()) {
      return JSON.parse(cached.value) as T;
    }

    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const fullKey = this.getKey(key);
    const serialized = JSON.stringify(value);
    const redis = getRedis();

    if (redis) {
      try {
        await redis.setex(fullKey, this.ttlSeconds, serialized);
        return;
      } catch (error) {
        console.error('[Cache] Redis set error:', error);
      }
    }

    this.memoryCache.set(fullKey, {
      value: serialized,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    const redis = getRedis();

    if (redis) {
      try {
        await redis.del(fullKey);
      } catch (error) {
        console.error('[Cache] Redis delete error:', error);
      }
    }

    this.memoryCache.delete(fullKey);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value);
    return value;
  }
}

export const cvcrmCache = new Cache({ prefix: 'cvcrm', ttlSeconds: 5 * 60 });
export const leadsCache = new Cache({ prefix: 'leads', ttlSeconds: 5 * 60 });
