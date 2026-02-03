/**
 * API: Check-in por QR Code
 *
 * POST /api/recepcao/checkin/qr - Check-in validando token do QR Code
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const CheckinQrSchema = z.object({
  qr_code_token: z.string().uuid('Token QR Code inválido'),
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

interface PlantaoAtivo {
  plantao_id: string;
  local_nome: string;
  max_corretores: number | null;
}

/**
 * POST /api/recepcao/checkin/qr
 * Check-in por QR Code
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = CheckinQrSchema.safeParse(body);

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

    const { qr_code_token } = validationResult.data;

    // Buscar local pelo token e verificar se tem plantão ativo hoje
    const plantaoQuery = await pool.query<PlantaoAtivo>(
      `SELECT p.id AS plantao_id, l.nome AS local_nome, p.max_corretores
       FROM recepcao_locais l
       JOIN recepcao_plantoes p ON p.local_id = l.id
       WHERE l.qr_code_token = $1
         AND l.workspace_id = $2
         AND l.is_active = true
         AND p.status = 'ativo'
         AND p.data = CURRENT_DATE
         AND CURRENT_TIME BETWEEN p.hora_inicio AND p.hora_fim
       ORDER BY p.hora_inicio ASC
       LIMIT 1`,
      [qr_code_token, workspaceId]
    );

    if (plantaoQuery.rows.length === 0) {
      // Verificar se o token existe mas não tem plantão
      const localCheck = await pool.query(
        `SELECT id, nome FROM recepcao_locais WHERE qr_code_token = $1 AND workspace_id = $2`,
        [qr_code_token, workspaceId]
      );

      if (localCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'QR Code inválido ou expirado' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Não há plantão ativo no momento em ${localCheck.rows[0].nome}` },
        { status: 400 }
      );
    }

    const { plantao_id, local_nome, max_corretores } = plantaoQuery.rows[0];

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

    // Verificar limite de corretores
    if (max_corretores) {
      const countResult = await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM recepcao_presencas
         WHERE plantao_id = $1 AND status = 'presente'`,
        [plantao_id]
      );

      if (countResult.rows[0].count >= max_corretores) {
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
       VALUES ($1, $2, $3, 'qr_code', $4)
       RETURNING *`,
      [workspaceId, plantao_id, (user as any).id, posicao]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: `Check-in realizado em ${local_nome}! Posição ${posicao} na fila.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao fazer check-in QR:', error);

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
