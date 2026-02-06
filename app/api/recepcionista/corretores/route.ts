/**
 * API: Listar corretores do workspace
 * GET /api/recepcionista/corretores
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { dbQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const { rows } = await dbQuery(
      `SELECT id, nome, telefone, avatar_url
       FROM users
       WHERE workspace_id = $1
         AND is_active = true
         AND hierarquia_id IN (
           SELECT id FROM hierarquias WHERE slug IN ('corretor', 'gerente', 'diretor')
         )
       ORDER BY nome ASC`,
      [workspaceId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao listar corretores:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar corretores' },
      { status: 500 }
    );
  }
}
