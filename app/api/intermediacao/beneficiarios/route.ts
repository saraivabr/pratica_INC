/**
 * API: Beneficiários do Sistema de Intermediação Imobiliária
 *
 * GET /api/intermediacao/beneficiarios - Listar beneficiários
 * POST /api/intermediacao/beneficiarios - Criar beneficiário
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

// ============================================================================
// Validação de CPF (Algoritmo Oficial Brasileiro)
// ============================================================================
function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, "");

  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (CPFs inválidos conhecidos)
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

  // Calcula primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) return false;

  // Calcula segundo dígito verificador
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
  // Remove caracteres não numéricos
  const cnpjLimpo = cnpj.replace(/\D/g, "");

  // Verifica se tem 14 dígitos
  if (cnpjLimpo.length !== 14) return false;

  // Verifica se todos os dígitos são iguais (CNPJs inválidos conhecidos)
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

  // Calcula primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(cnpjLimpo.charAt(12))) return false;

  // Calcula segundo dígito verificador
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
// Gerar Código Automático para Beneficiário
// ============================================================================
async function gerarCodigoBeneficiario(workspaceId: number): Promise<string> {
  const result = await dbQuery<{ max_codigo: string | null }>(
    `SELECT MAX(codigo) as max_codigo
     FROM intermediacao_beneficiarios
     WHERE codigo LIKE 'BEN%' AND workspace_id = $1`,
    [workspaceId]
  );

  const maxCodigo = result.rows[0]?.max_codigo;
  if (!maxCodigo) {
    return "BEN0001";
  }

  const numero = parseInt(maxCodigo.replace("BEN", "")) + 1;
  return `BEN${numero.toString().padStart(4, "0")}`;
}

// ============================================================================
// Registrar Auditoria
// ============================================================================
async function registrarAuditoria(
  workspaceId: number,
  entidade: string,
  entidade_id: number,
  operacao: string,
  usuario_id: string,
  dados_anteriores: object | null,
  dados_novos: object | null
): Promise<void> {
  await dbQuery(
    `INSERT INTO intermediacao_auditoria
     (workspace_id, entidade, entidade_id, operacao, usuario_id, dados_anteriores, dados_novos, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      workspaceId,
      entidade,
      entidade_id,
      operacao,
      usuario_id,
      dados_anteriores ? JSON.stringify(dados_anteriores) : null,
      dados_novos ? JSON.stringify(dados_novos) : null,
    ]
  );
}

// ============================================================================
// GET - Listar Beneficiários
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const cargo = searchParams.get("cargo");
    const ativo = searchParams.get("ativo");
    const busca = searchParams.get("busca");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    // Construir query com filtros
    let whereClause = "WHERE b.workspace_id = $1";
    const params: any[] = [ctx.workspaceId];
    let paramIndex = 2;

    if (cargo) {
      whereClause += ` AND b.cargo = $${paramIndex}`;
      params.push(cargo);
      paramIndex++;
    }

    if (ativo !== null && ativo !== undefined && ativo !== "") {
      whereClause += ` AND b.ativo = $${paramIndex}`;
      params.push(ativo === "true");
      paramIndex++;
    }

    if (busca) {
      whereClause += ` AND (
        LOWER(b.nome) LIKE LOWER($${paramIndex})
        OR b.documento LIKE $${paramIndex}
      )`;
      params.push(`%${busca}%`);
      paramIndex++;
    }

    // Buscar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM intermediacao_beneficiarios b
      ${whereClause}
    `;
    const countResult = await dbQuery<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Buscar beneficiários com totais calculados
    const query = `
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
        b.updated_at,
        COALESCE(
          (SELECT SUM(p.valor)
           FROM intermediacao_parcelas p
           JOIN intermediacao_comissoes c ON p.comissao_id = c.id
           WHERE c.beneficiario_id = b.id
           AND p.status = 'pendente'
           AND p.data_vencimento < CURRENT_DATE),
          0
        ) as total_a_receber,
        COALESCE(
          (SELECT SUM(p.valor)
           FROM intermediacao_parcelas p
           JOIN intermediacao_comissoes c ON p.comissao_id = c.id
           WHERE c.beneficiario_id = b.id
           AND p.status = 'pendente'
           AND p.data_vencimento >= CURRENT_DATE),
          0
        ) as total_pendente,
        COALESCE(
          (SELECT SUM(p.valor)
           FROM intermediacao_parcelas p
           JOIN intermediacao_comissoes c ON p.comissao_id = c.id
           WHERE c.beneficiario_id = b.id
           AND p.status = 'pago'),
          0
        ) as total_pago
      FROM intermediacao_beneficiarios b
      ${whereClause}
      ORDER BY b.nome ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await dbQuery(query, params);

    // Calcular totais gerais
    const totaisQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_geral_a_receber,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_geral_pendente,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as total_geral_pago
      FROM intermediacao_parcelas p
      JOIN intermediacao_comissoes c ON p.comissao_id = c.id
      JOIN intermediacao_beneficiarios b ON c.beneficiario_id = b.id
      ${whereClause.replace(/b\./g, 'b.')}
    `;
    const totaisResult = await dbQuery(totaisQuery, params.slice(0, -2));

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      totais: {
        a_receber: parseFloat(totaisResult.rows[0]?.total_geral_a_receber || "0"),
        pendente: parseFloat(totaisResult.rows[0]?.total_geral_pendente || "0"),
        pago: parseFloat(totaisResult.rows[0]?.total_geral_pago || "0"),
      },
    });
  } catch (error: any) {
    console.error("Erro ao listar beneficiários:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Criar Beneficiário
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

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
    } = body;

    // Validações obrigatórias
    if (!nome || !tipo_documento || !documento || !cargo || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos obrigatórios: nome, tipo_documento, documento, cargo, email",
        },
        { status: 400 }
      );
    }

    // Limpar documento (remover formatação)
    const documentoLimpo = documento.replace(/\D/g, "");

    // Validar documento conforme tipo
    if (tipo_documento === "cpf") {
      if (!validarCPF(documentoLimpo)) {
        return NextResponse.json(
          { success: false, error: "CPF inválido. Verifique os dígitos." },
          { status: 400 }
        );
      }
    } else if (tipo_documento === "cnpj") {
      if (!validarCNPJ(documentoLimpo)) {
        return NextResponse.json(
          { success: false, error: "CNPJ inválido. Verifique os dígitos." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Tipo de documento deve ser 'cpf' ou 'cnpj'" },
        { status: 400 }
      );
    }

    // Validar email
    if (!validarEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Email inválido" },
        { status: 400 }
      );
    }

    // Verificar se documento já existe no mesmo tenant
    const existeDoc = await dbQuery<{ id: number }>(
      `SELECT id FROM intermediacao_beneficiarios WHERE documento = $1 AND workspace_id = $2`,
      [documentoLimpo, ctx.workspaceId]
    );

    if (existeDoc.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Já existe um beneficiário cadastrado com este documento",
        },
        { status: 409 }
      );
    }

    // Gerar código automático
    const codigo = await gerarCodigoBeneficiario(ctx.workspaceId);

    // Inserir beneficiário
    const insertQuery = `
      INSERT INTO intermediacao_beneficiarios (
        workspace_id, codigo, nome, tipo_documento, documento, cargo, email, telefone,
        banco, agencia, conta, tipo_conta, pix, observacoes, ativo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW(), NOW()
      )
      RETURNING *
    `;

    const result = await dbQuery(insertQuery, [
      ctx.workspaceId,
      codigo,
      nome.trim(),
      tipo_documento,
      documentoLimpo,
      cargo,
      email.toLowerCase().trim(),
      telefone || null,
      banco || null,
      agencia || null,
      conta || null,
      tipo_conta || null,
      pix || null,
      observacoes || null,
    ]);

    const novoBeneficiario = result.rows[0];

    // Registrar auditoria
    await registrarAuditoria(
      ctx.workspaceId,
      "beneficiario",
      novoBeneficiario.id,
      "criacao",
      ctx.user.id,
      null,
      novoBeneficiario
    );

    return NextResponse.json(
      {
        success: true,
        data: novoBeneficiario,
        message: "Beneficiário criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao criar beneficiário:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
