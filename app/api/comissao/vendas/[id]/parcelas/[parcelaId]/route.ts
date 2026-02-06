/**
 * API: Parcela Individual de uma Venda
 *
 * PUT /api/comissao/vendas/[id]/parcelas/[parcelaId] - Atualizar parcela
 * DELETE /api/comissao/vendas/[id]/parcelas/[parcelaId] - Remover parcela
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import { comissaoParcelaUpdateSchema } from "@/lib/comissao/schemas";

interface Params {
  params: Promise<{ id: string; parcelaId: string }>;
}

/**
 * PUT - Atualizar parcela
 */
export async function PUT(request: NextRequest, { params }: Params) {
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

    const { id, parcelaId } = await params;
    const vendaId = parseInt(id);
    const parcelaIdNum = parseInt(parcelaId);

    if (isNaN(vendaId) || isNaN(parcelaIdNum)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar dados
    const parseResult = comissaoParcelaUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados invalidos",
          details: parseResult.error.errors,
        },
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

      // Verificar se parcela existe
      const { rows: parcelaRows } = await client.query(
        `SELECT * FROM comissao_parcelas WHERE id = $1 AND venda_id = $2`,
        [parcelaIdNum, vendaId]
      );

      if (parcelaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Parcela nao encontrada" },
          { status: 404 }
        );
      }

      const data = parseResult.data;

      // Construir UPDATE dinamico
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.descricao !== undefined) {
        updates.push(`descricao = $${paramIndex++}`);
        values.push(data.descricao);
      }
      if (data.valor_parcela !== undefined) {
        updates.push(`valor_parcela = $${paramIndex++}`);
        values.push(data.valor_parcela);
      }
      if (data.percentual_comissao !== undefined) {
        updates.push(`percentual_comissao = $${paramIndex++}`);
        values.push(data.percentual_comissao);
      }
      if (data.data_prevista !== undefined) {
        updates.push(`data_prevista = $${paramIndex++}`);
        values.push(data.data_prevista);
      }
      if (data.data_recebimento !== undefined) {
        updates.push(`data_recebimento = $${paramIndex++}`);
        values.push(data.data_recebimento);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { success: false, error: "Nenhum campo para atualizar" },
          { status: 400 }
        );
      }

      values.push(parcelaIdNum);

      const { rows } = await client.query(
        `UPDATE comissao_parcelas
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      // Se mudou valor/percentual, limpar matriz
      if (data.valor_parcela !== undefined || data.percentual_comissao !== undefined) {
        await client.query(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);
        await client.query(
          `UPDATE comissao_vendas SET status = 'ativa', updated_at = NOW() WHERE id = $1`,
          [vendaId]
        );
      }

      return NextResponse.json({
        success: true,
        data: rows[0],
        message: "Parcela atualizada com sucesso",
      });
    });
  } catch (error: any) {
    console.error("Erro ao atualizar parcela:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remover parcela da venda
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

    const { id, parcelaId } = await params;
    const vendaId = parseInt(id);
    const parcelaIdNum = parseInt(parcelaId);

    if (isNaN(vendaId) || isNaN(parcelaIdNum)) {
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

      // Verificar se parcela existe
      const { rows: parcelaRows } = await client.query(
        `SELECT * FROM comissao_parcelas WHERE id = $1 AND venda_id = $2`,
        [parcelaIdNum, vendaId]
      );

      if (parcelaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Parcela nao encontrada" },
          { status: 404 }
        );
      }

      // Remover parcela
      await client.query(`DELETE FROM comissao_parcelas WHERE id = $1`, [parcelaIdNum]);

      // Limpar matriz calculada
      await client.query(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);

      // Atualizar status da venda
      await client.query(
        `UPDATE comissao_vendas SET status = 'ativa', updated_at = NOW() WHERE id = $1`,
        [vendaId]
      );

      return NextResponse.json({
        success: true,
        message: "Parcela removida com sucesso",
      });
    });
  } catch (error: any) {
    console.error("Erro ao remover parcela:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
