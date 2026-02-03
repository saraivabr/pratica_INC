/**
 * API: Gerenciar Locais de Recepção
 *
 * GET /api/recepcao/locais - Lista locais do workspace
 * POST /api/recepcao/locais - Cria novo local
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const CreateLocalSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  endereco: z.string().optional(),
  descricao: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  raio_geofence: z.number().int().min(10).max(1000).optional().default(100),
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

/**
 * GET /api/recepcao/locais
 * Lista locais do workspace
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { searchParams } = new URL(request.url);

    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = `
      SELECT * FROM recepcao_locais
      WHERE workspace_id = $1
    `;
    const params: any[] = [workspaceId];

    if (!includeInactive) {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY nome ASC';

    const result = await pool.query<LocalDB>(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erro ao listar locais:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar locais' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recepcao/locais
 * Cria novo local
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const body = await request.json();
    const validationResult = CreateLocalSchema.safeParse(body);

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

    const { nome, endereco, descricao, latitude, longitude, raio_geofence } =
      validationResult.data;

    const result = await pool.query<LocalDB>(
      `INSERT INTO recepcao_locais (workspace_id, nome, endereco, descricao, latitude, longitude, raio_geofence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        workspaceId,
        nome,
        endereco || null,
        descricao || null,
        latitude || null,
        longitude || null,
        raio_geofence,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar local:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar local' },
      { status: 500 }
    );
  }
}
