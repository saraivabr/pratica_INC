/**
 * Message Queue — Redis list-based lightweight queue.
 *
 * Keys: mq:whatsapp:{workspaceId}
 * Each item: JSON { action, payload, timestamp }
 */

import { getRedis } from "@/lib/redis";

export type QueueAction =
  | "index_message"
  | "upsert_conversation"
  | "upsert_contact"
  | "analyze_conversation";

export interface QueueItem {
  action: QueueAction;
  payload: Record<string, any>;
  timestamp: number;
}

function queueKey(workspaceId: number): string {
  return `mq:whatsapp:${workspaceId}`;
}

/**
 * Enqueue a message for async processing (LPUSH — newest at head).
 */
export async function enqueueMessage(
  workspaceId: number,
  action: QueueAction,
  payload: Record<string, any>
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const item: QueueItem = { action, payload, timestamp: Date.now() };
  await redis.lpush(queueKey(workspaceId), JSON.stringify(item));
}

/**
 * Dequeue a batch of messages (RPOP — oldest first).
 */
export async function dequeueMessages(
  workspaceId: number,
  batch = 50
): Promise<QueueItem[]> {
  const redis = getRedis();
  if (!redis) return [];

  const items: QueueItem[] = [];
  const key = queueKey(workspaceId);

  for (let i = 0; i < batch; i++) {
    const raw = await redis.rpop(key);
    if (!raw) break;
    try {
      items.push(JSON.parse(raw));
    } catch {
      // Skip malformed items
    }
  }

  return items;
}

/**
 * Get queue length for a workspace.
 */
export async function getQueueLength(workspaceId: number): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  return redis.llen(queueKey(workspaceId));
}

/**
 * Get all workspace IDs that have pending items.
 */
export async function getActiveQueues(): Promise<number[]> {
  const redis = getRedis();
  if (!redis) return [];

  const keys = await redis.keys("mq:whatsapp:*");
  return keys
    .map((k) => parseInt(k.split(":").pop() || "0"))
    .filter((id) => id > 0);
}
