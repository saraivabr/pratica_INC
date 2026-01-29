/**
 * API: Pagamento em Lote
 *
 * POST /api/intermediacao/pagamentos/lote - Marcar multiplas parcelas como pagas
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const { parcela_ids, data_pagamento, metodo, referencia } = body;

    // Validacoes
    if (!parcela_ids || !Array.isArray(parcela_ids) || parcela_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lista de parcelas e obrigatoria" },
        { status: 400 }
      );
    }

    if (parcela_ids.length > 100) {
      return NextResponse.json(
        { success: false, error: "Maximo de 100 parcelas por lote" },
        { status: 400 }
      );
    }

    if (!data_pagamento) {
      return NextResponse.json(
        { success: false, error: "Data de pagamento e obrigatoria" },
        { status: 400 }
      );
    }

    if (!metodo) {
      return NextResponse.json(
        { success: false, error: "Metodo de pagamento e obrigatorio" },
        { status: 400 }
      );
    }

    const metodosValidos = ["transferencia", "deposito", "pix", "cheque", "outro"];
    if (!metodosValidos.includes(metodo.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Metodo invalido. Valores aceitos: ${metodosValidos.join(", ")}` },
        { status: 400 }
      );
    }

    // Buscar parcelas - filter by workspace_id
    const placeholders = parcela_ids.map((_, i) => `$${i + 2}`).join(", ");
    const parcelasResult = await dbQuery(
      `SELECT p.*, v.id as venda_id
       FROM parcelas_intermediacao p
       LEFT JOIN vendas_intermediacao v ON v.id = p.venda_id
       WHERE p.id IN (${placeholders}) AND p.workspace_id = $1`,
      [ctx.workspaceId, ...parcela_ids]
    );

    if (parcelasResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhuma parcela encontrada" },
        { status: 404 }
      );
    }

    // Validar cada parcela
    const parcelasValidas: any[] = [];
    const erros: any[] = [];

    for (const parcela of parcelasResult.rows) {
      if (parcela.status === "paga") {
        erros.push({
          parcela_id: parcela.id,
          erro: "Parcela ja esta paga"
        });
        continue;
      }

      if (parcela.status === "cancelada") {
        erros.push({
          parcela_id: parcela.id,
          erro: "Parcela esta cancelada"
        });
        continue;
      }

      // Verificar se ja existe pagamento - filter by workspace_id
      const pagamentoExistente = await dbQuery(
        `SELECT id FROM pagamentos_intermediacao WHERE parcela_id = $1 AND workspace_id = $2`,
        [parcela.id, ctx.workspaceId]
      );

      if (pagamentoExistente.rows.length > 0) {
        erros.push({
          parcela_id: parcela.id,
          erro: "Ja existe pagamento registrado"
        });
        continue;
      }

      parcelasValidas.push(parcela);
    }

    if (parcelasValidas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhuma parcela valida para pagamento",
          detalhes: erros
        },
        { status: 400 }
      );
    }

    // Processar pagamentos
    const pagamentosProcessados: any[] = [];
    const vendasParaVerificar = new Set<string>();

    for (const parcela of parcelasValidas) {
      // Criar registro de pagamento - include workspace_id
      const pagamentoResult = await dbQuery(
        `INSERT INTO pagamentos_intermediacao
         (workspace_id, parcela_id, beneficiario_id, valor, data_pagamento, metodo, referencia, registrado_por, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          ctx.workspaceId,
          parcela.id,
          parcela.beneficiario_id,
          parcela.valor,
          data_pagamento,
          metodo.toLowerCase(),
          referencia || null,
          ctx.user.id
        ]
      );

      // Atualizar status da parcela - filter by workspace_id
      await dbQuery(
        `UPDATE parcelas_intermediacao
         SET status = 'paga', updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2`,
        [parcela.id, ctx.workspaceId]
      );

      // Registrar auditoria - include workspace_id
      await dbQuery(
        `INSERT INTO log_auditoria_intermediacao
         (workspace_id, entidade, entidade_id, acao, usuario_id, usuario_nome, dados_novos, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          ctx.workspaceId,
          "parcela",
          parcela.id,
          "pagar_lote",
          ctx.user.id,
          ctx.user.nome,
          JSON.stringify({
            pagamento_id: pagamentoResult.rows[0].id,
            data_pagamento,
            metodo,
            valor: parcela.valor,
            lote_referencia: referencia
          })
        ]
      );

      pagamentosProcessados.push({
        parcela_id: parcela.id,
        pagamento_id: pagamentoResult.rows[0].id,
        valor: parseFloat(parcela.valor)
      });

      vendasParaVerificar.add(parcela.venda_id);
    }

    // Verificar vendas que podem ter sido totalmente pagas - filter by workspace_id
    const vendasAtualizadas: string[] = [];
    for (const vendaId of vendasParaVerificar) {
      const parcelasPendentesResult = await dbQuery(
        `SELECT COUNT(*) as pendentes
         FROM parcelas_intermediacao
         WHERE venda_id = $1 AND status != 'paga' AND status != 'cancelada' AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      const parcelasPendentes = parseInt(parcelasPendentesResult.rows[0]?.pendentes || "0");

      if (parcelasPendentes === 0) {
        await dbQuery(
          `UPDATE vendas_intermediacao
           SET status = 'paga', updated_at = NOW()
           WHERE id = $1 AND workspace_id = $2`,
          [vendaId, ctx.workspaceId]
        );
        vendasAtualizadas.push(vendaId);
      }
    }

    // Calcular totais
    const valorTotalPago = pagamentosProcessados.reduce((acc, p) => acc + p.valor, 0);

    return NextResponse.json({
      success: true,
      data: {
        pagamentos_processados: pagamentosProcessados,
        quantidade_processada: pagamentosProcessados.length,
        valor_total_pago: valorTotalPago,
        vendas_totalmente_pagas: vendasAtualizadas,
        erros: erros.length > 0 ? erros : undefined
      },
      message: `${pagamentosProcessados.length} pagamento(s) registrado(s) com sucesso`
    });
  } catch (error: any) {
    console.error("Erro ao processar pagamento em lote:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
