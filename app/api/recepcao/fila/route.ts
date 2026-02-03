/**
 * API: Fila do Plantão
 *
 * GET /api/recepcao/fila - Retorna fila atual do plantão
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

interface FilaItem {
  presenca_id: string;
  plantao_id: string;
  user_id: string;
  corretor_nome: string;
  corretor_telefone: string;
  corretor_avatar: string | null;
  posicao_fila: number;
  status: string;
  checkin_at: string;
  checkin_method: string;
  em_atendimento: boolean;
  pausado: boolean;
  feedback_pendente: boolean;
  leads_ativos: number;
  status_legivel: string;
  disponivel: boolean;
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

    // Verificar se plantão existe e pertence ao workspace
    const plantaoCheck = await pool.query(
      `SELECT id FROM recepcao_plantoes WHERE id = $1 AND workspace_id = $2`,
      [plantaoId, workspaceId]
    );

    if (plantaoCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado' },
        { status: 404 }
      );
    }

    // Buscar fila diretamente (inclui leads_ativos)
    const result = await pool.query<FilaItem>(
      `SELECT
        p.id AS presenca_id,
        p.plantao_id,
        p.user_id,
        u.nome AS corretor_nome,
        u.telefone AS corretor_telefone,
        u.avatar_url AS corretor_avatar,
        p.posicao_fila,
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
        (p.status = 'presente' AND NOT p.em_atendimento AND NOT p.pausado AND NOT p.feedback_pendente AND COALESCE(p.leads_ativos, 0) < 5) AS disponivel
      FROM recepcao_presencas p
      JOIN users u ON u.id = p.user_id
      WHERE p.plantao_id = $1 AND p.workspace_id = $2
      ORDER BY p.posicao_fila ASC`,
      [plantaoId, workspaceId]
    );

    // Estatísticas rápidas
    const stats = {
      total: result.rows.length,
      disponiveis: result.rows.filter(r => r.disponivel).length,
      em_atendimento: result.rows.filter(r => r.em_atendimento).length,
      pausados: result.rows.filter(r => r.pausado).length,
      aguardando_feedback: result.rows.filter(r => r.feedback_pendente).length,
      limite_leads: result.rows.filter(r => (r.leads_ativos || 0) >= 5).length,
    };

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats,
    });
  } catch (error) {
    console.error('Erro ao buscar fila:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar fila' },
      { status: 500 }
    );
  }
}
