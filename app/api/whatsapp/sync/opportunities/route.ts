import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/api-helpers';

// Use nodejs runtime para acesso ao banco de dados PostgreSQL
export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/sync/opportunities
 *
 * Retorna as oportunidades de recuperacao identificadas pela sincronizacao do WhatsApp.
 *
 * Query params:
 * - workspaceId: number (obrigatorio)
 * - potential: 'alto' | 'medio' | 'baixo' | 'all' (default: 'all')
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 *
 * Retorna: {
 *   data: Array<{
 *     id: number,
 *     phone_number: string,
 *     contact_name: string,
 *     last_message_at: string,
 *     last_message_text: string,
 *     last_message_from_me: boolean,
 *     days_without_response: number,
 *     recovery_potential: string,
 *     suggested_message: string,
 *     lead: {
 *       idlead: string,
 *       nome: string,
 *       situacao: string,
 *       empreendimento: string
 *     } | null
 *   }>,
 *   total: number,
 *   has_more: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const potential = searchParams.get('potential') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const workspaceId = ctx.workspaceId;

    // Validate potential filter
    const validPotentials = ['alto', 'medio', 'baixo', 'all'];
    if (!validPotentials.includes(potential)) {
      return NextResponse.json(
        { success: false, error: `potential deve ser: ${validPotentials.join(', ')}` },
        { status: 400 }
      );
    }

    // Build the WHERE clause
    const whereConditions = [
      'wsc.workspace_id = $1',
      "wsc.recovery_potential IS NOT NULL AND wsc.recovery_potential != 'none'"
    ];
    const queryParams: any[] = [workspaceId];

    if (potential !== 'all') {
      queryParams.push(potential);
      whereConditions.push(`wsc.recovery_potential = $${queryParams.length}`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count total opportunities
    const countQuery = `
      SELECT COUNT(*) as total
      FROM whatsapp_synced_chats wsc
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Fetch opportunities with optional lead join
    // Order by: recovery_potential (alto first), then days_without_response DESC
    const dataQuery = `
      SELECT
        wsc.id,
        wsc.phone_number,
        wsc.contact_name,
        wsc.last_message_at,
        wsc.last_message_text,
        wsc.last_message_from_me,
        wsc.days_without_response,
        wsc.recovery_potential,
        wsc.suggested_message,
        wsc.matched_lead_id,
        wsc.matched_lead_name,
        l.idlead as lead_idlead,
        l.nome as lead_nome,
        l.situacao_nome as lead_situacao,
        CASE
          WHEN jsonb_typeof(l.empreendimento) = 'array' THEN (l.empreendimento->0->>'nome')::text
          ELSE (l.empreendimento->>'nome')::text
        END as lead_empreendimento
      FROM whatsapp_synced_chats wsc
      LEFT JOIN cvcrm_leads l ON l.workspace_id = wsc.workspace_id AND l.idlead::text = wsc.matched_lead_id
      WHERE ${whereClause}
      ORDER BY
        CASE wsc.recovery_potential
          WHEN 'alto' THEN 1
          WHEN 'medio' THEN 2
          WHEN 'baixo' THEN 3
          ELSE 4
        END,
        wsc.days_without_response DESC NULLS LAST
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);

    const dataResult = await pool.query(dataQuery, queryParams);

    // Transform the results
    const opportunities = dataResult.rows.map((row) => ({
      id: row.id,
      phone_number: row.phone_number,
      contact_name: row.contact_name || row.matched_lead_name || row.phone_number,
      last_message_at: row.last_message_at?.toISOString() || null,
      last_message_text: row.last_message_text,
      last_message_from_me: row.last_message_from_me,
      days_without_response: row.days_without_response,
      recovery_potential: row.recovery_potential,
      suggested_message: row.suggested_message,
      lead: row.matched_lead_id ? {
        idlead: row.lead_idlead || row.matched_lead_id,
        nome: row.lead_nome || row.matched_lead_name,
        situacao: row.lead_situacao || null,
        empreendimento: row.lead_empreendimento || null
      } : null
    }));

    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      data: opportunities,
      total,
      has_more: hasMore,
      pagination: {
        limit,
        offset,
        current_page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('[GET /api/whatsapp/sync/opportunities] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar oportunidades',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
