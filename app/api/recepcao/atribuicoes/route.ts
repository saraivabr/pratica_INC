/**
 * API: Listar Atribuições
 *
 * GET /api/recepcao/atribuicoes - Lista atribuições do plantão ou do corretor
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

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
}

/**
 * GET /api/recepcao/atribuicoes
 * Lista atribuições
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { searchParams } = new URL(request.url);

    const plantaoId = searchParams.get('plantao_id');
    const userId = searchParams.get('user_id');
    const meus = searchParams.get('meus') === 'true';
    const pendentes = searchParams.get('pendentes') === 'true';
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const rawOffset = parseInt(searchParams.get('offset') || '0');
    // Sanitize inputs to prevent NaN and enforce bounds
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    let whereClause = 'WHERE a.workspace_id = $1';
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (plantaoId) {
      whereClause += ` AND a.plantao_id = $${paramIndex++}`;
      params.push(plantaoId);
    }

    if (meus) {
      whereClause += ` AND a.user_id = $${paramIndex++}`;
      params.push((user as any).id);
    } else if (userId) {
      whereClause += ` AND a.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (pendentes) {
      whereClause += ' AND a.feedback_status IS NULL';
    }

    const countQuery = `SELECT COUNT(*) AS total FROM recepcao_atribuicoes a ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const query = `
      SELECT
        a.*,
        u.nome AS corretor_nome,
        u.telefone AS corretor_telefone,
        ab.nome AS atribuido_por_nome
      FROM recepcao_atribuicoes a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN users ab ON ab.id = a.atribuido_por
      ${whereClause}
      ORDER BY a.atribuido_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query<AtribuicaoWithDetails>(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Erro ao listar atribuições:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar atribuições' },
      { status: 500 }
    );
  }
}
