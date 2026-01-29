/**
 * Check Silence Endpoint
 * 
 * POST /api/salva-leads/check-silence
 * 
 * Called by cron every 2-3 minutes. Checks for expired silence timers
 * and triggers Luna to enter conversations where the broker hasn't responded.
 * 
 * Flow:
 * 1. Scan all workspaces with active timers
 * 2. Get expired timers for each workspace
 * 3. Validate each timer (broker still hasn't responded, business hours, etc.)
 * 4. Luna enters the conversation with silence_takeover mode
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkspacesWithActiveTimers,
  getExpiredTimers,
  removeProcessedTimer,
  getCorretorConfig,
  isWithinBusinessHours,
  hasCorretorRespondedRecently,
  isLunaAlreadyActive,
  incrementConfigCounter,
} from '@/lib/salva-leads/silence-monitor';
import {
  getOrCreateConversation,
  addMessage,
  updateConversationStatus,
  updateContext,
  getConversationByPhone,
} from '@/lib/salva-leads/conversation';
import { generateSilenceTakeoverOpener } from '@/lib/salva-leads/persona';
import { sendTextMessage, formatPhoneNumber } from '@/lib/evolution-api';
import { dbQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Optional auth via cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      // Allow without secret in dev, but log warning
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 1. Get all workspaces with active timers
    const workspaceIds = await getWorkspacesWithActiveTimers();

    if (workspaceIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active timers',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    let totalProcessed = 0;
    let totalActivated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    // 2. Process each workspace
    for (const workspaceId of workspaceIds) {
      try {
        const expiredTimers = await getExpiredTimers(workspaceId);

        for (const timer of expiredTimers) {
          totalProcessed++;

          try {
            // 3. Validate timer before activating Luna
            const config = await getCorretorConfig(timer.corretorId);

            // Check if auto-assistant is enabled
            if (!config.autoAssistantEnabled) {
              await removeProcessedTimer(workspaceId, timer.leadPhone);
              totalSkipped++;
              continue;
            }

            // Check business hours
            if (!isWithinBusinessHours(config)) {
              await removeProcessedTimer(workspaceId, timer.leadPhone);
              totalSkipped++;
              continue;
            }

            // Check if corretor responded in the meantime
            const corretorResponded = await hasCorretorRespondedRecently(
              workspaceId,
              timer.leadPhone,
              5
            );
            if (corretorResponded) {
              await removeProcessedTimer(workspaceId, timer.leadPhone);
              totalSkipped++;
              continue;
            }

            // Check if Luna is already active
            const alreadyActive = await isLunaAlreadyActive(workspaceId, timer.leadPhone);
            if (alreadyActive) {
              await removeProcessedTimer(workspaceId, timer.leadPhone);
              totalSkipped++;
              continue;
            }

            // 4. Activate Luna for this conversation
            const activated = await activateLunaForSilence(timer, config);

            if (activated) {
              totalActivated++;
            } else {
              totalSkipped++;
            }

            // Clean up processed timer
            await removeProcessedTimer(workspaceId, timer.leadPhone);

          } catch (error: any) {
            console.error(`[Check Silence] Error processing timer for ${timer.leadPhone}:`, error);
            errors.push(`${timer.leadPhone}: ${error.message}`);
            // Remove timer to avoid infinite retries
            await removeProcessedTimer(workspaceId, timer.leadPhone);
          }
        }
      } catch (error: any) {
        console.error(`[Check Silence] Error processing workspace ${workspaceId}:`, error);
        errors.push(`workspace ${workspaceId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      activated: totalActivated,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
    });

  } catch (error: any) {
    console.error('[Check Silence] Fatal error:', error);
    return NextResponse.json(
      { error: error.message, duration: Date.now() - startTime },
      { status: 500 }
    );
  }
}

/**
 * Activate Luna for a silence takeover.
 * Creates/reuses conversation and sends the opener message.
 */
async function activateLunaForSilence(
  timer: import('@/lib/salva-leads/silence-monitor').SilenceTimer,
  config: import('@/lib/salva-leads/silence-monitor').SilenceConfig
): Promise<boolean> {
  try {
    // Get corretor info
    const { rows: corretorRows } = await dbQuery(
      `SELECT id, nome, workspace_id, telefone, imobiliaria_id,
              (SELECT nome FROM imobiliarias WHERE id = u.imobiliaria_id) as imobiliaria_nome
       FROM users u WHERE id = $1`,
      [timer.corretorId]
    );
    const corretor = corretorRows[0];
    if (!corretor) {
      console.error(`[Check Silence] Corretor ${timer.corretorId} not found`);
      return false;
    }

    // Check for existing conversation or create new one
    // Use a unique atendimento_id for silence-triggered conversations
    const atendimentoId = `silence-${timer.leadPhone}-${Date.now()}`;

    const conversation = await getOrCreateConversation({
      workspaceId: timer.workspaceId,
      atendimentoId,
      leadPhone: timer.leadPhone,
      leadName: timer.leadName || undefined,
      corretorId: timer.corretorId,
      corretorPhone: timer.corretorPhone || undefined,
    });

    // Generate Luna's opener
    const opener = generateSilenceTakeoverOpener({
      leadNome: timer.leadName || '',
      corretorNome: corretor.nome || 'Corretor',
      assistantName: config.assistantName,
      lastLeadMessage: timer.messageText,
    });

    // Send message via WhatsApp
    const formattedPhone = formatPhoneNumber(timer.leadPhone);
    await sendTextMessage(timer.instanceName, {
      number: formattedPhone,
      text: opener,
    });

    // Update conversation
    await updateConversationStatus(conversation.id, 'active');
    await addMessage(conversation.id, 'assistant', opener, {
      workspaceId: timer.workspaceId,
      phone: timer.leadPhone,
    });

    // Store context
    await updateContext(conversation.id, {
      triggerType: 'silence_takeover',
      silenceTakeoverAt: new Date().toISOString(),
      corretorNome: corretor.nome,
      imobiliariaNome: corretor.imobiliaria_nome || undefined,
      assistantName: config.assistantName,
      lastLeadMessage: timer.messageText,
    });

    // Mark as silence takeover in DB
    await dbQuery(
      `UPDATE salva_leads_conversations
       SET silence_takeover = true,
           silence_takeover_at = NOW(),
           trigger_type = 'silence_takeover'
       WHERE id = $1`,
      [conversation.id]
    );

    // Increment intervention counter for corretor
    await incrementConfigCounter(timer.corretorId, timer.workspaceId, 'total_interventions');

    console.log(`[Check Silence] Luna activated for ${timer.leadPhone} (corretor: ${corretor.nome})`);
    return true;

  } catch (error: any) {
    console.error(`[Check Silence] Error activating Luna for ${timer.leadPhone}:`, error);
    return false;
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
