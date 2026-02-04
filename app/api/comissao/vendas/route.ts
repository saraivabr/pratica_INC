/**
 * API: Vendas do Sistema de Calculo de Comissoes
 *
 * GET /api/comissao/vendas - Listar vendas com filtros
 * POST /api/comissao/vendas - Criar nova venda (completa com corretores e parcelas)
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import {
  comissaoVendaCreateSchema,
  comissaoVendaCompletaCreateSchema,
} from "@/lib/comissao/schemas";

/**
 * Gera codigo unico para a venda no formato COM-YYYYMM-XXXX
 */
async function gerarCodigoVenda(workspaceId: number): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { rows } = await dbQuery(
    `SELECT codigo FROM comissao_vendas
     WHERE codigo LIKE $1 AND workspace_id = $2
     ORDER BY codigo DESC
     LIMIT 1`,
    [`COM-${yearMonth}-%`, workspaceId]
  );

  let sequencial = 1;
  if (rows[0]?.codigo) {
    const match = rows[0].codigo.match(/COM-\d{6}-(\d+)/);
    if (match) {
      sequencial = parseInt(match[1]) + 1;
    }
  }

  return `COM-${yearMonth}-${String(sequencial).padStart(4, "0")}`;
}

/**
 * GET - Listar vendas com filtros
 */
export async function GET(request: NextRequest) {
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
            "Acesso negado. Apenas admin e gerentes podem acessar operacoes financeiras.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parametros de filtro
    const status = searchParams.getAll("status");
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");
    const empreendimento = searchParams.get("empreendimento");

    // Paginacao
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20"))
    );
    const offset = (page - 1) * pageSize;

    // Construir query dinamica
    const conditions: string[] = [`v.workspace_id = $1`];
    const params: any[] = [ctx.workspaceId];
    let paramIndex = 2;

    if (status.length > 0) {
      conditions.push(`v.status = ANY($${paramIndex})`);
      params.push(status);
      paramIndex++;
    }

    if (dataInicio) {
      conditions.push(`v.data_venda >= $${paramIndex}`);
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      conditions.push(`v.data_venda <= $${paramIndex}`);
      params.push(dataFim);
      paramIndex++;
    }

    if (empreendimento) {
      conditions.push(`v.empreendimento ILIKE $${paramIndex}`);
      params.push(`%${empreendimento}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Query principal
    const query = `
      SELECT
        v.*,
        (SELECT COUNT(*) FROM comissao_corretores c WHERE c.venda_id = v.id) as total_corretores,
        (SELECT COUNT(*) FROM comissao_parcelas p WHERE p.venda_id = v.id) as total_parcelas
      FROM comissao_vendas v
      ${whereClause}
      ORDER BY v.data_venda DESC, v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(pageSize, offset);

    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM comissao_vendas v
      ${whereClause}
    `;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      dbQuery(query, params),
      dbQuery(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countRows[0]?.total || "0");

    return NextResponse.json({
      success: true,
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error("Erro ao listar vendas comissao:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Criar nova venda
 * Aceita:
 * - Venda simples (apenas dados da venda)
 * - Venda completa (venda + corretores + parcelas)
 */
export async function POST(request: NextRequest) {
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
            "Acesso negado. Apenas admin e gerentes podem acessar operacoes financeiras.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Verificar se eh venda completa ou simples
    const isVendaCompleta = body.venda && body.corretores && body.parcelas;

    if (isVendaCompleta) {
      // Validar venda completa
      const parseResult = comissaoVendaCompletaCreateSchema.safeParse(body);
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

      const { venda, corretores, parcelas } = parseResult.data;

      // Gerar codigo
      const codigo = await gerarCodigoVenda(ctx.workspaceId);

      // Iniciar transacao
      await dbQuery("BEGIN");

      try {
        // 1. Inserir venda
        const { rows: vendaRows } = await dbQuery(
          `INSERT INTO comissao_vendas (
            workspace_id, codigo, referencia, valor_venda, percentual_comissao,
            empreendimento, unidade, cliente_nome, cliente_cpf,
            data_venda, status, observacoes, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ativa', $11, $12
          ) RETURNING *`,
          [
            ctx.workspaceId,
            codigo,
            venda.referencia || null,
            venda.valor_venda,
            venda.percentual_comissao,
            venda.empreendimento || null,
            venda.unidade || null,
            venda.cliente_nome || null,
            venda.cliente_cpf || null,
            venda.data_venda,
            venda.observacoes || null,
            ctx.user.id,
          ]
        );

        const vendaCriada = vendaRows[0];

        // 2. Inserir corretores
        for (const corretor of corretores) {
          await dbQuery(
            `INSERT INTO comissao_corretores (
              venda_id, beneficiario_id, nome, cpf,
              percentual_participacao, valor_comissao, prioridade, observacoes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              vendaCriada.id,
              corretor.beneficiario_id || null,
              corretor.nome,
              corretor.cpf || null,
              corretor.percentual_participacao,
              corretor.valor_comissao,
              corretor.prioridade || 0,
              corretor.observacoes || null,
            ]
          );
        }

        // 3. Inserir parcelas
        for (const parcela of parcelas) {
          await dbQuery(
            `INSERT INTO comissao_parcelas (
              venda_id, numero, descricao, valor_parcela,
              percentual_comissao, data_prevista, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'prevista')`,
            [
              vendaCriada.id,
              parcela.numero,
              parcela.descricao || null,
              parcela.valor_parcela,
              parcela.percentual_comissao,
              parcela.data_prevista,
            ]
          );
        }

        await dbQuery("COMMIT");

        // Buscar venda completa
        const { rows: vendaCompleta } = await dbQuery(
          `SELECT * FROM comissao_vendas WHERE id = $1`,
          [vendaCriada.id]
        );

        return NextResponse.json(
          {
            success: true,
            data: vendaCompleta[0],
            message: `Venda ${codigo} criada com sucesso`,
          },
          { status: 201 }
        );
      } catch (error) {
        await dbQuery("ROLLBACK");
        throw error;
      }
    } else {
      // Venda simples
      const parseResult = comissaoVendaCreateSchema.safeParse(body);
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
      const codigo = await gerarCodigoVenda(ctx.workspaceId);

      const { rows: vendaRows } = await dbQuery(
        `INSERT INTO comissao_vendas (
          workspace_id, codigo, referencia, valor_venda, percentual_comissao,
          empreendimento, unidade, cliente_nome, cliente_cpf,
          data_venda, status, observacoes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ativa', $11, $12
        ) RETURNING *`,
        [
          ctx.workspaceId,
          codigo,
          data.referencia || null,
          data.valor_venda,
          data.percentual_comissao,
          data.empreendimento || null,
          data.unidade || null,
          data.cliente_nome || null,
          data.cliente_cpf || null,
          data.data_venda,
          data.observacoes || null,
          ctx.user.id,
        ]
      );

      return NextResponse.json(
        {
          success: true,
          data: vendaRows[0],
          message: `Venda ${codigo} criada com sucesso`,
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error("Erro ao criar venda comissao:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
