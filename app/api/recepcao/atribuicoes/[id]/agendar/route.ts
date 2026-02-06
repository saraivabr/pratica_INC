/**
 * API: Agendar Follow-up
 *
 * POST /api/recepcao/atribuicoes/[id]/agendar - Agenda follow-up para lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

const AgendarSchema = z.object({
  data_agendamento: z.string().min(1, 'Data é obrigatória'),
  tipo: z.enum(['whatsapp', 'ligacao', 'visita', 'email']).default('whatsapp'),
  observacoes: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { id: atribuicaoId } = await params;
    const userId = (user as any).id;

    const body = await request.json();
    const validation = AgendarSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { data_agendamento, tipo, observacoes } = validation.data;

    return await withTenant(workspaceId, async (client) => {
      // Verify atribuição belongs to user and workspace
      const atribCheck = await client.query(
        `SELECT id, cvcrm_lead_id, lead_nome FROM recepcao_atribuicoes
         WHERE id = $1 AND workspace_id = $2 AND user_id = $3`,
        [atribuicaoId, workspaceId, userId]
      );

      if (atribCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Atribuição não encontrada' },
          { status: 404 }
        );
      }

      const atrib = atribCheck.rows[0];

      // Canal mapping
      const canalMap: Record<string, string> = {
        whatsapp: 'whatsapp',
        ligacao: 'telefone',
        visita: 'presencial',
        email: 'email',
      };

      // Create followup
      const result = await client.query(
        `INSERT INTO followups (workspace_id, lead_id, user_id, tipo, mensagem, canal, status, data_agendada)
         VALUES ($1, $2, $3, 'manual', $4, $5, 'agendado', $6)
         RETURNING *`,
        [
          workspaceId,
          atrib.cvcrm_lead_id,
          userId,
          observacoes || `Follow-up: ${atrib.lead_nome || 'Lead'}`,
          canalMap[tipo] || 'whatsapp',
          data_agendamento,
        ]
      );

      // Also add annotation
      await client.query(
        `INSERT INTO lead_anotacoes (workspace_id, atribuicao_id, cvcrm_lead_id, user_id, tipo, conteudo)
         VALUES ($1, $2, $3, $4, 'nota', $5)`,
        [
          workspaceId,
          atribuicaoId,
          atrib.cvcrm_lead_id,
          userId,
          `Follow-up agendado para ${new Date(data_agendamento).toLocaleString('pt-BR')} via ${tipo}${observacoes ? ': ' + observacoes : ''}`,
        ]
      );

      return NextResponse.json(
        {
          success: true,
          data: result.rows[0],
          message: 'Follow-up agendado!',
        },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error('Erro ao agendar follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao agendar follow-up' },
      { status: 500 }
    );
  }
}
