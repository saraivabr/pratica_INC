/**
 * POST /api/propostas/[id]/aprovar - Aprovar proposta (gerente/admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

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
        { success: false, error: "Apenas gerentes e admins podem aprovar propostas" },
        { status: 403 }
      );
    }

    const { id } = await params;

    return await withTenant(ctx.workspaceId, async (client) => {
      const { rows: existing } = await client.query(
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
          { success: false, error: "Apenas propostas enviadas podem ser aprovadas" },
          { status: 400 }
        );
      }

      const { rows: updated } = await client.query(
        `UPDATE propostas SET
          status = 'aprovada',
          aprovado_por = $1,
          aprovado_em = NOW(),
          updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [(ctx.user as any).id, id]
      );

      return NextResponse.json({
        success: true,
        data: updated[0],
        message: "Proposta aprovada com sucesso",
      });
    });
  } catch (error: any) {
    console.error("Erro ao aprovar proposta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
