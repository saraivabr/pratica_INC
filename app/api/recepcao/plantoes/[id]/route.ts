/**
 * API: Gerenciar Plantão Individual
 *
 * GET /api/recepcao/plantoes/:id - Detalhes do plantão
 * PUT /api/recepcao/plantoes/:id - Atualiza plantão
 * DELETE /api/recepcao/plantoes/:id - Cancela plantão
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const UpdatePlantaoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM').optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM').optional(),
  max_corretores: z.number().int().min(1).max(100).optional().nullable(),
  descricao: z.string().optional().nullable(),
  status: z.enum(['ativo', 'cancelado', 'encerrado']).optional(),
});

interface PlantaoDB {
  id: string;
  workspace_id: number;
  local_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  max_corretores: number | null;
  descricao: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PlantaoWithStats extends PlantaoDB {
  local_nome: string;
  local_endereco: string | null;
  total_presentes: number;
  disponiveis: number;
  em_atendimento: number;
  pausados: number;
  aguardando_feedback: number;
  total_atribuicoes: number;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/recepcao/plantoes/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de plantão inválido' },
        { status: 400 }
      );
    }

    const query = `
      SELECT
        p.*,
        l.nome AS local_nome,
        l.endereco AS local_endereco,
        COALESCE(stats.total_presentes, 0) AS total_presentes,
        COALESCE(stats.disponiveis, 0) AS disponiveis,
        COALESCE(stats.em_atendimento, 0) AS em_atendimento,
        COALESCE(stats.pausados, 0) AS pausados,
        COALESCE(stats.aguardando_feedback, 0) AS aguardando_feedback,
        COALESCE(atr.total_atribuicoes, 0) AS total_atribuicoes
      FROM recepcao_plantoes p
      JOIN recepcao_locais l ON l.id = p.local_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE status = 'presente') AS total_presentes,
          COUNT(*) FILTER (WHERE status = 'presente' AND NOT em_atendimento AND NOT pausado AND NOT feedback_pendente) AS disponiveis,
          COUNT(*) FILTER (WHERE em_atendimento = true) AS em_atendimento,
          COUNT(*) FILTER (WHERE pausado = true) AS pausados,
          COUNT(*) FILTER (WHERE feedback_pendente = true) AS aguardando_feedback
        FROM recepcao_presencas pr
        WHERE pr.plantao_id = p.id
      ) stats ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total_atribuicoes
        FROM recepcao_atribuicoes a
        WHERE a.plantao_id = p.id
      ) atr ON true
      WHERE p.id = $1 AND p.workspace_id = $2
    `;

    const result = await pool.query<PlantaoWithStats>(query, [id, workspaceId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar plantão:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar plantão' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/recepcao/plantoes/:id
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de plantão inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = UpdatePlantaoSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          field: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verificar se plantão existe
    const checkResult = await pool.query<{ status: string; hora_inicio: string; hora_fim: string }>(
      'SELECT status, hora_inicio, hora_fim FROM recepcao_plantoes WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado' },
        { status: 404 }
      );
    }

    const current = checkResult.rows[0];

    if (current.status === 'cancelado') {
      return NextResponse.json(
        { success: false, error: 'Não é possível editar um plantão cancelado' },
        { status: 400 }
      );
    }

    // Validar horários se ambos forem passados
    const newHoraInicio = data.hora_inicio || current.hora_inicio;
    const newHoraFim = data.hora_fim || current.hora_fim;

    if (newHoraFim <= newHoraInicio) {
      return NextResponse.json(
        { success: false, error: 'Hora fim deve ser maior que hora início' },
        { status: 400 }
      );
    }

    // Montar query dinâmica
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.data !== undefined) {
      updates.push(`data = $${paramIndex++}`);
      values.push(data.data);
    }
    if (data.hora_inicio !== undefined) {
      updates.push(`hora_inicio = $${paramIndex++}`);
      values.push(data.hora_inicio);
    }
    if (data.hora_fim !== undefined) {
      updates.push(`hora_fim = $${paramIndex++}`);
      values.push(data.hora_fim);
    }
    if (data.max_corretores !== undefined) {
      updates.push(`max_corretores = $${paramIndex++}`);
      values.push(data.max_corretores);
    }
    if (data.descricao !== undefined) {
      updates.push(`descricao = $${paramIndex++}`);
      values.push(data.descricao);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    values.push(id, workspaceId);

    const result = await pool.query<PlantaoDB>(
      `UPDATE recepcao_plantoes
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao atualizar plantão:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar plantão' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recepcao/plantoes/:id
 * Cancela plantão
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de plantão inválido' },
        { status: 400 }
      );
    }

    const result = await pool.query<PlantaoDB>(
      `UPDATE recepcao_plantoes
       SET status = 'cancelado', updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND status = 'ativo'
       RETURNING *`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado ou já cancelado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Plantão cancelado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cancelar plantão:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cancelar plantão' },
      { status: 500 }
    );
  }
}
