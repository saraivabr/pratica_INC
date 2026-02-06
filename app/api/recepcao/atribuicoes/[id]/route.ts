/**
 * API: Detalhes da Atribuição
 *
 * GET /api/recepcao/atribuicoes/:id - Detalhes de uma atribuição
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

interface AtribuicaoWithDetails {
  id: string;
  workspace_id: number;
  plantao_id: string;
  presenca_id: string;
  user_id: string;
  corretor_nome: string;
  corretor_telefone: string;
  lead_nome: string | null;
  lead_telefone: string | null;
  lead_email: string | null;
  lead_origem: string;
  lead_observacoes: string | null;
  atribuido_at: string;
  atendimento_iniciado_at: string | null;
  atendimento_finalizado_at: string | null;
  feedback_status: string | null;
  feedback_observacoes: string | null;
  feedback_at: string | null;
  atribuido_por_nome: string | null;
  local_nome: string;
  plantao_data: string;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/recepcao/atribuicoes/:id
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
        { success: false, error: 'ID de atribuição inválido' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      const query = `
        SELECT
          a.*,
          u.nome AS corretor_nome,
          u.telefone AS corretor_telefone,
          ab.nome AS atribuido_por_nome,
          l.nome AS local_nome,
          p.data AS plantao_data
        FROM recepcao_atribuicoes a
        JOIN users u ON u.id = a.user_id
        JOIN recepcao_presencas pr ON pr.id = a.presenca_id
        JOIN recepcao_plantoes p ON p.id = a.plantao_id
        JOIN recepcao_locais l ON l.id = p.local_id
        LEFT JOIN users ab ON ab.id = a.atribuido_por
        WHERE a.id = $1 AND a.workspace_id = $2
      `;

      const result = await client.query<AtribuicaoWithDetails>(query, [id, workspaceId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Atribuição não encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
      });
    });
  } catch (error) {
    console.error('Erro ao buscar atribuição:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar atribuição' },
      { status: 500 }
    );
  }
}
