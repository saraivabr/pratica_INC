/**
 * API: Corretores de uma Venda do Sistema de Calculo de Comissoes
 *
 * GET /api/comissao/vendas/[id]/corretores - Listar corretores da venda
 * POST /api/comissao/vendas/[id]/corretores - Adicionar corretor
 * PUT /api/comissao/vendas/[id]/corretores - Sincronizar corretores (equalizador)
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import {
  comissaoCorretorCreateSchema,
  comissaoCorretoresArraySchema,
} from "@/lib/comissao/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET - Listar corretores da venda
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

    // Verificar se venda existe e pertence ao workspace
    const { rows: vendaRows } = await dbQuery(
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

    // Buscar corretores
    const { rows } = await dbQuery(
      `SELECT * FROM comissao_corretores
       WHERE venda_id = $1
       ORDER BY prioridade DESC, nome`,
      [vendaId]
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("Erro ao listar corretores:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Adicionar um corretor a venda
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

    // Verificar se venda existe e pode ser editada
    const { rows: vendaRows } = await dbQuery(
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

    const body = await request.json();

    // Validar dados
    const parseResult = comissaoCorretorCreateSchema.safeParse(body);
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

    // Inserir corretor
    const { rows } = await dbQuery(
      `INSERT INTO comissao_corretores (
        venda_id, beneficiario_id, nome, cpf,
        percentual_participacao, valor_comissao, prioridade, observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        vendaId,
        data.beneficiario_id || null,
        data.nome,
        data.cpf || null,
        data.percentual_participacao,
        data.valor_comissao,
        data.prioridade || 0,
        data.observacoes || null,
      ]
    );

    // Limpar matriz calculada (precisa recalcular)
    await dbQuery(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);

    // Atualizar status da venda para 'ativa' (removendo 'calculada')
    await dbQuery(
      `UPDATE comissao_vendas SET status = 'ativa', updated_at = NOW() WHERE id = $1`,
      [vendaId]
    );

    return NextResponse.json(
      {
        success: true,
        data: rows[0],
        message: "Corretor adicionado com sucesso",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao adicionar corretor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Sincronizar todos os corretores (equalizador)
 * Substitui todos os corretores da venda pelos fornecidos
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

    // Verificar se venda existe e pode ser editada
    const { rows: vendaRows } = await dbQuery(
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

    const body = await request.json();
    const { corretores } = body;

    // Validar dados
    const parseResult = comissaoCorretoresArraySchema.safeParse(corretores);
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

    // Transacao para substituir todos os corretores
    await dbQuery("BEGIN");

    try {
      // Remover corretores existentes
      await dbQuery(`DELETE FROM comissao_corretores WHERE venda_id = $1`, [
        vendaId,
      ]);

      // Inserir novos corretores
      const novosCorretores = [];
      for (const corretor of parseResult.data) {
        const { rows } = await dbQuery(
          `INSERT INTO comissao_corretores (
            venda_id, beneficiario_id, nome, cpf,
            percentual_participacao, valor_comissao, prioridade, observacoes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            vendaId,
            corretor.beneficiario_id || null,
            corretor.nome,
            corretor.cpf || null,
            corretor.percentual_participacao,
            corretor.valor_comissao,
            corretor.prioridade || 0,
            corretor.observacoes || null,
          ]
        );
        novosCorretores.push(rows[0]);
      }

      // Limpar matriz calculada
      await dbQuery(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);

      // Atualizar status da venda
      await dbQuery(
        `UPDATE comissao_vendas SET status = 'ativa', updated_at = NOW() WHERE id = $1`,
        [vendaId]
      );

      await dbQuery("COMMIT");

      return NextResponse.json({
        success: true,
        data: novosCorretores,
        message: "Corretores sincronizados com sucesso",
      });
    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao sincronizar corretores:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
