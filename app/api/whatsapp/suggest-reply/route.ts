/**
 * AI-powered reply suggestions.
 *
 * POST /api/whatsapp/suggest-reply
 * Body: { phone_number, context_messages?: number, mode?: 'quick' | 'detailed' }
 *
 * Modes:
 * - 'quick': 3 short replies (1-2 sentences) for smart reply bar
 * - 'detailed': 2-3 longer replies for lead panel
 *
 * Returns: { success, suggestions: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace } from "@/lib/tenant-context";
import { suggestReply, suggestQuickReply } from "@/lib/whatsapp-storage/ai-engine";

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
    const { phone_number, context_messages = 10, mode = "detailed" } = body;

    if (!phone_number) {
      return NextResponse.json(
        { success: false, error: "phone_number é obrigatório" },
        { status: 400 }
      );
    }

    // Pass user's instance_name for isolation
    const instanceName = user.evolution_instance_name || undefined;

    const suggestions =
      mode === "quick"
        ? await suggestQuickReply(tenant.id, phone_number, context_messages, instanceName)
        : await suggestReply(tenant.id, phone_number, context_messages, instanceName);

    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    console.error("[Suggest Reply] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
