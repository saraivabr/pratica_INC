/**
 * API: Iniciar Atendimento
 *
 * POST /api/recepcao/atribuicoes/:id/iniciar - Marca início do atendimento
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

interface AtribuicaoDB {
  id: string;
  user_id: string;
  atendimento_iniciado_at: string | null;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/recepcao/atribuicoes/:id/iniciar
 * Marca início do atendimento
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de atribuição inválido' },
        { status: 400 }
      );
    }

    // Verificar se atribuição existe e pertence ao corretor
    const checkResult = await pool.query<AtribuicaoDB>(
      `SELECT id, user_id, atendimento_iniciado_at FROM recepcao_atribuicoes
       WHERE id = $1 AND workspace_id = $2`,
      [id, workspaceId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Atribuição não encontrada' },
        { status: 404 }
      );
    }

    const atribuicao = checkResult.rows[0];

    // Verificar se é o corretor correto
    if (atribuicao.user_id !== (user as any).id) {
      return NextResponse.json(
        { success: false, error: 'Esta atribuição pertence a outro corretor' },
        { status: 403 }
      );
    }

    // Verificar se já foi iniciado
    if (atribuicao.atendimento_iniciado_at) {
      return NextResponse.json(
        { success: false, error: 'Atendimento já foi iniciado' },
        { status: 400 }
      );
    }

    // Marcar início
    const result = await pool.query(
      `UPDATE recepcao_atribuicoes
       SET atendimento_iniciado_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Atendimento iniciado',
    });
  } catch (error) {
    console.error('Erro ao iniciar atendimento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao iniciar atendimento' },
      { status: 500 }
    );
  }
}
