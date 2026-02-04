/**
 * API: Buscar Leads para Disparador
 *
 * GET /api/disparador/leads
 *
 * Filtra leads do corretor com opções de situação, empreendimento e dias sem contato.
 * Exclui leads já disparados nas últimas 48h e sem telefone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const corretorId = (user as any).cvcrm_id;

    if (!corretorId) {
      return NextResponse.json(
        { error: 'Corretor não vinculado ao CV CRM' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const situacao = searchParams.get('situacao');
    const empreendimento = searchParams.get('empreendimento');
    const diasSemContato = parseInt(searchParams.get('dias_sem_contato') || '0');

    // Build query
    const conditions: string[] = [
      'l.workspace_id = $1',
      'l.corretor_id = $2',
      "l.telefones IS NOT NULL AND l.telefones != '[]'::jsonb AND l.telefones != 'null'",
    ];
    const params: any[] = [workspaceId, corretorId];
    let paramIndex = 3;

    // Excluir leads com disparo nas últimas 48h
    conditions.push(`
      NOT EXISTS (
        SELECT 1 FROM disparo_leads dl
        JOIN disparos d ON d.id = dl.disparo_id
        WHERE dl.lead_cvcrm_id = l.idlead
          AND dl.status = 'enviado'
          AND dl.enviado_at > NOW() - INTERVAL '48 hours'
      )
    `);

    // Filtro por situação
    if (situacao) {
      conditions.push(`l.situacao = $${paramIndex}`);
      params.push(situacao);
      paramIndex++;
    }

    // Filtro por empreendimento (campo JSONB)
    if (empreendimento) {
      conditions.push(`l.empreendimentos::text ILIKE $${paramIndex}`);
      params.push(`%${empreendimento}%`);
      paramIndex++;
    }

    // Filtro por dias sem contato (parametrizado para prevenir SQL injection)
    if (diasSemContato > 0) {
      conditions.push(`
        NOT EXISTS (
          SELECT 1 FROM cvcrm_lead_interacoes i
          WHERE i.idlead = l.idlead
            AND i.workspace_id = l.workspace_id
            AND i.created_at > NOW() - INTERVAL '1 day' * $${paramIndex}
        )
      `);
      params.push(diasSemContato);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM cvcrm_leads l WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch leads (max 50)
    const leadsResult = await pool.query(
      `SELECT
        l.id,
        l.idlead,
        l.nome,
        l.telefones,
        l.empreendimentos,
        l.situacao,
        l.created_at
      FROM cvcrm_leads l
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT 50`,
      params
    );

    // Extract first valid phone from JSONB telefones
    const leads = leadsResult.rows.map((lead: any) => {
      let telefone = '';
      try {
        const telefones = typeof lead.telefones === 'string'
          ? JSON.parse(lead.telefones)
          : lead.telefones;
        if (Array.isArray(telefones) && telefones.length > 0) {
          telefone = telefones[0]?.ddd && telefones[0]?.telefone
            ? `${telefones[0].ddd}${telefones[0].telefone}`
            : typeof telefones[0] === 'string' ? telefones[0] : '';
        }
      } catch { /* ignore parse errors */ }

      let empreendimentoNome = '';
      try {
        const emps = typeof lead.empreendimentos === 'string'
          ? JSON.parse(lead.empreendimentos)
          : lead.empreendimentos;
        if (Array.isArray(emps) && emps.length > 0) {
          empreendimentoNome = emps[0]?.nome || emps[0] || '';
        } else if (typeof emps === 'string') {
          empreendimentoNome = emps;
        }
      } catch { /* ignore */ }

      return {
        id: lead.id,
        idlead: lead.idlead,
        nome: lead.nome,
        telefone,
        empreendimento: empreendimentoNome,
        situacao: lead.situacao,
      };
    }).filter((l: any) => l.telefone); // Filter out leads where phone extraction failed

    // Fetch available filters (distinct situações e empreendimentos)
    const situacoesResult = await pool.query(
      `SELECT DISTINCT situacao FROM cvcrm_leads
       WHERE workspace_id = $1 AND corretor_id = $2 AND situacao IS NOT NULL
       ORDER BY situacao`,
      [workspaceId, corretorId]
    );

    const empreendimentosResult = await pool.query(
      `SELECT DISTINCT jsonb_array_elements(
        CASE WHEN jsonb_typeof(empreendimentos) = 'array' THEN empreendimentos ELSE '[]'::jsonb END
      )->>'nome' as nome
      FROM cvcrm_leads
      WHERE workspace_id = $1 AND corretor_id = $2
        AND empreendimentos IS NOT NULL
        AND empreendimentos != 'null'
      ORDER BY nome`,
      [workspaceId, corretorId]
    );

    return NextResponse.json({
      success: true,
      total,
      leads,
      filtros: {
        situacoes: situacoesResult.rows.map((r: any) => r.situacao),
        empreendimentos: empreendimentosResult.rows
          .map((r: any) => r.nome)
          .filter(Boolean),
      },
    });
  } catch (error: any) {
    console.error('[Disparador Leads] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar leads' },
      { status: 500 }
    );
  }
}
