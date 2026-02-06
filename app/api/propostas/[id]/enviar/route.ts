/**
 * POST /api/propostas/[id]/enviar - Enviar proposta para aprovação
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

      const proposta = existing[0];
      const userId = (ctx.user as any).id;
      const userRole = (ctx.user as any).role || "";

      if (userRole === "corretor" && proposta.corretor_id !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão" },
          { status: 403 }
        );
      }

      if (proposta.status !== "rascunho") {
        return NextResponse.json(
          { success: false, error: "Apenas propostas em rascunho podem ser enviadas" },
          { status: 400 }
        );
      }

      // Verificar se tem pelo menos uma parcela
      const { rows: parcelas } = await client.query(
        `SELECT COUNT(*) as total FROM proposta_parcelas WHERE proposta_id = $1`,
        [id]
      );

      if (parseInt(parcelas[0].total) === 0) {
        return NextResponse.json(
          { success: false, error: "Adicione pelo menos uma parcela antes de enviar" },
          { status: 400 }
        );
      }

      const { rows: updated } = await client.query(
        `UPDATE propostas SET status = 'enviada', enviada_em = NOW(), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );

      return NextResponse.json({
        success: true,
        data: updated[0],
        message: "Proposta enviada para aprovação",
      });
    });
  } catch (error: any) {
    console.error("Erro ao enviar proposta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
