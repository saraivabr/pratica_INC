/**
 * API: Beneficiário Individual - Sistema de Intermediação Imobiliária
 *
 * GET /api/intermediacao/beneficiarios/:id - Detalhe do beneficiário
 * PUT /api/intermediacao/beneficiarios/:id - Atualizar beneficiário
 * DELETE /api/intermediacao/beneficiarios/:id - Inativar beneficiário
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

// ============================================================================
// Validação de CPF (Algoritmo Oficial Brasileiro)
// ============================================================================
function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10))) return false;

  return true;
}

// ============================================================================
// Validação de CNPJ (Algoritmo Oficial Brasileiro)
// ============================================================================
function validarCNPJ(cnpj: string): boolean {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(cnpjLimpo.charAt(12))) return false;

  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpjLimpo.charAt(i)) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(cnpjLimpo.charAt(13))) return false;

  return true;
}

// ============================================================================
// Validar Email
// ============================================================================
function validarEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// Registrar Auditoria
// ============================================================================
async function registrarAuditoria(
  tenantId: number,
  entidade: string,
  entidade_id: number,
  operacao: string,
  usuario_id: string,
  dados_anteriores: object | null,
  dados_novos: object | null,
  justificativa?: string
): Promise<void> {
  await dbQuery(
    `INSERT INTO intermediacao_auditoria
     (tenant_id, entidade, entidade_id, operacao, usuario_id, dados_anteriores, dados_novos, justificativa, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      tenantId,
      entidade,
      entidade_id,
      operacao,
      usuario_id,
      dados_anteriores ? JSON.stringify(dados_anteriores) : null,
      dados_novos ? JSON.stringify(dados_novos) : null,
      justificativa || null,
    ]
  );
}

// ============================================================================
// GET - Detalhe do Beneficiário
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const beneficiarioId = parseInt(id);

    if (isNaN(beneficiarioId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    // Buscar beneficiário
    const beneficiarioQuery = `
      SELECT
        b.id,
        b.codigo,
        b.nome,
        b.tipo_documento,
        b.documento,
        b.cargo,
        b.email,
        b.telefone,
        b.banco,
        b.agencia,
        b.conta,
        b.tipo_conta,
        b.pix,
        b.observacoes,
        b.ativo,
        b.created_at,
        b.updated_at
      FROM intermediacao_beneficiarios b
      WHERE b.id = $1 AND b.tenant_id = $2
    `;
    const beneficiarioResult = await dbQuery(beneficiarioQuery, [beneficiarioId, ctx.tenantId]);

    if (beneficiarioResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Beneficiário não encontrado" },
        { status: 404 }
      );
    }

    const beneficiario = beneficiarioResult.rows[0];

    // Buscar comissões vinculadas
    const comissoesQuery = `
      SELECT
        c.id,
        c.percentual,
        c.valor,
        c.created_at,
        v.id as venda_id,
        v.codigo as venda_codigo,
        v.valor_total as venda_valor,
        v.status as venda_status,
        v.data_venda
      FROM intermediacao_comissoes c
      JOIN intermediacao_vendas v ON c.venda_id = v.id
      WHERE c.beneficiario_id = $1 AND c.tenant_id = $2
      ORDER BY c.created_at DESC
    `;
    const comissoesResult = await dbQuery(comissoesQuery, [beneficiarioId, ctx.tenantId]);

    // Buscar parcelas
    const parcelasQuery = `
      SELECT
        p.id,
        p.numero,
        p.valor,
        p.data_vencimento,
        p.data_pagamento,
        p.status,
        c.id as comissao_id,
        v.codigo as venda_codigo
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      JOIN intermediacao_vendas v ON c.venda_id = v.id
      WHERE c.beneficiario_id = $1 AND c.tenant_id = $2
      ORDER BY p.data_vencimento ASC
    `;
    const parcelasResult = await dbQuery(parcelasQuery, [beneficiarioId, ctx.tenantId]);

    // Calcular saldos
    const saldosQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_a_receber,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_pendente,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as total_pago
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      WHERE c.beneficiario_id = $1 AND c.tenant_id = $2
    `;
    const saldosResult = await dbQuery(saldosQuery, [beneficiarioId, ctx.tenantId]);

    return NextResponse.json({
      success: true,
      data: {
        ...beneficiario,
        comissoes: comissoesResult.rows,
        parcelas: parcelasResult.rows,
        saldos: {
          a_receber: parseFloat(saldosResult.rows[0]?.total_a_receber || "0"),
          pendente: parseFloat(saldosResult.rows[0]?.total_pendente || "0"),
          pago: parseFloat(saldosResult.rows[0]?.total_pago || "0"),
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar beneficiário:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Atualizar Beneficiário
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const beneficiarioId = parseInt(id);

    if (isNaN(beneficiarioId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    // Buscar beneficiário atual
    const beneficiarioAtual = await dbQuery(
      `SELECT * FROM intermediacao_beneficiarios WHERE id = $1 AND tenant_id = $2`,
      [beneficiarioId, ctx.tenantId]
    );

    if (beneficiarioAtual.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Beneficiário não encontrado" },
        { status: 404 }
      );
    }

    const dadosAnteriores = beneficiarioAtual.rows[0];

    // Verificar se tem comissões pagas (somente admin pode alterar)
    const comissoesPagasQuery = `
      SELECT COUNT(*) as total
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      WHERE c.beneficiario_id = $1 AND c.tenant_id = $2 AND p.status = 'pago'
    `;
    const comissoesPagasResult = await dbQuery(comissoesPagasQuery, [beneficiarioId, ctx.tenantId]);
    const temComissoesPagas = parseInt(comissoesPagasResult.rows[0]?.total || "0") > 0;

    if (temComissoesPagas && ctx.user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Este beneficiário possui comissões pagas. Apenas administradores podem alterar.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nome,
      tipo_documento,
      documento,
      cargo,
      email,
      telefone,
      banco,
      agencia,
      conta,
      tipo_conta,
      pix,
      observacoes,
      justificativa,
    } = body;

    // Validações
    if (documento && tipo_documento) {
      const documentoLimpo = documento.replace(/\D/g, "");

      if (tipo_documento === "cpf" && !validarCPF(documentoLimpo)) {
        return NextResponse.json(
          { success: false, error: "CPF inválido" },
          { status: 400 }
        );
      }

      if (tipo_documento === "cnpj" && !validarCNPJ(documentoLimpo)) {
        return NextResponse.json(
          { success: false, error: "CNPJ inválido" },
          { status: 400 }
        );
      }

      // Verificar duplicidade de documento no mesmo tenant
      const existeDoc = await dbQuery<{ id: number }>(
        `SELECT id FROM intermediacao_beneficiarios WHERE documento = $1 AND id != $2 AND tenant_id = $3`,
        [documentoLimpo, beneficiarioId, ctx.tenantId]
      );

      if (existeDoc.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: "Já existe outro beneficiário com este documento" },
          { status: 409 }
        );
      }
    }

    if (email && !validarEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Email inválido" },
        { status: 400 }
      );
    }

    // Construir query de atualização
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    const fieldsToUpdate = [
      { field: "nome", value: nome?.trim() },
      { field: "tipo_documento", value: tipo_documento },
      { field: "documento", value: documento?.replace(/\D/g, "") },
      { field: "cargo", value: cargo },
      { field: "email", value: email?.toLowerCase().trim() },
      { field: "telefone", value: telefone },
      { field: "banco", value: banco },
      { field: "agencia", value: agencia },
      { field: "conta", value: conta },
      { field: "tipo_conta", value: tipo_conta },
      { field: "pix", value: pix },
      { field: "observacoes", value: observacoes },
    ];

    for (const { field, value } of fieldsToUpdate) {
      if (value !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateParams.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = NOW()`);

    const updateQuery = `
      UPDATE intermediacao_beneficiarios
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    updateParams.push(beneficiarioId);

    const result = await dbQuery(updateQuery, updateParams);
    const beneficiarioAtualizado = result.rows[0];

    // Registrar auditoria
    await registrarAuditoria(
      ctx.tenantId,
      "beneficiario",
      beneficiarioId,
      "atualizacao",
      ctx.user.id,
      dadosAnteriores,
      beneficiarioAtualizado,
      temComissoesPagas ? justificativa : undefined
    );

    return NextResponse.json({
      success: true,
      data: beneficiarioAtualizado,
      message: "Beneficiário atualizado com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao atualizar beneficiário:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Inativar Beneficiário (Soft Delete)
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const beneficiarioId = parseInt(id);

    if (isNaN(beneficiarioId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    // Verificar se beneficiário existe
    const beneficiarioResult = await dbQuery(
      `SELECT * FROM intermediacao_beneficiarios WHERE id = $1 AND tenant_id = $2`,
      [beneficiarioId, ctx.tenantId]
    );

    if (beneficiarioResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Beneficiário não encontrado" },
        { status: 404 }
      );
    }

    const beneficiario = beneficiarioResult.rows[0];

    // Verificar se tem comissões pendentes
    const comissoesPendentesQuery = `
      SELECT COUNT(*) as total
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      WHERE c.beneficiario_id = $1 AND c.tenant_id = $2 AND p.status = 'pendente'
    `;
    const comissoesPendentesResult = await dbQuery(comissoesPendentesQuery, [beneficiarioId, ctx.tenantId]);
    const temComissoesPendentes = parseInt(comissoesPendentesResult.rows[0]?.total || "0") > 0;

    if (temComissoesPendentes) {
      return NextResponse.json(
        {
          success: false,
          error: "Não é possível inativar este beneficiário. Existem comissões pendentes.",
        },
        { status: 400 }
      );
    }

    // Inativar beneficiário (soft delete)
    await dbQuery(
      `UPDATE intermediacao_beneficiarios
       SET ativo = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [beneficiarioId, ctx.tenantId]
    );

    // Registrar auditoria
    await registrarAuditoria(
      ctx.tenantId,
      "beneficiario",
      beneficiarioId,
      "inativacao",
      ctx.user.id,
      { ativo: true },
      { ativo: false }
    );

    return NextResponse.json({
      success: true,
      message: "Beneficiário inativado com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao inativar beneficiário:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
