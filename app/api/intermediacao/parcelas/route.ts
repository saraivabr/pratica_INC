/**
 * API: Parcelas de Intermediacao
 *
 * GET /api/intermediacao/parcelas - Listar parcelas com filtros
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    // SECURITY: Operações financeiras requerem role admin ou gerente
    const allowedRoles = ['admin', 'gerente'];
    if (!allowedRoles.includes((ctx.user as any).role || '')) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Apenas admin e gerentes podem acessar operações financeiras.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Query params
    const status = searchParams.get("status");
    const beneficiario_id = searchParams.get("beneficiario_id");
    const venda_id = searchParams.get("venda_id");
    const data_vencimento_inicio = searchParams.get("data_vencimento_inicio");
    const data_vencimento_fim = searchParams.get("data_vencimento_fim");
    const filtro_especial = searchParams.get("filtro"); // 'vencidas', 'proximas_7_dias', 'este_mes'
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    // Build query - always filter by workspace_id
    let whereConditions: string[] = ["p.workspace_id = $1"];
    const params: any[] = [ctx.workspaceId];
    let paramIndex = 2;

    // Filter by status
    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Filter by beneficiario
    if (beneficiario_id) {
      whereConditions.push(`p.beneficiario_id = $${paramIndex}`);
      params.push(beneficiario_id);
      paramIndex++;
    }

    // Filter by venda
    if (venda_id) {
      whereConditions.push(`p.venda_id = $${paramIndex}`);
      params.push(venda_id);
      paramIndex++;
    }

    // Filter by date range
    if (data_vencimento_inicio) {
      whereConditions.push(`p.data_vencimento >= $${paramIndex}`);
      params.push(data_vencimento_inicio);
      paramIndex++;
    }

    if (data_vencimento_fim) {
      whereConditions.push(`p.data_vencimento <= $${paramIndex}`);
      params.push(data_vencimento_fim);
      paramIndex++;
    }

    // Special filters
    const now = new Date();
    if (filtro_especial === "vencidas") {
      whereConditions.push(`p.data_vencimento < $${paramIndex}`);
      whereConditions.push(`p.status != 'paga'`);
      params.push(now.toISOString().split('T')[0]);
      paramIndex++;
    } else if (filtro_especial === "proximas_7_dias") {
      const seteDias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      whereConditions.push(`p.data_vencimento >= $${paramIndex}`);
      params.push(now.toISOString().split('T')[0]);
      paramIndex++;
      whereConditions.push(`p.data_vencimento <= $${paramIndex}`);
      params.push(seteDias.toISOString().split('T')[0]);
      paramIndex++;
      whereConditions.push(`p.status != 'paga'`);
    } else if (filtro_especial === "este_mes") {
      const primeiroDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      whereConditions.push(`p.data_vencimento >= $${paramIndex}`);
      params.push(primeiroDiaMes.toISOString().split('T')[0]);
      paramIndex++;
      whereConditions.push(`p.data_vencimento <= $${paramIndex}`);
      params.push(ultimoDiaMes.toISOString().split('T')[0]);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM im_parcelas p
      WHERE ${whereClause}
    `;
    const countResult = await dbQuery(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Get parcelas with related data
    const query = `
      SELECT
        p.*,
        v.id as venda_id,
        v.valor_venda,
        v.cliente_nome,
        v.empreendimento,
        v.unidade,
        v.status as venda_status,
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        b.cpf_cnpj as beneficiario_documento,
        b.cargo as beneficiario_cargo,
        pg.id as pagamento_id,
        pg.data_pagamento,
        pg.metodo as pagamento_metodo,
        pg.comprovante as pagamento_comprovante,
        CASE
          WHEN p.status != 'paga' AND p.data_vencimento < CURRENT_DATE
          THEN CURRENT_DATE - p.data_vencimento
          ELSE 0
        END as dias_atraso
      FROM im_parcelas p
      LEFT JOIN im_vendas v ON v.id = p.venda_id
      LEFT JOIN im_beneficiarios b ON b.id = p.beneficiario_id
      LEFT JOIN im_pagamentos pg ON pg.parcela_id = p.id
      WHERE ${whereClause}
      ORDER BY p.data_vencimento ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await dbQuery(query, params);

    // Format response
    const parcelas = result.rows.map(row => ({
      id: row.id,
      numero_parcela: row.numero_parcela,
      valor: parseFloat(row.valor),
      data_vencimento: row.data_vencimento,
      status: row.status,
      dias_atraso: parseInt(row.dias_atraso) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      venda: row.venda_id ? {
        id: row.venda_id,
        valor_venda: parseFloat(row.valor_venda),
        cliente_nome: row.cliente_nome,
        empreendimento: row.empreendimento,
        unidade: row.unidade,
        status: row.venda_status
      } : null,
      beneficiario: row.beneficiario_id ? {
        id: row.beneficiario_id,
        nome: row.beneficiario_nome,
        documento: row.beneficiario_documento,
        cargo: row.beneficiario_cargo
      } : null,
      pagamento: row.pagamento_id ? {
        id: row.pagamento_id,
        data_pagamento: row.data_pagamento,
        metodo: row.pagamento_metodo,
        comprovante: row.pagamento_comprovante
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: parcelas,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Erro ao listar parcelas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
