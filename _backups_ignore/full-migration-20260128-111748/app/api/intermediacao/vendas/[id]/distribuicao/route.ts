/**
 * API: Gerenciamento de Distribuicao de Comissao
 *
 * GET /api/intermediacao/vendas/:id/distribuicao - Listar distribuicoes
 * POST /api/intermediacao/vendas/:id/distribuicao - Adicionar/substituir distribuicao
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";
import { z } from "zod";

// Schema de validacao
const distribuicaoItemSchema = z.object({
  beneficiario_id: z.string().uuid(),
  percentual: z.number().min(0).max(100),
});

const distribuicaoSchema = z.object({
  distribuicoes: z.array(distribuicaoItemSchema).min(1),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET - Listar distribuicoes da venda
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

    // Verificar se venda existe
    const { rows: vendaRows } = await dbQuery(
      `SELECT id, codigo, valor_comissao, percentual_intermediacao FROM im_vendas WHERE id = $1 AND tenant_id = $2`,
      [id, ctx.tenantId]
    );

    if (vendaRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const venda = vendaRows[0];

    // Buscar distribuicoes
    const { rows: distribuicoes } = await dbQuery(
      `SELECT
        d.id,
        d.beneficiario_id,
        b.nome as beneficiario_nome,
        b.tipo as beneficiario_tipo,
        b.cpf_cnpj as beneficiario_documento,
        b.banco,
        b.agencia,
        b.conta,
        b.pix,
        d.percentual,
        d.valor,
        d.created_at,
        (
          SELECT COALESCE(SUM(p.valor), 0)
          FROM im_parcelas p
          WHERE p.venda_id = d.venda_id AND p.beneficiario_id = d.beneficiario_id
        ) as valor_parcelado,
        (
          SELECT COALESCE(SUM(pg.valor), 0)
          FROM im_pagamentos pg
          JOIN im_parcelas p ON p.id = pg.parcela_id
          WHERE p.venda_id = d.venda_id AND p.beneficiario_id = d.beneficiario_id
        ) as valor_pago
      FROM im_distribuicao d
      LEFT JOIN im_beneficiarios b ON b.id = d.beneficiario_id
      WHERE d.venda_id = $1
      ORDER BY d.created_at`,
      [id]
    );

    // Calcular totais
    const somaPercentuais = distribuicoes.reduce((acc, d) => acc + parseFloat(d.percentual), 0);
    const somaValores = distribuicoes.reduce((acc, d) => acc + parseFloat(d.valor), 0);
    const percentualRestante = venda.percentual_intermediacao - somaPercentuais;

    return NextResponse.json({
      success: true,
      data: {
        venda: {
          id: venda.id,
          codigo: venda.codigo,
          valor_comissao: parseFloat(venda.valor_comissao),
          percentual_intermediacao: parseFloat(venda.percentual_intermediacao),
        },
        distribuicoes,
        resumo: {
          soma_percentuais: somaPercentuais,
          soma_valores: somaValores,
          percentual_restante: percentualRestante,
          valor_restante: (parseFloat(venda.valor_comissao) * percentualRestante) / venda.percentual_intermediacao,
          completa: Math.abs(percentualRestante) < 0.01,
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao listar distribuicoes:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Adicionar/substituir distribuicao
 */
