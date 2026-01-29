/**
 * Process Debounced Salva-Leads Messages
 *
 * POST/GET /api/salva-leads/process-debounced
 *
 * Este endpoint processa conversas Salva-Leads que tem mensagens pendentes
 * e cujo periodo de debounce ja expirou.
 *
 * Deve ser chamado por um cron job a cada 5-10 segundos para garantir
 * que mensagens sejam processadas logo apos o debounce expirar.
 *
 * Fluxo:
 * 1. Busca conversas com pending_messages > 0 e debounce_until <= NOW
 * 2. Para cada conversa, combina todas as mensagens pendentes
 * 3. Processa com IA e envia resposta
 * 4. Limpa pending_messages
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getConversationsReadyToProcess,
  getConversation,
  getPendingMessages,
  clearPendingMessages,
  incrementRetryCount,
  addMessage,
  acquireLock,
  releaseLock,
} from '@/lib/salva-leads/conversation';
import { processWithAgent } from '@/lib/salva-leads/agent';
import { sendTextMessage, formatPhoneNumber } from '@/lib/evolution-api';
import { getTenant } from '@/lib/tenant-context';
import {
  getActiveTenantsWithEvolution,
} from '@/lib/salva-leads/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minuto max

/**
 * GET handler - para cron jobs
 */
export async function GET(request: NextRequest) {
  return processDebounced(request);
}

/**
 * POST handler - para chamadas manuais
 */
export async function POST(request: NextRequest) {
  return processDebounced(request);
}

/**
 * Processa conversas com debounce expirado
 */
