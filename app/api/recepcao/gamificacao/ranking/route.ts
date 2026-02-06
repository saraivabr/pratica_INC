/**
 * API: Ranking de Estrelas
 *
 * GET /api/recepcao/gamificacao/ranking - Obter ranking de estrelas
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

interface RankingItem {
  user_id: string;
  user_nome: string;
  avatar_url: string | null;
  total_estrelas: number;
  estrelas_hoje: number;
  total_pix: number;
}

/**
 * GET /api/recepcao/gamificacao/ranking
 * Obter ranking de estrelas do workspace
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const searchParams = request.nextUrl.searchParams;
    const periodo = searchParams.get('periodo') || 'semana'; // dia, semana, mes, total
    const limitParam = parseInt(searchParams.get('limit') || '10');
    // Sanitize limit to prevent issues
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 10 : limitParam), 100);

    // Calculate date filter using parameterized interval
    // Instead of string concatenation, use a parameter for days offset
    let daysOffset: number | null = null;
    switch (periodo) {
      case 'dia':
        daysOffset = 0;
        break;
      case 'semana':
        daysOffset = 7;
        break;
      case 'mes':
        daysOffset = 30;
        break;
      default:
        daysOffset = null; // No date filter for 'total'
    }

    return await withTenant(workspaceId, async (client) => {
      // Use parameterized queries - if daysOffset is null, don't filter by date
      const result = await client.query<RankingItem>(
        `SELECT
          u.id AS user_id,
          u.nome AS user_nome,
          u.avatar_url,
          COALESCE(SUM(CASE WHEN g.tipo LIKE 'estrela_%' THEN 1 ELSE 0 END), 0)::int AS total_estrelas,
          COALESCE(SUM(CASE WHEN g.tipo LIKE 'estrela_%' AND g.created_at >= CURRENT_DATE THEN 1 ELSE 0 END), 0)::int AS estrelas_hoje,
          COALESCE(SUM(CASE WHEN g.tipo = 'bonus_pix' AND g.resgatado THEN g.valor ELSE 0 END), 0)::int AS total_pix
        FROM users u
        LEFT JOIN roleta_gamificacao g ON g.user_id = u.id
          AND g.workspace_id = $1
          AND ($3::int IS NULL OR g.created_at >= CURRENT_DATE - ($3::int || ' days')::interval)
        WHERE u.workspace_id = $1
          AND u.hierarquia_id = (SELECT id FROM hierarquias WHERE slug = 'corretor')
        GROUP BY u.id, u.nome, u.avatar_url
        HAVING COALESCE(SUM(CASE WHEN g.tipo LIKE 'estrela_%' THEN 1 ELSE 0 END), 0) > 0
        ORDER BY total_estrelas DESC
        LIMIT $2`,
        [workspaceId, limit, daysOffset]
      );

      // Verificar posicao do usuario atual - fully parameterized
      const userRankResult = await client.query<{ posicao: number }>(
        `WITH ranking AS (
          SELECT
            user_id,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS posicao
          FROM roleta_gamificacao
          WHERE workspace_id = $1
            AND tipo LIKE 'estrela_%'
            AND ($3::int IS NULL OR created_at >= CURRENT_DATE - ($3::int || ' days')::interval)
          GROUP BY user_id
        )
        SELECT posicao::int FROM ranking WHERE user_id = $2`,
        [workspaceId, (user as any).id, daysOffset]
      );

      const userPosicao = userRankResult.rows[0]?.posicao || null;

      return NextResponse.json({
        success: true,
        data: {
          ranking: result.rows,
          minha_posicao: userPosicao,
          periodo,
        },
      });
    });
  } catch (error: any) {
    console.error('Erro ao buscar ranking:', error);

    return NextResponse.json(
      { success: false, error: 'Erro ao buscar ranking' },
      { status: 500 }
    );
  }
}