export async function POST(
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

    // Buscar venda
    const { rows: vendaRows } = await dbQuery(
      `SELECT * FROM im_vendas WHERE id = $1 AND tenant_id = $2`,
      [id, ctx.tenantId]
    );

    if (vendaRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const venda = vendaRows[0];

    // Verificar se pode editar distribuicao
    if (!['rascunho', 'em_processamento'].includes(venda.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Distribuicao nao pode ser alterada. Status da venda: '${venda.status}'`
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar dados de entrada
    const parseResult = distribuicaoSchema.safeParse(body);
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

    const { distribuicoes } = parseResult.data;

    // Validar soma dos percentuais
    const somaPercentuais = distribuicoes.reduce((acc, d) => acc + d.percentual, 0);

    if (Math.abs(somaPercentuais - venda.percentual_intermediacao) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: `Soma dos percentuais (${somaPercentuais}%) deve ser igual ao percentual de intermediacao (${venda.percentual_intermediacao}%)`
        },
        { status: 400 }
      );
    }

    // Validar se beneficiarios existem
    const beneficiarioIds = distribuicoes.map(d => d.beneficiario_id);
    const { rows: beneficiarios } = await dbQuery(
      `SELECT id FROM im_beneficiarios WHERE id = ANY($1)`,
      [beneficiarioIds]
    );

    if (beneficiarios.length !== beneficiarioIds.length) {
      const encontrados = new Set(beneficiarios.map(b => b.id));
      const naoEncontrados = beneficiarioIds.filter(id => !encontrados.has(id));
      return NextResponse.json(
        {
          success: false,
          error: "Beneficiarios nao encontrados",
          beneficiarios_invalidos: naoEncontrados,
        },
        { status: 400 }
      );
    }

    // Verificar duplicatas
    const uniqueIds = new Set(beneficiarioIds);
    if (uniqueIds.size !== beneficiarioIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Nao e permitido adicionar o mesmo beneficiario mais de uma vez",
        },
        { status: 400 }
      );
    }

    // Iniciar transacao
    await dbQuery("BEGIN");

    try {
      // Buscar distribuicao anterior para auditoria
      const { rows: distAnterior } = await dbQuery(
        `SELECT d.*, b.nome as beneficiario_nome
         FROM im_distribuicao d
         LEFT JOIN im_beneficiarios b ON b.id = d.beneficiario_id
         WHERE d.venda_id = $1`,
        [id]
      );

      // Remover distribuicoes antigas
      await dbQuery(
        `DELETE FROM im_distribuicao WHERE venda_id = $1`,
        [id]
      );

      // Inserir novas distribuicoes
      const novasDistribuicoes: any[] = [];
      for (const dist of distribuicoes) {
        const valorDistribuicao = (parseFloat(venda.valor_comissao) * dist.percentual) / venda.percentual_intermediacao;

        const { rows } = await dbQuery(
          `INSERT INTO im_distribuicao (
            venda_id, beneficiario_id, percentual, valor
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [id, dist.beneficiario_id, dist.percentual, valorDistribuicao]
        );

        novasDistribuicoes.push(rows[0]);
      }

      // Registrar auditoria
      await dbQuery(
        `INSERT INTO im_auditoria (
          entidade, entidade_id, acao, dados_anteriores, dados_novos, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'venda',
          id,
          'atualizacao_distribuicao',
          JSON.stringify({
            distribuicoes: distAnterior.map(d => ({
              beneficiario_id: d.beneficiario_id,
              beneficiario_nome: d.beneficiario_nome,
              percentual: d.percentual,
              valor: d.valor,
            })),
          }),
          JSON.stringify({
            distribuicoes: distribuicoes.map((d, i) => ({
              ...d,
              valor: novasDistribuicoes[i]?.valor,
            })),
          }),
          ctx.user.id,
        ]
      );

      await dbQuery("COMMIT");

      // Buscar distribuicoes atualizadas com dados completos
      const { rows: distAtualizadas } = await dbQuery(
        `SELECT
          d.id,
          d.beneficiario_id,
          b.nome as beneficiario_nome,
          b.tipo as beneficiario_tipo,
          d.percentual,
          d.valor,
          d.created_at
        FROM im_distribuicao d
        LEFT JOIN im_beneficiarios b ON b.id = d.beneficiario_id
        WHERE d.venda_id = $1
        ORDER BY d.created_at`,
        [id]
      );

      return NextResponse.json({
        success: true,
        data: distAtualizadas,
        message: "Distribuicao atualizada com sucesso",
      });

    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao atualizar distribuicao:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
