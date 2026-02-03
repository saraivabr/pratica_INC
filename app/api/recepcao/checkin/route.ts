/**
 * API: Check-in Manual/Botão
 *
 * POST /api/recepcao/checkin - Check-in manual do corretor no plantão
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const CheckinSchema = z.object({
  plantao_id: z.string().uuid('ID do plantão inválido'),
});

interface PresencaDB {
  id: string;
  workspace_id: number;
  plantao_id: string;
  user_id: string;
  status: string;
  checkin_at: string;
  checkin_method: string;
  posicao_fila: number;
  em_atendimento: boolean;
  pausado: boolean;
  feedback_pendente: boolean;
}

/**
 * POST /api/recepcao/checkin
 * Check-in manual do corretor
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = CheckinSchema.safeParse(body);

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

    const { plantao_id } = validationResult.data;

    // Verificar se plantão existe, está ativo e pertence ao workspace
    const plantaoCheck = await pool.query<{ id: string; max_corretores: number | null }>(
      `SELECT id, max_corretores FROM recepcao_plantoes
       WHERE id = $1 AND workspace_id = $2 AND status = 'ativo'
         AND data = CURRENT_DATE`,
      [plantao_id, workspaceId]
    );

    if (plantaoCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado ou não está ativo hoje' },
        { status: 404 }
      );
    }

    const plantao = plantaoCheck.rows[0];

    // Verificar se já existe presença ativa
    const presencaExistente = await pool.query(
      `SELECT id FROM recepcao_presencas
       WHERE plantao_id = $1 AND user_id = $2 AND status = 'presente'`,
      [plantao_id, (user as any).id]
    );

    if (presencaExistente.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Você já está presente neste plantão' },
        { status: 409 }
      );
    }

    // Verificar limite de corretores (se definido)
    if (plantao.max_corretores) {
      const countResult = await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM recepcao_presencas
         WHERE plantao_id = $1 AND status = 'presente'`,
        [plantao_id]
      );

      if (countResult.rows[0].count >= plantao.max_corretores) {
        return NextResponse.json(
          { success: false, error: 'Plantão atingiu o limite máximo de corretores' },
          { status: 400 }
        );
      }
    }

    // Obter próxima posição na fila
    const posicaoResult = await pool.query<{ posicao: number }>(
      `SELECT get_proxima_posicao_fila($1) AS posicao`,
      [plantao_id]
    );

    const posicao = posicaoResult.rows[0].posicao;

    // Criar presença
    const result = await pool.query<PresencaDB>(
      `INSERT INTO recepcao_presencas (workspace_id, plantao_id, user_id, checkin_method, posicao_fila)
       VALUES ($1, $2, $3, 'manual', $4)
       RETURNING *`,
      [workspaceId, plantao_id, (user as any).id, posicao]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: `Check-in realizado! Você está na posição ${posicao} da fila.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao fazer check-in:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Você já está presente neste plantão' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao fazer check-in' },
      { status: 500 }
    );
  }
}
