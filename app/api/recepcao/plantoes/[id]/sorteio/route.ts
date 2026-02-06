/**
 * API: Sorteio Diario do Plantao
 *
 * POST /api/recepcao/plantoes/[id]/sorteio - Realizar sorteio
 * GET /api/recepcao/plantoes/[id]/sorteio - Obter resultado do sorteio
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';

interface SorteioResult {
  user_id: string;
  user_nome: string;
  sorteio_posicao: number;
}

/**
 * POST /api/recepcao/plantoes/[id]/sorteio
 * Realizar sorteio diario definindo a ordem da fila da portaria
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user, features } = ctx;
    const { id: plantao_id } = await params;

    // Verificar permissao (apenas admin/gerente/recepcionista)
    // TODO: Adicionar verificacao de hierarquia
    // Por enquanto, qualquer usuario autenticado pode realizar

    return await withTenant(workspaceId, async (client) => {
      // Verificar se plantao existe e pertence ao workspace
      const plantaoCheck = await client.query<{
        id: string;
        sorteio_realizado: boolean;
        sorteio_at: string | null;
      }>(
        `SELECT id, sorteio_realizado, sorteio_at FROM recepcao_plantoes
         WHERE id = $1 AND workspace_id = $2 AND status = 'ativo'`,
        [plantao_id, workspaceId]
      );

      if (plantaoCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Plantao nao encontrado' },
          { status: 404 }
        );
      }

      if (plantaoCheck.rows[0].sorteio_realizado) {
        return NextResponse.json(
          {
            success: false,
            error: 'Sorteio ja foi realizado para este plantao',
            sorteio_at: plantaoCheck.rows[0].sorteio_at,
          },
          { status: 400 }
        );
      }

      // Verificar se ha corretores presentes
      const presencasCheck = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM recepcao_presencas
         WHERE plantao_id = $1 AND status = 'presente'`,
        [plantao_id]
      );

      if (presencasCheck.rows[0].count === 0) {
        return NextResponse.json(
          { success: false, error: 'Nao ha corretores presentes para realizar o sorteio' },
          { status: 400 }
        );
      }

      // Realizar sorteio
      const result = await client.query<SorteioResult>(
        `SELECT * FROM realizar_sorteio($1)`,
        [plantao_id]
      );

      return NextResponse.json({
        success: true,
        data: {
          total_sorteados: result.rows.length,
          resultado: result.rows,
          sorteio_at: new Date().toISOString(),
        },
        message: `Sorteio realizado! ${result.rows.length} corretor(es) na fila.`,
      });
    });
  } catch (error: any) {
    console.error('Erro ao realizar sorteio:', error);

    if (error.message?.includes('ja foi realizado')) {
      return NextResponse.json(
        { success: false, error: 'Sorteio ja foi realizado para este plantao' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao realizar sorteio' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recepcao/plantoes/[id]/sorteio
 * Obter resultado do sorteio (se ja realizado)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id: plantao_id } = await params;

    return await withTenant(workspaceId, async (client) => {
      // Verificar se plantao existe
      const plantaoResult = await client.query<{
        sorteio_realizado: boolean;
        sorteio_at: string | null;
      }>(
        `SELECT sorteio_realizado, sorteio_at FROM recepcao_plantoes
         WHERE id = $1 AND workspace_id = $2`,
        [plantao_id, workspaceId]
      );

      if (plantaoResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Plantao nao encontrado' },
          { status: 404 }
        );
      }

      const plantao = plantaoResult.rows[0];

      if (!plantao.sorteio_realizado) {
        return NextResponse.json({
          success: true,
          data: {
            sorteio_realizado: false,
            sorteio_at: null,
            resultado: [],
          },
        });
      }

      // Buscar resultado do sorteio
      const resultadoResult = await client.query<{
        user_id: string;
        user_nome: string;
        avatar_url: string | null;
        sorteio_posicao: number;
        posicao_atual: number;
        status: string;
      }>(
        `SELECT
          p.user_id,
          u.nome AS user_nome,
          u.avatar_url,
          p.sorteio_posicao,
          p.posicao_fila AS posicao_atual,
          CASE
            WHEN p.em_atendimento THEN 'atendendo'
            WHEN p.pausado THEN 'pausado'
            WHEN p.feedback_pendente THEN 'feedback'
            WHEN p.status != 'presente' THEN 'ausente'
            ELSE 'disponivel'
          END AS status
        FROM recepcao_presencas p
        JOIN users u ON u.id = p.user_id
        WHERE p.plantao_id = $1 AND p.sorteio_posicao IS NOT NULL
        ORDER BY p.sorteio_posicao`,
        [plantao_id]
      );

      return NextResponse.json({
        success: true,
        data: {
          sorteio_realizado: true,
          sorteio_at: plantao.sorteio_at,
          resultado: resultadoResult.rows,
        },
      });
    });
  } catch (error: any) {
    console.error('Erro ao buscar sorteio:', error);

    return NextResponse.json(
      { success: false, error: 'Erro ao buscar sorteio' },
      { status: 500 }
    );
  }
}
