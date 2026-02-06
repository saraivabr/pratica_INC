/**
 * API: Buscar Empreendimentos
 *
 * GET /api/comissao/buscar/empreendimentos - Lista empreendimentos para selecao
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

/**
 * GET - Listar empreendimentos disponiveis
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get("busca");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    // Buscar em cvcrm_empreendimentos
    let query = `
      SELECT
        id,
        nome,
        cidade,
        uf,
        endereco_completo as endereco,
        status
      FROM cvcrm_empreendimentos
      WHERE workspace_id = $1
    `;
    const params: any[] = [ctx.workspaceId];
    let paramIndex = 2;

    if (busca) {
      query += ` AND (nome ILIKE $${paramIndex} OR cidade ILIKE $${paramIndex})`;
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
    console.error("Erro ao buscar empreendimentos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
