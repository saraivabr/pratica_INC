/**
 * API: Gerenciar Plantões
 *
 * GET /api/recepcao/plantoes - Lista plantões do workspace
 * POST /api/recepcao/plantoes - Cria novo plantão
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const CreatePlantaoSchema = z.object({
  local_id: z.string().uuid('ID do local inválido'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  max_corretores: z.number().int().min(1).max(100).optional(),
  descricao: z.string().optional(),
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

interface PlantaoWithLocal extends PlantaoDB {
  local_nome: string;
  local_endereco: string | null;
  total_presentes: number;
  disponiveis: number;
  em_atendimento: number;
}

/**
 * GET /api/recepcao/plantoes
 * Lista plantões do workspace
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { searchParams } = new URL(request.url);

    const data = searchParams.get('data');
    const localId = searchParams.get('local_id');
    const status = searchParams.get('status') || 'ativo';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    let whereClause = 'WHERE p.workspace_id = $1';
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (data) {
      whereClause += ` AND p.data = $${paramIndex++}`;
      params.push(data);
    }

    if (localId) {
      whereClause += ` AND p.local_id = $${paramIndex++}`;
      params.push(localId);
    }

    if (status !== 'all') {
      whereClause += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) as total FROM recepcao_plantoes p ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const query = `
      SELECT
        p.*,
        l.nome AS local_nome,
        l.endereco AS local_endereco,
        COALESCE(stats.total_presentes, 0) AS total_presentes,
        COALESCE(stats.disponiveis, 0) AS disponiveis,
        COALESCE(stats.em_atendimento, 0) AS em_atendimento
      FROM recepcao_plantoes p
      JOIN recepcao_locais l ON l.id = p.local_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE status = 'presente') AS total_presentes,
          COUNT(*) FILTER (WHERE status = 'presente' AND NOT em_atendimento AND NOT pausado AND NOT feedback_pendente) AS disponiveis,
          COUNT(*) FILTER (WHERE em_atendimento = true) AS em_atendimento
        FROM recepcao_presencas pr
        WHERE pr.plantao_id = p.id
      ) stats ON true
      ${whereClause}
      ORDER BY p.data DESC, p.hora_inicio ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query<PlantaoWithLocal>(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Erro ao listar plantões:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar plantões' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recepcao/plantoes
 * Cria novo plantão
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const body = await request.json();
    const validationResult = CreatePlantaoSchema.safeParse(body);

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

    const { local_id, data, hora_inicio, hora_fim, max_corretores, descricao } =
      validationResult.data;

    // Verificar se local existe e pertence ao workspace
    const localCheck = await pool.query(
      'SELECT id FROM recepcao_locais WHERE id = $1 AND workspace_id = $2 AND is_active = true',
      [local_id, workspaceId]
    );

    if (localCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Local não encontrado' },
        { status: 404 }
      );
    }

    // Validar que hora_fim > hora_inicio
    if (hora_fim <= hora_inicio) {
      return NextResponse.json(
        { success: false, error: 'Hora fim deve ser maior que hora início' },
        { status: 400 }
      );
    }

    const result = await pool.query<PlantaoDB>(
      `INSERT INTO recepcao_plantoes (workspace_id, local_id, data, hora_inicio, hora_fim, max_corretores, descricao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [workspaceId, local_id, data, hora_inicio, hora_fim, max_corretores || null, descricao || null]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar plantão:', error);

    // Tratar erro de duplicidade
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Já existe um plantão ativo para este local/data/horário' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao criar plantão' },
      { status: 500 }
    );
  }
}
