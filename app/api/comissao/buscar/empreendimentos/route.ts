/**
 * API: Buscar Empreendimentos
 *
 * GET /api/comissao/buscar/empreendimentos - Lista empreendimentos para selecao
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

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

    return await withTenant(ctx.workspaceId, async (client) => {
      // Buscar em cvcrm_empreendimentos
      let query = `
        SELECT
          id,
          cvcrm_id,
          nome,
          cidade,
          uf,
          endereco_completo as endereco,
          status,
          total_unidades
        FROM cvcrm_empreendimentos
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (busca) {
        query += ` AND (nome ILIKE $${paramIndex} OR cidade ILIKE $${paramIndex})`;
        params.push(`%${busca}%`);
        paramIndex++;
      }

      query += ` ORDER BY nome LIMIT $${paramIndex}`;
      params.push(limit);

      const { rows } = await client.query(query, params);

      return NextResponse.json({
        success: true,
        data: rows,
      });
    });
  } catch (error: any) {
    console.error("Erro ao buscar empreendimentos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
