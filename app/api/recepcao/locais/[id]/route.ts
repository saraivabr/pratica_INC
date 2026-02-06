/**
 * API: Gerenciar Local Individual
 *
 * GET /api/recepcao/locais/:id - Detalhes do local
 * PUT /api/recepcao/locais/:id - Atualiza local
 * DELETE /api/recepcao/locais/:id - Desativa local
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

const UpdateLocalSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  endereco: z.string().optional(),
  descricao: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  raio_geofence: z.number().int().min(10).max(1000).optional(),
  is_active: z.boolean().optional(),
});

interface LocalDB {
  id: string;
  workspace_id: number;
  nome: string;
  endereco: string | null;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  raio_geofence: number;
  qr_code_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/recepcao/locais/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de local inválido' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      const result = await client.query<LocalDB>(
        `SELECT * FROM recepcao_locais WHERE id = $1 AND workspace_id = $2`,
        [id, workspaceId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Local não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
      });
    });
  } catch (error) {
    console.error('Erro ao buscar local:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar local' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/recepcao/locais/:id
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de local inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = UpdateLocalSchema.safeParse(body);

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

    return await withTenant(workspaceId, async (client) => {
      // Verificar se local existe
      const checkResult = await client.query(
        'SELECT id FROM recepcao_locais WHERE id = $1 AND workspace_id = $2',
        [id, workspaceId]
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Local não encontrado' },
          { status: 404 }
        );
      }

      // Montar query dinâmica
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.nome !== undefined) {
        updates.push(`nome = $${paramIndex++}`);
        values.push(data.nome);
      }
      if (data.endereco !== undefined) {
        updates.push(`endereco = $${paramIndex++}`);
        values.push(data.endereco);
      }
      if (data.descricao !== undefined) {
        updates.push(`descricao = $${paramIndex++}`);
        values.push(data.descricao);
      }
      if (data.latitude !== undefined) {
        updates.push(`latitude = $${paramIndex++}`);
        values.push(data.latitude);
      }
      if (data.longitude !== undefined) {
        updates.push(`longitude = $${paramIndex++}`);
        values.push(data.longitude);
      }
      if (data.raio_geofence !== undefined) {
        updates.push(`raio_geofence = $${paramIndex++}`);
        values.push(data.raio_geofence);
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.is_active);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Nenhum campo para atualizar' },
          { status: 400 }
        );
      }

      values.push(id, workspaceId);

      const result = await client.query<LocalDB>(
        `UPDATE recepcao_locais
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      return NextResponse.json({
        success: true,
        data: result.rows[0],
      });
    });
  } catch (error) {
    console.error('Erro ao atualizar local:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar local' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recepcao/locais/:id
 * Desativa local (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de local inválido' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      const result = await client.query<LocalDB>(
        `UPDATE recepcao_locais
         SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2
         RETURNING *`,
        [id, workspaceId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Local não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Local desativado com sucesso',
      });
    });
  } catch (error) {
    console.error('Erro ao desativar local:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar local' },
      { status: 500 }
    );
  }
}
