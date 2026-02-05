/**
 * API: Status e Ações de Disparo Individual
 *
 * GET /api/disparador/[id] - Status + progresso
 * POST /api/disparador/[id] - Ações (cancelar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/disparador/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const { user } = ctx;

    // Fetch disparo
    const disparoResult = await pool.query(
      `SELECT * FROM disparos WHERE id = $1 AND user_id = $2`,
      [id, (user as any).id]
    );

    if (disparoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Disparo não encontrado' }, { status: 404 });
    }

    const disparo = disparoResult.rows[0];

    // Fetch leads with status
    const leadsResult = await pool.query(
      `SELECT id, lead_nome, lead_telefone, lead_empreendimento, status, enviado_at, error_message
       FROM disparo_leads
       WHERE disparo_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...disparo,
        leads: leadsResult.rows,
      },
    });
  } catch (error: any) {
    console.error('[Disparador GET ID] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar disparo' }, { status: 500 });
  }
}

/**
 * POST /api/disparador/[id]
 * Ações: cancelar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;
    const { user } = ctx;
    const body = await request.json();

    if (body.action === 'cancelar') {
      const result = await pool.query(
        `UPDATE disparos
         SET status = 'cancelado', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'enviando'
         RETURNING id`,
        [id, (user as any).id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Disparo não encontrado ou não pode ser cancelado' },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: 'Disparo cancelado' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('[Disparador POST ID] Erro:', error);
    return NextResponse.json({ error: 'Erro ao executar ação' }, { status: 500 });
  }
}
