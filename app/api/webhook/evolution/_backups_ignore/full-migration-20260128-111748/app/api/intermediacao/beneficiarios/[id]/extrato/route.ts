/**
 * API: Extrato do Beneficiário - Sistema de Intermediação Imobiliária
 *
 * GET /api/intermediacao/beneficiarios/:id/extrato - Extrato completo de movimentações
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

// ============================================================================
// GET - Extrato Completo do Beneficiário
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
    const status = searchParams.get("status"); // pendente, pago, vencido
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    // Verificar se beneficiário existe
    const beneficiarioResult = await dbQuery(
      `SELECT id, codigo, nome, email, telefone FROM intermediacao_beneficiarios WHERE id = $1 AND tenant_id = $2`,
      [beneficiarioId, ctx.tenantId]
    );

    if (beneficiarioResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Beneficiário não encontrado" },
        { status: 404 }
      );
    }

    const beneficiario = beneficiarioResult.rows[0];

    // Construir filtros
    let whereClause = "WHERE c.beneficiario_id = $1 AND c.tenant_id = $2";
    const queryParams: any[] = [beneficiarioId, ctx.tenantId];
    let paramIndex = 3;

    if (dataInicio) {
      whereClause += ` AND COALESCE(p.data_pagamento, p.data_vencimento) >= $${paramIndex}`;
      queryParams.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      whereClause += ` AND COALESCE(p.data_pagamento, p.data_vencimento) <= $${paramIndex}`;
      queryParams.push(dataFim);
      paramIndex++;
    }

    if (status) {
      if (status === "vencido") {
        whereClause += ` AND p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE`;
      } else if (status === "pendente" || status === "pago") {
        whereClause += ` AND p.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
    }

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      ${whereClause}
    `;
    const countResult = await dbQuery(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Buscar extrato (parcelas e pagamentos)
    const extratoQuery = `
      SELECT
        p.id as parcela_id,
        p.numero as parcela_numero,
        p.valor,
        p.data_vencimento,
        p.data_pagamento,
        p.status,
        p.metodo_pagamento,
        p.comprovante,
        CASE
          WHEN p.status = 'pago' THEN 'pagamento'
          WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN 'vencido'
          WHEN p.status = 'pendente' THEN 'a_vencer'
          WHEN p.status = 'cancelado' THEN 'cancelado'
          ELSE p.status
        END as tipo_movimentacao,
        CASE
          WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE
          THEN CURRENT_DATE - p.data_vencimento
          ELSE 0
        END as dias_atraso,
        c.id as comissao_id,
        c.percentual as comissao_percentual,
        c.valor as comissao_valor,
        v.id as venda_id,
        v.codigo as venda_codigo,
        v.valor_total as venda_valor,
        v.data_venda,
        v.status as venda_status,
        cl.nome as cliente_nome,
        e.nome as empreendimento_nome
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      JOIN intermediacao_vendas v ON c.venda_id = v.id
      LEFT JOIN intermediacao_clientes cl ON v.cliente_id = cl.id
      LEFT JOIN intermediacao_empreendimentos e ON v.empreendimento_id = e.id
      ${whereClause}
      ORDER BY
        COALESCE(p.data_pagamento, p.data_vencimento) DESC,
        p.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const extratoResult = await dbQuery(extratoQuery, queryParams);

    // Calcular resumo do período
    const resumoParams = queryParams.slice(0, -2); // Remove limit e offset
    const resumoQuery = `
      SELECT
        COUNT(*) as total_movimentacoes,
        COUNT(CASE WHEN p.status = 'pago' THEN 1 END) as total_pagamentos,
        COUNT(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN 1 END) as total_vencidos,
        COUNT(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN 1 END) as total_a_vencer,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as valor_pago,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN p.valor ELSE 0 END), 0) as valor_vencido,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor ELSE 0 END), 0) as valor_a_vencer
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      ${whereClause}
    `;
    const resumoResult = await dbQuery(resumoQuery, resumoParams);

    // Formatar dados do extrato
    const movimentacoes = extratoResult.rows.map((row) => ({
      parcela: {
        id: row.parcela_id,
        numero: row.parcela_numero,
        valor: parseFloat(row.valor),
        data_vencimento: row.data_vencimento,
        data_pagamento: row.data_pagamento,
        status: row.status,
        metodo_pagamento: row.metodo_pagamento,
        comprovante: row.comprovante,
      },
      tipo_movimentacao: row.tipo_movimentacao,
      dias_atraso: parseInt(row.dias_atraso),
      comissao: {
        id: row.comissao_id,
        percentual: parseFloat(row.comissao_percentual),
        valor: parseFloat(row.comissao_valor),
      },
      venda: {
        id: row.venda_id,
        codigo: row.venda_codigo,
        valor: parseFloat(row.venda_valor),
        data: row.data_venda,
        status: row.venda_status,
        cliente: row.cliente_nome,
        empreendimento: row.empreendimento_nome,
      },
    }));

    const resumo = resumoResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        beneficiario: {
          id: beneficiario.id,
          codigo: beneficiario.codigo,
          nome: beneficiario.nome,
          email: beneficiario.email,
          telefone: beneficiario.telefone,
        },
        filtros: {
          data_inicio: dataInicio || null,
          data_fim: dataFim || null,
          status: status || null,
        },
        resumo: {
          total_movimentacoes: parseInt(resumo?.total_movimentacoes || "0"),
          total_pagamentos: parseInt(resumo?.total_pagamentos || "0"),
          total_vencidos: parseInt(resumo?.total_vencidos || "0"),
          total_a_vencer: parseInt(resumo?.total_a_vencer || "0"),
          valores: {
            pago: parseFloat(resumo?.valor_pago || "0"),
            vencido: parseFloat(resumo?.valor_vencido || "0"),
            a_vencer: parseFloat(resumo?.valor_a_vencer || "0"),
          },
        },
        movimentacoes,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar extrato do beneficiário:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
