/**
 * API: Vendas do Sistema de Intermediacao Imobiliaria
 *
 * GET /api/intermediacao/vendas - Listar vendas com filtros
 * POST /api/intermediacao/vendas - Criar nova venda
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { z } from "zod";

// Schemas de validacao
const distribuicaoSchema = z.object({
  beneficiario_id: z.string().uuid(),
  percentual: z.number().min(0).max(100),
});

const createVendaSchema = z.object({
  valor_total: z.number().positive(),
  unidade: z.string().min(1),
  empreendimento: z.string().min(1),
  empreendimento_id: z.string().uuid().optional(),
  cliente_nome: z.string().min(1),
  cliente_cpf: z.string().optional(),
  cliente_telefone: z.string().optional(),
  cliente_email: z.string().email().optional(),
  data_venda: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  percentual_intermediacao: z.number().min(0).max(100),
  descricao: z.string().optional(),
  distribuicao: z.array(distribuicaoSchema).optional(),
});

type StatusVenda = 'rascunho' | 'em_processamento' | 'concluida' | 'paga' | 'cancelada';

/**
 * Gera codigo unico para a venda no formato VND-YYYYMM-XXXX
 */
async function gerarCodigoVenda(workspaceId: number): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { rows } = await dbQuery(
    `SELECT codigo FROM im_vendas
     WHERE codigo LIKE $1 AND workspace_id = $2
     ORDER BY codigo DESC
     LIMIT 1`,
    [`VND-${yearMonth}-%`, workspaceId]
  );

  let sequencial = 1;
  if (rows[0]?.codigo) {
    const match = rows[0].codigo.match(/VND-\d{6}-(\d+)/);
    if (match) {
      sequencial = parseInt(match[1]) + 1;
    }
  }

  return `VND-${yearMonth}-${String(sequencial).padStart(4, '0')}`;
}

/**
 * GET - Listar vendas com filtros
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);

    // Parametros de filtro
    const status = searchParams.get("status");
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");
    const empreendimento = searchParams.get("empreendimento");
    const cliente = searchParams.get("cliente");
    const beneficiario = searchParams.get("beneficiario");

    // Paginacao
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    // Construir query dinamica
    const conditions: string[] = [`v.workspace_id = $1`];
    const params: any[] = [ctx.workspaceId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`v.status = $${paramIndex}`);
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
      conditions.push(`(v.empreendimento ILIKE $${paramIndex} OR v.empreendimento_id = $${paramIndex + 1})`);
      params.push(`%${empreendimento}%`, empreendimento);
      paramIndex += 2;
    }

    if (cliente) {
      conditions.push(`(v.cliente_nome ILIKE $${paramIndex} OR v.cliente_cpf ILIKE $${paramIndex})`);
      params.push(`%${cliente}%`);
      paramIndex++;
    }

    if (beneficiario) {
      conditions.push(`EXISTS (
        SELECT 1 FROM im_distribuicao d
        WHERE d.venda_id = v.id AND d.beneficiario_id = $${paramIndex}
      )`);
      params.push(beneficiario);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Query principal com joins
    const query = `
      SELECT
        v.*,
        (
          SELECT json_agg(json_build_object(
            'id', d.id,
            'beneficiario_id', d.beneficiario_id,
            'beneficiario_nome', b.nome,
            'percentual', d.percentual,
            'valor', d.valor
          ))
          FROM im_distribuicao d
          LEFT JOIN im_beneficiarios b ON b.id = d.beneficiario_id
          WHERE d.venda_id = v.id
        ) as distribuicoes,
        u.nome as criado_por_nome
      FROM im_vendas v
      LEFT JOIN users u ON u.id = v.criado_por
      ${whereClause}
      ORDER BY v.data_venda DESC, v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM im_vendas v
      ${whereClause}
    `;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      dbQuery(query, params),
      dbQuery(countQuery, params.slice(0, -2))
    ]);

    const total = parseInt(countRows[0]?.total || "0");

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Erro ao listar vendas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Criar nova venda
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();

    // Validar dados de entrada
    const parseResult = createVendaSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados invalidos",
          details: parseResult.error.errors
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Validar soma dos percentuais da distribuicao
    if (data.distribuicao && data.distribuicao.length > 0) {
      const somaPercentuais = data.distribuicao.reduce(
        (acc, d) => acc + d.percentual,
        0
      );

      // Tolerancia de 0.01 para erros de ponto flutuante
      if (Math.abs(somaPercentuais - data.percentual_intermediacao) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `Soma dos percentuais da distribuicao (${somaPercentuais}%) deve ser igual ao percentual de intermediacao (${data.percentual_intermediacao}%)`
          },
          { status: 400 }
        );
      }
    }

    // Gerar codigo unico
    const codigo = await gerarCodigoVenda(ctx.workspaceId);

    // Calcular valor da comissao total
    const valorComissao = (data.valor_total * data.percentual_intermediacao) / 100;

    // Iniciar transacao
    await dbQuery("BEGIN");

    try {
      // Inserir venda
      const { rows: vendaRows } = await dbQuery(
        `INSERT INTO im_vendas (
          workspace_id, codigo, valor_total, valor_comissao, unidade, empreendimento,
          empreendimento_id, cliente_nome, cliente_cpf, cliente_telefone,
          cliente_email, data_venda, percentual_intermediacao, descricao,
          status, criado_por
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *`,
        [
          ctx.workspaceId,
          codigo,
          data.valor_total,
          valorComissao,
          data.unidade,
          data.empreendimento,
          data.empreendimento_id || null,
          data.cliente_nome,
          data.cliente_cpf || null,
          data.cliente_telefone || null,
          data.cliente_email || null,
          data.data_venda,
          data.percentual_intermediacao,
          data.descricao || null,
          'rascunho' as StatusVenda,
          ctx.user.id,
        ]
      );

      const venda = vendaRows[0];

      // Inserir distribuicoes (se houver)
      if (data.distribuicao && data.distribuicao.length > 0) {
        for (const dist of data.distribuicao) {
          const valorDistribuicao = (valorComissao * dist.percentual) / data.percentual_intermediacao;

          await dbQuery(
            `INSERT INTO im_distribuicao (
              venda_id, beneficiario_id, percentual, valor
            ) VALUES ($1, $2, $3, $4)`,
            [venda.id, dist.beneficiario_id, dist.percentual, valorDistribuicao]
          );
        }
      }

      // Registrar auditoria
      await dbQuery(
        `INSERT INTO im_auditoria (
          entidade, entidade_id, acao, dados_novos, usuario_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          'venda',
          venda.id,
          'criacao',
          JSON.stringify({ ...data, codigo }),
          ctx.user.id,
        ]
      );

      await dbQuery("COMMIT");

      // Buscar venda completa com distribuicoes
      const { rows: vendaCompleta } = await dbQuery(
        `SELECT
          v.*,
          (
            SELECT json_agg(json_build_object(
              'id', d.id,
              'beneficiario_id', d.beneficiario_id,
              'beneficiario_nome', b.nome,
              'percentual', d.percentual,
              'valor', d.valor
            ))
            FROM im_distribuicao d
            LEFT JOIN im_beneficiarios b ON b.id = d.beneficiario_id
            WHERE d.venda_id = v.id
          ) as distribuicoes
        FROM im_vendas v
        WHERE v.id = $1 AND v.workspace_id = $2`,
        [venda.id, ctx.workspaceId]
      );

      return NextResponse.json({
        success: true,
        data: vendaCompleta[0],
        message: `Venda ${codigo} criada com sucesso`,
      }, { status: 201 });

    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao criar venda:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
