/**
 * API: Disparar Convites de Evento
 *
 * POST /api/eventos/:id/disparar
 * Cria um batch de disparo e retorna imediatamente.
 * O processamento real é feito pelo cron /api/cron/dispatch-batches
 *
 * GET /api/eventos/:id/disparar?batch_id=xxx
 * Retorna status do batch de disparo
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { isInstanceConnected } from '@/lib/evolution-api';
import { z } from 'zod';

// Limite de convidados para processamento síncrono (sem batch)
const SYNC_LIMIT = 10;

// Schema de validacao
const DispararSchema = z.object({
  instance_name: z.string().min(1, 'Nome da instancia WhatsApp e obrigatorio'),
  convidado_ids: z.array(z.string().uuid()).optional(), // Se nao informado, envia para todos pendentes
  reenviar: z.boolean().optional().default(false), // Se true, reenvia para quem ja recebeu
  com_sofia: z.boolean().optional().default(true), // Se true, Sofia responde automaticamente
});

interface EventoDB {
  id: string;
  tenant_id: number;
  nome: string;
  descricao: string | null;
  data_hora: string;
  local: string;
  status: string;
}

interface ConvidadoDB {
  id: string;
  nome: string;
  celular: string;
  status: string;
  convite_enviado_at: string | null;
}

interface BatchDB {
  id: string;
  evento_id: string;
  tenant_id: number;
  instance_name: string;
  total_count: number;
  processed_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  error_log: any[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * GET /api/eventos/:id/disparar?batch_id=xxx
 * Retorna status do batch de disparo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;
    const { id: eventoId } = await params;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    if (!batchId) {
      // Retornar lista de batches do evento
      const batchesResult = await pool.query<BatchDB>(
        `SELECT * FROM dispatch_batches
         WHERE evento_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [eventoId, tenantId]
      );

      return NextResponse.json({
        success: true,
        data: {
          batches: batchesResult.rows,
        },
      });
    }

    // Retornar status específico do batch
    const batchResult = await pool.query<BatchDB>(
      `SELECT * FROM dispatch_batches
       WHERE id = $1 AND evento_id = $2 AND tenant_id = $3`,
      [batchId, eventoId, tenantId]
    );

    if (batchResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Batch nao encontrado' },
        { status: 404 }
      );
    }

    const batch = batchResult.rows[0];

    // Calcular progresso
    const progress = batch.total_count > 0
      ? Math.round((batch.processed_count / batch.total_count) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        batch_id: batch.id,
        status: batch.status,
        progress,
        total: batch.total_count,
        processed: batch.processed_count,
        sent: batch.sent_count,
        failed: batch.failed_count,
        errors: batch.error_log,
        started_at: batch.started_at,
        completed_at: batch.completed_at,
        created_at: batch.created_at,
      },
    });
  } catch (error) {
    console.error('Erro ao consultar status do batch:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao consultar status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/eventos/:id/disparar
 * Cria batch de disparo (ou executa síncronamente para poucos convidados)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;
    const { id: eventoId } = await params;

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
    const validationResult = DispararSchema.safeParse(body);

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

    const { instance_name, convidado_ids, reenviar, com_sofia } = validationResult.data;

    // Verificar conexao WhatsApp
    const connected = await isInstanceConnected(instance_name);
    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp nao esta conectado. Conecte primeiro.' },
        { status: 400 }
      );
    }

    // Buscar evento
    const eventoResult = await pool.query<EventoDB>(
      'SELECT * FROM eventos WHERE id = $1 AND tenant_id = $2',
      [eventoId, tenantId]
    );

    if (eventoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    const evento = eventoResult.rows[0];

    // Verificar se evento pode receber disparos
    if (evento.status === 'cancelado') {
      return NextResponse.json(
        { success: false, error: 'Nao e possivel disparar convites de evento cancelado' },
        { status: 400 }
      );
    }

    if (evento.status === 'finalizado') {
      return NextResponse.json(
        { success: false, error: 'Evento ja foi finalizado' },
        { status: 400 }
      );
    }

    // Verificar se já existe batch em processamento
    const activeBatchResult = await pool.query<BatchDB>(
      `SELECT * FROM dispatch_batches
       WHERE evento_id = $1 AND tenant_id = $2 AND status IN ('pending', 'processing')
       LIMIT 1`,
      [eventoId, tenantId]
    );

    if (activeBatchResult.rows.length > 0) {
      const activeBatch = activeBatchResult.rows[0];
      return NextResponse.json({
        success: false,
        error: 'Ja existe um disparo em andamento para este evento',
        data: {
          batch_id: activeBatch.id,
          status: activeBatch.status,
          progress: activeBatch.total_count > 0
            ? Math.round((activeBatch.processed_count / activeBatch.total_count) * 100)
            : 0,
        },
      }, { status: 409 });
    }

    // Buscar convidados para envio
    let convidadosQuery = `
      SELECT id, nome, celular, status, convite_enviado_at
      FROM evento_convidados
      WHERE evento_id = $1 AND tenant_id = $2
    `;
    const queryParams: any[] = [eventoId, tenantId];

    // Filtrar por IDs especificos ou status
    if (convidado_ids && convidado_ids.length > 0) {
      convidadosQuery += ` AND id = ANY($3)`;
      queryParams.push(convidado_ids);
    } else if (!reenviar) {
      // Se nao for reenvio, pegar apenas pendentes sem convite enviado
      convidadosQuery += ` AND (convite_enviado_at IS NULL)`;
    }

    const convidadosResult = await pool.query<ConvidadoDB>(convidadosQuery, queryParams);
    const convidados = convidadosResult.rows;

    if (convidados.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          enviados: 0,
          falhas: 0,
          total: 0,
        },
        message: 'Nenhum convidado para enviar convite',
      });
    }

    // Atualizar status do evento para ativo se estiver em rascunho
    // Também atualiza a configuração com_sofia
    if (evento.status === 'rascunho') {
      await pool.query(
        `UPDATE eventos SET status = 'ativo', com_sofia = $1, updated_at = NOW() WHERE id = $2`,
        [com_sofia, eventoId]
      );
    } else {
      // Mesmo se já ativo, atualizar a opção com_sofia
      await pool.query(
        `UPDATE eventos SET com_sofia = $1, updated_at = NOW() WHERE id = $2`,
        [com_sofia, eventoId]
      );
    }

    // Criar batch de disparo
    const batchResult = await pool.query<{ id: string }>(
      `INSERT INTO dispatch_batches (
        evento_id, tenant_id, instance_name, total_count, status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id`,
      [eventoId, tenantId, instance_name, convidados.length]
    );

    const batchId = batchResult.rows[0].id;

    // Vincular convidados ao batch
    const convidadoIds = convidados.map(c => c.id);
    await pool.query(
      `UPDATE evento_convidados
       SET dispatch_batch_id = $1
       WHERE id = ANY($2)`,
      [batchId, convidadoIds]
    );

    console.log(`[Dispatch] Batch ${batchId} criado: ${convidados.length} convidados para evento ${eventoId}`);

    return NextResponse.json({
      success: true,
      data: {
        batch_id: batchId,
        total: convidados.length,
        status: 'pending',
        message: `Batch criado com ${convidados.length} convidado(s). O processamento sera iniciado em breve.`,
        poll_url: `/api/eventos/${eventoId}/disparar?batch_id=${batchId}`,
      },
    });
  } catch (error) {
    console.error('Erro ao criar batch de disparo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar batch de disparo' },
      { status: 500 }
    );
  }
}
