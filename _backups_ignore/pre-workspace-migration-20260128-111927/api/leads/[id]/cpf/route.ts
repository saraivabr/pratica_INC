/**
 * API: Atualizar CPF do lead
 *
 * PATCH /api/leads/[id]/cpf
 * Body: { cpf: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import { dbQuery } from '@/lib/db';

/**
 * Validate CPF format (Brazilian tax ID)
 */
function isValidCPF(cpf: string): boolean {
  // Remove non-digits
  const digits = cpf.replace(/\D/g, '');

  // Must have 11 digits
  if (digits.length !== 11) return false;

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId, user } = ctx;

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { cpf } = body;

    if (!cpf) {
      return NextResponse.json({ error: 'CPF não informado' }, { status: 400 });
    }

    // Clean CPF (remove formatting)
    const cleanCpf = cpf.replace(/\D/g, '');

    // Validate CPF
    if (!isValidCPF(cleanCpf)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
    }

    // Update in database (com verificação de tenant)
    const result = await dbQuery(
      `UPDATE cvcrm_leads
       SET cpf = $1,
           updated_at = NOW()
       WHERE idlead = $2 AND tenant_id = $3
       RETURNING idlead, cpf, nome`,
      [cleanCpf, leadId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Log the update
    console.log(`[CPF] Updated for lead ${leadId}: ${cleanCpf.substring(0, 3)}***`);

    // Register interaction
    await dbQuery(
      `INSERT INTO interacoes (lead_id, tipo, descricao, user_id, created_at)
       VALUES ($1, 'cpf_update', $2, $3, NOW())`,
      [leadId, 'CPF atualizado', (user as any).id]
    ).catch(err => {
      console.warn('[CPF] Erro ao registrar interação:', err.message);
    });

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      cpf: cleanCpf
    });

  } catch (error: any) {
    console.error('[API] Erro ao atualizar CPF:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar CPF', details: error.message },
      { status: 500 }
    );
  }
}
