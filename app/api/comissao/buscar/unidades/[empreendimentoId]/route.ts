/**
 * API: Buscar Unidades de um Empreendimento
 *
 * GET /api/comissao/buscar/unidades/[empreendimentoId] - Lista unidades
 * empreendimentoId = cvcrm_id do empreendimento (integer)
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
    const empCvCrmId = parseInt(empreendimentoId);

    if (isNaN(empCvCrmId)) {
      return NextResponse.json(
        { success: false, error: "ID do empreendimento invalido" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get("busca");
    const showAll = searchParams.get("all") === "true";

    return await withTenant(ctx.workspaceId, async (client) => {
      let query = `
        SELECT
          u.id,
          u.cvcrm_id,
          u.codigo,
          u.nome,
          u.bloco,
          u.andar,
          u.area_privativa,
          u.dormitorios,
          COALESCE(u.cvcrm_data->>'tipologia', u.tipo) as tipologia,
          u.valor_venda,
          u.situacao,
          u.empreendimento_id,
          u.empreendimento_nome
        FROM cvcrm_unidades u
        WHERE u.empreendimento_id = $1
      `;
      const params_query: any[] = [empCvCrmId];
      let paramIndex = 2;

      if (!showAll) {
        query += ` AND u.situacao = 'Disponivel'`;
      }

      if (busca) {
        query += ` AND (u.nome ILIKE $${paramIndex} OR u.bloco ILIKE $${paramIndex} OR u.codigo ILIKE $${paramIndex})`;
        params_query.push(`%${busca}%`);
        paramIndex++;
      }

      query += ` ORDER BY u.bloco, u.andar, u.codigo, u.nome LIMIT 500`;

      const { rows } = await client.query(query, params_query);

      return NextResponse.json({
        success: true,
        data: rows.map((row: any) => ({
          ...row,
          valor_venda: row.valor_venda ? parseFloat(row.valor_venda) : null,
          area_privativa: row.area_privativa ? parseFloat(row.area_privativa) : null,
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
