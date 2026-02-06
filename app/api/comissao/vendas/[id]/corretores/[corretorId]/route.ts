/**
 * API: Corretor Individual de uma Venda
 *
 * DELETE /api/comissao/vendas/[id]/corretores/[corretorId] - Remover corretor
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

interface Params {
  params: Promise<{ id: string; corretorId: string }>;
}

/**
 * DELETE - Remover corretor da venda
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    // SECURITY
    const allowedRoles = ["admin", "gerente"];
    if (!allowedRoles.includes((ctx.user as any).role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado." },
        { status: 403 }
      );
    }

    const { id, corretorId } = await params;
    const vendaId = parseInt(id);
    const corretorIdNum = parseInt(corretorId);

    if (isNaN(vendaId) || isNaN(corretorIdNum)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar se venda existe e pode ser editada
      const { rows: vendaRows } = await client.query(
        `SELECT * FROM comissao_vendas
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      if (vendaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao encontrada" },
          { status: 404 }
        );
      }

      if (vendaRows[0].status === "cancelada" || vendaRows[0].status === "enviada") {
        return NextResponse.json(
          { success: false, error: "Venda nao pode ser editada" },
          { status: 400 }
        );
      }

      // Verificar se corretor existe
      const { rows: corretorRows } = await client.query(
        `SELECT * FROM comissao_corretores WHERE id = $1 AND venda_id = $2`,
        [corretorIdNum, vendaId]
      );

      if (corretorRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Corretor nao encontrado" },
          { status: 404 }
        );
      }

      // Remover corretor
      await client.query(`DELETE FROM comissao_corretores WHERE id = $1`, [corretorIdNum]);

      // Limpar matriz calculada
      await client.query(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);

      // Atualizar status da venda
      await client.query(
        `UPDATE comissao_vendas SET status = 'ativa', updated_at = NOW() WHERE id = $1`,
        [vendaId]
      );

      return NextResponse.json({
        success: true,
        message: "Corretor removido com sucesso",
      });
    });
  } catch (error: any) {
    console.error("Erro ao remover corretor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
