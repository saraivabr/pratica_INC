/**
 * Export WhatsApp conversation with AI analysis.
 *
 * GET /api/whatsapp/export?phone=551199&format=csv|json
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace } from "@/lib/tenant-context";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const tenant = await findUserWorkspace(user);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Empresa não configurada" },
        { status: 400 }
      );
    }

    const workspaceId = tenant.id;
    const params = request.nextUrl.searchParams;
    const phoneNumber = params.get("phone");
    const format = params.get("format") || "json";

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "phone é obrigatório" },
        { status: 400 }
      );
    }

    const db = getMongoDb();

    // Fetch messages
    const messages = await db
      .collection("messages")
      .find({ workspace_id: workspaceId, phone_number: phoneNumber })
      .sort({ timestamp: 1 })
      .toArray();

    // Fetch conversation with AI analysis
    const conversation = await db.collection("conversations").findOne({
      workspace_id: workspaceId,
      phone_number: phoneNumber,
    });

    // Fetch contact
    const contact = await db.collection("contacts").findOne({
      workspace_id: workspaceId,
      phone_number: phoneNumber,
    });

    if (format === "csv") {
      // CSV export
      const lines = [
        "timestamp,sender,message_type,message_text",
      ];

      for (const msg of messages) {
        const ts = new Date(msg.timestamp).toISOString();
        const sender = msg.is_from_me ? "Corretor" : "Cliente";
        const text = (msg.message_text || "").replace(/"/g, '""');
        lines.push(`"${ts}","${sender}","${msg.message_type}","${text}"`);
      }

      // Append AI summary as comment
      if (conversation?.ai_analysis?.summary) {
        lines.push("");
        lines.push(`# AI Summary: ${conversation.ai_analysis.summary}`);
        lines.push(
          `# Sentiment: ${conversation.ai_analysis.sentiment} | Temperature: ${conversation.ai_analysis.temperature}`
        );
      }

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="whatsapp_${phoneNumber}.csv"`,
        },
      });
    }

    // JSON export
    return NextResponse.json({
      success: true,
      data: {
        contact: {
          phone_number: phoneNumber,
          name:
            contact?.push_name ||
            contact?.contact_name ||
            conversation?.contact_name ||
            phoneNumber,
          profile_picture_url: contact?.profile_picture_url || null,
          is_business: contact?.is_business || false,
        },
        conversation: {
          total_messages: conversation?.total_messages || messages.length,
          first_message_at: conversation?.first_message_at || null,
          last_message_at: conversation?.last_message_at || null,
          labels: conversation?.labels || [],
        },
        ai_analysis: conversation?.ai_analysis || null,
        messages: messages.map((m) => ({
          timestamp: m.timestamp,
          sender: m.is_from_me ? "corretor" : "cliente",
          message_type: m.message_type,
          message_text: m.message_text,
          status: m.status,
        })),
      },
    });
  } catch (error: any) {
    console.error("[Export] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
