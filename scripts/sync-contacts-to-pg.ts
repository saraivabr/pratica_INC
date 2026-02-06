/**
 * Sync contacts from MongoDB to PostgreSQL whatsapp_contacts
 *
 * Usage: npx tsx scripts/sync-contacts-to-pg.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { MongoClient } from 'mongodb';
import { Pool } from 'pg';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://pratica:pratica_mongo_2026!@localhost:27017/pratica?authSource=pratica';
const PG_URI = 'postgresql://pratica:pratica2026secure@localhost:5432/pratica';

async function main() {
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db('pratica');

  const pool = new Pool({ connectionString: PG_URI });

  console.log('[sync-contacts] Connected to MongoDB and PostgreSQL');

  // Read contacts from MongoDB
  const contacts = await db.collection('contacts').find({}).toArray();
  console.log(`[sync-contacts] Found ${contacts.length} contacts in MongoDB`);

  let synced = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      const workspaceId = contact.workspace_id;
      if (!workspaceId) {
        console.warn(`  [skip] Contact ${contact.phone_number} has no workspace_id`);
        continue;
      }
      if (!contact.instance_name) {
        console.warn(`  [skip] Contact ${contact.phone_number} has no instance_name`);
        continue;
      }

      // Set RLS context for this workspace
      const client = await pool.connect();
      try {
        await client.query("SELECT set_config('app.current_workspace_id', $1::text, false)", [String(workspaceId)]);

        await client.query(
          `INSERT INTO whatsapp_contacts (
            workspace_id, instance_name, phone_number, contact_name,
            profile_picture_url, lead_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (instance_name, phone_number)
          DO UPDATE SET
            workspace_id = COALESCE(EXCLUDED.workspace_id, whatsapp_contacts.workspace_id),
            contact_name = COALESCE(EXCLUDED.contact_name, whatsapp_contacts.contact_name),
            profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, whatsapp_contacts.profile_picture_url),
            updated_at = NOW()`,
          [
            workspaceId,
            contact.instance_name || null,
            contact.phone_number,
            contact.push_name || contact.contact_name || null,
            contact.profile_picture_url || null,
            contact.matched_lead_id || null,
            contact.first_seen_at || new Date(),
          ]
        );
        synced++;
      } finally {
        client.release();
      }
    } catch (err: any) {
      errors++;
      console.error(`  [error] Contact ${contact.phone_number}:`, err.message);
    }
  }

  console.log(`\n[sync-contacts] Done! Synced: ${synced}, Errors: ${errors}`);

  await mongo.close();
  await pool.end();
}

main().catch((err) => {
  console.error('[sync-contacts] Fatal error:', err);
  process.exit(1);
});
