/**
 * Setup MongoDB collections and indexes for WhatsApp polyglot storage.
 * Run once: npx tsx scripts/setup-mongodb.ts
 */

import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://pratica:pratica_mongo_2026!@localhost:27017/pratica?authSource=pratica";

async function main() {
  console.log("[MongoDB Setup] Connecting...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  // ── messages ──────────────────────────────────────────────────────
  console.log("[MongoDB Setup] Creating messages collection + indexes...");
  const messages = db.collection("messages");

  await messages.createIndex(
    { workspace_id: 1, phone_number: 1, timestamp: -1 },
    { name: "idx_messages_workspace_phone_ts" }
  );
  await messages.createIndex(
    { workspace_id: 1, message_id: 1 },
    { name: "idx_messages_workspace_msgid", unique: true }
  );
  await messages.createIndex(
    { workspace_id: 1, remote_jid: 1, timestamp: -1 },
    { name: "idx_messages_workspace_jid_ts" }
  );

  // ── conversations ─────────────────────────────────────────────────
  console.log("[MongoDB Setup] Creating conversations collection + indexes...");
  const conversations = db.collection("conversations");

  await conversations.createIndex(
    { workspace_id: 1, remote_jid: 1 },
    { name: "idx_conv_workspace_jid", unique: true }
  );
  await conversations.createIndex(
    { workspace_id: 1, last_message_at: -1 },
    { name: "idx_conv_workspace_lastmsg" }
  );
  await conversations.createIndex(
    { workspace_id: 1, labels: 1 },
    { name: "idx_conv_workspace_labels" }
  );
  await conversations.createIndex(
    { workspace_id: 1, phone_number: 1 },
    { name: "idx_conv_workspace_phone" }
  );

  // ── contacts ──────────────────────────────────────────────────────
  console.log("[MongoDB Setup] Creating contacts collection + indexes...");
  const contacts = db.collection("contacts");

  await contacts.createIndex(
    { workspace_id: 1, phone_number: 1 },
    { name: "idx_contacts_workspace_phone", unique: true }
  );
  await contacts.createIndex(
    { workspace_id: 1, remote_jid: 1 },
    { name: "idx_contacts_workspace_jid" }
  );

  console.log("[MongoDB Setup] Done! All collections and indexes created.");
  await client.close();
}

main().catch((err) => {
  console.error("[MongoDB Setup] Fatal error:", err);
  process.exit(1);
});
