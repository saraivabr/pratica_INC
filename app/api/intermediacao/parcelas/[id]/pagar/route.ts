/**
 * API: Marcar Parcela como Paga
 *
 * POST /api/intermediacao/parcelas/:id/pagar - Registrar pagamento
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const parcelaId = id;
    const body = await request.json();
    const { data_pagamento, metodo, comprovante, referencia } = body;

    // Validacoes
    if (!data_pagamento) {
      return NextResponse.json(
        { success: false, error: "Data de pagamento e obrigatoria" },
        { status: 400 }
      );
    }

    if (!metodo) {
      return NextResponse.json(
        { success: false, error: "Metodo de pagamento e obrigatorio" },
        { status: 400 }
      );
    }

    const metodosValidos = ["transferencia", "deposito", "pix", "cheque", "outro"];
    if (!metodosValidos.includes(metodo.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Metodo invalido. Valores aceitos: ${metodosValidos.join(", ")}` },
        { status: 400 }
      );
    }

    // Buscar parcela (filtered by workspace_id)
    const parcelaResult = await dbQuery(
      `SELECT p.*, v.id as venda_id
       FROM parcelas_intermediacao p
       LEFT JOIN vendas_intermediacao v ON v.id = p.venda_id
       WHERE p.id = $1 AND p.workspace_id = $2`,
      [parcelaId, ctx.workspaceId]
    );

    if (parcelaResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Parcela nao encontrada" },
        { status: 404 }
      );
    }

    const parcela = parcelaResult.rows[0];

    // Verificar se ja esta paga
    if (parcela.status === "paga") {
      return NextResponse.json(
        { success: false, error: "Esta parcela ja foi paga" },
        { status: 400 }
      );
    }

    // Verificar se ja existe pagamento (filtered by workspace_id)
    const pagamentoExistente = await dbQuery(
      `SELECT id FROM pagamentos_intermediacao WHERE parcela_id = $1 AND workspace_id = $2`,
      [parcelaId, ctx.workspaceId]
    );

    if (pagamentoExistente.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Ja existe um pagamento registrado para esta parcela" },
        { status: 400 }
      );
    }

    // Criar registro de pagamento
    const pagamentoResult = await dbQuery(
      `INSERT INTO pagamentos_intermediacao
       (parcela_id, beneficiario_id, valor, data_pagamento, metodo, comprovante, referencia, registrado_por, workspace_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        parcelaId,
        parcela.beneficiario_id,
        parcela.valor,
        data_pagamento,
        metodo.toLowerCase(),
        comprovante || null,
        referencia || null,
        ctx.user.id,
        ctx.workspaceId
      ]
    );

    // Atualizar status da parcela para 'paga' (with workspace_id filter for safety)
    await dbQuery(
      `UPDATE parcelas_intermediacao
       SET status = 'paga', updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2`,
      [parcelaId, ctx.workspaceId]
    );

    // Verificar se todas as parcelas da venda foram pagas (filtered by workspace_id)
    const parcelasPendentesResult = await dbQuery(
      `SELECT COUNT(*) as pendentes
       FROM parcelas_intermediacao
       WHERE venda_id = $1 AND status != 'paga' AND workspace_id = $2`,
      [parcela.venda_id, ctx.workspaceId]
    );

    const parcelasPendentes = parseInt(parcelasPendentesResult.rows[0]?.pendentes || "0");

    // Se todas pagas, atualizar status da venda (with workspace_id filter for safety)
    if (parcelasPendentes === 0) {
      await dbQuery(
        `UPDATE vendas_intermediacao
         SET status = 'paga', updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2`,
        [parcela.venda_id, ctx.workspaceId]
      );
    }

    // Registrar auditoria
    await dbQuery(
      `INSERT INTO log_auditoria_intermediacao
       (entidade, entidade_id, acao, usuario_id, usuario_nome, dados_novos, workspace_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        "parcela",
        parcelaId,
        "pagar",
        ctx.user.id,
        ctx.user.nome,
        JSON.stringify({
          pagamento_id: pagamentoResult.rows[0].id,
          data_pagamento,
          metodo,
          valor: parcela.valor,
          venda_status_atualizado: parcelasPendentes === 0
        }),
        ctx.workspaceId
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        pagamento: pagamentoResult.rows[0],
        parcela_status: "paga",
        venda_status_atualizado: parcelasPendentes === 0
      },
      message: "Pagamento registrado com sucesso"
    });
  } catch (error: any) {
    console.error("Erro ao registrar pagamento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
