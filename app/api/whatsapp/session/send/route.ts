import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace, tenantQuery } from "@/lib/tenant-context";
import { sendTextMessage, formatPhoneNumber } from "@/lib/evolution-api";
import rateLimiter, { RateLimitConfigs } from "@/lib/rate-limiter";
import { canAccessInstance } from "@/lib/whatsapp-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const workspace = await findUserWorkspace(user);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace não configurado" }, { status: 400 });
    }

    // Rate limiting
    const rateLimitKey = `whatsapp:send:${user.id}`;
    const rateLimit = await rateLimiter.check(rateLimitKey, RateLimitConfigs.WHATSAPP_SEND);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Limite de mensagens atingido. Aguarde.", retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const { phoneNumber, message, instanceName: bodyInstance } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: "phoneNumber e message são obrigatórios" }, { status: 400 });
    }

    const userInstance = user.evolution_instance_name || null;
    const instanceName = bodyInstance || userInstance;

    if (!instanceName) {
      return NextResponse.json({ error: "Instância WhatsApp não configurada" }, { status: 400 });
    }

    if (!(await canAccessInstance(user, workspace.id, instanceName))) {
      return NextResponse.json({ error: "Instância não pertence a este usuário" }, { status: 403 });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    const result = await sendTextMessage(instanceName, {
      number: formattedPhone,
      text: message,
    });

    const query = tenantQuery(workspace.id);
    await query.insert("whatsapp_messages", {
      instance_name: instanceName,
      phone_number: phoneNumber,
      message_id: result.key?.id || `msg-${Date.now()}`,
      message_type: "conversation",
      message_text: message,
      is_from_me: true,
      status: "sent",
      timestamp: new Date().toISOString(),
      raw_data: result,
    });

    return NextResponse.json({
      success: true,
      data: {
        message_id: result.key?.id,
        phone_number: phoneNumber,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
  }
}
