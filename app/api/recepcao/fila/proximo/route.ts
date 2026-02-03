/**
 * API: Próximo Corretor na Fila
 *
 * GET /api/recepcao/fila/proximo - Retorna próximo corretor disponível
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

interface ProximoCorretor {
  presenca_id: string;
  user_id: string;
  user_nome: string;
  user_telefone: string;
  posicao_fila: number;
}

/**
 * GET /api/recepcao/fila/proximo
 * Retorna próximo corretor disponível na fila
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
      `SELECT id FROM recepcao_plantoes WHERE id = $1 AND workspace_id = $2 AND status = 'ativo'`,
      [plantaoId, workspaceId]
    );

    if (plantaoCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado ou não está ativo' },
        { status: 404 }
      );
    }

    // Buscar próximo corretor usando a função SQL
    const result = await pool.query<ProximoCorretor>(
      `SELECT * FROM get_proximo_corretor_fila($1)`,
      [plantaoId]
    );

    if (result.rows.length === 0 || !result.rows[0].presenca_id) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Não há corretores disponíveis na fila',
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar próximo corretor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar próximo corretor' },
      { status: 500 }
    );
  }
}
