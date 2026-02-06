/**
 * API: Propostas
 *
 * GET /api/propostas - Listar propostas (corretor vê as dele, admin/gerente vê todas)
 * POST /api/propostas - Criar proposta completa (com parcelas)
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

async function gerarCodigoProposta(workspaceId: number): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { rows } = await dbQuery(
    `SELECT codigo FROM propostas
     WHERE codigo LIKE $1 AND workspace_id = $2
     ORDER BY codigo DESC
     LIMIT 1`,
    [`PROP-${yearMonth}-%`, workspaceId]
  );

  let sequencial = 1;
  if (rows[0]?.codigo) {
    const match = rows[0].codigo.match(/PROP-\d{6}-(\d+)/);
    if (match) {
      sequencial = parseInt(match[1]) + 1;
    }
  }

  return `PROP-${yearMonth}-${String(sequencial).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.getAll("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [`p.workspace_id = $1`];
    const params: any[] = [ctx.workspaceId];
    let paramIndex = 2;

    // Corretor só vê as próprias propostas
    const userRole = (ctx.user as any).role || "";
    if (userRole === "corretor") {
      conditions.push(`p.corretor_id = $${paramIndex}`);
      params.push((ctx.user as any).id);
      paramIndex++;
    }

    if (status.length > 0) {
      conditions.push(`p.status = ANY($${paramIndex})`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const query = `
      SELECT
        p.*,
        u.nome as corretor_nome,
        (SELECT COUNT(*) FROM proposta_parcelas pp WHERE pp.proposta_id = p.id) as total_parcelas,
        (SELECT COUNT(*) FROM proposta_documentos pd WHERE pd.proposta_id = p.id) as total_documentos
      FROM propostas p
      LEFT JOIN users u ON u.id = p.corretor_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(pageSize, offset);

    const countQuery = `SELECT COUNT(*) as total FROM propostas p ${whereClause}`;
    const countParams = params.slice(0, paramIndex - 1);

    const [{ rows }, { rows: countRows }] = await Promise.all([
      dbQuery(query, params),
      dbQuery(countQuery, countParams),
    ]);

    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => ({
        ...r,
        valor_total: r.valor_total ? parseFloat(r.valor_total) : 0,
        valor_ato: r.valor_ato ? parseFloat(r.valor_ato) : 0,
        valor_tabela: r.valor_tabela ? parseFloat(r.valor_tabela) : null,
      })),
      pagination: {
        page,
        pageSize,
        total: parseInt(countRows[0].total),
        totalPages: Math.ceil(parseInt(countRows[0].total) / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Erro ao listar propostas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();

    const {
      empreendimento_id,
      empreendimento_nome,
      unidade_id,
      unidade_codigo,
      unidade_bloco,
      unidade_andar,
      valor_tabela,
      cliente_nome,
      cliente_cpf,
      cliente_telefone,
      cliente_email,
      valor_total,
      valor_ato,
      observacoes,
      parcelas,
    } = body;

    if (!empreendimento_id || !empreendimento_nome || !unidade_id || !cliente_nome || !valor_total) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: empreendimento, unidade, cliente, valor_total" },
        { status: 400 }
      );
    }

    const codigo = await gerarCodigoProposta(ctx.workspaceId);

    await dbQuery("BEGIN");

    try {
      const { rows } = await dbQuery(
        `INSERT INTO propostas (
          codigo, workspace_id, corretor_id,
          empreendimento_id, empreendimento_nome,
          unidade_id, unidade_codigo, unidade_bloco, unidade_andar, valor_tabela,
          cliente_nome, cliente_cpf, cliente_telefone, cliente_email,
          valor_total, valor_ato, observacoes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *`,
        [
          codigo, ctx.workspaceId, (ctx.user as any).id,
          empreendimento_id, empreendimento_nome,
          unidade_id, unidade_codigo || null, unidade_bloco || null, unidade_andar || null,
          valor_tabela || null,
          cliente_nome, cliente_cpf || null, cliente_telefone || null, cliente_email || null,
          valor_total, valor_ato || 0, observacoes || null,
        ]
      );

      const proposta = rows[0];

      if (parcelas && Array.isArray(parcelas) && parcelas.length > 0) {
        for (let i = 0; i < parcelas.length; i++) {
          const p = parcelas[i];
          await dbQuery(
            `INSERT INTO proposta_parcelas (
              proposta_id, tipo, descricao, valor, data_vencimento,
              quantidade, valor_parcela, ordem
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              proposta.id, p.tipo, p.descricao || null, p.valor,
              p.data_vencimento || null, p.quantidade || 1,
              p.valor_parcela || null, p.ordem ?? i,
            ]
          );
        }
      }

      await dbQuery("COMMIT");

      return NextResponse.json(
        { success: true, data: proposta, message: "Proposta criada com sucesso" },
        { status: 201 }
      );
    } catch (err) {
      await dbQuery("ROLLBACK");
      throw err;
    }
  } catch (error: any) {
    console.error("Erro ao criar proposta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
