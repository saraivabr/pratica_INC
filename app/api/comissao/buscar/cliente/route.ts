/**
 * API: Buscar Cliente por CPF
 *
 * GET /api/comissao/buscar/cliente - Busca cliente por CPF para auto-complete
 * Busca em cvcrm_pessoas e retorna dados do cliente
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

/**
 * GET - Buscar cliente por CPF
 * Query params:
 *   - cpf: CPF do cliente (pode ser formatado ou apenas números)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get("cpf");

    if (!cpf) {
      return NextResponse.json({
        success: true,
        data: { encontrado: false },
      });
    }

    // Remove caracteres não numéricos
    const cpfLimpo = cpf.replace(/\D/g, "");

    if (cpfLimpo.length < 11) {
      return NextResponse.json({
        success: true,
        data: { encontrado: false },
        message: "CPF deve ter 11 dígitos",
      });
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      // Busca por CPF exato (limpando o CPF no banco também)
      const query = `
        SELECT
          cvcrm_id as pessoa_id,
          nome,
          cpf,
          email,
          COALESCE(celular, telefone) as telefone
        FROM cvcrm_pessoas
        WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), '/', '') = $1
        LIMIT 1
      `;

      const { rows } = await client.query(query, [cpfLimpo]);

      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          data: { encontrado: false },
        });
      }

      const pessoa = rows[0];

      return NextResponse.json({
        success: true,
        data: {
          encontrado: true,
          pessoa_id: pessoa.pessoa_id,
          nome: pessoa.nome,
          cpf: pessoa.cpf,
          email: pessoa.email,
          telefone: pessoa.telefone,
        },
      });
    });
  } catch (error: any) {
    console.error("Erro ao buscar cliente por CPF:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
