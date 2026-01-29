/**
 * API: Pagamento Individual
 *
 * GET /api/intermediacao/pagamentos/:id - Detalhe do pagamento
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const pagamentoId = id;

    const query = `
      SELECT
        pg.*,
        p.id as parcela_id,
        p.numero_parcela,
        p.valor as parcela_valor,
        p.data_vencimento,
        p.status as parcela_status,
        p.venda_id,
        v.valor_venda,
        v.cliente_nome,
        v.empreendimento,
        v.unidade,
        v.data_venda,
        v.percentual_intermediacao,
        v.valor_comissao_total,
        v.status as venda_status,
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        b.cpf_cnpj as beneficiario_documento,
        b.cargo as beneficiario_cargo,
        b.email as beneficiario_email,
        b.telefone as beneficiario_telefone,
        dc.percentual as distribuicao_percentual,
        dc.valor as distribuicao_valor,
        u.nome as registrado_por_nome,
        u.email as registrado_por_email
      FROM pagamentos_intermediacao pg
      LEFT JOIN parcelas_intermediacao p ON p.id = pg.parcela_id
      LEFT JOIN vendas_intermediacao v ON v.id = p.venda_id
      LEFT JOIN beneficiarios_intermediacao b ON b.id = pg.beneficiario_id
      LEFT JOIN distribuicao_comissao dc ON dc.venda_id = p.venda_id AND dc.beneficiario_id = pg.beneficiario_id
      LEFT JOIN users u ON u.id = pg.registrado_por
      WHERE pg.id = $1 AND pg.workspace_id = $2
    `;

    const result = await dbQuery(query, [pagamentoId, ctx.workspaceId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pagamento nao encontrado" },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    const pagamento = {
      id: row.id,
      valor: parseFloat(row.valor),
      data_pagamento: row.data_pagamento,
      metodo: row.metodo,
      comprovante: row.comprovante,
      referencia: row.referencia,
      registrado_por: {
        id: row.registrado_por,
        nome: row.registrado_por_nome,
        email: row.registrado_por_email
      },
      created_at: row.created_at,
      parcela: row.parcela_id ? {
        id: row.parcela_id,
        numero_parcela: row.numero_parcela,
        valor: parseFloat(row.parcela_valor),
        data_vencimento: row.data_vencimento,
        status: row.parcela_status
      } : null,
      venda: row.venda_id ? {
        id: row.venda_id,
        valor_venda: parseFloat(row.valor_venda),
        cliente_nome: row.cliente_nome,
        empreendimento: row.empreendimento,
        unidade: row.unidade,
        data_venda: row.data_venda,
        percentual_intermediacao: parseFloat(row.percentual_intermediacao),
        valor_comissao_total: parseFloat(row.valor_comissao_total),
        status: row.venda_status
      } : null,
      beneficiario: row.beneficiario_id ? {
        id: row.beneficiario_id,
        nome: row.beneficiario_nome,
        documento: row.beneficiario_documento,
        cargo: row.beneficiario_cargo,
        email: row.beneficiario_email,
        telefone: row.beneficiario_telefone
      } : null,
      distribuicao: {
        percentual: parseFloat(row.distribuicao_percentual) || 0,
        valor: parseFloat(row.distribuicao_valor) || 0
      }
    };

    return NextResponse.json({
      success: true,
      data: pagamento
    });
  } catch (error: any) {
    console.error("Erro ao buscar pagamento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
