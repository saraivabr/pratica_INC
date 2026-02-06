/**
 * API: Qualificacao para Roleta de Leads
 *
 * GET /api/recepcao/qualificacao - Obter status de qualificacao do usuario
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

interface QualificacaoData {
  id: string;
  plantao_id: string;
  total_ofertas: number;
  meta_ofertas: number;
  qualificado: boolean;
  qualificado_at: string | null;
  posicao_roleta_leads: number | null;
  progresso_percentual: number;
  ofertas_faltantes: number;
  mensagem_motivacional: string;
}

/**
 * GET /api/recepcao/qualificacao
 * Obter status de qualificacao do usuario no plantao
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const searchParams = request.nextUrl.searchParams;
    const plantao_id = searchParams.get('plantao_id');

    if (!plantao_id) {
      return NextResponse.json(
        { success: false, error: 'plantao_id e obrigatorio' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      // Buscar qualificacao usando view
      const result = await client.query<QualificacaoData>(
        `SELECT
          q.id,
          q.plantao_id,
          q.total_ofertas,
          p.meta_ofertas,
          q.qualificado,
          q.qualificado_at,
          q.posicao_roleta_leads,
          ROUND((q.total_ofertas::DECIMAL / NULLIF(p.meta_ofertas, 0)) * 100, 1)::float AS progresso_percentual,
          GREATEST(p.meta_ofertas - q.total_ofertas, 0)::int AS ofertas_faltantes,
          CASE
            WHEN q.qualificado THEN 'Voce esta na Roleta de Leads!'
            WHEN q.total_ofertas >= p.meta_ofertas * 0.9 THEN 'Quase la! So mais ' || (p.meta_ofertas - q.total_ofertas) || '!'
            WHEN q.total_ofertas >= p.meta_ofertas * 0.5 THEN 'Metade do caminho! Continue assim.'
            WHEN q.total_ofertas >= p.meta_ofertas * 0.3 THEN 'Bom progresso! So mais ' || (p.meta_ofertas - q.total_ofertas) || ' ofertas.'
            ELSE 'Comece forte! Cada oferta te aproxima dos leads.'
          END AS mensagem_motivacional
        FROM roleta_qualificacao q
        JOIN recepcao_plantoes p ON p.id = q.plantao_id
        WHERE q.plantao_id = $1 AND q.user_id = $2 AND q.workspace_id = $3`,
        [plantao_id, (user as any).id, workspaceId]
      );

      if (result.rows.length === 0) {
        // Usuario ainda nao tem qualificacao - retornar valores default
        const plantaoResult = await client.query<{ meta_ofertas: number }>(
          `SELECT COALESCE(meta_ofertas, 30) AS meta_ofertas FROM recepcao_plantoes WHERE id = $1`,
          [plantao_id]
        );

        const metaOfertas = plantaoResult.rows[0]?.meta_ofertas || 30;

        return NextResponse.json({
          success: true,
          data: {
            id: null,
            plantao_id,
            total_ofertas: 0,
            meta_ofertas: metaOfertas,
            qualificado: false,
            qualificado_at: null,
            posicao_roleta_leads: null,
            progresso_percentual: 0,
            ofertas_faltantes: metaOfertas,
            mensagem_motivacional: 'Comece forte! Cada oferta te aproxima dos leads.',
          },
        });
      }

      // Buscar total de qualificados para context
      const totalQualificadosResult = await client.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM roleta_qualificacao
         WHERE plantao_id = $1 AND qualificado = true`,
        [plantao_id]
      );

      return NextResponse.json({
        success: true,
        data: {
          ...result.rows[0],
          total_qualificados: totalQualificadosResult.rows[0].total,
        },
      });
    });
  } catch (error: any) {
    console.error('Erro ao buscar qualificacao:', error);

    return NextResponse.json(
      { success: false, error: 'Erro ao buscar qualificacao' },
      { status: 500 }
    );
  }
}
