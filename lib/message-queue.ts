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
 * Falls back to direct pipeline write if Redis is unavailable.
 */
export async function enqueueMessage(
  workspaceId: number,
  action: QueueAction,
  payload: Record<string, any>
): Promise<void> {
  const item: QueueItem = { action, payload, timestamp: Date.now() };

  try {
    const redis = getRedis();
    if (!redis) throw new Error("Redis unavailable");
    await redis.lpush(queueKey(workspaceId), JSON.stringify(item));
  } catch (err: any) {
    // Fallback: write directly to MongoDB/ES (skip queue)
    console.warn(`[MQ] Redis fallback for ${action}:`, err.message);
    try {
      const { indexMessage, updateConversationOnMessage, upsertContact } = await import("@/lib/whatsapp-storage/pipeline");

      if (action === "index_message") {
        const p = payload;
        await indexMessage(workspaceId, {
          workspace_id: p.workspace_id,
          instance_name: p.instance_name,
          phone_number: p.phone_number,
          remote_jid: p.remote_jid || `${p.phone_number}@s.whatsapp.net`,
          message_id: p.message_id,
          message_type: p.message_type,
          message_text: p.message_text,
          is_from_me: p.is_from_me,
          is_group: p.is_group || false,
          has_media: p.has_media || false,
          timestamp: new Date(p.timestamp),
          contact_name: p.contact_name || null,
          status: p.status || "sent",
          raw_data: p.raw_data,
        });
        await updateConversationOnMessage(
          workspaceId, p.phone_number, p.message_text,
          p.is_from_me, new Date(p.timestamp), p.instance_name
        );
      } else if (action === "upsert_contact") {
        await upsertContact(workspaceId, {
          phone_number: payload.phone_number,
          remote_jid: payload.remote_jid,
          push_name: payload.push_name,
          contact_name: payload.contact_name,
          profile_picture_url: payload.profile_picture_url,
        }, payload.instance_name);
      }
    } catch (fallbackErr: any) {
      console.error(`[MQ] Fallback write also failed:`, fallbackErr.message);
    }
  }
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
