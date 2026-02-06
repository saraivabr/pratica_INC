/**
 * API: Retomar na Fila
 *
 * POST /api/recepcao/retomar - Retomar corretor na fila após pausa
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

const RetomarSchema = z.object({
  presenca_id: z.string().uuid('ID da presença inválido').optional(),
  plantao_id: z.string().uuid('ID do plantão inválido').optional(),
});

interface PresencaDB {
  id: string;
  plantao_id: string;
  user_id: string;
  status: string;
  pausado: boolean;
  posicao_fila: number;
}

/**
 * POST /api/recepcao/retomar
 * Retomar corretor na fila
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = RetomarSchema.safeParse(body);

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

    const { presenca_id, plantao_id } = validationResult.data;

    if (!presenca_id && !plantao_id) {
      return NextResponse.json(
        { success: false, error: 'Informe presenca_id ou plantao_id' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      let query: string;
      let params: any[];

      if (presenca_id) {
        query = `
          UPDATE recepcao_presencas
          SET pausado = false, updated_at = NOW()
          WHERE id = $1 AND user_id = $2
            AND status = 'presente'
            AND pausado = true
          RETURNING *
        `;
        params = [presenca_id, (user as any).id];
      } else {
        query = `
          UPDATE recepcao_presencas
          SET pausado = false, updated_at = NOW()
          WHERE plantao_id = $1 AND user_id = $2
            AND status = 'presente'
            AND pausado = true
          RETURNING *
        `;
        params = [plantao_id, (user as any).id];
      }

      const result = await client.query<PresencaDB>(query, params);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Presença não encontrada ou você não está pausado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: `Você retomou na fila! Sua posição: ${result.rows[0].posicao_fila}`,
      });
    });
  } catch (error) {
    console.error('Erro ao retomar:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao retomar' },
      { status: 500 }
    );
  }
}
