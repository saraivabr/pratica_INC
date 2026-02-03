/**
 * API: Check-out
 *
 * POST /api/recepcao/checkout - Check-out do corretor do plantão
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const CheckoutSchema = z.object({
  plantao_id: z.string().uuid('ID do plantão inválido').optional(),
  presenca_id: z.string().uuid('ID da presença inválido').optional(),
});

interface PresencaDB {
  id: string;
  workspace_id: number;
  plantao_id: string;
  user_id: string;
  status: string;
  checkin_at: string;
  checkout_at: string | null;
  posicao_fila: number;
}

/**
 * POST /api/recepcao/checkout
 * Check-out do corretor
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = CheckoutSchema.safeParse(body);

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

    const { plantao_id, presenca_id } = validationResult.data;

    // Deve ter pelo menos um dos IDs
    if (!plantao_id && !presenca_id) {
      return NextResponse.json(
        { success: false, error: 'Informe plantao_id ou presenca_id' },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];

    if (presenca_id) {
      // Check-out por ID da presença
      query = `
        UPDATE recepcao_presencas
        SET status = 'saiu', checkout_at = NOW()
        WHERE id = $1 AND user_id = $2 AND workspace_id = $3 AND status = 'presente'
        RETURNING *
      `;
      params = [presenca_id, (user as any).id, workspaceId];
    } else {
      // Check-out por ID do plantão
      query = `
        UPDATE recepcao_presencas
        SET status = 'saiu', checkout_at = NOW()
        WHERE plantao_id = $1 AND user_id = $2 AND workspace_id = $3 AND status = 'presente'
        RETURNING *
      `;
      params = [plantao_id, (user as any).id, workspaceId];
    }

    const result = await pool.query<PresencaDB>(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Presença não encontrada ou já encerrada' },
        { status: 404 }
      );
    }

    // Reorganizar fila após saída
    await pool.query(
      `SELECT mover_corretor_fim_fila($1)`,
      [result.rows[0].id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Check-out realizado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao fazer check-out:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer check-out' },
      { status: 500 }
    );
  }
}
