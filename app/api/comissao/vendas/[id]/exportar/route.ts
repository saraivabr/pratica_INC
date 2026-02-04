/**
 * API: Exportar Matriz de Comissoes
 *
 * GET /api/comissao/vendas/[id]/exportar?formato=excel|csv - Exporta matriz
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { arredondarValor } from "@/lib/comissao/calculations";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET - Exportar matriz para CSV ou Excel
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const vendaId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const formato = searchParams.get("formato") || "csv";

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
      `SELECT * FROM comissao_matriz WHERE venda_id = $1`,
      [vendaId]
    );

    // Gerar CSV
    const linhas: string[] = [];

    // Cabecalho com info da venda
    linhas.push(`PLANILHA DE COMISSAO - ${venda.codigo}`);
    linhas.push(`Empreendimento: ${venda.empreendimento || "-"}`);
    linhas.push(`Unidade: ${venda.unidade || "-"}`);
    linhas.push(`Cliente: ${venda.cliente_nome || "-"}`);
    linhas.push(`Valor Venda: R$ ${parseFloat(venda.valor_venda).toFixed(2)}`);
    linhas.push(`Comissao (${(parseFloat(venda.percentual_comissao) * 100).toFixed(1)}%): R$ ${parseFloat(venda.valor_comissao_total).toFixed(2)}`);
    linhas.push(`Data Venda: ${new Date(venda.data_venda).toLocaleDateString("pt-BR")}`);
    linhas.push(`Status: ${venda.status}`);
    linhas.push("");

    // Cabecalho da tabela
    const colunas = ["CORRETOR", "PARTICIPACAO"];
    for (const parcela of parcelas) {
      const desc = parcela.descricao || `Parcela ${parcela.numero}`;
      colunas.push(desc);
    }
    colunas.push("TOTAL");
    linhas.push(colunas.join(";"));

    // Linhas dos corretores
    for (const corretor of corretores) {
      const cols = [
        corretor.nome,
        `${(parseFloat(corretor.percentual_participacao) * 100).toFixed(1)}%`,
      ];

      let totalCorretor = 0;
      for (const parcela of parcelas) {
        const item = matrizRows.find(
          (m: any) => m.corretor_id === corretor.id && m.parcela_id === parcela.id
        );
        const valor = item ? parseFloat(item.valor_calculado) : 0;
        totalCorretor += valor;
        cols.push(`R$ ${valor.toFixed(2)}`);
      }

      cols.push(`R$ ${arredondarValor(totalCorretor).toFixed(2)}`);
      linhas.push(cols.join(";"));
    }

    // Linha de totais
    const totaisCols = ["TOTAL", "100%"];
    let totalGeral = 0;
    for (const parcela of parcelas) {
      let totalParcela = 0;
      for (const corretor of corretores) {
        const item = matrizRows.find(
          (m: any) => m.corretor_id === corretor.id && m.parcela_id === parcela.id
        );
        if (item) totalParcela += parseFloat(item.valor_calculado);
      }
      totaisCols.push(`R$ ${arredondarValor(totalParcela).toFixed(2)}`);
      totalGeral += totalParcela;
    }
    totaisCols.push(`R$ ${arredondarValor(totalGeral).toFixed(2)}`);
    linhas.push(totaisCols.join(";"));

    // Linha de datas previstas
    linhas.push("");
    const datasCols = ["Data Prevista", ""];
    for (const parcela of parcelas) {
      datasCols.push(new Date(parcela.data_prevista).toLocaleDateString("pt-BR"));
    }
    datasCols.push("");
    linhas.push(datasCols.join(";"));

    const csv = linhas.join("\n");

    // Retornar arquivo
    const filename = `comissao-${venda.codigo}-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao exportar matriz:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
