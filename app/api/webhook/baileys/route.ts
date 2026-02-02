import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getUserById, normalizePhone } from "@/lib/supabase";
import { processMessage } from "@/lib/sofia";

type IncomingPayload = {
  workspaceId: string;
  userId: string;
  from: string;
  text: string;
  messageId?: string;
  timestamp?: number;
};

async function shouldProcessInbound(
  phone: string,
  messageId?: string,
  timestamp?: number
): Promise<boolean> {
  const id = messageId || (timestamp ? `${phone}:${timestamp}` : null);
  if (!id) return false;

  const { rows } = await dbQuery(
    `insert into inbound_messages (message_id, phone, received_at)
     values ($1, $2, now())
     on conflict (message_id) do nothing
     returning id`,
    [id, phone]
  );

  return rows.length > 0;
}

/**
 * SECURITY: Validar token do webhook
 */
function validateWebhookToken(request: Request): boolean {
  const webhookToken = process.env.BAILEYS_WEBHOOK_TOKEN;
  if (!webhookToken) {
    console.error('[Baileys] BAILEYS_WEBHOOK_TOKEN não configurado. Rejeitando request.');
    return false;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${webhookToken}`) return true;
  const tokenHeader = request.headers.get('x-webhook-token');
  if (tokenHeader === webhookToken) return true;
  return false;
}

export async function POST(request: Request) {
  try {
    // SECURITY: Validar token antes de processar
    if (!validateWebhookToken(request)) {
      console.error('[Baileys] Unauthorized webhook request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: IncomingPayload = await request.json();
    if (!body?.userId || !body?.from || !body?.text) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const user = await getUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const senderPhone = normalizePhone(body.from);
    const allowed = await shouldProcessInbound(
      senderPhone,
      body.messageId,
      body.timestamp
    );
    if (!allowed) {
      return NextResponse.json({ received: true });
    }

    await processMessage(user, body.text);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Baileys webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
