/**
 * API: Plantões de Hoje
 *
 * GET /api/recepcao/plantoes/hoje - Retorna plantões ativos do dia atual
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

interface PlantaoHoje {
  id: string;
  workspace_id: number;
  local_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  hora_limite_checkin: string | null;
  max_corretores: number | null;
  descricao: string | null;
  status: string;
  sorteio_realizado: boolean;
  sorteio_at: string | null;
  meta_ofertas: number;
  local_nome: string;
  local_endereco: string | null;
  total_presentes: number;
  disponiveis: number;
  em_atendimento: number;
  is_current: boolean;
}

/**
 * GET /api/recepcao/plantoes/hoje
 * Retorna plantões ativos do dia atual
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { searchParams } = new URL(request.url);

    const localId = searchParams.get('local_id');

    return await withTenant(workspaceId, async (client) => {
      let whereClause = `
        WHERE p.data = CURRENT_DATE
          AND p.status = 'ativo'
      `;
      const params: any[] = [];

      if (localId) {
        whereClause += ` AND p.local_id = $1`;
        params.push(localId);
      }

      const query = `
        SELECT
          p.id,
          p.workspace_id,
          p.local_id,
          p.data,
          p.hora_inicio,
          p.hora_fim,
          p.hora_limite_checkin,
          p.max_corretores,
          p.descricao,
          p.status,
          COALESCE(p.sorteio_realizado, false) AS sorteio_realizado,
          p.sorteio_at,
          COALESCE(p.meta_ofertas, 30) AS meta_ofertas,
          l.nome AS local_nome,
          l.endereco AS local_endereco,
          COALESCE(stats.total_presentes, 0) AS total_presentes,
          COALESCE(stats.disponiveis, 0) AS disponiveis,
          COALESCE(stats.em_atendimento, 0) AS em_atendimento,
          (CURRENT_TIME BETWEEN p.hora_inicio AND p.hora_fim) AS is_current
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
        ORDER BY p.hora_inicio ASC
      `;

      const result = await client.query<PlantaoHoje>(query, params);

      // Identificar o plantão atual (horário corrente)
      const current = result.rows.find(p => p.is_current) || null;

      return NextResponse.json({
        success: true,
        data: result.rows,
        current: current,
      });
    });
  } catch (error) {
    console.error('Erro ao buscar plantões de hoje:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar plantões de hoje' },
      { status: 500 }
    );
  }
}
