import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const result = await dbQuery(
      "SELECT metadata FROM users WHERE id = $1",
      [user.id]
    );

    const metadata = result.rows[0]?.metadata;
    const salvaLeads = metadata?.salva_leads || {};

    return NextResponse.json({
      assistantName: salvaLeads.assistant_name || "Luna",
      assistantInstructions: salvaLeads.assistant_instructions || "",
    });
  } catch (error) {
    console.error("[salva-leads/config] GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { assistantName, assistantInstructions } = body;

    // Validation
    if (assistantName && assistantName.length > 30) {
      return NextResponse.json(
        { error: "Nome do assistente deve ter no máximo 30 caracteres" },
        { status: 400 }
      );
    }

    if (assistantInstructions && assistantInstructions.length > 500) {
      return NextResponse.json(
        { error: "Instruções devem ter no máximo 500 caracteres" },
        { status: 400 }
      );
    }

    const salvaLeadsConfig = JSON.stringify({
      assistant_name: assistantName || "Luna",
      assistant_instructions: assistantInstructions || "",
    });

    await dbQuery(
      `UPDATE users
       SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{salva_leads}', $1::jsonb),
           updated_at = NOW()
       WHERE id = $2`,
      [salvaLeadsConfig, user.id]
    );

    return NextResponse.json({
      success: true,
      assistantName: assistantName || "Luna",
      assistantInstructions: assistantInstructions || "",
    });
  } catch (error) {
    console.error("[salva-leads/config] PUT error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
