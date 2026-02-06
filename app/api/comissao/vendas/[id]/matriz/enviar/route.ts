/**
 * API: Marcar parcelas como enviadas para pagadoria
 *
 * POST /api/comissao/vendas/[id]/matriz/enviar - Marca parcelas como enviadas
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const enviarSchema = z.object({
  parcela_ids: z.array(z.number().int().positive()).min(1),
});

/**
 * POST - Marcar parcelas como enviadas para pagadoria
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    // SECURITY
    const allowedRoles = ["admin", "gerente"];
    if (!allowedRoles.includes((ctx.user as any).role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar dados
    const parseResult = enviarSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados invalidos",
          details: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { parcela_ids } = parseResult.data;

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar se venda existe
      const { rows: vendaRows } = await client.query(
        `SELECT * FROM comissao_vendas
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      if (vendaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao encontrada" },
          { status: 404 }
        );
      }

      const venda = vendaRows[0];

      if (venda.status !== "calculada") {
        return NextResponse.json(
          { success: false, error: "Venda precisa estar calculada antes de enviar" },
          { status: 400 }
        );
      }

      // Marcar como enviadas
      await client.query(
        `UPDATE comissao_matriz
         SET enviado_pagadoria = true, data_envio_pagadoria = NOW()
         WHERE venda_id = $1 AND parcela_id = ANY($2)`,
        [vendaId, parcela_ids]
      );

      // Verificar se todas as parcelas foram enviadas
      const { rows: naoEnviadas } = await client.query(
        `SELECT COUNT(*) as total FROM comissao_matriz
         WHERE venda_id = $1 AND enviado_pagadoria = false`,
        [vendaId]
      );

      // Se todas foram enviadas, atualizar status da venda
      if (parseInt(naoEnviadas[0]?.total || "0") === 0) {
        await client.query(
          `UPDATE comissao_vendas SET status = 'enviada', updated_at = NOW() WHERE id = $1`,
          [vendaId]
        );
      }

      return NextResponse.json({
        success: true,
        message: `${parcela_ids.length} parcela(s) marcada(s) como enviada(s) para pagadoria`,
      });
    });
  } catch (error: any) {
    console.error("Erro ao marcar como enviado:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
