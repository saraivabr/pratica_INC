/**
 * API: Pausar na Fila
 *
 * POST /api/recepcao/pausar - Pausar corretor na fila (temporariamente indisponível)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

const PausarSchema = z.object({
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
 * POST /api/recepcao/pausar
 * Pausar corretor na fila
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = PausarSchema.safeParse(body);

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
          SET pausado = true, updated_at = NOW()
          WHERE id = $1 AND user_id = $2 AND workspace_id = $3
            AND status = 'presente'
            AND em_atendimento = false
          RETURNING *
        `;
        params = [presenca_id, (user as any).id, workspaceId];
      } else {
        query = `
          UPDATE recepcao_presencas
          SET pausado = true, updated_at = NOW()
          WHERE plantao_id = $1 AND user_id = $2 AND workspace_id = $3
            AND status = 'presente'
            AND em_atendimento = false
          RETURNING *
        `;
        params = [plantao_id, (user as any).id, workspaceId];
      }

      const result = await client.query<PresencaDB>(query, params);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Presença não encontrada ou você está em atendimento' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Você está pausado na fila. Não receberá novos leads até retomar.',
      });
    });
  } catch (error) {
    console.error('Erro ao pausar:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao pausar' },
      { status: 500 }
    );
  }
}
