/**
 * API: Parcela Individual
 *
 * GET /api/intermediacao/parcelas/:id - Detalhe da parcela
 * PUT /api/intermediacao/parcelas/:id - Atualizar parcela
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

// GET - Detalhe da parcela
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const parcelaId = id;

    const query = `
      SELECT
        p.*,
        v.id as venda_id,
        v.valor_venda,
        v.cliente_nome,
        v.empreendimento,
        v.unidade,
        v.data_venda,
        v.status as venda_status,
        v.percentual_intermediacao,
        v.valor_comissao_total,
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        b.cpf_cnpj as beneficiario_documento,
        b.cargo as beneficiario_cargo,
        b.email as beneficiario_email,
        b.telefone as beneficiario_telefone,
        dc.percentual as distribuicao_percentual,
        dc.valor as distribuicao_valor,
        pg.id as pagamento_id,
        pg.data_pagamento,
        pg.metodo as pagamento_metodo,
        pg.comprovante as pagamento_comprovante,
        pg.referencia as pagamento_referencia,
        pg.created_at as pagamento_created_at,
        CASE
          WHEN p.status != 'paga' AND p.data_vencimento < CURRENT_DATE
          THEN CURRENT_DATE - p.data_vencimento
          ELSE 0
        END as dias_atraso
      FROM parcelas_intermediacao p
      LEFT JOIN vendas_intermediacao v ON v.id = p.venda_id
      LEFT JOIN beneficiarios_intermediacao b ON b.id = p.beneficiario_id
      LEFT JOIN distribuicao_comissao dc ON dc.venda_id = p.venda_id AND dc.beneficiario_id = p.beneficiario_id
      LEFT JOIN pagamentos_intermediacao pg ON pg.parcela_id = p.id
      WHERE p.id = $1 AND p.tenant_id = $2
    `;

    const result = await dbQuery(query, [parcelaId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Parcela nao encontrada" },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    const parcela = {
      id: row.id,
      numero_parcela: row.numero_parcela,
      valor: parseFloat(row.valor),
      data_vencimento: row.data_vencimento,
      status: row.status,
      dias_atraso: parseInt(row.dias_atraso) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      venda: row.venda_id ? {
        id: row.venda_id,
        valor_venda: parseFloat(row.valor_venda),
        cliente_nome: row.cliente_nome,
        empreendimento: row.empreendimento,
        unidade: row.unidade,
        data_venda: row.data_venda,
        status: row.venda_status,
        percentual_intermediacao: parseFloat(row.percentual_intermediacao),
        valor_comissao_total: parseFloat(row.valor_comissao_total)
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
      },
      pagamento: row.pagamento_id ? {
        id: row.pagamento_id,
        data_pagamento: row.data_pagamento,
        metodo: row.pagamento_metodo,
        comprovante: row.pagamento_comprovante,
        referencia: row.pagamento_referencia,
        created_at: row.pagamento_created_at
      } : null
    };

    return NextResponse.json({
      success: true,
      data: parcela
    });
  } catch (error: any) {
    console.error("Erro ao buscar parcela:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar parcela
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const parcelaId = id;
    const body = await request.json();
    const { valor, data_vencimento } = body;

    // Verificar se a parcela existe e seu status (filtered by tenant_id)
    const parcelaResult = await dbQuery(
      `SELECT p.*, dc.valor as distribuicao_valor, p.beneficiario_id, p.venda_id
       FROM parcelas_intermediacao p
       LEFT JOIN distribuicao_comissao dc ON dc.venda_id = p.venda_id AND dc.beneficiario_id = p.beneficiario_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [parcelaId, ctx.tenantId]
    );

    if (parcelaResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Parcela nao encontrada" },
        { status: 404 }
      );
    }

    const parcela = parcelaResult.rows[0];

    // Nao permitir edicao se ja esta paga
    if (parcela.status === "paga") {
      return NextResponse.json(
        { success: false, error: "Nao e possivel editar parcela ja paga" },
        { status: 400 }
      );
    }

    // Se valor foi alterado, validar que soma das parcelas = comissao total
    if (valor !== undefined && valor !== parseFloat(parcela.valor)) {
      // Buscar todas as outras parcelas do mesmo beneficiario/venda (filtered by tenant_id)
      const outrasParcelasResult = await dbQuery(
        `SELECT SUM(valor) as soma
         FROM parcelas_intermediacao
         WHERE venda_id = $1 AND beneficiario_id = $2 AND id != $3 AND tenant_id = $4`,
        [parcela.venda_id, parcela.beneficiario_id, parcelaId, ctx.tenantId]
      );

      const somaOutras = parseFloat(outrasParcelasResult.rows[0]?.soma || "0");
      const novoTotal = somaOutras + valor;
      const comissaoTotal = parseFloat(parcela.distribuicao_valor);

      // Tolerancia de 0.01 para arredondamentos
      if (Math.abs(novoTotal - comissaoTotal) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `A soma das parcelas (R$ ${novoTotal.toFixed(2)}) deve ser igual a comissao total do beneficiario (R$ ${comissaoTotal.toFixed(2)})`
          },
          { status: 400 }
        );
      }
    }

    // Preparar campos para update
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let updateIndex = 1;

    if (valor !== undefined) {
      updateFields.push(`valor = $${updateIndex}`);
      updateParams.push(valor);
      updateIndex++;
    }

    if (data_vencimento !== undefined) {
      updateFields.push(`data_vencimento = $${updateIndex}`);
      updateParams.push(data_vencimento);
      updateIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = NOW()`);

    // Update parcela (with tenant_id filter for safety)
    const updateQuery = `
      UPDATE parcelas_intermediacao
      SET ${updateFields.join(", ")}
      WHERE id = $${updateIndex} AND tenant_id = $${updateIndex + 1}
      RETURNING *
    `;
    updateParams.push(parcelaId, ctx.tenantId);

    const updateResult = await dbQuery(updateQuery, updateParams);

    // Registrar auditoria
    await dbQuery(
      `INSERT INTO log_auditoria_intermediacao
       (entidade, entidade_id, acao, usuario_id, usuario_nome, dados_anteriores, dados_novos, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        "parcela",
        parcelaId,
        "atualizar",
        ctx.user.id,
        ctx.user.nome,
        JSON.stringify({
          valor: parcela.valor,
          data_vencimento: parcela.data_vencimento
        }),
        JSON.stringify({
          valor: valor ?? parcela.valor,
          data_vencimento: data_vencimento ?? parcela.data_vencimento
        }),
        ctx.tenantId
      ]
    );

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      message: "Parcela atualizada com sucesso"
    });
  } catch (error: any) {
    console.error("Erro ao atualizar parcela:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
