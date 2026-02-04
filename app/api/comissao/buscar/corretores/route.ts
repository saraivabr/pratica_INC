/**
 * API: Buscar Corretores
 *
 * GET /api/comissao/buscar/corretores - Busca corretores para selecao
 * Combina dados de: cvcrm_corretores, im_beneficiarios, users
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

/**
 * GET - Buscar corretores por nome
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get("busca");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));

    if (!busca || busca.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const buscaLike = `%${busca}%`;

    // Buscar em cvcrm_corretores
    const { rows: cvcrmRows } = await dbQuery(
      `SELECT
        c.id,
        c.nome,
        c.cpf,
        c.creci,
        c.email,
        c.telefone,
        i.nome as imobiliaria_nome,
        i.id as imobiliaria_id,
        'cvcrm' as fonte
      FROM cvcrm_corretores c
      LEFT JOIN cvcrm_imobiliarias i ON i.id = c.imobiliaria_id
      WHERE c.workspace_id = $1
        AND (c.nome ILIKE $2 OR c.cpf ILIKE $2 OR c.creci ILIKE $2)
      LIMIT $3`,
      [ctx.workspaceId, buscaLike, limit]
    );

    // Buscar em im_beneficiarios
    const { rows: beneficiarioRows } = await dbQuery(
      `SELECT
        id,
        nome,
        documento as cpf,
        NULL as creci,
        email,
        telefone,
        NULL as imobiliaria_nome,
        NULL as imobiliaria_id,
        'beneficiario' as fonte
      FROM im_beneficiarios
      WHERE workspace_id = $1
        AND (nome ILIKE $2 OR documento ILIKE $2)
        AND ativo = true
      LIMIT $3`,
      [ctx.workspaceId, buscaLike, limit]
    );

    // Combinar resultados e remover duplicados por CPF
    const todosCorretores = [...cvcrmRows, ...beneficiarioRows];
    const cpfsVistos = new Set<string>();
    const corretoresUnicos = [];

    for (const corretor of todosCorretores) {
      const cpfLimpo = corretor.cpf?.replace(/\D/g, "") || "";
      if (cpfLimpo && cpfsVistos.has(cpfLimpo)) continue;
      if (cpfLimpo) cpfsVistos.add(cpfLimpo);
      corretoresUnicos.push(corretor);
    }

    return NextResponse.json({
      success: true,
      data: corretoresUnicos.slice(0, limit),
    });
  } catch (error: any) {
    console.error("Erro ao buscar corretores:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
