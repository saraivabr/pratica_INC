/**
 * API: Gerenciar Evento Individual
 *
 * GET /api/eventos/:id - Detalhes do evento
 * PUT /api/eventos/:id - Atualiza evento
 * DELETE /api/eventos/:id - Cancela evento
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

// Schema de validacao para atualizacao
const UpdateEventoSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  data_hora: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Data/hora invalida',
    })
    .optional(),
  local: z.string().min(1).optional(),
  lembrete_horas: z.number().int().min(1).max(48).optional(),
  status: z.enum(['rascunho', 'ativo', 'finalizado', 'cancelado']).optional(),
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
 * GET /api/eventos/:id
 * Retorna detalhes do evento com estatisticas
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;
    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    // Buscar evento com estatisticas
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
      WHERE e.id = $1 AND e.tenant_id = $2
    `;

    const result = await pool.query<EventoWithStats>(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar evento' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/eventos/:id
 * Atualiza evento
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;
    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    // Validar body
    const body = await request.json();
    const validationResult = UpdateEventoSchema.safeParse(body);

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

    const data = validationResult.data;

    // Verificar se evento existe e pertence ao tenant
    const checkResult = await pool.query(
      'SELECT id, status FROM eventos WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    // Nao permitir edicao de evento cancelado
    if (checkResult.rows[0].status === 'cancelado') {
      return NextResponse.json(
        { success: false, error: 'Nao e possivel editar um evento cancelado' },
        { status: 400 }
      );
    }

    // Montar query de update dinamica
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nome !== undefined) {
      updates.push(`nome = $${paramIndex++}`);
      values.push(data.nome);
    }
    if (data.descricao !== undefined) {
      updates.push(`descricao = $${paramIndex++}`);
      values.push(data.descricao);
    }
    if (data.data_hora !== undefined) {
      updates.push(`data_hora = $${paramIndex++}`);
      values.push(data.data_hora);
    }
    if (data.local !== undefined) {
      updates.push(`local = $${paramIndex++}`);
      values.push(data.local);
    }
    if (data.lembrete_horas !== undefined) {
      updates.push(`lembrete_horas = $${paramIndex++}`);
      values.push(data.lembrete_horas);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    updates.push('updated_at = NOW()');
    values.push(id, tenantId);

    const updateQuery = `
      UPDATE eventos
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query<EventoDB>(updateQuery, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar evento' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/eventos/:id
 * Cancela evento (soft delete - muda status para cancelado)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;
    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    // Verificar se evento existe
    const checkResult = await pool.query(
      'SELECT id, status FROM eventos WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    if (checkResult.rows[0].status === 'cancelado') {
      return NextResponse.json(
        { success: false, error: 'Evento ja esta cancelado' },
        { status: 400 }
      );
    }

    // Cancelar evento (soft delete)
    const result = await pool.query<EventoDB>(
      `UPDATE eventos
       SET status = 'cancelado', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Evento cancelado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cancelar evento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cancelar evento' },
      { status: 500 }
    );
  }
}
