/**
 * API: Detalhe, Atualizacao e Exclusao de Venda
 *
 * GET /api/intermediacao/vendas/:id - Detalhe da venda
 * PUT /api/intermediacao/vendas/:id - Atualizar venda
 * DELETE /api/intermediacao/vendas/:id - Excluir venda
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";
import { z } from "zod";

// Schema de validacao para atualizacao
const distribuicaoSchema = z.object({
  beneficiario_id: z.string().uuid(),
  percentual: z.number().min(0).max(100),
});

const updateVendaSchema = z.object({
  valor_total: z.number().positive().optional(),
  unidade: z.string().min(1).optional(),
  empreendimento: z.string().min(1).optional(),
  empreendimento_id: z.string().uuid().optional().nullable(),
  cliente_nome: z.string().min(1).optional(),
  cliente_cpf: z.string().optional().nullable(),
  cliente_telefone: z.string().optional().nullable(),
  cliente_email: z.string().email().optional().nullable(),
  data_venda: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  percentual_intermediacao: z.number().min(0).max(100).optional(),
  descricao: z.string().optional().nullable(),
  distribuicao: z.array(distribuicaoSchema).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET - Detalhe da venda com todas as relacoes
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Buscar venda com todas as relacoes
    const { rows } = await dbQuery(
      `SELECT
        v.*,
        u.nome as criado_por_nome,
        (
          SELECT json_agg(json_build_object(
            'id', d.id,
            'beneficiario_id', d.beneficiario_id,
            'beneficiario_nome', b.nome,
            'beneficiario_tipo', b.tipo,
            'percentual', d.percentual,
            'valor', d.valor
          ) ORDER BY d.created_at)
          FROM im_distribuicao d
          LEFT JOIN im_beneficiarios b ON b.id = d.beneficiario_id
          WHERE d.venda_id = v.id
        ) as distribuicoes,
        (
          SELECT json_agg(json_build_object(
            'id', p.id,
            'numero', p.numero,
            'valor', p.valor,
            'data_vencimento', p.data_vencimento,
            'data_pagamento', p.data_pagamento,
            'status', p.status,
            'beneficiario_id', p.beneficiario_id,
            'beneficiario_nome', b.nome
          ) ORDER BY p.numero)
          FROM im_parcelas p
          LEFT JOIN im_beneficiarios b ON b.id = p.beneficiario_id
          WHERE p.venda_id = v.id
        ) as parcelas,
        (
          SELECT json_agg(json_build_object(
            'id', pg.id,
            'parcela_id', pg.parcela_id,
            'valor', pg.valor,
            'data_pagamento', pg.data_pagamento,
            'forma_pagamento', pg.forma_pagamento,
            'comprovante', pg.comprovante
          ) ORDER BY pg.data_pagamento)
          FROM im_pagamentos pg
          JOIN im_parcelas p ON p.id = pg.parcela_id
          WHERE p.venda_id = v.id
        ) as pagamentos,
        (
          SELECT json_agg(json_build_object(
            'id', a.id,
            'acao', a.acao,
            'dados_anteriores', a.dados_anteriores,
            'dados_novos', a.dados_novos,
            'usuario_nome', au.nome,
            'created_at', a.created_at
          ) ORDER BY a.created_at DESC)
          FROM im_auditoria a
          LEFT JOIN users au ON au.id = a.usuario_id
          WHERE a.entidade = 'venda' AND a.entidade_id = v.id
        ) as auditoria
      FROM im_vendas v
      LEFT JOIN users u ON u.id = v.criado_por
      WHERE v.id = $1 AND v.tenant_id = $2`,
      [id, ctx.tenantId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
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
 * So permitir se status = 'rascunho' ou 'em_processamento'
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Buscar venda atual
    const { rows: vendaAtual } = await dbQuery(
      `SELECT * FROM im_vendas WHERE id = $1 AND tenant_id = $2`,
      [id, ctx.tenantId]
    );

    if (vendaAtual.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const venda = vendaAtual[0];

    // Verificar se pode editar
    if (!['rascunho', 'em_processamento'].includes(venda.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Venda com status '${venda.status}' nao pode ser editada`
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar dados de entrada
    const parseResult = updateVendaSchema.safeParse(body);
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

    // Calcular novos valores
    const valorTotal = data.valor_total ?? venda.valor_total;
    const percentualIntermediacao = data.percentual_intermediacao ?? venda.percentual_intermediacao;
    const valorComissao = (valorTotal * percentualIntermediacao) / 100;

    // Validar soma dos percentuais da distribuicao
    if (data.distribuicao && data.distribuicao.length > 0) {
      const somaPercentuais = data.distribuicao.reduce(
        (acc, d) => acc + d.percentual,
        0
      );

      if (Math.abs(somaPercentuais - percentualIntermediacao) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `Soma dos percentuais da distribuicao (${somaPercentuais}%) deve ser igual ao percentual de intermediacao (${percentualIntermediacao}%)`
          },
          { status: 400 }
        );
      }
    }

    // Iniciar transacao
    await dbQuery("BEGIN");

    try {
      // Construir query de update dinamica
      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let paramIndex = 1;

      const fieldsToUpdate: Record<string, any> = {
        valor_total: data.valor_total,
        valor_comissao: data.valor_total || data.percentual_intermediacao ? valorComissao : undefined,
        unidade: data.unidade,
        empreendimento: data.empreendimento,
        empreendimento_id: data.empreendimento_id,
        cliente_nome: data.cliente_nome,
        cliente_cpf: data.cliente_cpf,
        cliente_telefone: data.cliente_telefone,
        cliente_email: data.cliente_email,
        data_venda: data.data_venda,
        percentual_intermediacao: data.percentual_intermediacao,
        descricao: data.descricao,
      };

      // Registrar campos alterados para auditoria
      const camposAlterados: Record<string, { antes: any; depois: any }> = {};

      for (const [field, value] of Object.entries(fieldsToUpdate)) {
        if (value !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateParams.push(value);
          paramIndex++;

          // Registrar mudanca para auditoria
          const fieldKey = field as keyof typeof venda;
          if (venda[fieldKey] !== value) {
            camposAlterados[field] = {
              antes: venda[fieldKey],
              depois: value,
            };
          }
        }
      }

      // Adicionar updated_at
      updateFields.push(`updated_at = NOW()`);

      // Executar update
      updateParams.push(id);
      const updateQuery = `
        UPDATE im_vendas
        SET ${updateFields.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const { rows: updatedRows } = await dbQuery(updateQuery, updateParams);

      // Atualizar distribuicoes (se enviadas)
      if (data.distribuicao) {
        // Remover distribuicoes antigas
        await dbQuery(
          `DELETE FROM im_distribuicao WHERE venda_id = $1`,
          [id]
        );

        // Inserir novas distribuicoes
        for (const dist of data.distribuicao) {
          const valorDistribuicao = (valorComissao * dist.percentual) / percentualIntermediacao;

          await dbQuery(
            `INSERT INTO im_distribuicao (
              venda_id, beneficiario_id, percentual, valor
            ) VALUES ($1, $2, $3, $4)`,
            [id, dist.beneficiario_id, dist.percentual, valorDistribuicao]
          );
        }

        camposAlterados['distribuicao'] = {
          antes: 'distribuicao anterior',
          depois: data.distribuicao,
        };
      }

      // Registrar auditoria
      if (Object.keys(camposAlterados).length > 0) {
        await dbQuery(
          `INSERT INTO im_auditoria (
            entidade, entidade_id, acao, dados_anteriores, dados_novos, usuario_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'venda',
            id,
            'atualizacao',
            JSON.stringify({ campos_alterados: Object.keys(camposAlterados), valores_anteriores: Object.fromEntries(Object.entries(camposAlterados).map(([k, v]) => [k, v.antes])) }),
            JSON.stringify({ campos_alterados: Object.keys(camposAlterados), valores_novos: Object.fromEntries(Object.entries(camposAlterados).map(([k, v]) => [k, v.depois])) }),
            ctx.user.id,
          ]
        );
      }

      await dbQuery("COMMIT");

      // Buscar venda atualizada com relacoes
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
        WHERE v.id = $1 AND v.tenant_id = $2`,
        [id, ctx.tenantId]
      );

      return NextResponse.json({
        success: true,
        data: vendaCompleta[0],
        message: "Venda atualizada com sucesso",
      });

    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao atualizar venda:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Excluir venda
 * So permitir se status = 'rascunho'
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Buscar venda atual
    const { rows: vendaAtual } = await dbQuery(
      `SELECT * FROM im_vendas WHERE id = $1 AND tenant_id = $2`,
      [id, ctx.tenantId]
    );

    if (vendaAtual.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const venda = vendaAtual[0];

    // Verificar se pode excluir
    if (venda.status !== 'rascunho') {
      return NextResponse.json(
        {
          success: false,
          error: `Apenas vendas com status 'rascunho' podem ser excluidas. Status atual: '${venda.status}'`
        },
        { status: 400 }
      );
    }

    // Iniciar transacao
    await dbQuery("BEGIN");

    try {
      // Registrar auditoria antes de excluir
      await dbQuery(
        `INSERT INTO im_auditoria (
          entidade, entidade_id, acao, dados_anteriores, usuario_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          'venda',
          id,
          'exclusao',
          JSON.stringify(venda),
          ctx.user.id,
        ]
      );

      // Excluir distribuicoes relacionadas
      await dbQuery(
        `DELETE FROM im_distribuicao WHERE venda_id = $1`,
        [id]
      );

      // Excluir venda
      await dbQuery(
        `DELETE FROM im_vendas WHERE id = $1 AND tenant_id = $2`,
        [id, ctx.tenantId]
      );

      await dbQuery("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Venda ${venda.codigo} excluida com sucesso`,
      });

    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao excluir venda:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
