/**
 * API: Buscar Unidades de um Empreendimento
 *
 * GET /api/comissao/buscar/unidades/[empreendimentoId] - Lista unidades
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

interface Params {
  params: Promise<{ empreendimentoId: string }>;
}

/**
 * GET - Listar unidades de um empreendimento
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { empreendimentoId } = await params;
    const empId = parseInt(empreendimentoId);

    if (isNaN(empId)) {
      return NextResponse.json(
        { success: false, error: "ID do empreendimento invalido" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get("busca");

    return await withTenant(ctx.workspaceId, async (client) => {
      // Buscar em cvcrm_unidades
      let query = `
        SELECT
          u.id,
          u.nome as codigo,
          u.bloco,
          u.andar,
          u.area,
          u.tipologia,
          u.valor as valor_tabela,
          u.status,
          e.id as empreendimento_id,
          e.nome as empreendimento_nome
        FROM cvcrm_unidades u
        JOIN cvcrm_empreendimentos e ON e.id = u.empreendimento_id
        WHERE u.empreendimento_id = $1
      `;
      const params_query: any[] = [empId];
      let paramIndex = 2;

      if (busca) {
        query += ` AND (u.nome ILIKE $${paramIndex} OR u.bloco ILIKE $${paramIndex})`;
        params_query.push(`%${busca}%`);
        paramIndex++;
      }

      query += ` ORDER BY u.bloco, u.nome LIMIT 100`;

      const { rows } = await client.query(query, params_query);

      return NextResponse.json({
        success: true,
        data: rows.map((row: any) => ({
          ...row,
          valor_tabela: row.valor_tabela ? parseFloat(row.valor_tabela) : null,
          area: row.area ? parseFloat(row.area) : null,
        })),
      });
    });
  } catch (error: any) {
    console.error("Erro ao buscar unidades:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
