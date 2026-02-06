/**
 * API: Venda Individual do Sistema de Calculo de Comissoes
 *
 * GET /api/comissao/vendas/[id] - Obter venda por ID
 * PUT /api/comissao/vendas/[id] - Atualizar venda
 * DELETE /api/comissao/vendas/[id] - Excluir venda
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import { comissaoVendaUpdateSchema } from "@/lib/comissao/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET - Obter venda por ID com todos os dados relacionados
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
      // Buscar venda
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

      // Buscar corretores
      const { rows: corretores } = await client.query(
        `SELECT * FROM comissao_corretores
         WHERE venda_id = $1
         ORDER BY prioridade DESC, nome`,
        [vendaId]
      );

      // Buscar parcelas
      const { rows: parcelas } = await client.query(
        `SELECT * FROM comissao_parcelas
         WHERE venda_id = $1
         ORDER BY numero`,
        [vendaId]
      );

      return NextResponse.json({
        success: true,
        data: {
          ...vendaRows[0],
          corretores,
          parcelas,
        },
      });
    });
  } catch (error: any) {
    console.error("Erro ao buscar venda:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Atualizar venda
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    // SECURITY: Operacoes financeiras requerem role admin ou gerente
    const allowedRoles = ["admin", "gerente"];
    if (!allowedRoles.includes((ctx.user as any).role || "")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Acesso negado. Apenas admin e gerentes podem modificar vendas.",
        },
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
    const parseResult = comissaoVendaUpdateSchema.safeParse(body);
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
      // Verificar se venda existe e pertence ao workspace
      const { rows: existingRows } = await client.query(
        `SELECT * FROM comissao_vendas
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      if (existingRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao encontrada" },
          { status: 404 }
        );
      }

      // Verificar se venda pode ser editada
      const venda = existingRows[0];
      if (venda.status === "cancelada") {
        return NextResponse.json(
          { success: false, error: "Venda cancelada nao pode ser editada" },
          { status: 400 }
        );
      }

      const data = parseResult.data;

      // Construir UPDATE dinamico
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.valor_venda !== undefined) {
        updates.push(`valor_venda = $${paramIndex++}`);
        values.push(data.valor_venda);
      }
      if (data.percentual_comissao !== undefined) {
        updates.push(`percentual_comissao = $${paramIndex++}`);
        values.push(data.percentual_comissao);
      }
      if (data.empreendimento !== undefined) {
        updates.push(`empreendimento = $${paramIndex++}`);
        values.push(data.empreendimento);
      }
      if (data.unidade !== undefined) {
        updates.push(`unidade = $${paramIndex++}`);
        values.push(data.unidade);
      }
      if (data.cliente_nome !== undefined) {
        updates.push(`cliente_nome = $${paramIndex++}`);
        values.push(data.cliente_nome);
      }
      if (data.cliente_cpf !== undefined) {
        updates.push(`cliente_cpf = $${paramIndex++}`);
        values.push(data.cliente_cpf);
      }
      if (data.data_venda !== undefined) {
        updates.push(`data_venda = $${paramIndex++}`);
        values.push(data.data_venda);
      }
      if (data.observacoes !== undefined) {
        updates.push(`observacoes = $${paramIndex++}`);
        values.push(data.observacoes);
      }
      if (data.referencia !== undefined) {
        updates.push(`referencia = $${paramIndex++}`);
        values.push(data.referencia);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }
      // Webropay address fields
      const addressFields = [
        'cliente_email', 'cliente_telefone', 'cliente_logradouro',
        'cliente_numero', 'cliente_complemento', 'cliente_bairro',
        'cliente_cidade', 'cliente_uf', 'cliente_cep'
      ] as const;
      for (const field of addressFields) {
        if ((data as any)[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          values.push((data as any)[field]);
        }
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { success: false, error: "Nenhum campo para atualizar" },
          { status: 400 }
        );
      }

      updates.push(`updated_at = NOW()`);
      values.push(vendaId, ctx.workspaceId);

      const { rows: updatedRows } = await client.query(
        `UPDATE comissao_vendas
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex}
         RETURNING *`,
        values
      );

      return NextResponse.json({
        success: true,
        data: updatedRows[0],
        message: "Venda atualizada com sucesso",
      });
    });
  } catch (error: any) {
    console.error("Erro ao atualizar venda:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Excluir venda (soft delete - muda status para cancelada)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    // SECURITY: Operacoes financeiras requerem role admin ou gerente
    const allowedRoles = ["admin", "gerente"];
    if (!allowedRoles.includes((ctx.user as any).role || "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Acesso negado. Apenas admin e gerentes podem excluir vendas.",
        },
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

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar se venda existe
      const { rows: existingRows } = await client.query(
        `SELECT * FROM comissao_vendas
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      if (existingRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao encontrada" },
          { status: 404 }
        );
      }

      // Verificar se ha itens enviados para pagadoria
      const { rows: enviadosRows } = await client.query(
        `SELECT COUNT(*) as total FROM comissao_matriz
         WHERE venda_id = $1 AND enviado_pagadoria = true`,
        [vendaId]
      );

      if (parseInt(enviadosRows[0]?.total || "0") > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Venda possui itens ja enviados para pagadoria e nao pode ser excluida",
          },
          { status: 400 }
        );
      }

      // Soft delete - mudar status para cancelada
      await client.query(
        `UPDATE comissao_vendas
         SET status = 'cancelada', updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      return NextResponse.json({
        success: true,
        message: "Venda cancelada com sucesso",
      });
    });
  } catch (error: any) {
    console.error("Erro ao excluir venda:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
