/**
 * API: Validar Documento - Sistema de Intermediação Imobiliária
 *
 * POST /api/intermediacao/beneficiarios/validar-documento - Validar CPF/CNPJ
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

// ============================================================================
// Validação de CPF (Algoritmo Oficial Brasileiro)
// ============================================================================
function validarCPF(cpf: string): { valido: boolean; motivo?: string } {
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, "");

  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) {
    return { valido: false, motivo: "CPF deve ter 11 dígitos" };
  }

  // Verifica se todos os dígitos são iguais (CPFs inválidos conhecidos)
  if (/^(\d)\1{10}$/.test(cpfLimpo)) {
    return { valido: false, motivo: "CPF inválido: todos os dígitos são iguais" };
  }

  // Calcula primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) {
    return { valido: false, motivo: "Primeiro dígito verificador inválido" };
  }

  // Calcula segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10))) {
    return { valido: false, motivo: "Segundo dígito verificador inválido" };
  }

  return { valido: true };
}

// ============================================================================
// Validação de CNPJ (Algoritmo Oficial Brasileiro)
// ============================================================================
function validarCNPJ(cnpj: string): { valido: boolean; motivo?: string } {
  // Remove caracteres não numéricos
  const cnpjLimpo = cnpj.replace(/\D/g, "");

  // Verifica se tem 14 dígitos
  if (cnpjLimpo.length !== 14) {
    return { valido: false, motivo: "CNPJ deve ter 14 dígitos" };
  }

  // Verifica se todos os dígitos são iguais (CNPJs inválidos conhecidos)
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) {
    return { valido: false, motivo: "CNPJ inválido: todos os dígitos são iguais" };
  }

  // Calcula primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(cnpjLimpo.charAt(12))) {
    return { valido: false, motivo: "Primeiro dígito verificador inválido" };
  }

  // Calcula segundo dígito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpjLimpo.charAt(i)) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(cnpjLimpo.charAt(13))) {
    return { valido: false, motivo: "Segundo dígito verificador inválido" };
  }

  return { valido: true };
}

// ============================================================================
// Formatar documento para exibição
// ============================================================================
function formatarDocumento(tipo: "cpf" | "cnpj", documento: string): string {
  const docLimpo = documento.replace(/\D/g, "");

  if (tipo === "cpf") {
    return docLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else {
    return docLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
}

// ============================================================================
// POST - Validar Documento
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const { tipo, documento } = body;

    // Validar parâmetros
    if (!tipo || !documento) {
      return NextResponse.json(
        { success: false, error: "Parâmetros obrigatórios: tipo e documento" },
        { status: 400 }
      );
    }

    if (tipo !== "cpf" && tipo !== "cnpj") {
      return NextResponse.json(
        { success: false, error: "Tipo de documento deve ser 'cpf' ou 'cnpj'" },
        { status: 400 }
      );
    }

    // Limpar documento
    const documentoLimpo = documento.replace(/\D/g, "");

    // Validar documento
    let validacao: { valido: boolean; motivo?: string };

    if (tipo === "cpf") {
      validacao = validarCPF(documentoLimpo);
    } else {
      validacao = validarCNPJ(documentoLimpo);
    }

    // Se documento inválido, retornar erro
    if (!validacao.valido) {
      return NextResponse.json({
        success: true,
        data: {
          tipo,
          documento: documentoLimpo,
          documento_formatado: null,
          valido: false,
          motivo: validacao.motivo,
          existe: false,
          beneficiario_id: null,
          beneficiario_nome: null,
        },
      });
    }

    // Verificar se documento já existe no mesmo tenant
    const existeResult = await dbQuery<{
      id: number;
      nome: string;
      codigo: string;
      ativo: boolean;
    }>(
      `SELECT id, nome, codigo, ativo
       FROM intermediacao_beneficiarios
       WHERE documento = $1 AND workspace_id = $2`,
      [documentoLimpo, ctx.workspaceId]
    );

    const existe = existeResult.rows.length > 0;
    const beneficiarioExistente = existe ? existeResult.rows[0] : null;

    return NextResponse.json({
      success: true,
      data: {
        tipo,
        documento: documentoLimpo,
        documento_formatado: formatarDocumento(tipo, documentoLimpo),
        valido: true,
        motivo: null,
        existe,
        beneficiario_id: beneficiarioExistente?.id || null,
        beneficiario_codigo: beneficiarioExistente?.codigo || null,
        beneficiario_nome: beneficiarioExistente?.nome || null,
        beneficiario_ativo: beneficiarioExistente?.ativo || null,
      },
    });
  } catch (error: any) {
    console.error("Erro ao validar documento:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
