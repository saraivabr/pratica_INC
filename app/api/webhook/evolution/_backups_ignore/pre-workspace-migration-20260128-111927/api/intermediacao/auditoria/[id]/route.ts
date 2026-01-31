/**
 * API: Auditoria - Detalhe do Log
 *
 * GET /api/intermediacao/auditoria/:id - Detalhe do log de auditoria
 * Inclui: diff completo (antes/depois), entidade atual (se existe)
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

// Mapeamento de tabelas para consulta da entidade atual
const TABELA_QUERIES: Record<string, string> = {
  vendas: "SELECT * FROM vendas WHERE id = $1",
  beneficiarios: "SELECT * FROM beneficiarios WHERE id = $1",
  distribuicao_comissao: "SELECT * FROM distribuicao_comissao WHERE id = $1",
  parcelas: "SELECT * FROM parcelas WHERE id = $1",
  pagamentos: "SELECT * FROM pagamentos WHERE id = $1",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "auditor"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas admin, gerente ou auditor podem acessar logs de auditoria." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const logId = parseInt(id);

    if (isNaN(logId)) {
      return NextResponse.json(
        { success: false, error: "ID de log inválido" },
        { status: 400 }
      );
    }

    // Buscar log de auditoria
    const logQuery = `
      SELECT
        la.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        u.role as usuario_role
      FROM log_auditoria la
      LEFT JOIN users u ON u.id = la.usuario_id
      WHERE la.id = $1
    `;
    const logResult = await dbQuery(logQuery, [logId]);

    if (logResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Log de auditoria não encontrado" },
        { status: 404 }
      );
    }

    const log = logResult.rows[0];

    // Tentar buscar a entidade atual se a operacao nao foi DELETE
    let entidadeAtual = null;
    if (log.operacao !== "DELETE" && log.tabela && log.registro_id) {
      const tabelaQuery = TABELA_QUERIES[log.tabela.toLowerCase()];
      if (tabelaQuery) {
        try {
          const entidadeResult = await dbQuery(tabelaQuery, [log.registro_id]);
          if (entidadeResult.rows.length > 0) {
            entidadeAtual = entidadeResult.rows[0];
          }
        } catch (e) {
          // Entidade pode nao existir mais, ignorar erro
          console.warn(`Entidade ${log.tabela}/${log.registro_id} nao encontrada`);
        }
      }
    }

    // Gerar diff entre dados anteriores e novos
    const diff = gerarDiff(log.dados_anteriores, log.dados_novos);

    return NextResponse.json({
      success: true,
      data: {
        id: log.id,
        tabela: log.tabela,
        operacao: log.operacao,
        registro_id: log.registro_id,
        dados_anteriores: log.dados_anteriores,
        dados_novos: log.dados_novos,
        diff,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        justificativa: log.justificativa,
        created_at: log.created_at,
        usuario: {
          id: log.usuario_id,
          nome: log.usuario_nome,
          email: log.usuario_email,
          role: log.usuario_role
        },
        entidade_atual: entidadeAtual,
        entidade_existe: entidadeAtual !== null
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar detalhe do log de auditoria:", error);
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

  // Coletar todas as chaves unicas
  const todasChaves = new Set([
    ...Object.keys(anterior),
    ...Object.keys(novo)
  ]);

  for (const chave of todasChaves) {
    const valorAnterior = anterior[chave];
    const valorNovo = novo[chave];

    // Ignorar campos de controle
    if (["created_at", "updated_at", "id"].includes(chave)) continue;

    // Verificar se houve mudanca
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
