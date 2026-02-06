/**
 * API: Anotações de Atribuição
 *
 * GET  /api/recepcao/atribuicoes/[id]/anotacoes - Lista anotações
 * POST /api/recepcao/atribuicoes/[id]/anotacoes - Cria nova anotação
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { dbQuery } from '@/lib/db';
import { z } from 'zod';

const AnotacaoSchema = z.object({
  tipo: z.enum(['nota', 'ligacao', 'whatsapp', 'visita', 'email']).default('nota'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório').max(2000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id: atribuicaoId } = await params;

    const result = await dbQuery(
      `SELECT la.*, u.nome as user_nome
       FROM lead_anotacoes la
       JOIN users u ON u.id = la.user_id
       WHERE la.atribuicao_id = $1 AND la.workspace_id = $2
       ORDER BY la.created_at ASC`,
      [atribuicaoId, workspaceId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erro ao listar anotações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar anotações' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { id: atribuicaoId } = await params;
    const userId = (user as any).id;

    const body = await request.json();
    const validation = AnotacaoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { tipo, conteudo } = validation.data;

    // Verify atribuição belongs to user and workspace
    const atribCheck = await dbQuery(
      `SELECT id, cvcrm_lead_id FROM recepcao_atribuicoes
       WHERE id = $1 AND workspace_id = $2 AND user_id = $3`,
      [atribuicaoId, workspaceId, userId]
    );

    if (atribCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Atribuição não encontrada' },
        { status: 404 }
      );
    }

    const result = await dbQuery(
      `INSERT INTO lead_anotacoes (workspace_id, atribuicao_id, cvcrm_lead_id, user_id, tipo, conteudo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        workspaceId,
        atribuicaoId,
        atribCheck.rows[0].cvcrm_lead_id,
        userId,
        tipo,
        conteudo,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Anotação salva',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar anotação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar anotação' },
      { status: 500 }
    );
  }
}
