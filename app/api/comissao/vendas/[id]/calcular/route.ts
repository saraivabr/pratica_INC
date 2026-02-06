/**
 * API: Calcular Matriz de Comissoes
 *
 * POST /api/comissao/vendas/[id]/calcular - Dispara o calculo da matriz
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import { gerarDadosMatrizParaBanco, arredondarValor } from "@/lib/comissao/calculations";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST - Dispara o calculo da matriz de comissoes
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

    return await withTenant(ctx.workspaceId, async (client) => {
      // Buscar venda
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

      if (venda.status === "cancelada") {
        return NextResponse.json(
          { success: false, error: "Venda cancelada nao pode ser calculada" },
          { status: 400 }
        );
      }

      // Buscar corretores
      const { rows: corretores } = await client.query(
        `SELECT * FROM comissao_corretores
         WHERE venda_id = $1
         ORDER BY prioridade DESC, nome`,
        [vendaId]
      );

      if (corretores.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao possui corretores cadastrados" },
          { status: 400 }
        );
      }

      // Buscar parcelas
      const { rows: parcelas } = await client.query(
        `SELECT * FROM comissao_parcelas
         WHERE venda_id = $1
         ORDER BY numero`,
        [vendaId]
      );

      if (parcelas.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao possui parcelas cadastradas" },
          { status: 400 }
        );
      }

      // Validar soma dos percentuais dos corretores
      const somaCorretores = corretores.reduce(
        (acc: number, c: any) => acc + parseFloat(c.percentual_participacao),
        0
      );
      if (Math.abs(somaCorretores - 1) > 0.001) {
        return NextResponse.json(
          {
            success: false,
            error: `Soma dos percentuais dos corretores (${(somaCorretores * 100).toFixed(1)}%) deve ser 100%`,
          },
          { status: 400 }
        );
      }

      // Validar soma dos percentuais das parcelas
      const somaParcelas = parcelas.reduce(
        (acc: number, p: any) => acc + parseFloat(p.percentual_comissao),
        0
      );
      if (Math.abs(somaParcelas - 1) > 0.001) {
        return NextResponse.json(
          {
            success: false,
            error: `Soma dos percentuais das parcelas (${(somaParcelas * 100).toFixed(1)}%) deve ser 100%`,
          },
          { status: 400 }
        );
      }

      // Gerar dados da matriz
      const dadosMatriz = gerarDadosMatrizParaBanco(vendaId, corretores, parcelas);

      // Transacao para salvar matriz
      await client.query("BEGIN");

      try {
        // Limpar matriz anterior
        await client.query(`DELETE FROM comissao_matriz WHERE venda_id = $1`, [vendaId]);

        // Inserir novos calculos
        for (const item of dadosMatriz) {
          await client.query(
            `INSERT INTO comissao_matriz (
              venda_id, parcela_id, corretor_id,
              valor_calculado, percentual_usado, formula_aplicada
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              item.venda_id,
              item.parcela_id,
              item.corretor_id,
              item.valor_calculado,
              item.percentual_usado,
              item.formula_aplicada,
            ]
          );
        }

        // Atualizar status da venda
        await client.query(
          `UPDATE comissao_vendas SET status = 'calculada', updated_at = NOW() WHERE id = $1`,
          [vendaId]
        );

        await client.query("COMMIT");

        // Preparar resposta com totais
        const totaisPorCorretor: Record<string, number> = {};
        const totaisPorParcela: Record<string, number> = {};

        for (const corretor of corretores) {
          totaisPorCorretor[corretor.nome] = parseFloat(corretor.valor_comissao);
        }

        for (const parcela of parcelas) {
          const desc = parcela.descricao || `Parcela ${parcela.numero}`;
          totaisPorParcela[desc] = arredondarValor(
            parseFloat(venda.valor_comissao_total) * parseFloat(parcela.percentual_comissao)
          );
        }

        // Buscar matriz calculada
        const { rows: matrizRows } = await client.query(
          `SELECT
            m.*,
            c.nome as corretor_nome,
            COALESCE(p.descricao, 'Parcela ' || p.numero) as parcela_descricao
          FROM comissao_matriz m
          JOIN comissao_corretores c ON c.id = m.corretor_id
          JOIN comissao_parcelas p ON p.id = m.parcela_id
          WHERE m.venda_id = $1
          ORDER BY c.nome, p.numero`,
          [vendaId]
        );

        return NextResponse.json({
          success: true,
          venda_id: vendaId,
          matriz: matrizRows.map((row: any) => ({
            corretor_nome: row.corretor_nome,
            parcela_descricao: row.parcela_descricao,
            valor_calculado: parseFloat(row.valor_calculado),
          })),
          totais: {
            por_corretor: totaisPorCorretor,
            por_parcela: totaisPorParcela,
          },
          message: "Matriz calculada com sucesso",
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  } catch (error: any) {
    console.error("Erro ao calcular matriz:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
