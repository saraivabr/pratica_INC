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

export async function POST(request: Request) {
  try {
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
