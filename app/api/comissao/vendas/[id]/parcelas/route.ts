/**
 * API: Parcelas de uma Venda do Sistema de Calculo de Comissoes
 *
 * GET /api/comissao/vendas/[id]/parcelas - Listar parcelas da venda
 * POST /api/comissao/vendas/[id]/parcelas - Adicionar parcela
 * PUT /api/comissao/vendas/[id]/parcelas - Sincronizar parcelas
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import {
  comissaoParcelaCreateSchema,
  comissaoParcelasArraySchema,
} from "@/lib/comissao/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET - Listar parcelas da venda
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar se venda existe e pertence ao workspace
      const { rows: vendaRows } = await client.query(
        `SELECT id FROM comissao_vendas
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      if (vendaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao encontrada" },
          { status: 404 }
        );
      }

      // Buscar parcelas
      const { rows } = await client.query(
        `SELECT * FROM comissao_parcelas
         WHERE venda_id = $1
         ORDER BY numero`,
        [vendaId]
      );

      return NextResponse.json({
        success: true,
        data: rows,
      });
    });
  } catch (error: any) {
    console.error("Erro ao listar parcelas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Adicionar uma parcela a venda
 */
export async function POST(request: NextRequest, { params }: Params) {
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

    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar dados
    const parseResult = comissaoParcelaCreateSchema.safeParse(body);
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

    const data = parseResult.data;

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

      // Inserir parcela
      const { rows } = await client.query(
        `INSERT INTO comissao_parcelas (
          venda_id, numero, descricao, valor_parcela,
          percentual_comissao, data_prevista, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'prevista')
        RETURNING *`,
        [
          vendaId,
          data.numero,
          data.descricao || null,
          data.valor_parcela,
          data.percentual_comissao,
          data.data_prevista,
        ]
      );

      // Limpar matriz calculada
      await client.query(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);

      // Atualizar status da venda
      await client.query(
        `UPDATE comissao_vendas SET status = 'ativa', updated_at = NOW() WHERE id = $1`,
        [vendaId]
      );

      return NextResponse.json(
        {
          success: true,
          data: rows[0],
          message: "Parcela adicionada com sucesso",
        },
        { status: 201 }
      );
    });
  } catch (error: any) {
    console.error("Erro ao adicionar parcela:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Sincronizar todas as parcelas
 * Substitui todas as parcelas da venda pelas fornecidas
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

    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { parcelas } = body;

    // Validar dados
    const parseResult = comissaoParcelasArraySchema.safeParse(parcelas);
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

      // Transacao para substituir todas as parcelas
      await client.query("BEGIN");

      try {
        // Remover parcelas existentes
        await client.query(`DELETE FROM comissao_parcelas WHERE venda_id = $1`, [vendaId]);

        // Inserir novas parcelas
        const novasParcelas = [];
        for (const parcela of parseResult.data) {
          const { rows } = await client.query(
            `INSERT INTO comissao_parcelas (
              venda_id, numero, descricao, valor_parcela,
              percentual_comissao, data_prevista, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'prevista')
            RETURNING *`,
            [
              vendaId,
              parcela.numero,
              parcela.descricao || null,
              parcela.valor_parcela,
              parcela.percentual_comissao,
              parcela.data_prevista,
            ]
          );
          novasParcelas.push(rows[0]);
        }

        // Limpar matriz calculada
        await client.query(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);

        // Atualizar status da venda
        await client.query(
          `UPDATE comissao_vendas SET status = 'ativa', updated_at = NOW() WHERE id = $1`,
          [vendaId]
        );

        await client.query("COMMIT");

        return NextResponse.json({
          success: true,
          data: novasParcelas,
          message: "Parcelas sincronizadas com sucesso",
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  } catch (error: any) {
    console.error("Erro ao sincronizar parcelas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
