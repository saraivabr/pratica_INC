/**
 * API: Gerenciar Eventos
 *
 * GET /api/eventos - Lista eventos do tenant
 * POST /api/eventos - Cria novo evento
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

// Schema de validacao para criacao de evento
const CreateEventoSchema = z.object({
  nome: z.string().min(1, 'Nome do evento e obrigatorio').max(255),
  descricao: z.string().optional(),
  data_hora: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data/hora invalida',
  }),
  local: z.string().min(1, 'Local e obrigatorio'),
  lembrete_horas: z.number().int().min(1).max(48).optional().default(24),
});

interface EventoDB {
  id: string;
  tenant_id: number;
  nome: string;
  descricao: string | null;
  data_hora: string;
  local: string;
  lembrete_horas: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EventoWithStats extends EventoDB {
  total_convidados: number;
  confirmados: number;
  recusados: number;
  talvez: number;
  pendentes: number;
}

/**
 * GET /api/eventos
 * Lista eventos do tenant com estatisticas
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;
    const { searchParams } = new URL(request.url);

    // Parametros de filtro e paginacao
    const status = searchParams.get('status') || 'all';
    const rawLimit = parseInt(searchParams.get('limit') || '20');
    const rawOffset = parseInt(searchParams.get('offset') || '0');

    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100);
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    // Query base com estatisticas de convidados
    let whereClause = 'WHERE e.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Filtro por status
    if (status !== 'all') {
      whereClause += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Contar total
    const countQuery = `SELECT COUNT(*) as total FROM eventos e ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Buscar eventos com estatisticas
    const query = `
      SELECT
        e.*,
        COALESCE(stats.total_convidados, 0) as total_convidados,
        COALESCE(stats.confirmados, 0) as confirmados,
        COALESCE(stats.recusados, 0) as recusados,
        COALESCE(stats.talvez, 0) as talvez,
        COALESCE(stats.pendentes, 0) as pendentes
      FROM eventos e
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) as total_convidados,
          COUNT(*) FILTER (WHERE status = 'confirmado') as confirmados,
          COUNT(*) FILTER (WHERE status = 'recusado') as recusados,
          COUNT(*) FILTER (WHERE status = 'talvez') as talvez,
          COUNT(*) FILTER (WHERE status = 'pendente') as pendentes
        FROM evento_convidados ec
        WHERE ec.evento_id = e.id
      ) stats ON true
      ${whereClause}
      ORDER BY e.data_hora DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query<EventoWithStats>(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Erro ao listar eventos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar eventos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/eventos
 * Cria novo evento
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;

    // Validar body
    const body = await request.json();
    const validationResult = CreateEventoSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          field: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    const { nome, descricao, data_hora, local, lembrete_horas } = validationResult.data;

    // Inserir evento
    const result = await pool.query<EventoDB>(
      `INSERT INTO eventos (tenant_id, nome, descricao, data_hora, local, lembrete_horas, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'rascunho')
       RETURNING *`,
      [tenantId, nome, descricao || null, data_hora, local, lembrete_horas]
    );

    const evento = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          ...evento,
          total_convidados: 0,
          confirmados: 0,
          recusados: 0,
          talvez: 0,
          pendentes: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar evento' },
      { status: 500 }
    );
  }
}
