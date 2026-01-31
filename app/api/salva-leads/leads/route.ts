import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/salva-leads/leads
 * 
 * Lista leads com score e filtros
 * Query params:
 * - workspace_id (number) - obrigatório
 * - corretor_id (string, opcional)
 * - status (string, opcional) - novo, em_contato, agendado, visitou, etc
 * - qualificado (boolean, opcional) - true para só qualificados
 * - limit (number, default: 50)
 * - offset (number, default: 0)
 * - sort (string) - 'score', 'created_at', 'nome' (default: 'score DESC')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = parseInt(searchParams.get('workspace_id') || '0');
    const corretorId = searchParams.get('corretor_id');
    const status = searchParams.get('status');
    const qualificado = searchParams.get('qualificado');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'score DESC';

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id é obrigatório' },
        { status: 400 }
      );
    }

    // Construir query dinâmica
    const conditions: string[] = ['workspace_id = $1'];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (corretorId) {
      conditions.push(`corretor_id = $${paramIndex}`);
      params.push(corretorId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (qualificado !== null && qualificado !== undefined && qualificado !== '') {
      conditions.push(`qualificado = $${paramIndex}`);
      params.push(qualificado === 'true');
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Buscar leads (use COALESCE for nome/name and whatsapp/phone compatibility)
    const leadsResult = await pool.query(
      `SELECT
        id,
        COALESCE(nome, name) as nome,
        email,
        COALESCE(whatsapp, phone) as whatsapp,
        imovel_id,
        imovel_nome,
        imovel_preco,
        filtros,
        score,
        COALESCE(qualificado, false) as qualificado,
        COALESCE(status, 'novo') as status,
        corretor_id,
        source,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM leads_interactions WHERE lead_id = leads.id) as interaction_count,
        (SELECT MAX(created_at) FROM leads_interactions WHERE lead_id = leads.id) as last_interaction
      FROM leads
      WHERE ${whereClause}
      ORDER BY ${sort}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Contar total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM leads WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Formatar leads
    const leads = leadsResult.rows.map((lead: any) => ({
      id: lead.id,
      nome: lead.nome,
      email: lead.email,
      whatsapp: lead.whatsapp,
      imovel: {
        id: lead.imovel_id,
        nome: lead.imovel_nome,
        preco: lead.imovel_preco,
      },
      filtros: lead.filtros ? JSON.parse(lead.filtros) : {},
      score: lead.score,
      qualificado: lead.qualificado,
      status: lead.status,
      interactions: lead.interaction_count,
      lastInteraction: lead.last_interaction,
      source: lead.source,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    }));

    return NextResponse.json({
      success: true,
      leads,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('[Get Leads] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
