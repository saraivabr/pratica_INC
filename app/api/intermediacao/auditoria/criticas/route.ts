/**
 * API: Auditoria - Operações Críticas
 *
 * GET /api/intermediacao/auditoria/criticas - Operações críticas recentes
 * Operacoes criticas incluem:
 * - DELETE em qualquer tabela
 * - Desfazer pagamento (mudanca status de pago para pendente)
 * - Alteracao de valor > 10%
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "auditor"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas admin, gerente ou auditor podem acessar operações críticas." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Buscar todas as operacoes que podem ser criticas
    const query = `
      SELECT
        la.id,
        la.tabela,
        la.operacao,
        la.registro_id,
        la.dados_anteriores,
        la.dados_novos,
        la.justificativa,
        la.created_at,
        la.usuario_id,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM log_auditoria la
      LEFT JOIN users u ON u.id = la.usuario_id
      WHERE
        la.operacao = 'DELETE'
        OR (
          la.operacao = 'UPDATE'
          AND (
            -- Desfazer pagamento: status mudou de 'pago' para outro
            (la.dados_anteriores->>'status' = 'pago' AND la.dados_novos->>'status' != 'pago')
            OR
            -- Alteracao de valor significativa (campos de valor)
            (
              la.dados_anteriores->>'valor' IS NOT NULL
              AND la.dados_novos->>'valor' IS NOT NULL
              AND la.dados_anteriores->>'valor' != la.dados_novos->>'valor'
            )
            OR
            (
              la.dados_anteriores->>'valor_total' IS NOT NULL
              AND la.dados_novos->>'valor_total' IS NOT NULL
              AND la.dados_anteriores->>'valor_total' != la.dados_novos->>'valor_total'
            )
            OR
            (
              la.dados_anteriores->>'valor_comissao' IS NOT NULL
              AND la.dados_novos->>'valor_comissao' IS NOT NULL
              AND la.dados_anteriores->>'valor_comissao' != la.dados_novos->>'valor_comissao'
            )
          )
        )
      ORDER BY la.created_at DESC
      LIMIT $1
    `;

    const { rows } = await dbQuery(query, [limit * 2]); // Buscar mais para filtrar depois

    // Filtrar e classificar operacoes criticas
    const operacoesCriticas = rows
      .map(row => {
        const criticidade = classificarCriticidade(row);
        if (!criticidade) return null;

        return {
          id: row.id,
          tabela: row.tabela,
          operacao: row.operacao,
          registro_id: row.registro_id,
          tipo_critico: criticidade.tipo,
          nivel_criticidade: criticidade.nivel,
          descricao: criticidade.descricao,
          dados_anteriores: row.dados_anteriores,
          dados_novos: row.dados_novos,
          justificativa: row.justificativa,
          created_at: row.created_at,
          usuario: {
            id: row.usuario_id,
            nome: row.usuario_nome,
            email: row.usuario_email
          }
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    // Resumo por tipo de operacao critica
    const resumoPorTipo: Record<string, number> = {};
    operacoesCriticas.forEach(op => {
      if (op) {
        resumoPorTipo[op.tipo_critico] = (resumoPorTipo[op.tipo_critico] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        operacoes: operacoesCriticas,
        total: operacoesCriticas.length,
        resumo_por_tipo: Object.entries(resumoPorTipo).map(([tipo, quantidade]) => ({
          tipo,
          quantidade
        }))
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar operações críticas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * Classifica a criticidade de uma operacao
 */
function classificarCriticidade(row: any): { tipo: string; nivel: "alta" | "media" | "baixa"; descricao: string } | null {
  // DELETE sempre e critico
  if (row.operacao === "DELETE") {
    return {
      tipo: "exclusao",
      nivel: "alta",
      descricao: `Exclusao de registro na tabela ${row.tabela}`
    };
  }

  // Desfazer pagamento
  const statusAnterior = row.dados_anteriores?.status;
  const statusNovo = row.dados_novos?.status;
  if (statusAnterior === "pago" && statusNovo && statusNovo !== "pago") {
    return {
      tipo: "desfazer_pagamento",
      nivel: "alta",
      descricao: `Pagamento desfeito: status alterado de "pago" para "${statusNovo}"`
    };
  }

  // Alteracao de valor > 10%
  const camposValor = ["valor", "valor_total", "valor_comissao"];
  for (const campo of camposValor) {
    const valorAnterior = parseFloat(row.dados_anteriores?.[campo]);
    const valorNovo = parseFloat(row.dados_novos?.[campo]);

    if (!isNaN(valorAnterior) && !isNaN(valorNovo) && valorAnterior > 0) {
      const percentualMudanca = Math.abs((valorNovo - valorAnterior) / valorAnterior) * 100;

      if (percentualMudanca > 10) {
        const nivel = percentualMudanca > 50 ? "alta" : percentualMudanca > 25 ? "media" : "baixa";
        return {
          tipo: "alteracao_valor_significativa",
          nivel,
          descricao: `Campo "${campo}" alterado de R$ ${valorAnterior.toFixed(2)} para R$ ${valorNovo.toFixed(2)} (${percentualMudanca.toFixed(1)}% de mudanca)`
        };
      }
    }
  }

  return null;
}
