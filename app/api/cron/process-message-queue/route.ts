/**
 * Cron: Process Message Queue
 *
 * Dequeues items from Redis and writes to MongoDB + Elasticsearch.
 * Should be called every 5-10 seconds.
 *
 * GET /api/cron/process-message-queue?secret=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveQueues, dequeueMessages } from "@/lib/message-queue";
import {
  indexMessage,
  updateConversationOnMessage,
  upsertContact,
  type MessageDoc,
} from "@/lib/whatsapp-storage/pipeline";
import { incrementUnread } from "@/lib/whatsapp-storage/realtime";
import {
  analyzeConversation,
  shouldReanalyze,
} from "@/lib/whatsapp-storage/ai-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    const activeQueues = await getActiveQueues();

    for (const workspaceId of activeQueues) {
      const items = await dequeueMessages(workspaceId, 100);
      if (items.length === 0) continue;

      for (const item of items) {
        try {
          switch (item.action) {
            case "index_message": {
              const p = item.payload;
              const doc: MessageDoc = {
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
              };

              await indexMessage(workspaceId, doc);

              // Update conversation aggregate
              await updateConversationOnMessage(
                workspaceId,
                doc.phone_number,
                doc.message_text,
                doc.is_from_me,
                doc.timestamp
              );

              // Update Redis unread count for incoming messages
              if (!doc.is_from_me) {
                await incrementUnread(workspaceId, doc.phone_number);
              }

              break;
            }

            case "upsert_contact": {
              const p = item.payload;
              await upsertContact(workspaceId, {
                phone_number: p.phone_number,
                remote_jid: p.remote_jid,
                push_name: p.push_name,
                contact_name: p.contact_name,
                profile_picture_url: p.profile_picture_url,
                about: p.about,
                is_business: p.is_business || false,
              });
              break;
            }

            case "analyze_conversation": {
              const p = item.payload;
              const shouldRun = await shouldReanalyze(
                workspaceId,
                p.phone_number
              );
              if (shouldRun) {
                await analyzeConversation(workspaceId, p.phone_number);
              }
              break;
            }
          }

          totalProcessed++;
        } catch (err: any) {
          totalErrors++;
          console.error(
            `[MQ] Error processing ${item.action}:`,
            err.message
          );
        }
      }
    }

    const elapsed = Date.now() - started;

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      errors: totalErrors,
      queues: activeQueues.length,
      elapsed_ms: elapsed,
    });
  } catch (err: any) {
    console.error("[MQ] Fatal error:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
