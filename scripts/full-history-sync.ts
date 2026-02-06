/**
 * Full History Sync — Migrate existing PostgreSQL data and fetch complete
 * WhatsApp history into MongoDB + Elasticsearch.
 *
 * Run: npx tsx scripts/full-history-sync.ts
 *
 * Steps:
 * 1. Migrate existing whatsapp_messages from PostgreSQL → MongoDB + ES
 * 2. For each connected workspace:
 *    a. Fetch ALL chats from Evolution (filter @g.us)
 *    b. Fetch ALL messages per chat (paginated)
 *    c. Fetch contacts with name + photo + about
 * 3. Build conversation aggregates in MongoDB
 */

import "dotenv/config";
import { Pool } from "pg";
import { MongoClient } from "mongodb";
import { Client as ESClient } from "@elastic/elasticsearch";
import {
  fetchAllChats,
  fetchAllChatMessages,
  fetchAllContacts,
  extractPhoneFromJid,
} from "../lib/whatsapp-sync/fetch";
import {
  getContact,
  getProfilePicture,
} from "../lib/evolution-api";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://pratica:pratica2026secure@localhost:5432/pratica";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://pratica:pratica_mongo_2026!@localhost:27017/pratica?authSource=pratica";
const ES_URL = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
const ES_INDEX = "whatsapp_messages_v2";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("=== Full History Sync ===\n");

  // Connect to all databases
  const pool = new Pool({ connectionString: DATABASE_URL });
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db();
  const es = new ESClient({ node: ES_URL });

  const messagesCol = db.collection("messages");
  const conversationsCol = db.collection("conversations");
  const contactsCol = db.collection("contacts");

  // ── Step 1: Migrate existing PostgreSQL messages ────────────────────
  console.log("[Step 1] Migrating existing PostgreSQL messages...");

  const { rows: pgMessages } = await pool.query(`
    SELECT * FROM whatsapp_messages ORDER BY timestamp ASC
  `);

  console.log(`  Found ${pgMessages.length} messages in PostgreSQL`);

  let migratedCount = 0;
  const bulkOps: any[] = [];
  const esBulk: any[] = [];

  for (const msg of pgMessages) {
    const phoneNumber = msg.phone_number;
    const remoteJid = `${phoneNumber}@s.whatsapp.net`;
    const hasMedia = !!(
      msg.message_type?.includes("image") ||
      msg.message_type?.includes("video") ||
      msg.message_type?.includes("audio") ||
      msg.message_type?.includes("document") ||
      msg.message_type?.includes("sticker")
    );

    bulkOps.push({
      updateOne: {
        filter: {
          workspace_id: msg.workspace_id,
          message_id: msg.message_id,
        },
        update: {
          $set: {
            workspace_id: msg.workspace_id,
            instance_name: msg.instance_name,
            phone_number: phoneNumber,
            remote_jid: remoteJid,
            message_id: msg.message_id,
            message_type: msg.message_type,
            message_text: msg.message_text,
            is_from_me: msg.is_from_me,
            is_group: false,
            has_media: hasMedia,
            timestamp: new Date(msg.timestamp),
            contact_name: msg.contact_name || null,
            status: msg.status || "synced",
            updated_at: new Date(),
          },
          $setOnInsert: { created_at: new Date() },
        },
        upsert: true,
      },
    });

    esBulk.push({
      index: {
        _index: ES_INDEX,
        _id: `${msg.workspace_id}_${msg.message_id}`,
      },
    });
    esBulk.push({
      workspace_id: msg.workspace_id,
      phone_number: phoneNumber,
      remote_jid: remoteJid,
      message_id: msg.message_id,
      instance_name: msg.instance_name,
      message_text: msg.message_text,
      contact_name: msg.contact_name || null,
      message_type: msg.message_type,
      is_from_me: msg.is_from_me,
      is_group: false,
      has_media: hasMedia,
      timestamp: new Date(msg.timestamp).toISOString(),
      status: msg.status || "synced",
    });

    // Batch write every 500
    if (bulkOps.length >= 500) {
      await messagesCol.bulkWrite(bulkOps);
      migratedCount += bulkOps.length;
      bulkOps.length = 0;

      if (esBulk.length > 0) {
        await es.bulk({ body: esBulk }).catch((e: any) =>
          console.error("  ES bulk error:", e.message)
        );
        esBulk.length = 0;
      }

      process.stdout.write(`  Migrated ${migratedCount}...\r`);
    }
  }

  // Flush remaining
  if (bulkOps.length > 0) {
    await messagesCol.bulkWrite(bulkOps);
    migratedCount += bulkOps.length;
  }
  if (esBulk.length > 0) {
    await es.bulk({ body: esBulk }).catch((e: any) =>
      console.error("  ES bulk error:", e.message)
    );
  }

  console.log(`  Migrated ${migratedCount} messages to MongoDB + ES`);

  // ── Step 2: Fetch full history from Evolution API ───────────────────
  console.log("\n[Step 2] Fetching connected workspaces...");

  const { rows: workspaces } = await pool.query(`
    SELECT w.id, w.name, u.evolution_instance_name, u.evolution_connected
    FROM workspaces w
    JOIN users u ON u.workspace_id = w.id
    WHERE u.evolution_instance_name IS NOT NULL
      AND u.evolution_connected = true
    ORDER BY w.id
  `);

  console.log(`  Found ${workspaces.length} connected instances`);

  for (const ws of workspaces) {
    console.log(
      `\n[Workspace ${ws.id}] ${ws.name} — instance: ${ws.evolution_instance_name}`
    );

    try {
      // 2a. Fetch all chats
      const chats = await fetchAllChats(ws.id, ws.evolution_instance_name);
      const individualChats = chats.filter(
        (c) => !c.remoteJid.includes("@g.us")
      );
      console.log(
        `  Chats: ${chats.length} total, ${individualChats.length} individual`
      );

      // 2b. Fetch ALL messages per chat
      let totalNewMessages = 0;
      for (const chat of individualChats) {
        try {
          const phoneNumber = extractPhoneFromJid(chat.remoteJid);
          const contactName = chat.name || chat.pushName || phoneNumber;

          const messages = await fetchAllChatMessages(
            ws.evolution_instance_name,
            chat.remoteJid,
            500,
            10000
          );

          if (messages.length === 0) continue;

          const chatBulk: any[] = [];
          const chatEsBulk: any[] = [];

          for (const msg of messages) {
            const messageId = msg.key?.id;
            if (!messageId) continue;

            const isFromMe = msg.key?.fromMe || false;
            const messageText =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption ||
              null;
            const messageType = msg.message
              ? Object.keys(msg.message)[0]
              : "unknown";
            const timestamp = msg.messageTimestamp
              ? new Date(msg.messageTimestamp * 1000)
              : new Date();
            const hasMedia = !!(
              msg.message?.imageMessage ||
              msg.message?.videoMessage ||
              msg.message?.audioMessage ||
              msg.message?.documentMessage ||
              msg.message?.stickerMessage
            );

            chatBulk.push({
              updateOne: {
                filter: {
                  workspace_id: ws.id,
                  message_id: messageId,
                },
                update: {
                  $set: {
                    workspace_id: ws.id,
                    instance_name: ws.evolution_instance_name,
                    phone_number: phoneNumber,
                    remote_jid: chat.remoteJid,
                    message_id: messageId,
                    message_type: messageType,
                    message_text: messageText,
                    is_from_me: isFromMe,
                    is_group: false,
                    has_media: hasMedia,
                    timestamp,
                    contact_name: contactName,
                    status: isFromMe ? "sent" : "received",
                    updated_at: new Date(),
                  },
                  $setOnInsert: { created_at: new Date() },
                },
                upsert: true,
              },
            });

            chatEsBulk.push({
              index: {
                _index: ES_INDEX,
                _id: `${ws.id}_${messageId}`,
              },
            });
            chatEsBulk.push({
              workspace_id: ws.id,
              phone_number: phoneNumber,
              remote_jid: chat.remoteJid,
              message_id: messageId,
              instance_name: ws.evolution_instance_name,
              message_text: messageText,
              contact_name: contactName,
              message_type: messageType,
              is_from_me: isFromMe,
              is_group: false,
              has_media: hasMedia,
              timestamp: timestamp.toISOString(),
              status: isFromMe ? "sent" : "received",
            });
          }

          if (chatBulk.length > 0) {
            await messagesCol.bulkWrite(chatBulk);
            totalNewMessages += chatBulk.length;
          }
          if (chatEsBulk.length > 0) {
            await es
              .bulk({ body: chatEsBulk })
              .catch((e: any) =>
                console.error("  ES bulk error:", e.message)
              );
          }

          process.stdout.write(
            `  Messages: ${totalNewMessages} synced...    \r`
          );
        } catch (chatErr: any) {
          console.error(
            `  Error syncing chat ${chat.remoteJid}: ${chatErr.message}`
          );
        }
      }

      console.log(`  Messages: ${totalNewMessages} total synced`);

      // 2c. Fetch contacts with name + photo
      console.log("  Fetching contacts...");
      const contacts = await fetchAllContacts(ws.id, ws.evolution_instance_name);
      const individualContacts = contacts.filter(
        (c) => !c.remoteJid?.includes("@g.us")
      );

      let contactsSynced = 0;
      for (const contact of individualContacts) {
        try {
          const phoneNumber = extractPhoneFromJid(contact.remoteJid);
          if (!phoneNumber) continue;

          let profilePictureUrl: string | null = null;
          try {
            const pic = await getProfilePicture(
              ws.evolution_instance_name,
              phoneNumber
            );
            profilePictureUrl = pic?.profilePictureUrl || null;
          } catch {
            // Many contacts won't have profile pictures accessible
          }

          await contactsCol.updateOne(
            { workspace_id: ws.id, phone_number: phoneNumber },
            {
              $set: {
                workspace_id: ws.id,
                phone_number: phoneNumber,
                remote_jid: contact.remoteJid,
                push_name: contact.pushName || null,
                contact_name: contact.pushName || null,
                profile_picture_url: profilePictureUrl,
                about: null,
                is_business: contact.isBusiness || false,
                matched_lead_id: null,
                matched_lead_name: null,
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

          contactsSynced++;

          // Rate limit: 1 profile picture request per 100ms
          if (contactsSynced % 10 === 0) await sleep(100);

          process.stdout.write(
            `  Contacts: ${contactsSynced}/${individualContacts.length}...    \r`
          );
        } catch (contactErr: any) {
          console.error(
            `  Error syncing contact ${contact.remoteJid}: ${contactErr.message}`
          );
        }
      }

      console.log(`  Contacts: ${contactsSynced} synced`);

      // ── Step 3: Build conversation aggregates ─────────────────────
      console.log("  Building conversation aggregates...");

      const pipeline = [
        { $match: { workspace_id: ws.id } },
        {
          $group: {
            _id: "$phone_number",
            remote_jid: { $first: "$remote_jid" },
            total_messages: { $sum: 1 },
            messages_sent: {
              $sum: { $cond: ["$is_from_me", 1, 0] },
            },
            messages_received: {
              $sum: { $cond: ["$is_from_me", 0, 1] },
            },
            first_message_at: { $min: "$timestamp" },
            last_message_at: { $max: "$timestamp" },
            last_msg: {
              $last: {
                text: "$message_text",
                from_me: "$is_from_me",
                ts: "$timestamp",
              },
            },
            contact_name: {
              $last: "$contact_name",
            },
          },
        },
      ];

      const aggregated = await messagesCol.aggregate(pipeline).toArray();

      for (const agg of aggregated) {
        const phoneNumber = agg._id;
        const remoteJid = agg.remote_jid || `${phoneNumber}@s.whatsapp.net`;

        // Get contact info from contacts collection
        const contactDoc = await contactsCol.findOne({
          workspace_id: ws.id,
          phone_number: phoneNumber,
        });

        // Get matched lead from PostgreSQL
        const { rows: leads } = await pool.query(
          `SELECT id_lead, nome FROM cvcrm_leads WHERE workspace_id = $1 AND telefone LIKE $2 LIMIT 1`,
          [ws.id, `%${phoneNumber.slice(-9)}`]
        );
        const matchedLead = leads[0] || null;

        const bestName =
          contactDoc?.push_name ||
          contactDoc?.contact_name ||
          agg.contact_name ||
          matchedLead?.nome ||
          phoneNumber;

        await conversationsCol.updateOne(
          { workspace_id: ws.id, remote_jid: remoteJid },
          {
            $set: {
              workspace_id: ws.id,
              remote_jid: remoteJid,
              phone_number: phoneNumber,
              contact_name: bestName,
              profile_picture_url:
                contactDoc?.profile_picture_url || null,
              total_messages: agg.total_messages,
              messages_sent: agg.messages_sent,
              messages_received: agg.messages_received,
              first_message_at: agg.first_message_at,
              last_message_at: agg.last_message_at,
              last_message_text: agg.last_msg?.text || null,
              last_message_from_me: agg.last_msg?.from_me || false,
              unread_count: 0,
              matched_lead_id: matchedLead?.id_lead || null,
              matched_lead_name: matchedLead?.nome || null,
              updated_at: new Date(),
            },
            $setOnInsert: {
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

      console.log(
        `  Conversations: ${aggregated.length} aggregates built`
      );
    } catch (wsErr: any) {
      console.error(
        `  [Workspace ${ws.id}] Fatal error: ${wsErr.message}`
      );
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const totalMessages = await messagesCol.countDocuments();
  const totalConversations = await conversationsCol.countDocuments();
  const totalContacts = await contactsCol.countDocuments();

  console.log("\n=== Sync Complete ===");
  console.log(`  MongoDB messages:      ${totalMessages}`);
  console.log(`  MongoDB conversations: ${totalConversations}`);
  console.log(`  MongoDB contacts:      ${totalContacts}`);

  await pool.end();
  await mongo.close();
  await es.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
