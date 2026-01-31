/**
 * API: Auditoria - Histórico de um Registro Específico
 *
 * GET /api/intermediacao/auditoria/registro/:tabela/:registroId
 * Timeline completa de um registro desde a criação
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

// Tabelas permitidas para consulta
const TABELAS_PERMITIDAS = [
  "vendas",
  "beneficiarios",
  "distribuicao_comissao",
  "parcelas",
  "pagamentos"
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tabela: string; registroId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "auditor", "financeiro"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Permissão insuficiente para visualizar histórico de auditoria." },
        { status: 403 }
      );
    }

    const { tabela, registroId } = await params;

    // Validar tabela
    if (!TABELAS_PERMITIDAS.includes(tabela.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Tabela inválida. Tabelas permitidas: ${TABELAS_PERMITIDAS.join(", ")}` },
        { status: 400 }
      );
    }

    // Buscar todos os logs do registro ordenados cronologicamente
    const query = `
      SELECT
        la.id,
        la.tabela,
        la.operacao,
        la.registro_id,
        la.dados_anteriores,
        la.dados_novos,
        la.ip_address,
        la.justificativa,
        la.created_at,
        la.usuario_id,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM log_auditoria la
      LEFT JOIN users u ON u.id = la.usuario_id
      WHERE la.tabela = $1 AND la.registro_id = $2
      ORDER BY la.created_at ASC
    `;
    const { rows } = await dbQuery(query, [tabela, registroId]);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          tabela,
          registro_id: registroId,
          timeline: [],
          total_eventos: 0,
          resumo: {
            criado_em: null,
            criado_por: null,
            ultima_alteracao: null,
            alterado_por: null,
            total_alteracoes: 0
          }
        }
      });
    }

    // Construir timeline
    const timeline = rows.map((row, index) => {
      const diff = gerarDiff(row.dados_anteriores, row.dados_novos);

      return {
        evento_numero: index + 1,
        id: row.id,
        operacao: row.operacao,
        descricao: gerarDescricaoEvento(row.operacao, diff),
        dados_anteriores: row.dados_anteriores,
        dados_novos: row.dados_novos,
        diff,
        justificativa: row.justificativa,
        created_at: row.created_at,
        usuario: {
          id: row.usuario_id,
          nome: row.usuario_nome,
          email: row.usuario_email
        }
      };
    });

    // Gerar resumo
    const primeiroEvento = rows[0];
    const ultimoEvento = rows[rows.length - 1];
    const totalAlteracoes = rows.filter(r => r.operacao === "UPDATE").length;

    return NextResponse.json({
      success: true,
      data: {
        tabela,
        registro_id: registroId,
        timeline,
        total_eventos: rows.length,
        resumo: {
          criado_em: primeiroEvento.operacao === "INSERT" ? primeiroEvento.created_at : null,
          criado_por: primeiroEvento.operacao === "INSERT" ? primeiroEvento.usuario_nome : null,
          ultima_alteracao: ultimoEvento.created_at,
          alterado_por: ultimoEvento.usuario_nome,
          total_alteracoes: totalAlteracoes,
          foi_excluido: rows.some(r => r.operacao === "DELETE")
        }
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar histórico do registro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * Gera um diff detalhado entre dados anteriores e novos
 */
function gerarDiff(dadosAnteriores: any, dadosNovos: any): any[] {
  const diff: any[] = [];

  const anterior = dadosAnteriores || {};
  const novo = dadosNovos || {};

  const todasChaves = new Set([
    ...Object.keys(anterior),
    ...Object.keys(novo)
  ]);

  for (const chave of todasChaves) {
    const valorAnterior = anterior[chave];
    const valorNovo = novo[chave];

    if (["created_at", "updated_at", "id"].includes(chave)) continue;

    const anteriorStr = JSON.stringify(valorAnterior);
    const novoStr = JSON.stringify(valorNovo);

    if (anteriorStr !== novoStr) {
      diff.push({
        campo: chave,
        valor_anterior: valorAnterior,
        valor_novo: valorNovo,
        tipo: valorAnterior === undefined ? "adicionado" :
              valorNovo === undefined ? "removido" : "alterado"
      });
    }
  }

  return diff;
}

/**
 * Gera uma descricao legivel do evento
 */
function gerarDescricaoEvento(operacao: string, diff: any[]): string {
  switch (operacao) {
    case "INSERT":
      return "Registro criado";
    case "DELETE":
      return "Registro excluido";
    case "UPDATE":
      if (diff.length === 0) return "Registro atualizado";
      const campos = diff.map(d => d.campo).join(", ");
      return `Campos alterados: ${campos}`;
    default:
      return `Operacao: ${operacao}`;
  }
}
