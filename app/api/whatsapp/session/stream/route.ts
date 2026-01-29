/**
 * SSE endpoint for real-time WhatsApp messages
 * 
 * GET /api/whatsapp/session/stream?instance=xxx
 * 
 * Returns a Server-Sent Events stream that emits:
 * - new_message: when a new message arrives
 * - connection_update: when WhatsApp connection status changes
 * - ping: keepalive every 30s
 */

import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { messageEvents } from "@/lib/message-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const instance = searchParams.get("instance");
  if (!instance) {
    return new Response("Instance não especificada", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Subscribe to message events
      const unsubscribe = messageEvents.subscribe(instance, (data) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      });

      // Keepalive ping every 30s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`)
          );
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
