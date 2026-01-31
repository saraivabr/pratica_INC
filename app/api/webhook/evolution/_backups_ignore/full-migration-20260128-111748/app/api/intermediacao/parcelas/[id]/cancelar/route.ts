/**
 * API: Cancelar Parcela
 *
 * POST /api/intermediacao/parcelas/:id/cancelar - Cancelar parcela (apenas admin)
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

    // Apenas admin pode cancelar parcelas
    if (ctx.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem cancelar parcelas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const parcelaId = id;
    const body = await request.json();
    const { justificativa } = body;

    // Validacao
    if (!justificativa || justificativa.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Justificativa e obrigatoria (minimo 10 caracteres)" },
        { status: 400 }
      );
    }

    // Buscar parcela (filtered by tenant_id)
    const parcelaResult = await dbQuery(
      `SELECT * FROM parcelas_intermediacao WHERE id = $1 AND tenant_id = $2`,
      [parcelaId, ctx.tenantId]
    );

    if (parcelaResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Parcela nao encontrada" },
        { status: 404 }
      );
    }

    const parcela = parcelaResult.rows[0];

    // Verificar se ja esta cancelada
    if (parcela.status === "cancelada") {
      return NextResponse.json(
        { success: false, error: "Esta parcela ja foi cancelada" },
        { status: 400 }
      );
    }

    // Se estava paga, nao pode cancelar diretamente
    if (parcela.status === "paga") {
      return NextResponse.json(
        { success: false, error: "Nao e possivel cancelar parcela ja paga. Use a funcao de desfazer pagamento primeiro." },
        { status: 400 }
      );
    }

    // Atualizar status da parcela para 'cancelada' (with tenant_id filter for safety)
    await dbQuery(
      `UPDATE parcelas_intermediacao
       SET status = 'cancelada', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [parcelaId, ctx.tenantId]
    );

    // Registrar auditoria com justificativa
    await dbQuery(
      `INSERT INTO log_auditoria_intermediacao
       (entidade, entidade_id, acao, usuario_id, usuario_nome, dados_anteriores, dados_novos, justificativa, criticidade, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        "parcela",
        parcelaId,
        "cancelar",
        ctx.user.id,
        ctx.user.nome,
        JSON.stringify({
          status: parcela.status,
          valor: parcela.valor,
          data_vencimento: parcela.data_vencimento
        }),
        JSON.stringify({
          status: "cancelada"
        }),
        justificativa.trim(),
        "alta",
        ctx.tenantId
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        parcela_id: parcelaId,
        status: "cancelada"
      },
      message: "Parcela cancelada com sucesso"
    });
  } catch (error: any) {
    console.error("Erro ao cancelar parcela:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
