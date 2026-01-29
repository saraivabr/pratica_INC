/**
 * API: Atualizar estágio/situação do lead
 *
 * POST /api/leads/[id]/stage
 * Body: { stage: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { dbQuery } from '@/lib/db';

// Mapeamento de estágios do frontend para situação do CV CRM
const STAGE_TO_SITUACAO: Record<string, number> = {
  'novo': 1,
  'contato_realizado': 2,
  'qualificado': 3,
  'visita_agendada': 4,
  'proposta': 5,
  'negociacao': 6,
  'fechado': 7,
  'perdido': 8,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { stage } = body;

    if (!stage) {
      return NextResponse.json({ error: 'Estágio não informado' }, { status: 400 });
    }

    // Converter estágio para situação_id
    const situacaoId = STAGE_TO_SITUACAO[stage];

    if (!situacaoId) {
      return NextResponse.json({ error: 'Estágio inválido' }, { status: 400 });
    }

    // Atualizar no banco local (com verificação de tenant)
    const result = await dbQuery(
      `UPDATE cvcrm_leads
       SET situacao_id = $1,
           situacao = jsonb_set(COALESCE(situacao, '{}')::jsonb, '{nome}', $2::jsonb),
           updated_at = NOW()
       WHERE idlead = $3 AND workspace_id = $4
       RETURNING idlead, situacao_id, situacao`,
      [situacaoId, JSON.stringify(stage), leadId, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Registrar interação
    await dbQuery(
      `INSERT INTO interacoes (lead_id, tipo, descricao, user_id, created_at)
       VALUES ($1, 'stage_change', $2, $3, NOW())`,
      [leadId, `Estágio alterado para: ${stage}`, (user as any).id]
    ).catch(err => {
      console.warn('[Stage] Erro ao registrar interação:', err.message);
    });

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      stage,
      situacao_id: situacaoId
    });

  } catch (error: any) {
    console.error('[API] Erro ao atualizar estágio:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar estágio', details: error.message },
      { status: 500 }
    );
  }
}
