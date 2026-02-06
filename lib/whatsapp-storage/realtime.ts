/**
 * Real-time helpers — Redis-backed unread counts and contact cache.
 */

import { getRedis } from "@/lib/redis";

// ── Unread Counts ───────────────────────────────────────────────────

function unreadKey(workspaceId: number): string {
  return `wa:unread:${workspaceId}`;
}

export async function incrementUnread(
  workspaceId: number,
  phoneNumber: string
): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  return redis.hincrby(unreadKey(workspaceId), phoneNumber, 1);
}

export async function resetUnread(
  workspaceId: number,
  phoneNumber: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hdel(unreadKey(workspaceId), phoneNumber);
}

export async function getUnreadCounts(
  workspaceId: number
): Promise<Record<string, number>> {
  const redis = getRedis();
  if (!redis) return {};
  const raw = await redis.hgetall(unreadKey(workspaceId));
  const result: Record<string, number> = {};
  for (const [phone, count] of Object.entries(raw)) {
    result[phone] = parseInt(count) || 0;
  }
  return result;
}

export async function getUnreadCount(
  workspaceId: number,
  phoneNumber: string
): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const val = await redis.hget(unreadKey(workspaceId), phoneNumber);
  return parseInt(val || "0");
}

// ── Contact Cache ───────────────────────────────────────────────────

function contactCacheKey(workspaceId: number, phoneNumber: string): string {
  return `wa:contact:${workspaceId}:${phoneNumber}`;
}

export interface CachedContact {
  name: string | null;
  picture_url: string | null;
  about: string | null;
}

export async function getCachedContact(
  workspaceId: number,
  phoneNumber: string
): Promise<CachedContact | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(contactCacheKey(workspaceId, phoneNumber));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCachedContact(
  workspaceId: number,
  phoneNumber: string,
  contact: CachedContact
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setex(
    contactCacheKey(workspaceId, phoneNumber),
    3600, // 1 hour TTL
    JSON.stringify(contact)
  );
}
