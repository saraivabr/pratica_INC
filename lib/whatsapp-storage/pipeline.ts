/**
 * Dual-Write Pipeline — writes message documents to MongoDB and Elasticsearch.
 *
 * PostgreSQL remains the source of truth (synchronous in webhook).
 * This pipeline handles async writes to MongoDB + ES.
 */

import { getMongoDb } from "@/lib/mongodb";
import { getElasticsearch, ES_INDEX } from "@/lib/elasticsearch";

// ── Types ───────────────────────────────────────────────────────────

export interface MessageDoc {
  workspace_id: number;
  instance_name: string;
  phone_number: string;
  remote_jid: string;
  message_id: string;
  message_type: string;
  message_text: string | null;
  is_from_me: boolean;
  is_group: boolean;
  has_media: boolean;
  timestamp: Date;
  contact_name: string | null;
  status: string;
  raw_data?: any;
}

export interface ConversationDoc {
  workspace_id: number;
  remote_jid: string;
  phone_number: string;
  contact_name: string | null;
  profile_picture_url: string | null;
  total_messages: number;
  messages_sent: number;
  messages_received: number;
  first_message_at: Date;
  last_message_at: Date;
  last_message_text: string | null;
  last_message_from_me: boolean;
  unread_count: number;
  matched_lead_id: number | null;
  matched_lead_name: string | null;
  labels: string[];
  archived: boolean;
  pinned: boolean;
  ai_analysis?: any;
}

export interface ContactDoc {
  workspace_id: number;
  phone_number: string;
  remote_jid: string;
  push_name: string | null;
  contact_name: string | null;
  profile_picture_url: string | null;
  about: string | null;
  is_business: boolean;
  matched_lead_id: number | null;
  matched_lead_name: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
  synced_at: Date;
}

// ── MongoDB Writes ──────────────────────────────────────────────────

/**
 * Upsert a message document into MongoDB + index in Elasticsearch.
 */
export async function indexMessage(
  workspaceId: number,
  doc: MessageDoc
): Promise<void> {
  const db = getMongoDb();

  // MongoDB upsert
  await db.collection("messages").updateOne(
    { workspace_id: workspaceId, message_id: doc.message_id },
    {
      $set: {
        ...doc,
        updated_at: new Date(),
      },
      $setOnInsert: {
        created_at: new Date(),
      },
    },
    { upsert: true }
  );

  // Elasticsearch index (non-blocking)
  try {
    const es = getElasticsearch();
    await es.index({
      index: ES_INDEX,
      id: `${workspaceId}_${doc.message_id}`,
      document: {
        workspace_id: doc.workspace_id,
        phone_number: doc.phone_number,
        remote_jid: doc.remote_jid,
        message_id: doc.message_id,
        instance_name: doc.instance_name,
        message_text: doc.message_text,
        contact_name: doc.contact_name,
        message_type: doc.message_type,
        is_from_me: doc.is_from_me,
        is_group: doc.is_group,
        has_media: doc.has_media,
        timestamp: doc.timestamp.toISOString(),
        status: doc.status,
      },
    });
  } catch (err: any) {
    console.error("[Pipeline] ES index error:", err.message);
  }
}

/**
 * Upsert a conversation aggregate in MongoDB.
 */
export async function upsertConversation(
  workspaceId: number,
  phoneNumber: string,
  update: Partial<ConversationDoc>,
  instanceName?: string
): Promise<void> {
  const db = getMongoDb();
  const remoteJid = `${phoneNumber}@s.whatsapp.net`;

  const filter: Record<string, any> = { workspace_id: workspaceId, remote_jid: remoteJid };
  if (instanceName) filter.instance_name = instanceName;

  await db.collection("conversations").updateOne(
    filter,
    {
      $set: {
        ...update,
        workspace_id: workspaceId,
        remote_jid: remoteJid,
        phone_number: phoneNumber,
        ...(instanceName ? { instance_name: instanceName } : {}),
        updated_at: new Date(),
      },
      $setOnInsert: {
        labels: [],
        archived: false,
        pinned: false,
        created_at: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Increment conversation message counters and update last message.
 */
export async function updateConversationOnMessage(
  workspaceId: number,
  phoneNumber: string,
  messageText: string | null,
  isFromMe: boolean,
  timestamp: Date,
  instanceName?: string
): Promise<void> {
  const db = getMongoDb();
  const remoteJid = `${phoneNumber}@s.whatsapp.net`;

  const filter: Record<string, any> = { workspace_id: workspaceId, remote_jid: remoteJid };
  if (instanceName) filter.instance_name = instanceName;

  const inc: any = { total_messages: 1 };
  if (isFromMe) {
    inc.messages_sent = 1;
  } else {
    inc.messages_received = 1;
    inc.unread_count = 1;
  }

  await db.collection("conversations").updateOne(
    filter,
    {
      $set: {
        last_message_at: timestamp,
        last_message_text: messageText,
        last_message_from_me: isFromMe,
        ...(instanceName ? { instance_name: instanceName } : {}),
        updated_at: new Date(),
      },
      $inc: inc,
      $min: { first_message_at: timestamp },
      $setOnInsert: {
        workspace_id: workspaceId,
        remote_jid: remoteJid,
        phone_number: phoneNumber,
        contact_name: null,
        profile_picture_url: null,
        matched_lead_id: null,
        matched_lead_name: null,
        labels: [],
        archived: false,
        pinned: false,
        ai_analysis: null,
        created_at: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Upsert a contact document in MongoDB.
 */
export async function upsertContact(
  workspaceId: number,
  doc: Partial<ContactDoc> & { phone_number: string },
  instanceName?: string
): Promise<void> {
  const db = getMongoDb();

  const filter: Record<string, any> = { workspace_id: workspaceId, phone_number: doc.phone_number };
  if (instanceName) filter.instance_name = instanceName;

  await db.collection("contacts").updateOne(
    filter,
    {
      $set: {
        ...doc,
        workspace_id: workspaceId,
        ...(instanceName ? { instance_name: instanceName } : {}),
        last_seen_at: new Date(),
        synced_at: new Date(),
      },
      $setOnInsert: {
        first_seen_at: new Date(),
        created_at: new Date(),
      },
    },
    { upsert: true }
  );
}
