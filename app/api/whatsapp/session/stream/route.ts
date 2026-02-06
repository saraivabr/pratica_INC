/**
 * SSE: Real-time WhatsApp events stream
 *
 * GET /api/whatsapp/session/stream
 *
 * Pushes events via Server-Sent Events when:
 * - New message arrives (new_message)
 * - Connection status changes (connection_update)
 * - Message status updates (message_update)
 *
 * Client subscribes and invalidates React Query cache on events,
 * giving the appearance of real-time updates without polling.
 */

import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { subscribeToInstance } from "@/lib/sse-pubsub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const instanceName = (user as any).evolution_instance_name;
  if (!instanceName) {
    return new Response("No WhatsApp instance", { status: 400 });
  }

  const { events, cleanup } = subscribeToInstance(instanceName);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial connected event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ instance: instanceName })}\n\n`)
      );

      try {
        for await (const message of events) {
          if (message === '') {
            // Heartbeat to keep connection alive
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } else {
            try {
              const parsed = JSON.parse(message);
              controller.enqueue(
                encoder.encode(`event: ${parsed.type}\ndata: ${JSON.stringify(parsed.data || {})}\n\n`)
              );
            } catch {
              controller.enqueue(
                encoder.encode(`event: update\ndata: ${message}\n\n`)
              );
            }
          }
        }
      } catch {
        // Stream closed
      } finally {
        cleanup();
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
