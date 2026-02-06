/**
 * Cron: Processar Disparos Inteligentes
 *
 * GET/POST /api/cron/dispatch-disparos
 *
 * Processa disparos pendentes enviando mensagens via WhatsApp.
 * Deve ser executado a cada 30 segundos.
 *
 * Segurança anti-spam:
 * - Delays humanizados: 8-25s entre mensagens
 * - Pausa 30-90s a cada 5 mensagens
 * - Horário comercial: 8h-20h BRT
 * - Max 20 leads por execução do cron
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendTextMessage, formatPhoneNumber, isInstanceConnected } from '@/lib/evolution-api';
import { tenantQuery, withTenant } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos max

const BATCH_SIZE = 20;

const DELAYS = {
  MIN_BETWEEN_MESSAGES: 8000,
  MAX_BETWEEN_MESSAGES: 25000,
  TYPING_PER_CHAR: 50,
  PAUSE_EVERY_N: 5,
  PAUSE_MIN: 30000,
  PAUSE_MAX: 90000,
  THINKING_MIN: 2000,
  THINKING_MAX: 5000,
};

function validateCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Dispatch Disparos] CRON_SECRET não configurado');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) return true;

  return false;
}

function isHorarioComercial(): boolean {
  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hour = brt.getHours();
  return hour >= 8 && hour < 20;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calcularDelay(mensagem: string, posicao: number): number {
  const typingTime = mensagem.length * DELAYS.TYPING_PER_CHAR;
  const thinkingTime = randomBetween(DELAYS.THINKING_MIN, DELAYS.THINKING_MAX);
  const randomDelay = randomBetween(DELAYS.MIN_BETWEEN_MESSAGES, DELAYS.MAX_BETWEEN_MESSAGES);
  const isPause = posicao > 0 && posicao % DELAYS.PAUSE_EVERY_N === 0;
  const pauseTime = isPause ? randomBetween(DELAYS.PAUSE_MIN, DELAYS.PAUSE_MAX) : 0;
  const variation = 0.8 + (Math.random() * 0.4);

  return Math.floor((typingTime + thinkingTime + randomDelay + pauseTime) * variation);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (!validateCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verificar horário comercial
    if (!isHorarioComercial()) {
      return NextResponse.json({
        success: true,
        message: 'Fora do horário comercial (8h-20h BRT)',
        duration: Date.now() - startTime,
      });
    }

    // Buscar 1 disparo ativo
    const disparoResult = await pool.query(
      `SELECT * FROM disparos WHERE status = 'enviando' ORDER BY started_at ASC LIMIT 1`
    );

    if (disparoResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum disparo pendente',
        duration: Date.now() - startTime,
      });
    }

    const disparo = disparoResult.rows[0];
    const { id: disparoId, instance_name, workspace_id } = disparo;
    const query = tenantQuery(workspace_id);

    // Verificar WhatsApp conectado
    const connected = await isInstanceConnected(instance_name);
    if (!connected) {
      await pool.query(
        `UPDATE disparos SET status = 'falhou', error_log = error_log || $1::jsonb, completed_at = NOW() WHERE id = $2`,
        [JSON.stringify([{ error: 'WhatsApp desconectado', timestamp: new Date().toISOString() }]), disparoId]
      );
      return NextResponse.json({
        success: false,
        error: 'WhatsApp desconectado',
        disparo_id: disparoId,
      });
    }

    return await withTenant(workspace_id, async (client) => {
      // Buscar leads pendentes
      const leadsResult = await client.query(
        `SELECT * FROM disparo_leads WHERE disparo_id = $1 AND status = 'pendente' ORDER BY created_at ASC LIMIT $2`,
        [disparoId, BATCH_SIZE]
      );

      const leads = leadsResult.rows;
      let sent = 0;
      let failed = 0;
      const errors: any[] = [];

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];

        // Re-check if disparo was cancelled
        if (i > 0 && i % 5 === 0) {
          const checkResult = await client.query(
            `SELECT status FROM disparos WHERE id = $1`,
            [disparoId]
          );
          if (checkResult.rows[0]?.status !== 'enviando') {
            console.log(`[Dispatch Disparos] Disparo ${disparoId} cancelado durante envio`);
            break;
          }
        }

        try {
          const formattedPhone = formatPhoneNumber(lead.lead_telefone);

          await sendTextMessage(instance_name, {
            number: formattedPhone,
            text: lead.mensagem_gerada,
          });

          // Salvar no histórico de whatsapp_messages
          try {
            await query.insert('whatsapp_messages', {
              instance_name,
              phone_number: lead.lead_telefone,
              message_type: 'conversation',
              message_text: lead.mensagem_gerada,
              is_from_me: true,
              status: 'sent',
              timestamp: new Date().toISOString(),
              raw_data: { disparo_id: disparoId, lead_id: lead.id },
            });
          } catch (e) {
            // Non-critical: don't fail if message save fails
            console.warn(`[Dispatch Disparos] Erro ao salvar msg no histórico:`, (e as any).message);
          }

          // Mark as sent
          await client.query(
            `UPDATE disparo_leads SET status = 'enviado', enviado_at = NOW() WHERE id = $1`,
            [lead.id]
          );

          sent++;
          console.log(`[Dispatch Disparos] ✓ Enviado para ${lead.lead_nome} (${i + 1}/${leads.length})`);

          // Delay humanizado (exceto último)
          if (i < leads.length - 1) {
            const delayMs = calcularDelay(lead.mensagem_gerada, i);
            console.log(`[Dispatch Disparos] Aguardando ${Math.round(delayMs / 1000)}s...`);
            await delay(delayMs);
          }
        } catch (error: any) {
          failed++;
          errors.push({
            lead_id: lead.id,
            nome: lead.lead_nome,
            error: error.message,
            timestamp: new Date().toISOString(),
          });

          await client.query(
            `UPDATE disparo_leads SET status = 'falhou', error_message = $1 WHERE id = $2`,
            [error.message?.substring(0, 500), lead.id]
          );

          console.error(`[Dispatch Disparos] ✗ Erro para ${lead.lead_nome}:`, error.message);
        }
      }

      // Atualizar contadores do disparo
      const newProcessed = disparo.processed_count + sent + failed;
      const newSent = disparo.sent_count + sent;
      const newFailed = disparo.failed_count + failed;

      // Verificar se completou
      const remainingResult = await client.query(
        `SELECT COUNT(*) as remaining FROM disparo_leads WHERE disparo_id = $1 AND status = 'pendente'`,
        [disparoId]
      );
      const remaining = parseInt(remainingResult.rows[0].remaining);
      const isComplete = remaining === 0;

      const newStatus = isComplete ? 'concluido' : 'enviando';
      await client.query(
        `UPDATE disparos SET
          processed_count = $1, sent_count = $2, failed_count = $3,
          status = $4,
          error_log = COALESCE(error_log, '[]'::jsonb) || $5::jsonb,
          completed_at = CASE WHEN $6 THEN NOW() ELSE completed_at END,
          updated_at = NOW()
         WHERE id = $7`,
        [
          newProcessed,
          newSent,
          newFailed,
          newStatus,
          JSON.stringify(errors),
          isComplete,
          disparoId,
        ]
      );

      return NextResponse.json({
        success: true,
        disparo_id: disparoId,
        processed: sent + failed,
        sent,
        failed,
        remaining,
        status: isComplete ? 'concluido' : 'enviando',
        duration: Date.now() - startTime,
      });
    });
  } catch (error: any) {
    console.error('[Dispatch Disparos] Erro geral:', error);
    return NextResponse.json(
      { success: false, error: error.message, duration: Date.now() - startTime },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
