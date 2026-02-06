/**
 * API: Fila do Plantão
 *
 * GET /api/recepcao/fila - Retorna fila atual do plantão
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

interface FilaItem {
  presenca_id: string;
  plantao_id: string;
  user_id: string;
  corretor_nome: string;
  corretor_telefone: string;
  corretor_avatar: string | null;
  posicao_fila: number;
  sorteio_posicao: number | null;
  status: string;
  checkin_at: string;
  checkin_method: string;
  em_atendimento: boolean;
  pausado: boolean;
  feedback_pendente: boolean;
  leads_ativos: number;
  status_legivel: string;
  disponivel: boolean;
  // Qualificacao
  qualificado: boolean;
  total_ofertas: number;
  posicao_leads: number | null;
}

/**
 * GET /api/recepcao/fila
 * Retorna fila atual do plantão
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { searchParams } = new URL(request.url);

    const plantaoId = searchParams.get('plantao_id');

    if (!plantaoId) {
      return NextResponse.json(
        { success: false, error: 'plantao_id é obrigatório' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      // Verificar se plantão existe
      const plantaoCheck = await client.query(
        `SELECT id FROM recepcao_plantoes WHERE id = $1`,
        [plantaoId]
      );

      if (plantaoCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Plantão não encontrado' },
          { status: 404 }
        );
      }

      // Buscar fila diretamente (inclui leads_ativos e qualificação)
      const result = await client.query<FilaItem>(
        `SELECT
          p.id AS presenca_id,
          p.plantao_id,
          p.user_id,
          u.nome AS corretor_nome,
          u.telefone AS corretor_telefone,
          u.avatar_url AS corretor_avatar,
          p.posicao_fila,
          p.sorteio_posicao,
          p.status,
          p.checkin_at,
          p.checkin_method,
          p.em_atendimento,
          p.pausado,
          p.feedback_pendente,
          COALESCE(p.leads_ativos, 0) AS leads_ativos,
          p.workspace_id,
          CASE
            WHEN COALESCE(p.leads_ativos, 0) >= 5 THEN 'Limite de leads'
            WHEN p.em_atendimento THEN 'Em atendimento'
            WHEN p.pausado THEN 'Pausado'
            WHEN p.feedback_pendente THEN 'Aguardando feedback'
            WHEN p.status != 'presente' THEN 'Ausente'
            ELSE 'Disponível'
          END AS status_legivel,
          (p.status = 'presente' AND NOT p.em_atendimento AND NOT p.pausado AND NOT p.feedback_pendente AND COALESCE(p.leads_ativos, 0) < 5) AS disponivel,
          -- Qualificação
          COALESCE(q.qualificado, false) AS qualificado,
          COALESCE(q.total_ofertas, 0) AS total_ofertas,
          q.posicao_roleta_leads AS posicao_leads
        FROM recepcao_presencas p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN roleta_qualificacao q ON q.presenca_id = p.id
        WHERE p.plantao_id = $1
        ORDER BY p.posicao_fila ASC`,
        [plantaoId]
      );

      // Estatísticas rápidas
      const stats = {
        total: result.rows.length,
        disponiveis: result.rows.filter(r => r.disponivel).length,
        em_atendimento: result.rows.filter(r => r.em_atendimento).length,
        pausados: result.rows.filter(r => r.pausado).length,
        aguardando_feedback: result.rows.filter(r => r.feedback_pendente).length,
        limite_leads: result.rows.filter(r => (r.leads_ativos || 0) >= 5).length,
        qualificados: result.rows.filter(r => r.qualificado).length,
      };

      return NextResponse.json({
        success: true,
        data: result.rows,
        stats,
      });
    });
  } catch (error) {
    console.error('Erro ao buscar fila:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar fila' },
      { status: 500 }
    );
  }
}
