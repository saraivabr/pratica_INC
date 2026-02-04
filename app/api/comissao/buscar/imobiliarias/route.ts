/**
 * API: Buscar Imobiliarias
 *
 * GET /api/comissao/buscar/imobiliarias - Lista imobiliarias para selecao
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

/**
 * GET - Listar imobiliarias disponiveis
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get("busca");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    // Buscar em cvcrm_imobiliarias
    let query = `
      SELECT
        id,
        nome,
        cnpj
      FROM cvcrm_imobiliarias
      WHERE workspace_id = $1
    `;
    const params: any[] = [ctx.workspaceId];
    let paramIndex = 2;

    if (busca) {
      query += ` AND (nome ILIKE $${paramIndex} OR cnpj ILIKE $${paramIndex})`;
      params.push(`%${busca}%`);
      paramIndex++;
    }

    query += ` ORDER BY nome LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await dbQuery(query, params);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("Erro ao buscar imobiliarias:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
