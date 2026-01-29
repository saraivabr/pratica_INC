import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

// GET /api/crm/leads - Lista leads para o pipeline
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    // Buscar leads do workspace
    let query = `
      SELECT 
        cvcrm_id as id,
        nome as name,
        telefone as phone,
        email,
        situacao_id as stage_id,
        situacao_nome as stage,
        score,
        data_cadastro_cvcrm as created_at,
        data_atualizacao_cvcrm as last_interaction_at,
        'warm' as temperature
      FROM cvcrm_leads
      WHERE workspace_id = $1
    `;

    const params: any[] = [workspaceId];

    // Filtrar por role
    if (user.role === 'corretor') {
      query += ` AND corretor_nome = $2`;
      params.push(user.nome);
    } else if (user.role === 'gerente') {
      query += ` AND (corretor_nome IN (
        SELECT nome FROM users WHERE gerente_id = $2
      ) OR corretor_nome = (SELECT nome FROM users WHERE id = $2))`;
      params.push(user.id);
    }

    query += ` ORDER BY data_atualizacao_cvcrm DESC NULLS LAST LIMIT 100`;

    const result = await pool.query(query, params);

    const leads = result.rows.map(row => ({
      ...row,
      stage_id: row.stage_id?.toString() || '1',
    }));

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Erro ao buscar leads CRM:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar leads' },
      { status: 500 }
    );
  }
}
