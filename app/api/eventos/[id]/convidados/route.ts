/**
 * API: Gerenciar Convidados de Evento
 *
 * GET /api/eventos/:id/convidados - Lista convidados do evento
 * POST /api/eventos/:id/convidados - Adiciona convidados ao evento
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

// Schema para adicionar convidados
const AddConvidadosSchema = z.object({
  convidados: z
    .array(
      z.object({
        nome: z.string().min(1, 'Nome e obrigatorio').max(255),
        celular: z.string().min(10, 'Celular invalido').max(50),
        cvcrm_id: z.number().int().optional(),
        origem: z.enum(['cvcrm', 'importado']).optional().default('cvcrm'),
      })
    )
    .min(1, 'Pelo menos um convidado e obrigatorio'),
});

interface ConvidadoDB {
  id: string;
  evento_id: string;
  workspace_id: number;
  nome: string;
  celular: string;
  origem: string;
  cvcrm_id: number | null;
  status: string;
  convite_enviado_at: string | null;
  lembrete_enviado_at: string | null;
  confirmado_at: string | null;
  created_at: string;
}

/**
 * Normaliza numero de celular para formato padrao
 */
function normalizeCelular(celular: string): string {
  // Remove tudo exceto numeros
  const digits = celular.replace(/\D/g, '');

  // Se ja tem codigo do pais, retorna
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }

  // Adiciona codigo do pais se necessario
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }

  return digits;
}

/**
 * GET /api/eventos/:id/convidados
 * Lista convidados do evento
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const params = await context.params;
    const eventoId = params.id;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventoId)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parametros de filtro e paginacao
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search')?.slice(0, 100);
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const rawOffset = parseInt(searchParams.get('offset') || '0');

    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 200);
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    return await withTenant(workspaceId, async (client) => {
      // Verificar se evento existe e pertence ao tenant
      const eventoCheck = await client.query(
        'SELECT id FROM eventos WHERE id = $1 AND workspace_id = $2',
        [eventoId, workspaceId]
      );

      if (eventoCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Evento nao encontrado' },
          { status: 404 }
        );
      }

      // Montar query
      let whereClause = 'WHERE evento_id = $1 AND workspace_id = $2';
      const queryParams: any[] = [eventoId, workspaceId];
      let paramIndex = 3;

      // Filtro por status
      if (status !== 'all') {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // Filtro por busca (nome ou celular)
      if (search) {
        whereClause += ` AND (LOWER(nome) LIKE LOWER($${paramIndex}) OR celular LIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Contar total
      const countQuery = `SELECT COUNT(*) as total FROM evento_convidados ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Buscar convidados
      const query = `
        SELECT *
        FROM evento_convidados
        ${whereClause}
        ORDER BY nome ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const result = await client.query<ConvidadoDB>(query, queryParams);

      // Estatisticas
      const statsQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'confirmado') as confirmados,
          COUNT(*) FILTER (WHERE status = 'recusado') as recusados,
          COUNT(*) FILTER (WHERE status = 'talvez') as talvez
        FROM evento_convidados
        WHERE evento_id = $1 AND workspace_id = $2
      `;
      const statsResult = await client.query(statsQuery, [eventoId, workspaceId]);
      const stats = statsResult.rows[0];

      return NextResponse.json({
        success: true,
        data: result.rows,
        total,
        limit,
        offset,
        stats: {
          total: parseInt(stats.total),
          pendentes: parseInt(stats.pendentes),
          confirmados: parseInt(stats.confirmados),
          recusados: parseInt(stats.recusados),
          talvez: parseInt(stats.talvez),
        },
      });
    });
  } catch (error) {
    console.error('Erro ao listar convidados:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar convidados' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/eventos/:id/convidados
 * Adiciona convidados ao evento
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const params = await context.params;
    const eventoId = params.id;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventoId)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    // Validar body
    const body = await request.json();
    const validationResult = AddConvidadosSchema.safeParse(body);

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

    const { convidados } = validationResult.data;

    return await withTenant(workspaceId, async (client) => {
      // Verificar se evento existe e pertence ao tenant
      const eventoCheck = await client.query(
        'SELECT id, status FROM eventos WHERE id = $1 AND workspace_id = $2',
        [eventoId, workspaceId]
      );

      if (eventoCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Evento nao encontrado' },
          { status: 404 }
        );
      }

      // Nao permitir adicionar convidados em evento cancelado
      if (eventoCheck.rows[0].status === 'cancelado') {
        return NextResponse.json(
          { success: false, error: 'Nao e possivel adicionar convidados em evento cancelado' },
          { status: 400 }
        );
      }

      // Buscar celulares ja cadastrados para evitar duplicatas
      const celularesNormalizados = convidados.map((c) => normalizeCelular(c.celular));
      const existingCheck = await client.query(
        `SELECT celular FROM evento_convidados
         WHERE evento_id = $1 AND celular = ANY($2)`,
        [eventoId, celularesNormalizados]
      );

      const existingCelulares = new Set(existingCheck.rows.map((r) => r.celular));

      // Filtrar convidados novos
      const novosConvidados = convidados.filter(
        (c) => !existingCelulares.has(normalizeCelular(c.celular))
      );

      if (novosConvidados.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'Todos os convidados ja estavam cadastrados',
          added: 0,
          skipped: convidados.length,
        });
      }

      // Inserir novos convidados
      const insertValues: any[][] = novosConvidados.map((c) => [
        eventoId,
        workspaceId,
        c.nome,
        normalizeCelular(c.celular),
        c.origem || 'cvcrm',
        c.cvcrm_id || null,
        'pendente',
      ]);

      const placeholders = insertValues
        .map(
          (_, i) =>
            `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
        )
        .join(', ');

      const flatValues = insertValues.flat();

      const insertQuery = `
        INSERT INTO evento_convidados (evento_id, workspace_id, nome, celular, origem, cvcrm_id, status)
        VALUES ${placeholders}
        RETURNING *
      `;

      const result = await client.query<ConvidadoDB>(insertQuery, flatValues);

      return NextResponse.json(
        {
          success: true,
          data: result.rows,
          added: result.rows.length,
          skipped: convidados.length - result.rows.length,
          message: `${result.rows.length} convidado(s) adicionado(s)`,
        },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error('Erro ao adicionar convidados:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao adicionar convidados' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/eventos/:id/convidados
 * Remove convidados do evento (por IDs)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id: eventoId } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventoId)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { convidado_ids } = body;

    if (!Array.isArray(convidado_ids) || convidado_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'convidado_ids deve ser um array com pelo menos um ID' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      // Verificar se evento existe e pertence ao tenant
      const eventoCheck = await client.query(
        'SELECT id FROM eventos WHERE id = $1 AND workspace_id = $2',
        [eventoId, workspaceId]
      );

      if (eventoCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Evento nao encontrado' },
          { status: 404 }
        );
      }

      // Remover convidados
      const result = await client.query(
        `DELETE FROM evento_convidados
         WHERE evento_id = $1 AND workspace_id = $2 AND id = ANY($3)
         RETURNING id`,
        [eventoId, workspaceId, convidado_ids]
      );

      return NextResponse.json({
        success: true,
        removed: result.rowCount || 0,
        message: `${result.rowCount} convidado(s) removido(s)`,
      });
    });
  } catch (error) {
    console.error('Erro ao remover convidados:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao remover convidados' },
      { status: 500 }
    );
  }
}
