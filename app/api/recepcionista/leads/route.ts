/**
 * API: Cadastro e listagem de leads pela recepcionista
 * POST /api/recepcionista/leads - Cadastrar lead
 * GET  /api/recepcionista/leads - Listar leads de hoje + stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

const CadastroLeadSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 caracteres').max(50),
  tipo_visita: z.enum(['primeira_vez', 'indicacao', 'retorno']).default('primeira_vez'),
  corretor_id: z.string().uuid('ID do corretor inválido').optional().nullable(),
  fonte: z.enum(['presencial', 'telefone', 'whatsapp', 'instagram', 'facebook', 'site', 'indicacao', 'outros']).default('presencial'),
  observacoes: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validation = CadastroLeadSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message, field: firstError.path.join('.') },
        { status: 400 }
      );
    }

    const { nome, whatsapp, tipo_visita, corretor_id, fonte, observacoes } = validation.data;

    return await withTenant(workspaceId, async (client) => {
      // Buscar nome do corretor se informado
      let corretor_nome: string | null = null;
      if (corretor_id) {
        const { rows } = await client.query(
          `SELECT nome FROM users WHERE id = $1 AND workspace_id = $2`,
          [corretor_id, workspaceId]
        );
        corretor_nome = rows[0]?.nome || null;
      }

      const { rows } = await client.query(
        `INSERT INTO recepcionista_leads
         (workspace_id, nome, whatsapp, corretor_id, corretor_nome, tipo_visita, fonte, observacoes, registrado_por, registrado_por_nome)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          workspaceId,
          nome,
          whatsapp,
          corretor_id || null,
          corretor_nome,
          tipo_visita,
          fonte,
          observacoes || null,
          user.id,
          user.nome,
        ]
      );

      return NextResponse.json(
        { success: true, data: rows[0] },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error('Erro ao cadastrar lead:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cadastrar lead' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    return await withTenant(workspaceId, async (client) => {
      // Leads do dia
      const { rows: leads } = await client.query(
        `SELECT *
         FROM recepcionista_leads
         WHERE workspace_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + interval '1 day')
         ORDER BY created_at DESC
         LIMIT $3`,
        [workspaceId, date, limit]
      );

      // Stats do dia
      const { rows: statsRows } = await client.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE tipo_visita = 'primeira_vez') as primeira_vez,
           COUNT(*) FILTER (WHERE tipo_visita = 'indicacao') as indicacao,
           COUNT(*) FILTER (WHERE tipo_visita = 'retorno') as retorno
         FROM recepcionista_leads
         WHERE workspace_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + interval '1 day')`,
        [workspaceId, date]
      );

      // Stats por fonte
      const { rows: porFonte } = await client.query(
        `SELECT fonte, COUNT(*) as total
         FROM recepcionista_leads
         WHERE workspace_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + interval '1 day')
         GROUP BY fonte
         ORDER BY total DESC`,
        [workspaceId, date]
      );

      // Stats por corretor
      const { rows: porCorretor } = await client.query(
        `SELECT corretor_id, corretor_nome, COUNT(*) as total
         FROM recepcionista_leads
         WHERE workspace_id = $1
           AND created_at >= $2::date
           AND created_at < ($2::date + interval '1 day')
           AND corretor_id IS NOT NULL
         GROUP BY corretor_id, corretor_nome
         ORDER BY total DESC`,
        [workspaceId, date]
      );

      const stats = {
        total: parseInt(statsRows[0]?.total || '0', 10),
        primeira_vez: parseInt(statsRows[0]?.primeira_vez || '0', 10),
        indicacao: parseInt(statsRows[0]?.indicacao || '0', 10),
        retorno: parseInt(statsRows[0]?.retorno || '0', 10),
        por_fonte: porFonte,
        por_corretor: porCorretor,
      };

      return NextResponse.json({ success: true, data: leads, stats });
    });
  } catch (error) {
    console.error('Erro ao listar leads:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar leads' },
      { status: 500 }
    );
  }
}
