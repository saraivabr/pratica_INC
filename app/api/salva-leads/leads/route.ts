import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/salva-leads/leads
 * 
 * Lista leads com score e filtros, respeitando permissões por role:
 * - admin: vê todos os leads do workspace
 * - gerente: vê leads dos corretores da sua equipe
 * - corretor: vê apenas seus próprios leads
 * 
 * Query params:
 * - workspace_id (number) - obrigatório
 * - corretor_id (string, opcional) - filtrar por corretor específico (admin/gerente)
 * - status (string, opcional) - novo, em_contato, agendado, visitou, etc
 * - qualificado (boolean, opcional) - true para só qualificados
 * - limit (number, default: 50)
 * - offset (number, default: 0)
 * - sort (string) - 'score', 'created_at', 'nome' (default: 'score DESC')
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = parseInt(searchParams.get('workspace_id') || '0');
    const corretorIdParam = searchParams.get('corretor_id');
    const status = searchParams.get('status');
    const qualificado = searchParams.get('qualificado');
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 200);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));
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

    // === FILTRO POR ROLE ===
    if (user.role === 'admin') {
      // Admin vê tudo do workspace - filtro por corretor é opcional
      if (corretorIdParam) {
        conditions.push(`corretor_id = $${paramIndex}`);
        params.push(corretorIdParam);
        paramIndex++;
      }
    } else if (user.role === 'gerente') {
      // Gerente vê leads dos corretores da sua equipe
      if (corretorIdParam) {
        // Filtro por corretor específico (deve ser da equipe do gerente)
        conditions.push(`corretor_id = $${paramIndex} AND corretor_id IN (SELECT id FROM users WHERE gerente_id = $${paramIndex + 1})`);
        params.push(corretorIdParam, user.id);
        paramIndex += 2;
      } else {
        // Todos os corretores da equipe + leads do próprio gerente
        conditions.push(`(corretor_id IN (SELECT id FROM users WHERE gerente_id = $${paramIndex}) OR corretor_id = $${paramIndex})`);
        params.push(user.id);
        paramIndex++;
      }
    } else {
      // Corretor vê apenas seus próprios leads
      conditions.push(`corretor_id = $${paramIndex}`);
      params.push(user.id);
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

    // Sanitize sort to prevent SQL injection
    const allowedSorts = ['score DESC', 'score ASC', 'created_at DESC', 'created_at ASC', 'nome ASC', 'nome DESC'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'score DESC';

    // Buscar leads
    const leadsResult = await pool.query(
      `SELECT
        l.id,
        COALESCE(l.nome, l.name) as nome,
        l.email,
        COALESCE(l.whatsapp, l.phone) as whatsapp,
        l.imovel_id,
        l.imovel_nome,
        l.imovel_preco,
        l.filtros,
        l.score,
        COALESCE(l.qualificado, false) as qualificado,
        COALESCE(l.status, 'novo') as status,
        l.corretor_id,
        l.source,
        l.created_at,
        l.updated_at,
        u.nome as corretor_nome,
        (SELECT COUNT(*) FROM leads_interactions WHERE lead_id = l.id) as interaction_count,
        (SELECT MAX(created_at) FROM leads_interactions WHERE lead_id = l.id) as last_interaction
      FROM leads l
      LEFT JOIN users u ON u.id = l.corretor_id
      WHERE ${whereClause}
      ORDER BY ${safeSort}
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
      filtros: lead.filtros ? (typeof lead.filtros === 'string' ? JSON.parse(lead.filtros) : lead.filtros) : {},
      score: lead.score,
      qualificado: lead.qualificado,
      status: lead.status,
      corretor_id: lead.corretor_id,
      corretor_nome: lead.corretor_nome,
      interactions: parseInt(lead.interaction_count || '0'),
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
      role: user.role,
    });

  } catch (error: any) {
    console.error('[Get Leads] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
