/**
 * API: Check-in por GPS
 *
 * POST /api/recepcao/checkin/gps - Check-in com validação de geolocalização
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { z } from 'zod';

const CheckinGpsSchema = z.object({
  plantao_id: z.string().uuid('ID do plantão inválido'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

interface PresencaDB {
  id: string;
  workspace_id: number;
  plantao_id: string;
  user_id: string;
  status: string;
  checkin_at: string;
  checkin_method: string;
  checkin_latitude: number;
  checkin_longitude: number;
  posicao_fila: number;
  em_atendimento: boolean;
  pausado: boolean;
  feedback_pendente: boolean;
}

interface LocalGeo {
  latitude: number;
  longitude: number;
  raio_geofence: number;
  local_nome: string;
}

/**
 * POST /api/recepcao/checkin/gps
 * Check-in com validação de GPS
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = CheckinGpsSchema.safeParse(body);

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

    const { plantao_id, latitude, longitude } = validationResult.data;

    return await withTenant(workspaceId, async (client) => {
      // Verificar plantão e obter dados do local
      const plantaoCheck = await client.query<{ id: string; max_corretores: number | null } & LocalGeo>(
        `SELECT p.id, p.max_corretores, l.latitude, l.longitude, l.raio_geofence, l.nome AS local_nome
         FROM recepcao_plantoes p
         JOIN recepcao_locais l ON l.id = p.local_id
         WHERE p.id = $1 AND p.status = 'ativo'
           AND p.data = CURRENT_DATE`,
        [plantao_id]
      );

      if (plantaoCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Plantão não encontrado ou não está ativo hoje' },
          { status: 404 }
        );
      }

      const plantao = plantaoCheck.rows[0];

      // Verificar se local tem coordenadas GPS configuradas
      if (!plantao.latitude || !plantao.longitude) {
        return NextResponse.json(
          { success: false, error: 'Este local não tem GPS configurado. Use outro método de check-in.' },
          { status: 400 }
        );
      }

      // Validar geofence
      const geofenceResult = await client.query<{ dentro: boolean }>(
        `SELECT dentro_geofence($1, $2, $3, $4, $5) AS dentro`,
        [latitude, longitude, plantao.latitude, plantao.longitude, plantao.raio_geofence]
      );

      if (!geofenceResult.rows[0].dentro) {
        return NextResponse.json(
          {
            success: false,
            error: `Você está fora da área permitida (${plantao.raio_geofence}m do local ${plantao.local_nome})`,
            details: {
              sua_posicao: { latitude, longitude },
              local: { latitude: plantao.latitude, longitude: plantao.longitude },
              raio_permitido: plantao.raio_geofence,
            },
          },
          { status: 400 }
        );
      }

      // Verificar se já existe presença ativa
      const presencaExistente = await client.query(
        `SELECT id FROM recepcao_presencas
         WHERE plantao_id = $1 AND user_id = $2 AND status = 'presente'`,
        [plantao_id, (user as any).id]
      );

      if (presencaExistente.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Você já está presente neste plantão' },
          { status: 409 }
        );
      }

      // Verificar limite de corretores
      if (plantao.max_corretores) {
        const countResult = await client.query<{ count: number }>(
          `SELECT COUNT(*)::int AS count FROM recepcao_presencas
           WHERE plantao_id = $1 AND status = 'presente'`,
          [plantao_id]
        );

        if (countResult.rows[0].count >= plantao.max_corretores) {
          return NextResponse.json(
            { success: false, error: 'Plantão atingiu o limite máximo de corretores' },
            { status: 400 }
          );
        }
      }

      // Obter próxima posição na fila
      const posicaoResult = await client.query<{ posicao: number }>(
        `SELECT get_proxima_posicao_fila($1) AS posicao`,
        [plantao_id]
      );

      const posicao = posicaoResult.rows[0].posicao;

      // Criar presença com coordenadas
      const result = await client.query<PresencaDB>(
        `INSERT INTO recepcao_presencas
         (workspace_id, plantao_id, user_id, checkin_method, checkin_latitude, checkin_longitude, posicao_fila)
         VALUES ($1, $2, $3, 'gps', $4, $5, $6)
         RETURNING *`,
        [workspaceId, plantao_id, (user as any).id, latitude, longitude, posicao]
      );

      return NextResponse.json(
        {
          success: true,
          data: result.rows[0],
          message: `Check-in por GPS realizado em ${plantao.local_nome}! Posição ${posicao} na fila.`,
        },
        { status: 201 }
      );
    });
  } catch (error: any) {
    console.error('Erro ao fazer check-in GPS:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Você já está presente neste plantão' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao fazer check-in' },
      { status: 500 }
    );
  }
}
