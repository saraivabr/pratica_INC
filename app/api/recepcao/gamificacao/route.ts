/**
 * API: Gamificacao - Estrelas e PIX
 *
 * GET /api/recepcao/gamificacao - Obter estrelas e status do usuario
 * POST /api/recepcao/gamificacao - Resgatar PIX (5 estrelas = R$50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

interface EstrelasSummary {
  estrelas_disponiveis: number;
  estrelas_resgatadas: number;
  pix_pendentes: number;
  pix_pagos: number;
  total_pix_recebido: number;
  pode_resgatar: boolean;
}

interface EstrelaHistorico {
  id: string;
  tipo: string;
  valor: number;
  resgatado: boolean;
  resgatado_at: string | null;
  created_at: string;
  plantao_data: string | null;
  local_nome: string | null;
}

/**
 * GET /api/recepcao/gamificacao
 * Obter estrelas e historico do usuario
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const searchParams = request.nextUrl.searchParams;
    const includeHistorico = searchParams.get('historico') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    return await withTenant(workspaceId, async (client) => {
      // Buscar resumo de estrelas
      const summaryResult = await client.query<EstrelasSummary>(
        `SELECT * FROM v_roleta_estrelas WHERE user_id = $1 AND workspace_id = $2`,
        [(user as any).id, workspaceId]
      );

      const summary: EstrelasSummary = summaryResult.rows[0] || {
        estrelas_disponiveis: 0,
        estrelas_resgatadas: 0,
        pix_pendentes: 0,
        pix_pagos: 0,
        total_pix_recebido: 0,
        pode_resgatar: false,
      };

      let historico: EstrelaHistorico[] = [];

      if (includeHistorico) {
        const historicoResult = await client.query<EstrelaHistorico>(
          `SELECT
            g.id,
            g.tipo,
            g.valor,
            g.resgatado,
            g.resgatado_at,
            g.created_at,
            p.data AS plantao_data,
            l.nome AS local_nome
          FROM roleta_gamificacao g
          LEFT JOIN recepcao_plantoes p ON p.id = g.plantao_id
          LEFT JOIN recepcao_locais l ON l.id = p.local_id
          WHERE g.user_id = $1 AND g.workspace_id = $2
          ORDER BY g.created_at DESC
          LIMIT $3`,
          [(user as any).id, workspaceId, limit]
        );
        historico = historicoResult.rows;
      }

      // Calcular estrelas para proximo PIX
      const estrelasParaPix = Math.max(0, 5 - (summary.estrelas_disponiveis % 5));

      return NextResponse.json({
        success: true,
        data: {
          ...summary,
          estrelas_para_pix: summary.pode_resgatar ? 0 : estrelasParaPix,
          historico,
        },
      });
    });
  } catch (error: any) {
    console.error('Erro ao buscar gamificacao:', error);

    return NextResponse.json(
      { success: false, error: 'Erro ao buscar dados de gamificacao' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recepcao/gamificacao
 * Resgatar PIX (5 estrelas = R$50)
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    return await withTenant(workspaceId, async (client) => {
      // Chamar funcao de resgate
      const result = await client.query<{
        sucesso: boolean;
        resgate_id: string | null;
        mensagem: string;
        estrelas_restantes: number;
      }>(
        `SELECT * FROM resgatar_pix($1, $2)`,
        [workspaceId, (user as any).id]
      );

      const resgate = result.rows[0];

      if (!resgate.sucesso) {
        return NextResponse.json(
          { success: false, error: resgate.mensagem },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          resgate_id: resgate.resgate_id,
          estrelas_restantes: resgate.estrelas_restantes,
          valor: 50,
        },
        message: resgate.mensagem,
      });
    });
  } catch (error: any) {
    console.error('Erro ao resgatar PIX:', error);

    return NextResponse.json(
      { success: false, error: 'Erro ao processar resgate' },
      { status: 500 }
    );
  }
}
