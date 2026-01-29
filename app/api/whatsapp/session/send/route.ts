import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { dbQuery } from "@/lib/db";
import { emitNewMessage } from "@/lib/message-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const phone = body.phone || body.phoneNumber;
    const message = body.message || body.text;
    const instanceName = body.instanceName;

    if (!phone || !message) {
      return NextResponse.json({ error: "phone e message são obrigatórios" }, { status: 400 });
    }

    // Buscar instance name do usuário se não fornecido
    let instance = instanceName;
    if (!instance) {
      const res = await dbQuery(
        `SELECT evolution_instance_name FROM users WHERE id = $1`,
        [(user as any).id]
      );
      instance = res.rows[0]?.evolution_instance_name;
    }

    if (!instance) {
      // Fallback: buscar qualquer instância ativa
      const res = await dbQuery(
        `SELECT instance_name FROM whatsapp_instances WHERE status = 'open' LIMIT 1`
      );
      instance = res.rows[0]?.instance_name;
    }

    if (!instance) {
      return NextResponse.json({ error: "Nenhuma instância WhatsApp conectada" }, { status: 400 });
    }

    // Enviar via Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
    const apiKey = process.env.EVOLUTION_API_KEY || "pratica_evolution_key_2026_secure";

    const number = phone.replace(/\D/g, "");
    
    const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: number,
        text: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Send] Evolution API error:", data);
      return NextResponse.json({ error: "Erro ao enviar mensagem", details: data }, { status: 500 });
    }

    // Salvar mensagem enviada no banco
    const messageId = data.key?.id || `sent-${Date.now()}`;
    const timestamp = new Date().toISOString();

    await dbQuery(
      `INSERT INTO whatsapp_messages (
        tenant_id, instance_name, message_id, phone_number, contact_name,
        message_type, message_text, is_from_me, timestamp, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      ON CONFLICT (instance_name, message_id) DO NOTHING`,
      [
        1, instance, messageId, number, "Você",
        "conversation", message, true, timestamp, JSON.stringify(data),
      ]
    );

    // Emitir SSE
    emitNewMessage(instance, {
      phone_number: number,
      contact_name: "Você",
      message_text: message,
      message_type: "conversation",
      is_from_me: true,
      timestamp,
    });

    return NextResponse.json({ 
      success: true, 
      messageId,
      status: "sent" 
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
  }
}
