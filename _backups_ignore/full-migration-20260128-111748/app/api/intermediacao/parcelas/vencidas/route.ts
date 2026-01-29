/**
 * API: Parcelas Vencidas
 *
 * GET /api/intermediacao/parcelas/vencidas - Listar parcelas vencidas nao pagas
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;
    const beneficiario_id = searchParams.get("beneficiario_id");

    // Build where conditions - always filter by tenant_id
    let whereConditions = [
      "p.tenant_id = $1",
      "p.data_vencimento < CURRENT_DATE",
      "p.status NOT IN ('paga', 'cancelada')"
    ];
    const params: any[] = [ctx.tenantId];
    let paramIndex = 2;

    if (beneficiario_id) {
      whereConditions.push(`p.beneficiario_id = $${paramIndex}`);
      params.push(beneficiario_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM parcelas_intermediacao p
      WHERE ${whereClause}
    `;
    const countResult = await dbQuery(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Get parcelas vencidas
    const query = `
      SELECT
        p.*,
        CURRENT_DATE - p.data_vencimento as dias_atraso,
        v.id as venda_id,
        v.valor_venda,
        v.cliente_nome,
        v.empreendimento,
        v.unidade,
        v.data_venda,
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        b.cpf_cnpj as beneficiario_documento,
        b.cargo as beneficiario_cargo,
        b.email as beneficiario_email,
        b.telefone as beneficiario_telefone
      FROM parcelas_intermediacao p
      LEFT JOIN vendas_intermediacao v ON v.id = p.venda_id
      LEFT JOIN beneficiarios_intermediacao b ON b.id = p.beneficiario_id
      WHERE ${whereClause}
      ORDER BY (CURRENT_DATE - p.data_vencimento) DESC, p.valor DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await dbQuery(query, params);

    // Calcular totais
    const totaisQuery = `
      SELECT
        COUNT(*) as quantidade_vencidas,
        COALESCE(SUM(p.valor), 0) as valor_total_vencido,
        AVG(CURRENT_DATE - p.data_vencimento) as media_dias_atraso,
        MAX(CURRENT_DATE - p.data_vencimento) as max_dias_atraso
      FROM parcelas_intermediacao p
      WHERE ${whereConditions.join(" AND ")}
    `;
    const totaisResult = await dbQuery(totaisQuery, params.slice(0, -2));

    // Format response
    const parcelas = result.rows.map(row => ({
      id: row.id,
      numero_parcela: row.numero_parcela,
      valor: parseFloat(row.valor),
      data_vencimento: row.data_vencimento,
      status: row.status,
      dias_atraso: parseInt(row.dias_atraso) || 0,
      created_at: row.created_at,
      venda: row.venda_id ? {
        id: row.venda_id,
        valor_venda: parseFloat(row.valor_venda),
        cliente_nome: row.cliente_nome,
        empreendimento: row.empreendimento,
        unidade: row.unidade,
        data_venda: row.data_venda
      } : null,
      beneficiario: row.beneficiario_id ? {
        id: row.beneficiario_id,
        nome: row.beneficiario_nome,
        documento: row.beneficiario_documento,
        cargo: row.beneficiario_cargo,
        email: row.beneficiario_email,
        telefone: row.beneficiario_telefone
      } : null
    }));

    const totais = totaisResult.rows[0];

    return NextResponse.json({
      success: true,
      data: parcelas,
      resumo: {
        quantidade_vencidas: parseInt(totais.quantidade_vencidas) || 0,
        valor_total_vencido: parseFloat(totais.valor_total_vencido) || 0,
        media_dias_atraso: Math.round(parseFloat(totais.media_dias_atraso) || 0),
        max_dias_atraso: parseInt(totais.max_dias_atraso) || 0
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Erro ao listar parcelas vencidas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
