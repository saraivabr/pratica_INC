/**
 * AI-powered reply suggestions.
 *
 * POST /api/whatsapp/suggest-reply
 * Body: { phone_number, context_messages?: number }
 *
 * Returns: { success, suggestions: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace } from "@/lib/tenant-context";
import { suggestReply } from "@/lib/whatsapp-storage/ai-engine";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { phone_number, context_messages = 10 } = body;

    if (!phone_number) {
      return NextResponse.json(
        { success: false, error: "phone_number é obrigatório" },
        { status: 400 }
      );
    }

    const suggestions = await suggestReply(
      tenant.id,
      phone_number,
      context_messages
    );

    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    console.error("[Suggest Reply] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
