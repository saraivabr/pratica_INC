/**
 * Sync contacts from Evolution API into MongoDB.
 *
 * Fetches all chats from connected Evolution instances,
 * extracts contact info (name, photo, push_name) and upserts into MongoDB.
 *
 * Usage: npx tsx scripts/sync-contacts.ts
 */

import { MongoClient } from "mongodb";
import { execSync } from "child_process";

const MONGO_URI = "mongodb://pratica:pratica_mongo_2026!@localhost:27017/pratica?authSource=pratica";
const EVOLUTION_BASE_URL = "https://pratica-evolution-api.robuvi.easypanel.host";
const EVOLUTION_API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

async function main() {
  console.log("[Sync Contacts] Starting...");

  // Get connected workspaces via psql (peer auth requires running as postgres)
  const pgResult = execSync(
    `sudo -u postgres psql -d pratica -t -A -F'|' -c "SELECT id, evolution_instance_name FROM workspaces WHERE evolution_connected = true AND evolution_instance_name IS NOT NULL"`
  ).toString().trim();

  const workspaces = pgResult
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, instance_name] = line.split("|");
      return { id: parseInt(id), evolution_instance_name: instance_name };
    });

  // Connect to MongoDB
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db();

  try {
    console.log(`[Sync Contacts] Found ${workspaces.length} connected workspace(s)`);

    for (const ws of workspaces) {
      const workspaceId = ws.id;
      const instanceName = ws.evolution_instance_name;
      console.log(`\n[Workspace ${workspaceId}] Instance: ${instanceName}`);

      // Fetch chats from Evolution API
      const chatsRes = await fetch(`${EVOLUTION_BASE_URL}/chat/findChats/${instanceName}`, {
        method: "POST",
        headers: {
          "apikey": EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!chatsRes.ok) {
        console.error(`[Workspace ${workspaceId}] Failed to fetch chats: ${chatsRes.status}`);
        continue;
      }

      const chats: any[] = await chatsRes.json();
      console.log(`[Workspace ${workspaceId}] Got ${chats.length} chats`);

      let contactsUpserted = 0;
      let conversationsUpdated = 0;

      for (const chat of chats) {
        const remoteJid = chat.remoteJid;
        if (!remoteJid) continue;

        // Skip groups
        if (remoteJid.endsWith("@g.us")) continue;

        // Extract phone number from JID
        let phoneNumber: string | null = null;
        if (remoteJid.endsWith("@s.whatsapp.net")) {
          phoneNumber = remoteJid.replace("@s.whatsapp.net", "");
        } else if (remoteJid.endsWith("@lid")) {
          // LID format - try to get phone from participant or alt field
          const lastMsg = chat.lastMessage;
          if (lastMsg?.key?.remoteJidAlt) {
            phoneNumber = lastMsg.key.remoteJidAlt.replace("@s.whatsapp.net", "");
          } else {
            // Skip LID contacts we can't resolve
            continue;
          }
        } else {
          continue;
        }

        if (!phoneNumber) continue;

        const pushName = chat.pushName || chat.lastMessage?.pushName || null;
        const profilePictureUrl = chat.profilePicUrl || null;

        // Upsert contact in MongoDB
        await db.collection("contacts").updateOne(
          { workspace_id: workspaceId, phone_number: phoneNumber },
          {
            $set: {
              workspace_id: workspaceId,
              phone_number: phoneNumber,
              remote_jid: remoteJid,
              ...(pushName && { push_name: pushName }),
              ...(profilePictureUrl && { profile_picture_url: profilePictureUrl }),
              synced_at: new Date(),
            },
            $setOnInsert: {
              contact_name: null,
              about: null,
              is_business: false,
              first_seen_at: new Date(),
            },
          },
          { upsert: true }
        );
        contactsUpserted++;

        // Also update conversation with contact info
        const convUpdate: any = {};
        if (pushName) convUpdate.contact_name = pushName;
        if (profilePictureUrl) convUpdate.profile_picture_url = profilePictureUrl;

        if (Object.keys(convUpdate).length > 0) {
          const result = await db.collection("conversations").updateOne(
            { workspace_id: workspaceId, phone_number: phoneNumber },
            { $set: convUpdate }
          );
          if (result.modifiedCount > 0) conversationsUpdated++;
        }
      }

      console.log(`[Workspace ${workspaceId}] Upserted ${contactsUpserted} contacts, updated ${conversationsUpdated} conversations`);

      // Phase 2: Fetch profile pictures for all conversations that don't have one
      console.log(`[Workspace ${workspaceId}] Fetching profile pictures for remaining contacts...`);
      const convsWithoutPic = await db
        .collection("conversations")
        .find({
          workspace_id: workspaceId,
          $or: [
            { profile_picture_url: null },
            { profile_picture_url: { $exists: false } },
          ],
        })
        .toArray();

      let picsFetched = 0;
      let picsFailed = 0;
      for (const conv of convsWithoutPic) {
        const phone = conv.phone_number;
        if (!phone) continue;

        try {
          const picRes = await fetch(
            `${EVOLUTION_BASE_URL}/chat/fetchProfilePictureUrl/${instanceName}`,
            {
              method: "POST",
              headers: {
                apikey: EVOLUTION_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ number: phone }),
            }
          );

          if (picRes.ok) {
            const picData: any = await picRes.json();
            if (picData.profilePictureUrl) {
              await db.collection("conversations").updateOne(
                { workspace_id: workspaceId, phone_number: phone },
                { $set: { profile_picture_url: picData.profilePictureUrl } }
              );
              await db.collection("contacts").updateOne(
                { workspace_id: workspaceId, phone_number: phone },
                {
                  $set: {
                    profile_picture_url: picData.profilePictureUrl,
                    synced_at: new Date(),
                  },
                  $setOnInsert: {
                    workspace_id: workspaceId,
                    phone_number: phone,
                    push_name: conv.contact_name || null,
                    contact_name: null,
                    about: null,
                    is_business: false,
                    first_seen_at: new Date(),
                  },
                },
                { upsert: true }
              );
              picsFetched++;
            }
          }
        } catch {
          picsFailed++;
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 100));
      }

      console.log(
        `[Workspace ${workspaceId}] Profile pics: ${picsFetched} fetched, ${picsFailed} failed, ${convsWithoutPic.length - picsFetched - picsFailed} no picture`
      );
    }

    // Final counts
    const contactCount = await db.collection("contacts").countDocuments();
    const convCount = await db.collection("conversations").countDocuments();
    console.log(`\n[Done] MongoDB contacts: ${contactCount}, conversations: ${convCount}`);
  } finally {
    await mongo.close();
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
