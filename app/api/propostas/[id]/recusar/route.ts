/**
 * POST /api/propostas/[id]/recusar - Recusar proposta com motivo (gerente/admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const userRole = (ctx.user as any).role || "";
    if (!["admin", "gerente"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Apenas gerentes e admins podem recusar propostas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { motivo_recusa } = body;

    if (!motivo_recusa || motivo_recusa.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Motivo da recusa é obrigatório" },
        { status: 400 }
      );
    }

    const { rows: existing } = await dbQuery(
      `SELECT * FROM propostas WHERE id = $1 AND workspace_id = $2`,
      [id, ctx.workspaceId]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Proposta não encontrada" },
        { status: 404 }
      );
    }

    if (existing[0].status !== "enviada") {
      return NextResponse.json(
        { success: false, error: "Apenas propostas enviadas podem ser recusadas" },
        { status: 400 }
      );
    }

    const { rows: updated } = await dbQuery(
      `UPDATE propostas SET
        status = 'recusada',
        motivo_recusa = $1,
        aprovado_por = $2,
        aprovado_em = NOW(),
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [motivo_recusa.trim(), (ctx.user as any).id, id]
    );

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: "Proposta recusada",
    });
  } catch (error: any) {
    console.error("Erro ao recusar proposta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
