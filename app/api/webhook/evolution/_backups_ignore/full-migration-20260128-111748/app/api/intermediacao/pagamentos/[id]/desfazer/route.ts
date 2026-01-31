/**
 * API: Desfazer Pagamento
 *
 * POST /api/intermediacao/pagamentos/:id/desfazer - Desfazer pagamento (apenas admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    // Apenas admin pode desfazer pagamentos
    if (ctx.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem desfazer pagamentos" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const pagamentoId = id;
    const body = await request.json();
    const { justificativa } = body;

    // Validacao
    if (!justificativa || justificativa.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Justificativa e obrigatoria (minimo 10 caracteres)" },
        { status: 400 }
      );
    }

    // Buscar pagamento - filter by tenant_id
    const pagamentoResult = await dbQuery(
      `SELECT pg.*, p.venda_id, p.status as parcela_status
       FROM pagamentos_intermediacao pg
       LEFT JOIN parcelas_intermediacao p ON p.id = pg.parcela_id
       WHERE pg.id = $1 AND pg.tenant_id = $2`,
      [pagamentoId, ctx.tenantId]
    );

    if (pagamentoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pagamento nao encontrado" },
        { status: 404 }
      );
    }

    const pagamento = pagamentoResult.rows[0];

    // Salvar dados do pagamento para auditoria
    const dadosPagamento = {
      id: pagamento.id,
      parcela_id: pagamento.parcela_id,
      beneficiario_id: pagamento.beneficiario_id,
      valor: pagamento.valor,
      data_pagamento: pagamento.data_pagamento,
      metodo: pagamento.metodo,
      comprovante: pagamento.comprovante,
      referencia: pagamento.referencia,
      registrado_por: pagamento.registrado_por,
      created_at: pagamento.created_at
    };

    // Verificar se venda ficara com status diferente de 'paga'
    // Buscar outras parcelas da mesma venda que ainda estao pagas
    const outrasParcelasPagasResult = await dbQuery(
      `SELECT COUNT(*) as count
       FROM parcelas_intermediacao p
       WHERE p.venda_id = $1 AND p.id != $2 AND p.status = 'paga' AND p.tenant_id = $3`,
      [pagamento.venda_id, pagamento.parcela_id, ctx.tenantId]
    );

    const outrasParcelasPagas = parseInt(outrasParcelasPagasResult.rows[0]?.count || "0");

    // Excluir pagamento - filter by tenant_id
    await dbQuery(
      `DELETE FROM pagamentos_intermediacao WHERE id = $1 AND tenant_id = $2`,
      [pagamentoId, ctx.tenantId]
    );

    // Reverter status da parcela - filter by tenant_id
    await dbQuery(
      `UPDATE parcelas_intermediacao
       SET status = CASE
         WHEN data_vencimento < CURRENT_DATE THEN 'vencida'
         ELSE 'pendente'
       END,
       updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [pagamento.parcela_id, ctx.tenantId]
    );

    // Se a venda estava 'paga' e agora tem parcela pendente, reverter status
    const vendaResult = await dbQuery(
      `SELECT status FROM vendas_intermediacao WHERE id = $1 AND tenant_id = $2`,
      [pagamento.venda_id, ctx.tenantId]
    );

    let vendaStatusRevertido = false;
    if (vendaResult.rows[0]?.status === "paga") {
      await dbQuery(
        `UPDATE vendas_intermediacao
         SET status = 'concluida', updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [pagamento.venda_id, ctx.tenantId]
      );
      vendaStatusRevertido = true;
    }

    // Registrar auditoria CRITICA - include tenant_id
    await dbQuery(
      `INSERT INTO log_auditoria_intermediacao
       (tenant_id, entidade, entidade_id, acao, usuario_id, usuario_nome, dados_anteriores, dados_novos, justificativa, criticidade, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        ctx.tenantId,
        "pagamento",
        pagamentoId,
        "desfazer",
        ctx.user.id,
        ctx.user.nome,
        JSON.stringify(dadosPagamento),
        JSON.stringify({
          pagamento_excluido: true,
          parcela_status_revertido: true,
          venda_status_revertido: vendaStatusRevertido
        }),
        justificativa.trim(),
        "critica"
      ]
    );

    // Log adicional para a parcela - include tenant_id
    await dbQuery(
      `INSERT INTO log_auditoria_intermediacao
       (tenant_id, entidade, entidade_id, acao, usuario_id, usuario_nome, dados_novos, justificativa, criticidade, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        ctx.tenantId,
        "parcela",
        pagamento.parcela_id,
        "pagamento_desfeito",
        ctx.user.id,
        ctx.user.nome,
        JSON.stringify({
          pagamento_id_excluido: pagamentoId,
          novo_status: "pendente"
        }),
        justificativa.trim(),
        "critica"
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        pagamento_excluido: pagamentoId,
        parcela_id: pagamento.parcela_id,
        parcela_status: "pendente/vencida",
        venda_status_revertido: vendaStatusRevertido
      },
      message: "Pagamento desfeito com sucesso. Parcela revertida para status pendente."
    });
  } catch (error: any) {
    console.error("Erro ao desfazer pagamento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
