/**
 * API: Saldo do Beneficiário - Sistema de Intermediação Imobiliária
 *
 * GET /api/intermediacao/beneficiarios/:id/saldo - Consultar saldos detalhados
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

// ============================================================================
// GET - Saldos do Beneficiário
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const beneficiarioId = parseInt(id);

    if (isNaN(beneficiarioId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    // Parâmetros de filtro
    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");

    // Verificar se beneficiário existe
    const beneficiarioResult = await dbQuery(
      `SELECT id, codigo, nome FROM intermediacao_beneficiarios WHERE id = $1 AND tenant_id = $2`,
      [beneficiarioId, ctx.tenantId]
    );

    if (beneficiarioResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Beneficiário não encontrado" },
        { status: 404 }
      );
    }

    const beneficiario = beneficiarioResult.rows[0];

    // Construir filtro de período
    let periodoFilter = " AND c.tenant_id = $2";
    const periodoParams: any[] = [beneficiarioId, ctx.tenantId];
    let paramIndex = 3;

    if (dataInicio) {
      periodoFilter += ` AND p.data_vencimento >= $${paramIndex}`;
      periodoParams.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      periodoFilter += ` AND p.data_vencimento <= $${paramIndex}`;
      periodoParams.push(dataFim);
      paramIndex++;
    }

    // Calcular totais
    const totaisQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_a_receber,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_pendente,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as total_pago
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      WHERE c.beneficiario_id = $1 ${periodoFilter}
    `;
    const totaisResult = await dbQuery(totaisQuery, periodoParams);

    // Detalhamento por venda
    const detalhamentoQuery = `
      SELECT
        v.id as venda_id,
        v.codigo as venda_codigo,
        v.valor_total as venda_valor,
        v.data_venda,
        v.status as venda_status,
        c.percentual as comissao_percentual,
        c.valor as comissao_valor,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN p.valor ELSE 0 END), 0) as a_receber,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor ELSE 0 END), 0) as pendente,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as pago,
        COUNT(CASE WHEN p.status = 'pendente' THEN 1 END) as parcelas_pendentes,
        COUNT(CASE WHEN p.status = 'pago' THEN 1 END) as parcelas_pagas
      FROM intermediacao_vendas v
      JOIN intermediacao_comissoes c ON c.venda_id = v.id
      LEFT JOIN intermediacao_parcelas p ON p.comissao_id = c.id
      WHERE c.beneficiario_id = $1 ${periodoFilter}
      GROUP BY v.id, v.codigo, v.valor_total, v.data_venda, v.status, c.percentual, c.valor
      ORDER BY v.data_venda DESC
    `;
    const detalhamentoResult = await dbQuery(detalhamentoQuery, periodoParams);

    // Parcelas vencidas (detalhamento)
    const vencidasQuery = `
      SELECT
        p.id,
        p.numero,
        p.valor,
        p.data_vencimento,
        CURRENT_DATE - p.data_vencimento as dias_atraso,
        v.codigo as venda_codigo
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      JOIN intermediacao_vendas v ON c.venda_id = v.id
      WHERE c.beneficiario_id = $1
      AND p.status = 'pendente'
      AND p.data_vencimento < CURRENT_DATE
      ${periodoFilter}
      ORDER BY p.data_vencimento ASC
    `;
    const vencidasResult = await dbQuery(vencidasQuery, periodoParams);

    // Próximas parcelas (a vencer nos próximos 30 dias)
    const proximasQuery = `
      SELECT
        p.id,
        p.numero,
        p.valor,
        p.data_vencimento,
        p.data_vencimento - CURRENT_DATE as dias_para_vencer,
        v.codigo as venda_codigo
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      JOIN intermediacao_vendas v ON c.venda_id = v.id
      WHERE c.beneficiario_id = $1
      AND c.tenant_id = $2
      AND p.status = 'pendente'
      AND p.data_vencimento >= CURRENT_DATE
      AND p.data_vencimento <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY p.data_vencimento ASC
    `;
    const proximasResult = await dbQuery(proximasQuery, [beneficiarioId, ctx.tenantId]);

    return NextResponse.json({
      success: true,
      data: {
        beneficiario: {
          id: beneficiario.id,
          codigo: beneficiario.codigo,
          nome: beneficiario.nome,
        },
        periodo: {
          data_inicio: dataInicio || null,
          data_fim: dataFim || null,
        },
        totais: {
          total_a_receber: parseFloat(totaisResult.rows[0]?.total_a_receber || "0"),
          total_pendente: parseFloat(totaisResult.rows[0]?.total_pendente || "0"),
          total_pago: parseFloat(totaisResult.rows[0]?.total_pago || "0"),
        },
        detalhamento_por_venda: detalhamentoResult.rows.map((row) => ({
          venda_id: row.venda_id,
          venda_codigo: row.venda_codigo,
          venda_valor: parseFloat(row.venda_valor),
          data_venda: row.data_venda,
          venda_status: row.venda_status,
          comissao: {
            percentual: parseFloat(row.comissao_percentual),
            valor: parseFloat(row.comissao_valor),
          },
          saldos: {
            a_receber: parseFloat(row.a_receber),
            pendente: parseFloat(row.pendente),
            pago: parseFloat(row.pago),
          },
          parcelas: {
            pendentes: parseInt(row.parcelas_pendentes),
            pagas: parseInt(row.parcelas_pagas),
          },
        })),
        parcelas_vencidas: vencidasResult.rows.map((row) => ({
          id: row.id,
          numero: row.numero,
          valor: parseFloat(row.valor),
          data_vencimento: row.data_vencimento,
          dias_atraso: parseInt(row.dias_atraso),
          venda_codigo: row.venda_codigo,
        })),
        proximas_parcelas: proximasResult.rows.map((row) => ({
          id: row.id,
          numero: row.numero,
          valor: parseFloat(row.valor),
          data_vencimento: row.data_vencimento,
          dias_para_vencer: parseInt(row.dias_para_vencer),
          venda_codigo: row.venda_codigo,
        })),
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar saldo do beneficiário:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
