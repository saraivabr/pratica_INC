/**
 * Manage WhatsApp conversations — archive, pin, labels.
 *
 * PATCH /api/whatsapp/conversations
 * Body: { phone_number, action: 'archive'|'unarchive'|'pin'|'unpin'|'label', value?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace } from "@/lib/tenant-context";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
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
    const body = await request.json();
    const { phone_number, action, value } = body;

    if (!phone_number || !action) {
      return NextResponse.json(
        { success: false, error: "phone_number e action são obrigatórios" },
        { status: 400 }
      );
    }

    const db = getMongoDb();
    const remoteJid = `${phone_number}@s.whatsapp.net`;
    const filter = { workspace_id: workspaceId, remote_jid: remoteJid };

    let update: any = {};

    switch (action) {
      case "archive":
        update = { $set: { archived: true, updated_at: new Date() } };
        break;
      case "unarchive":
        update = { $set: { archived: false, updated_at: new Date() } };
        break;
      case "pin":
        update = { $set: { pinned: true, updated_at: new Date() } };
        break;
      case "unpin":
        update = { $set: { pinned: false, updated_at: new Date() } };
        break;
      case "label":
        if (!value) {
          return NextResponse.json(
            { success: false, error: "value é obrigatório para action=label" },
            { status: 400 }
          );
        }
        update = { $addToSet: { labels: value }, $set: { updated_at: new Date() } };
        break;
      case "unlabel":
        if (!value) {
          return NextResponse.json(
            { success: false, error: "value é obrigatório para action=unlabel" },
            { status: 400 }
          );
        }
        update = { $pull: { labels: value }, $set: { updated_at: new Date() } };
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Action '${action}' não reconhecida` },
          { status: 400 }
        );
    }

    const result = await db.collection("conversations").updateOne(filter, update);

    return NextResponse.json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("[Conversations] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
