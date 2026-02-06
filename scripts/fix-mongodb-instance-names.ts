/**
 * Fix MongoDB instance_name — standalone script
 *
 * Adds instance_name to conversations and contacts in MongoDB.
 * Uses message data to determine which instance owns each conversation.
 *
 * Usage: npx tsx scripts/fix-mongodb-instance-names.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://pratica:pratica_mongo_2026!@localhost:27017/pratica?authSource=pratica';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('pratica');

  console.log('[fix-mongodb] Connected to MongoDB');

  // Step 1: Build mapping of (workspace_id, remote_jid) -> instance_name from messages
  // Use the most common instance_name for each conversation
  const pipeline = [
    {
      $group: {
        _id: { workspace_id: '$workspace_id', remote_jid: '$remote_jid' },
        instance_name: { $last: '$instance_name' }, // most recent message's instance
        count: { $sum: 1 },
      },
    },
  ];

  const msgAgg = await db.collection('messages').aggregate(pipeline).toArray();
  console.log(`[fix-mongodb] Found ${msgAgg.length} unique (workspace, remote_jid) pairs in messages`);

  // Build lookup map: "workspace_id:remote_jid" -> instance_name
  const convMap = new Map<string, string>();
  // Also build phone->instance map for contacts
  const phoneMap = new Map<string, string>(); // "workspace_id:phone" -> instance_name

  for (const row of msgAgg) {
    const wid = row._id.workspace_id;
    const rjid = row._id.remote_jid;
    const inst = row.instance_name;
    if (!inst) continue;

    convMap.set(`${wid}:${rjid}`, inst);

    // Extract phone from remote_jid
    const phone = rjid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    if (phone) {
      phoneMap.set(`${wid}:${phone}`, inst);
    }
  }

  // Step 2: Update conversations
  const conversations = await db.collection('conversations').find({}).toArray();
  console.log(`[fix-mongodb] Found ${conversations.length} conversations to update`);

  let convUpdated = 0;
  for (const conv of conversations) {
    const key = `${conv.workspace_id}:${conv.remote_jid}`;
    const instanceName = convMap.get(key);
    if (instanceName) {
      await db.collection('conversations').updateOne(
        { _id: conv._id },
        { $set: { instance_name: instanceName } }
      );
      convUpdated++;
    } else {
      console.warn(`  [skip] No instance found for conversation ${key}`);
    }
  }
  console.log(`[fix-mongodb] Updated ${convUpdated}/${conversations.length} conversations`);

  // Step 3: Update contacts
  const contacts = await db.collection('contacts').find({}).toArray();
  console.log(`[fix-mongodb] Found ${contacts.length} contacts to update`);

  let contactUpdated = 0;
  for (const contact of contacts) {
    const key = `${contact.workspace_id}:${contact.phone_number}`;
    const instanceName = phoneMap.get(key);
    if (instanceName) {
      await db.collection('contacts').updateOne(
        { _id: contact._id },
        { $set: { instance_name: instanceName } }
      );
      contactUpdated++;
    } else {
      console.warn(`  [skip] No instance found for contact ${key}`);
    }
  }
  console.log(`[fix-mongodb] Updated ${contactUpdated}/${contacts.length} contacts`);

  // Step 4: Create indexes
  console.log('[fix-mongodb] Creating indexes...');
  await db.collection('conversations').createIndex(
    { workspace_id: 1, instance_name: 1 },
    { name: 'idx_conv_workspace_instance' }
  );
  await db.collection('conversations').createIndex(
    { workspace_id: 1, instance_name: 1, remote_jid: 1 },
    { name: 'idx_conv_workspace_instance_jid', unique: true }
  );
  await db.collection('contacts').createIndex(
    { workspace_id: 1, instance_name: 1 },
    { name: 'idx_contact_workspace_instance' }
  );
  await db.collection('contacts').createIndex(
    { workspace_id: 1, instance_name: 1, phone_number: 1 },
    { name: 'idx_contact_workspace_instance_phone', unique: true }
  );

  console.log('[fix-mongodb] Done! Indexes created.');

  // Verify
  const convWithInstance = await db.collection('conversations').countDocuments({ instance_name: { $exists: true } });
  const contactsWithInstance = await db.collection('contacts').countDocuments({ instance_name: { $exists: true } });
  console.log(`\n[Verification]`);
  console.log(`  Conversations with instance_name: ${convWithInstance}/${conversations.length}`);
  console.log(`  Contacts with instance_name: ${contactsWithInstance}/${contacts.length}`);

  await client.close();
}

main().catch((err) => {
  console.error('[fix-mongodb] Fatal error:', err);
  process.exit(1);
});
