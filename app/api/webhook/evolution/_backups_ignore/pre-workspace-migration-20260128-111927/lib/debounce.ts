// lib/debounce.ts
import { getRedis } from './redis';

interface DebounceEntry {
  data: any;
  createdAt: number;
}

const memoryDebounce: Map<string, DebounceEntry> = new Map();

/**
 * Distributed debounce using Redis
 * Accumulates data for a key and returns it after the delay
 */
export async function debounceAccumulate(
  key: string,
  data: any,
  delayMs: number
): Promise<void> {
  const redis = getRedis();
  const fullKey = `debounce:${key}`;

  if (redis) {
    try {
      const entry: DebounceEntry = { data, createdAt: Date.now() };
      await redis.setex(fullKey, Math.ceil(delayMs / 1000) + 60, JSON.stringify(entry));
      return;
    } catch (error) {
      console.error('[Debounce] Redis error:', error);
    }
  }

  memoryDebounce.set(fullKey, { data, createdAt: Date.now() });
}

/**
 * Check if debounce period has passed and get accumulated data
 */
export async function debounceCheck(
  key: string,
  delayMs: number
): Promise<{ ready: boolean; data: any | null }> {
  const redis = getRedis();
  const fullKey = `debounce:${key}`;

  let entry: DebounceEntry | null = null;

  if (redis) {
    try {
      const value = await redis.get(fullKey);
      if (value) {
        entry = JSON.parse(value);
      }
    } catch (error) {
      console.error('[Debounce] Redis error:', error);
    }
  }

  if (!entry) {
    entry = memoryDebounce.get(fullKey) || null;
  }

  if (!entry) {
    return { ready: false, data: null };
  }

  const elapsed = Date.now() - entry.createdAt;
  if (elapsed >= delayMs) {
    if (redis) {
      await redis.del(fullKey);
    }
    memoryDebounce.delete(fullKey);

    return { ready: true, data: entry.data };
  }

  return { ready: false, data: null };
}

/**
 * Clear debounce entry
 */
export async function debounceClear(key: string): Promise<void> {
  const redis = getRedis();
  const fullKey = `debounce:${key}`;

  if (redis) {
    try {
      await redis.del(fullKey);
    } catch (error) {
      console.error('[Debounce] Redis error:', error);
    }
  }

  memoryDebounce.delete(fullKey);
}
