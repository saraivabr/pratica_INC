/**
 * API: Plantão Recorrente Individual
 *
 * GET /api/recepcao/plantoes-recorrentes/[id] - Detalhes do template
 * PUT /api/recepcao/plantoes-recorrentes/[id] - Atualiza template
 * DELETE /api/recepcao/plantoes-recorrentes/[id] - Remove template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const UpdateRecorrenteSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  dias_semana: z.array(z.number().int().min(1).max(7)).min(1).optional(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hora_limite_checkin: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  max_corretores: z.number().int().min(1).max(100).optional().nullable(),
  meta_ofertas: z.number().int().min(1).max(200).optional(),
  descricao: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recepcao/plantoes-recorrentes/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    const result = await pool.query(
      `SELECT
        r.*,
        l.nome AS local_nome,
        l.endereco AS local_endereco,
        ARRAY(
          SELECT CASE d
            WHEN 1 THEN 'Seg'
            WHEN 2 THEN 'Ter'
            WHEN 3 THEN 'Qua'
            WHEN 4 THEN 'Qui'
            WHEN 5 THEN 'Sex'
            WHEN 6 THEN 'Sab'
            WHEN 7 THEN 'Dom'
          END
          FROM UNNEST(r.dias_semana) AS d
          ORDER BY d
        ) AS dias_semana_texto,
        (SELECT COUNT(*) FROM recepcao_plantoes_criados_auto ca WHERE ca.recorrente_id = r.id) AS total_plantoes_criados,
        (SELECT MAX(data) FROM recepcao_plantoes_criados_auto ca WHERE ca.recorrente_id = r.id) AS ultimo_plantao_criado
      FROM recepcao_plantoes_recorrentes r
      JOIN recepcao_locais l ON l.id = r.local_id
      WHERE r.id = $1 AND r.workspace_id = $2`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão recorrente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar histórico de plantões criados
    const historico = await pool.query(
      `SELECT
        ca.data,
        ca.created_at,
        p.id AS plantao_id,
        p.status AS plantao_status,
        (SELECT COUNT(*) FROM recepcao_presencas pr WHERE pr.plantao_id = p.id) AS total_presencas
      FROM recepcao_plantoes_criados_auto ca
      JOIN recepcao_plantoes p ON p.id = ca.plantao_id
      WHERE ca.recorrente_id = $1
      ORDER BY ca.data DESC
      LIMIT 30`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        historico: historico.rows,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar plantão recorrente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar plantão recorrente' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/recepcao/plantoes-recorrentes/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { id } = await params;

    // Verificar permissão
    if (user.role !== 'admin' && user.role !== 'gerente') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão' },
        { status: 403 }
      );
    }

    // Verificar se existe
    const existing = await pool.query(
      'SELECT id FROM recepcao_plantoes_recorrentes WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão recorrente não encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = UpdateRecorrenteSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Construir query dinamicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nome !== undefined) {
      updates.push(`nome = $${paramIndex++}`);
      values.push(data.nome);
    }
    if (data.dias_semana !== undefined) {
      const diasUnicos = [...new Set(data.dias_semana)].sort((a, b) => a - b);
      updates.push(`dias_semana = $${paramIndex++}`);
      values.push(diasUnicos);
    }
    if (data.hora_inicio !== undefined) {
      updates.push(`hora_inicio = $${paramIndex++}`);
      values.push(data.hora_inicio);
    }
    if (data.hora_fim !== undefined) {
      updates.push(`hora_fim = $${paramIndex++}`);
      values.push(data.hora_fim);
    }
    if (data.hora_limite_checkin !== undefined) {
      updates.push(`hora_limite_checkin = $${paramIndex++}`);
      values.push(data.hora_limite_checkin);
    }
    if (data.max_corretores !== undefined) {
      updates.push(`max_corretores = $${paramIndex++}`);
      values.push(data.max_corretores);
    }
    if (data.meta_ofertas !== undefined) {
      updates.push(`meta_ofertas = $${paramIndex++}`);
      values.push(data.meta_ofertas);
    }
    if (data.descricao !== undefined) {
      updates.push(`descricao = $${paramIndex++}`);
      values.push(data.descricao);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, workspaceId);

    const result = await pool.query(
      `UPDATE recepcao_plantoes_recorrentes
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: data.is_active === false
        ? 'Plantão recorrente desativado'
        : 'Plantão recorrente atualizado',
    });
  } catch (error) {
    console.error('Erro ao atualizar plantão recorrente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar plantão recorrente' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recepcao/plantoes-recorrentes/[id]
 * Remove template (soft delete - apenas desativa)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { id } = await params;

    // Verificar permissão
    if (user.role !== 'admin' && user.role !== 'gerente') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão' },
        { status: 403 }
      );
    }

    // Soft delete - desativar em vez de deletar
    const result = await pool.query(
      `UPDATE recepcao_plantoes_recorrentes
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2
       RETURNING id`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão recorrente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Plantão recorrente desativado. Plantões futuros não serão criados automaticamente.',
    });
  } catch (error) {
    console.error('Erro ao desativar plantão recorrente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar plantão recorrente' },
      { status: 500 }
    );
  }
}
