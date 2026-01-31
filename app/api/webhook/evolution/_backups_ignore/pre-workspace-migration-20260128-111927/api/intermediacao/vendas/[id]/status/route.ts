/**
 * API: Mudanca de Status da Venda
 *
 * PATCH /api/intermediacao/vendas/:id/status - Mudar status da venda
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";
import { z } from "zod";

// Schema de validacao
const statusSchema = z.object({
  status: z.enum(['rascunho', 'em_processamento', 'concluida', 'paga', 'cancelada']),
  motivo: z.string().optional(),
});

type StatusVenda = 'rascunho' | 'em_processamento' | 'concluida' | 'paga' | 'cancelada';

// Mapa de transicoes permitidas
const transicoesPermitidas: Record<StatusVenda, StatusVenda[]> = {
  'rascunho': ['em_processamento', 'cancelada'],
  'em_processamento': ['concluida', 'rascunho', 'cancelada'],
  'concluida': ['paga', 'cancelada'],
  'paga': [], // Status final
  'cancelada': ['rascunho'], // Pode reabrir como rascunho
};

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH - Mudar status da venda
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar dados de entrada
    const parseResult = statusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados invalidos",
          details: parseResult.error.errors
        },
        { status: 400 }
      );
    }

    const { status: novoStatus, motivo } = parseResult.data;

    // Buscar venda atual
    const { rows: vendaRows } = await dbQuery(
      `SELECT v.*,
        (SELECT COUNT(*) FROM im_distribuicao WHERE venda_id = v.id) as qtd_distribuicoes,
        (SELECT COALESCE(SUM(percentual), 0) FROM im_distribuicao WHERE venda_id = v.id) as soma_percentuais,
        (SELECT COUNT(*) FROM im_parcelas WHERE venda_id = v.id) as qtd_parcelas,
        (SELECT COUNT(*) FROM im_parcelas WHERE venda_id = v.id AND status = 'paga') as qtd_parcelas_pagas
      FROM im_vendas v
      WHERE v.id = $1 AND v.tenant_id = $2`,
      [id, ctx.tenantId]
    );

    if (vendaRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const venda = vendaRows[0];
    const statusAtual = venda.status as StatusVenda;

    // Verificar se a transicao e permitida
    if (!transicoesPermitidas[statusAtual].includes(novoStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Transicao de '${statusAtual}' para '${novoStatus}' nao e permitida`,
          transicoes_permitidas: transicoesPermitidas[statusAtual],
        },
        { status: 400 }
      );
    }

    // Validacoes especificas por transicao
    const validacoes: { valido: boolean; mensagem: string }[] = [];

    // rascunho -> em_processamento
    if (statusAtual === 'rascunho' && novoStatus === 'em_processamento') {
      if (venda.percentual_intermediacao <= 0) {
        validacoes.push({
          valido: false,
          mensagem: "Venda deve ter percentual de intermediacao maior que zero",
        });
      }
    }

    // em_processamento -> concluida
    if (statusAtual === 'em_processamento' && novoStatus === 'concluida') {
      // Verificar se toda comissao foi distribuida
      if (parseInt(venda.qtd_distribuicoes) === 0) {
        validacoes.push({
          valido: false,
          mensagem: "Venda deve ter pelo menos uma distribuicao de comissao",
        });
      }

      const somaPercentuais = parseFloat(venda.soma_percentuais);
      if (Math.abs(somaPercentuais - venda.percentual_intermediacao) > 0.01) {
        validacoes.push({
          valido: false,
          mensagem: `Soma das distribuicoes (${somaPercentuais}%) deve ser igual ao percentual de intermediacao (${venda.percentual_intermediacao}%)`,
        });
      }

      // Verificar se parcelas foram criadas
      if (parseInt(venda.qtd_parcelas) === 0) {
        validacoes.push({
          valido: false,
          mensagem: "Venda deve ter parcelas criadas antes de ser concluida",
        });
      }
    }

    // concluida -> paga (automático ou manual)
    if (statusAtual === 'concluida' && novoStatus === 'paga') {
      const qtdParcelas = parseInt(venda.qtd_parcelas);
      const qtdParcelasPagas = parseInt(venda.qtd_parcelas_pagas);

      if (qtdParcelas === 0) {
        validacoes.push({
          valido: false,
          mensagem: "Venda nao possui parcelas",
        });
      } else if (qtdParcelasPagas < qtdParcelas) {
        validacoes.push({
          valido: false,
          mensagem: `Todas as parcelas devem estar pagas. Pagas: ${qtdParcelasPagas}/${qtdParcelas}`,
        });
      }
    }

    // Verificar validacoes
    const errosValidacao = validacoes.filter(v => !v.valido);
    if (errosValidacao.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validacoes nao atendidas",
          validacoes: errosValidacao.map(v => v.mensagem),
        },
        { status: 400 }
      );
    }

    // Iniciar transacao
    await dbQuery("BEGIN");

    try {
      // Atualizar status
      const { rows: updatedRows } = await dbQuery(
        `UPDATE im_vendas
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [novoStatus, id, ctx.tenantId]
      );

      // Registrar auditoria
      await dbQuery(
        `INSERT INTO im_auditoria (
          entidade, entidade_id, acao, dados_anteriores, dados_novos, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'venda',
          id,
          'mudanca_status',
          JSON.stringify({ status: statusAtual }),
          JSON.stringify({ status: novoStatus, motivo: motivo || null }),
          ctx.user.id,
        ]
      );

      await dbQuery("COMMIT");

      return NextResponse.json({
        success: true,
        data: updatedRows[0],
        message: `Status alterado de '${statusAtual}' para '${novoStatus}'`,
      });

    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao mudar status da venda:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET - Obter transicoes de status permitidas
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Buscar venda atual
    const { rows: vendaRows } = await dbQuery(
      `SELECT status FROM im_vendas WHERE id = $1 AND tenant_id = $2`,
      [id, ctx.tenantId]
    );

    if (vendaRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const statusAtual = vendaRows[0].status as StatusVenda;

    return NextResponse.json({
      success: true,
      data: {
        status_atual: statusAtual,
        transicoes_permitidas: transicoesPermitidas[statusAtual],
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar transicoes permitidas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
