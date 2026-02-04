/**
 * API: Matriz Calculada de uma Venda
 *
 * GET /api/comissao/vendas/[id]/matriz - Retorna matriz em formato de planilha
 * POST /api/comissao/vendas/[id]/matriz/enviar - Marcar como enviado para pagadoria
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { arredondarValor } from "@/lib/comissao/calculations";
import type { MatrizPlanilha, MatrizPlanilhaRow } from "@/lib/comissao/types";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET - Retorna matriz calculada em formato de planilha
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Buscar venda
    const { rows: vendaRows } = await dbQuery(
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

    // Buscar corretores
    const { rows: corretores } = await dbQuery(
      `SELECT * FROM comissao_corretores
       WHERE venda_id = $1
       ORDER BY prioridade DESC, nome`,
      [vendaId]
    );

    // Buscar parcelas
    const { rows: parcelas } = await dbQuery(
      `SELECT * FROM comissao_parcelas
       WHERE venda_id = $1
       ORDER BY numero`,
      [vendaId]
    );

    // Buscar matriz calculada
    const { rows: matrizRows } = await dbQuery(
      `SELECT * FROM comissao_matriz
       WHERE venda_id = $1`,
      [vendaId]
    );

    // Montar estrutura da planilha
    const matriz: MatrizPlanilhaRow[] = corretores.map((corretor: any) => {
      const valoresPorParcela = parcelas.map((parcela: any) => {
        const item = matrizRows.find(
          (m: any) => m.corretor_id === corretor.id && m.parcela_id === parcela.id
        );
        return item ? parseFloat(item.valor_calculado) : 0;
      });

      const total = valoresPorParcela.reduce((acc, v) => acc + v, 0);

      return {
        corretor_id: corretor.id,
        corretor_nome: corretor.nome,
        percentual_participacao: parseFloat(corretor.percentual_participacao),
        corretor_comissao_total: parseFloat(corretor.valor_comissao),
        valores_por_parcela: valoresPorParcela,
        total: arredondarValor(total),
      };
    });

    // Calcular totais por parcela
    const totais_parcela = parcelas.map((_: any, parcelaIndex: number) => {
      const total = matriz.reduce(
        (acc, row) => acc + row.valores_por_parcela[parcelaIndex],
        0
      );
      return arredondarValor(total);
    });

    // Total geral
    const total_geral = arredondarValor(matriz.reduce((acc, row) => acc + row.total, 0));

    const response: MatrizPlanilha = {
      venda: {
        ...venda,
        valor_venda: parseFloat(venda.valor_venda),
        percentual_comissao: parseFloat(venda.percentual_comissao),
        valor_comissao_total: parseFloat(venda.valor_comissao_total),
      },
      corretores: corretores.map((c: any) => ({
        ...c,
        percentual_participacao: parseFloat(c.percentual_participacao),
        valor_comissao: parseFloat(c.valor_comissao),
      })),
      parcelas: parcelas.map((p: any) => ({
        ...p,
        valor_parcela: parseFloat(p.valor_parcela),
        percentual_comissao: parseFloat(p.percentual_comissao),
      })),
      matriz,
      totais_parcela,
      total_geral,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Erro ao buscar matriz:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
