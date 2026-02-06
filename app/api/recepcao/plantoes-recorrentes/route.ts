/**
 * API: Plantões Recorrentes (Automáticos)
 *
 * GET /api/recepcao/plantoes-recorrentes - Lista templates
 * POST /api/recepcao/plantoes-recorrentes - Cria novo template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

const CreateRecorrenteSchema = z.object({
  local_id: z.string().uuid('ID do local inválido'),
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  dias_semana: z
    .array(z.number().int().min(1).max(7))
    .min(1, 'Selecione pelo menos um dia'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  hora_limite_checkin: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM')
    .optional()
    .nullable(),
  max_corretores: z.number().int().min(1).max(100).optional().nullable(),
  meta_ofertas: z.number().int().min(1).max(200).optional().default(30),
  descricao: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

interface RecorrenteDB {
  id: string;
  workspace_id: number;
  local_id: string;
  nome: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  hora_limite_checkin: string | null;
  max_corretores: number | null;
  meta_ofertas: number;
  descricao: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  local_nome?: string;
  local_endereco?: string | null;
  dias_semana_texto?: string[];
  total_plantoes_criados?: number;
  ultimo_plantao_criado?: string | null;
}

/**
 * GET /api/recepcao/plantoes-recorrentes
 * Lista templates de plantões recorrentes
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { searchParams } = new URL(request.url);

    const localId = searchParams.get('local_id');
    const isActive = searchParams.get('is_active');

    return await withTenant(workspaceId, async (client) => {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (localId) {
        whereClause += ` AND r.local_id = $${paramIndex++}`;
        params.push(localId);
      }

      if (isActive !== null && isActive !== 'all') {
        whereClause += ` AND r.is_active = $${paramIndex++}`;
        params.push(isActive === 'true');
      }

      const query = `
        SELECT
          r.*,
          l.nome AS local_nome,
          l.endereco AS local_endereco,
          ARRAY(
            SELECT CASE d
              WHEN 1 THEN 'Seg'
              WHEN 2 THEN 'Ter'
              WHEN 3 THEN 'Qua'
              WHEN 4 THEN 'Qui'
              WHEN 5 THEN 'Sex'
              WHEN 6 THEN 'Sab'
              WHEN 7 THEN 'Dom'
            END
            FROM UNNEST(r.dias_semana) AS d
            ORDER BY d
          ) AS dias_semana_texto,
          (SELECT COUNT(*) FROM recepcao_plantoes_criados_auto ca WHERE ca.recorrente_id = r.id) AS total_plantoes_criados,
          (SELECT MAX(data) FROM recepcao_plantoes_criados_auto ca WHERE ca.recorrente_id = r.id) AS ultimo_plantao_criado
        FROM recepcao_plantoes_recorrentes r
        JOIN recepcao_locais l ON l.id = r.local_id
        ${whereClause}
        ORDER BY r.is_active DESC, l.nome ASC, r.hora_inicio ASC
      `;

      const result = await client.query<RecorrenteDB>(query, params);

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    });
  } catch (error) {
    console.error('Erro ao listar plantões recorrentes:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar plantões recorrentes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recepcao/plantoes-recorrentes
 * Cria novo template de plantão recorrente
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    // Verificar permissão (admin ou gerente)
    if (user.role !== 'admin' && user.role !== 'gerente') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = CreateRecorrenteSchema.safeParse(body);

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

    // Validar que hora_fim > hora_inicio
    if (data.hora_fim <= data.hora_inicio) {
      return NextResponse.json(
        { success: false, error: 'Hora fim deve ser maior que hora início' },
        { status: 400 }
      );
    }

    // Remover duplicatas dos dias
    const diasUnicos = [...new Set(data.dias_semana)].sort((a, b) => a - b);

    return await withTenant(workspaceId, async (client) => {
      // Verificar se local existe e está ativo
      const localCheck = await client.query(
        'SELECT id FROM recepcao_locais WHERE id = $1 AND is_active = true',
        [data.local_id]
      );

      if (localCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Local não encontrado' },
          { status: 404 }
        );
      }

      const result = await client.query<RecorrenteDB>(
        `INSERT INTO recepcao_plantoes_recorrentes (
          workspace_id, local_id, nome, dias_semana,
          hora_inicio, hora_fim, hora_limite_checkin,
          max_corretores, meta_ofertas, descricao, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          workspaceId,
          data.local_id,
          data.nome,
          diasUnicos,
          data.hora_inicio,
          data.hora_fim,
          data.hora_limite_checkin || null,
          data.max_corretores || null,
          data.meta_ofertas,
          data.descricao || null,
          data.is_active,
        ]
      );

      return NextResponse.json(
        {
          success: true,
          data: result.rows[0],
          message: 'Plantão recorrente criado! Será criado automaticamente nos dias configurados.',
        },
        { status: 201 }
      );
    });
  } catch (error: any) {
    console.error('Erro ao criar plantão recorrente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar plantão recorrente' },
      { status: 500 }
    );
  }
}