async function processDebounced(request: NextRequest) {
  // Verificar autenticacao do Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Permitir execucao manual em dev ou com secret correto
  const isAuthorized =
    process.env.NODE_ENV === 'development' ||
    authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    console.error('[Process-Debounced] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results: Array<{
    tenantId: number;
    conversationId: number;
    messagesCount: number;
    status: 'processed' | 'error' | 'skipped';
    error?: string;
  }> = [];

  try {
    // Buscar todos os tenants ativos com Evolution
    const tenants = await getActiveTenantsWithEvolution();
    console.log(`[Process-Debounced] Verificando ${tenants.length} tenants`);

    for (const tenant of tenants) {
      try {
        // Buscar conversas prontas para processar neste tenant
        const conversations = await getConversationsReadyToProcess(tenant.id);

        if (conversations.length === 0) {
          continue;
        }

        console.log(`[Process-Debounced] Tenant ${tenant.id}: ${conversations.length} conversas prontas`);

        // Obter instance name do tenant
        const instanceName = await getEvolutionInstanceName(tenant.id);

        if (!instanceName) {
          console.warn(`[Process-Debounced] Tenant ${tenant.id} sem instance Evolution conectada`);
          continue;
        }

        for (const conv of conversations) {
          try {
            const result = await processConversation(conv.id, tenant.id, instanceName);
            results.push({
              tenantId: tenant.id,
              conversationId: conv.id,
              messagesCount: result.messagesCount,
              status: result.status,
              error: result.error,
            });
          } catch (error: any) {
            console.error(`[Process-Debounced] Erro na conversa ${conv.id}:`, error);
            results.push({
              tenantId: tenant.id,
              conversationId: conv.id,
              messagesCount: 0,
              status: 'error',
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        console.error(`[Process-Debounced] Erro no tenant ${tenant.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    const processed = results.filter(r => r.status === 'processed').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`[Process-Debounced] Concluido em ${duration}ms - ${processed} processadas, ${errors} erros`);

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        total: results.length,
        processed,
        errors,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Process-Debounced] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Limite máximo de retries antes de pausar conversa
const MAX_RETRY_COUNT = 3;

/**
 * Processa uma conversa especifica
 *
 * IMPORTANTE: Usa padrão read-then-clear para evitar perda de mensagens.
 * Mensagens só são limpas APÓS processamento bem-sucedido.
 *
 * LOCK REDIS: Usa lock distribuído para evitar processamento duplicado
 * quando múltiplas instâncias do cron rodam simultaneamente.
 */
async function processConversation(
  conversationId: number,
  tenantId: number,
  instanceName: string
): Promise<{ messagesCount: number; status: 'processed' | 'error' | 'skipped'; error?: string }> {
  // Buscar conversa atualizada
  const conv = await getConversation(conversationId);

  if (!conv) {
    return { messagesCount: 0, status: 'error', error: 'conversa_nao_encontrada' };
  }

  // Contexto para Redis
  const context = { tenantId, phone: conv.lead_phone };

  // Tentar adquirir lock (evita processamento duplicado)
  const { acquired, lockValue } = await acquireLock(tenantId, conv.lead_phone);
  if (!acquired) {
    console.log(`[Process-Debounced] Conversa ${conversationId} já está sendo processada (lock ativo)`);
    return { messagesCount: 0, status: 'skipped', error: 'lock_ativo' };
  }

  try {
    // Verificar se ainda tem mensagens pendentes
    const pendingMessages = conv.pending_messages || [];
    if (pendingMessages.length === 0) {
      return { messagesCount: 0, status: 'skipped', error: 'sem_mensagens_pendentes' };
    }

    // Verificar se debounce realmente expirou (double-check)
    const debounceUntil = conv.debounce_until ? new Date(conv.debounce_until) : null;
    if (debounceUntil && debounceUntil > new Date()) {
      return { messagesCount: 0, status: 'skipped', error: 'debounce_ainda_ativo' };
    }

    // Verificar se bot esta pausado
    if (conv.bot_paused) {
      return { messagesCount: pendingMessages.length, status: 'skipped', error: 'bot_pausado' };
    }

    // Verificar se já atingiu limite de retries
    const retryCount = (conv as any).retry_count || 0;
    if (retryCount >= MAX_RETRY_COUNT) {
      console.warn(`[Process-Debounced] Conversa ${conversationId} atingiu limite de retries (${retryCount}). Requer intervenção manual.`);
      return { messagesCount: pendingMessages.length, status: 'skipped', error: `max_retries_atingido (${retryCount})` };
    }

    // Combinar todas as mensagens pendentes
    // NOTA: Usar getPendingMessages() com contexto para tentar Redis primeiro
    const messages = await getPendingMessages(conversationId, context);
    const combinedMessage = messages.join('\n');
    const messagesCount = messages.length;

    if (messagesCount === 0) {
      return { messagesCount: 0, status: 'skipped', error: 'sem_mensagens_pendentes_atualizado' };
    }

    console.log(`[Process-Debounced] Processando conversa ${conversationId}: ${messagesCount} mensagens combinadas (retry: ${retryCount})`);

    // Adicionar mensagem do usuario ao historico ANTES de processar
    await addMessage(conversationId, 'user', combinedMessage, context);

    // Processar com IA
    let response: string | null = null;
    try {
      response = await processWithAgent(conv, combinedMessage, tenantId);
    } catch (processingError: any) {
      // Se IA falhar, incrementar retry e aguardar próxima tentativa
      const newRetryCount = await incrementRetryCount(conversationId);
      console.error(`[Process-Debounced] Erro ao processar com IA (retry ${newRetryCount}):`, processingError.message);
      return {
        messagesCount,
        status: 'error',
        error: `erro_processamento_ia: ${processingError.message} (retry: ${newRetryCount})`,
      };
    }

    if (response) {
      // Enviar resposta via Evolution API
      try {
        const formattedPhone = formatPhoneNumber(conv.lead_phone);
        await sendTextMessage(instanceName, {
          number: formattedPhone,
          text: response,
        });
        console.log(`[Process-Debounced] Resposta enviada para ${conv.lead_phone}`);

        // SUCESSO: Limpar mensagens pendentes (Redis + PostgreSQL)
        await clearPendingMessages(conversationId, context);

        // Adicionar resposta ao historico (PostgreSQL + Redis)
        await addMessage(conversationId, 'assistant', response, context);

        return { messagesCount, status: 'processed' };

      } catch (sendError: any) {
        // Se envio falhar, incrementar retry mas NÃO limpar mensagens
        const newRetryCount = await incrementRetryCount(conversationId);
        console.error(`[Process-Debounced] Erro ao enviar resposta (retry ${newRetryCount}):`, sendError.message);
        return {
          messagesCount,
          status: 'error',
          error: `erro_envio: ${sendError.message} (retry: ${newRetryCount})`,
        };
      }
    } else {
      // IA não retornou resposta - limpar mensagens mesmo assim
      // (pode ser comportamento intencional, ex: mensagem irrelevante)
      await clearPendingMessages(conversationId, context);
      console.log(`[Process-Debounced] IA não retornou resposta para conversa ${conversationId}`);
      return { messagesCount, status: 'processed' };
    }
  } finally {
    // SEMPRE liberar lock, mesmo se houve erro
    await releaseLock(tenantId, conv.lead_phone, lockValue);
  }
}

/**
 * Obtem o nome da instancia Evolution para um tenant
 */
async function getEvolutionInstanceName(tenantId: number): Promise<string | null> {
  const tenant = await getTenant(tenantId);
  if (!tenant) return null;

  const instances = tenant.evolution_instances || [];
  const activeInstance = instances.find(
    (i) => i.status === 'connected' || i.status === 'open'
  );

  return activeInstance?.instance_name || instances[0]?.instance_name || null;
}
