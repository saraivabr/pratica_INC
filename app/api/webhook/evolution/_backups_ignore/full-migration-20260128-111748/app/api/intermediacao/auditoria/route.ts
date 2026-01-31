/**
 * API: Auditoria - Listar Logs
 *
 * GET /api/intermediacao/auditoria - Listar logs de auditoria
 * Query params: tabela, operacao, usuario_id, registro_id, data_inicio, data_fim, page, limit
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "auditor"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas admin, gerente ou auditor podem acessar logs de auditoria." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tabela = searchParams.get("tabela");
    const operacao = searchParams.get("operacao");
    const usuarioId = searchParams.get("usuario_id");
    const registroId = searchParams.get("registro_id");
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    // Construir query dinamicamente
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (tabela) {
      whereClause += ` AND la.tabela = $${paramIndex}`;
      params.push(tabela);
      paramIndex++;
    }

    if (operacao) {
      whereClause += ` AND la.operacao = $${paramIndex}`;
      params.push(operacao);
      paramIndex++;
    }

    if (usuarioId) {
      whereClause += ` AND la.usuario_id = $${paramIndex}`;
      params.push(usuarioId);
      paramIndex++;
    }

    if (registroId) {
      whereClause += ` AND la.registro_id = $${paramIndex}`;
      params.push(registroId);
      paramIndex++;
    }

    if (dataInicio) {
      whereClause += ` AND la.created_at >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      whereClause += ` AND la.created_at <= $${paramIndex}`;
      params.push(dataFim + " 23:59:59");
      paramIndex++;
    }

    // Query para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM log_auditoria la
      ${whereClause}
    `;
    const countResult = await dbQuery(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Query principal com JOIN para nome do usuário
    const query = `
      SELECT
        la.id,
        la.tabela,
        la.operacao,
        la.registro_id,
        la.dados_anteriores,
        la.dados_novos,
        la.ip_address,
        la.user_agent,
        la.justificativa,
        la.created_at,
        la.usuario_id,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM log_auditoria la
      LEFT JOIN users u ON u.id = la.usuario_id
      ${whereClause}
      ORDER BY la.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const { rows } = await dbQuery(query, params);

    // Calcular metadados de paginacao
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        logs: rows.map(row => ({
          id: row.id,
          tabela: row.tabela,
          operacao: row.operacao,
          registro_id: row.registro_id,
          dados_anteriores: row.dados_anteriores,
          dados_novos: row.dados_novos,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          justificativa: row.justificativa,
          created_at: row.created_at,
          usuario: {
            id: row.usuario_id,
            nome: row.usuario_nome,
            email: row.usuario_email
          }
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error("Erro ao listar logs de auditoria:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
