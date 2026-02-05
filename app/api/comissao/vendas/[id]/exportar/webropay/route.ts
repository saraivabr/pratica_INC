/**
 * API: Exportar Matriz de Comissoes no Formato Webropay
 *
 * GET /api/comissao/vendas/[id]/exportar/webropay - Exporta CSV no formato Webropay
 *
 * Formato CSV:
 * CARGO,BENEFICIARIO,CPF_CNPJ,TOTAL,15/01/2026,15/02/2026,...
 * IMOBILIARIA,MEDI INTELIGENCIA,42.821.818/0001-15,"R$ 13.568,18","R$ 4.347,81",...
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { arredondarValor } from "@/lib/comissao/calculations";
import { CARGO_LABELS, type TipoDocumento } from "@/lib/comissao/types";

interface Params {
  params: Promise<{ id: string }>;
}

// ============================================================================
// FUNCOES AUXILIARES
// ============================================================================

/**
 * Formata valor monetario para CSV no padrao brasileiro
 * Ex: 1234.56 -> "R$ 1.234,56"
 */
function formatarValorCSV(valor: number): string {
  const valorArredondado = arredondarValor(valor);
  const formatado = valorArredondado.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `R$ ${formatado}`;
}

/**
 * Formata data para CSV no padrao brasileiro
 * Ex: 2026-01-15 -> 15/01/2026
 */
function formatarDataCSV(data: string): string {
  if (!data) return "";
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata documento (CPF ou CNPJ) para exibicao
 * CPF: 353.241.028-14
 * CNPJ: 42.821.818/0001-15
 */
function formatarDocumentoCSV(documento: string | null, tipo: TipoDocumento | string | null): string {
  if (!documento) return "";

  // Remove caracteres nao numericos
  const numeros = documento.replace(/\D/g, "");

  // Detecta tipo pelo tamanho se nao informado
  const tipoDoc = tipo || (numeros.length > 11 ? "cnpj" : "cpf");

  if (tipoDoc === "cnpj" && numeros.length === 14) {
    // Formato: 00.000.000/0000-00
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
  } else if (tipoDoc === "cpf" && numeros.length === 11) {
    // Formato: 000.000.000-00
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
  }

  // Retorna como esta se nao conseguir formatar
  return documento;
}

/**
 * Escapa valor para CSV (adiciona aspas se necessario)
 */
function escaparCSV(valor: string): string {
  // Se contem virgula, aspas ou quebra de linha, envolve em aspas
  if (valor.includes(",") || valor.includes('"') || valor.includes("\n")) {
    // Escapa aspas duplicando-as
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Obtem label do cargo (ou retorna o valor original se nao encontrado)
 */
function obterLabelCargo(cargo: string | null): string {
  if (!cargo) return "";
  return CARGO_LABELS[cargo] || cargo.toUpperCase();
}

// ============================================================================
// HANDLER GET
// ============================================================================

/**
 * GET - Exportar matriz no formato Webropay (CSV)
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

    // Buscar corretores (beneficiarios)
    const { rows: corretores } = await dbQuery(
      `SELECT * FROM comissao_corretores
       WHERE venda_id = $1
       ORDER BY grupo NULLS LAST, prioridade DESC, nome`,
      [vendaId]
    );

    // Buscar parcelas ordenadas por data
    const { rows: parcelas } = await dbQuery(
      `SELECT * FROM comissao_parcelas
       WHERE venda_id = $1
       ORDER BY data_prevista, numero`,
      [vendaId]
    );

    // Buscar matriz calculada
    const { rows: matrizRows } = await dbQuery(
      `SELECT
        m.*,
        COALESCE(m.valor_manual, m.valor_calculado) as valor_final
       FROM comissao_matriz m
       WHERE m.venda_id = $1`,
      [vendaId]
    );

    // ========================================================================
    // MONTAR CSV NO FORMATO WEBROPAY
    // ========================================================================

    const linhas: string[] = [];

    // Cabecalho: CARGO,BENEFICIARIO,CPF_CNPJ,TOTAL,DATA_1,DATA_2,...
    const cabecalho = ["CARGO", "BENEFICIARIO", "CPF_CNPJ", "TOTAL"];
    for (const parcela of parcelas) {
      cabecalho.push(formatarDataCSV(parcela.data_prevista));
    }
    linhas.push(cabecalho.join(","));

    // Linhas dos beneficiarios
    for (const corretor of corretores) {
      const cols: string[] = [];

      // CARGO
      const cargo = obterLabelCargo(corretor.cargo);
      cols.push(escaparCSV(cargo));

      // BENEFICIARIO (nome)
      cols.push(escaparCSV(corretor.nome || ""));

      // CPF_CNPJ
      const documento = formatarDocumentoCSV(
        corretor.documento || corretor.cpf,
        corretor.tipo_documento
      );
      cols.push(escaparCSV(documento));

      // Calcular valores por parcela e total
      let totalBeneficiario = 0;
      const valoresParcelas: number[] = [];

      for (const parcela of parcelas) {
        const item = matrizRows.find(
          (m: any) => m.corretor_id === corretor.id && m.parcela_id === parcela.id
        );
        const valor = item ? parseFloat(item.valor_final) : 0;
        valoresParcelas.push(valor);
        totalBeneficiario += valor;
      }

      // TOTAL
      cols.push(escaparCSV(formatarValorCSV(totalBeneficiario)));

      // Valores por data/parcela
      for (const valor of valoresParcelas) {
        cols.push(escaparCSV(formatarValorCSV(valor)));
      }

      linhas.push(cols.join(","));
    }

    // Montar CSV final
    const csv = linhas.join("\n");

    // Retornar arquivo para download
    const codigoVenda = venda.codigo || `venda-${vendaId}`;
    const filename = `comissao-${codigoVenda}-webropay.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao exportar Webropay:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
