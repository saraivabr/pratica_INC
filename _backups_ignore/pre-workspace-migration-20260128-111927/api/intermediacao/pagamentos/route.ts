/**
 * API: Pagamentos de Intermediacao
 *
 * GET /api/intermediacao/pagamentos - Listar pagamentos com filtros
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);

    // Query params
    const beneficiario_id = searchParams.get("beneficiario_id");
    const data_inicio = searchParams.get("data_inicio");
    const data_fim = searchParams.get("data_fim");
    const metodo = searchParams.get("metodo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    // Build query - always filter by tenant_id
    let whereConditions: string[] = ["pg.tenant_id = $1"];
    const params: any[] = [ctx.tenantId];
    let paramIndex = 2;

    // Filter by beneficiario
    if (beneficiario_id) {
      whereConditions.push(`pg.beneficiario_id = $${paramIndex}`);
      params.push(beneficiario_id);
      paramIndex++;
    }

    // Filter by date range
    if (data_inicio) {
      whereConditions.push(`pg.data_pagamento >= $${paramIndex}`);
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      whereConditions.push(`pg.data_pagamento <= $${paramIndex}`);
      params.push(data_fim);
      paramIndex++;
    }

    // Filter by metodo
    if (metodo) {
      whereConditions.push(`pg.metodo = $${paramIndex}`);
      params.push(metodo.toLowerCase());
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pagamentos_intermediacao pg
      WHERE ${whereClause}
    `;
    const countResult = await dbQuery(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Get pagamentos with related data
    const query = `
      SELECT
        pg.*,
        p.id as parcela_id,
        p.numero_parcela,
        p.data_vencimento,
        p.venda_id,
        v.valor_venda,
        v.cliente_nome,
        v.empreendimento,
        v.unidade,
        v.data_venda,
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        b.cpf_cnpj as beneficiario_documento,
        b.cargo as beneficiario_cargo,
        u.nome as registrado_por_nome
      FROM pagamentos_intermediacao pg
      LEFT JOIN parcelas_intermediacao p ON p.id = pg.parcela_id
      LEFT JOIN vendas_intermediacao v ON v.id = p.venda_id
      LEFT JOIN beneficiarios_intermediacao b ON b.id = pg.beneficiario_id
      LEFT JOIN users u ON u.id = pg.registrado_por
      WHERE ${whereClause}
      ORDER BY pg.data_pagamento DESC, pg.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await dbQuery(query, params);

    // Format response
    const pagamentos = result.rows.map(row => ({
      id: row.id,
      valor: parseFloat(row.valor),
      data_pagamento: row.data_pagamento,
      metodo: row.metodo,
      comprovante: row.comprovante,
      referencia: row.referencia,
      registrado_por: {
        id: row.registrado_por,
        nome: row.registrado_por_nome
      },
      created_at: row.created_at,
      parcela: row.parcela_id ? {
        id: row.parcela_id,
        numero_parcela: row.numero_parcela,
        data_vencimento: row.data_vencimento
      } : null,
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
        cargo: row.beneficiario_cargo
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: pagamentos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Erro ao listar pagamentos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
