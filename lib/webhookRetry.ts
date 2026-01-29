/**
 * Sistema de Retry Automático para Webhooks
 * Implementa retry exponencial com backoff para webhooks falhados
 */

import { createClient } from '@/lib/supabase/server';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1s
  maxDelay: 30000, // 30s
  backoffMultiplier: 2
};

interface WebhookPayload {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

interface WebhookLog {
  id?: string;
  workspace_id?: string;
  webhook_type: string;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  retry_count: number;
  last_error?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Executa webhook com retry automático
 */
export async function executeWebhookWithRetry(
  webhookType: string,
  payload: WebhookPayload,
  workspaceId?: string,
  config: Partial<RetryConfig> = {}
): Promise<{ success: boolean; error?: string; retries: number }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: string | undefined;
  let retries = 0;

  // Log inicial
  const logId = await logWebhookAttempt({
    workspace_id: workspaceId,
    webhook_type: webhookType,
    payload: payload.body || payload,
    status: 'pending',
    retry_count: 0
  });

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(payload.url, {
        method: payload.method,
        headers: {
          'Content-Type': 'application/json',
          ...payload.headers
        },
        body: payload.body ? JSON.stringify(payload.body) : undefined,
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      if (response.ok) {
        // Sucesso!
        await updateWebhookLog(logId, {
          status: 'success',
          retry_count: retries
        });

        return { success: true, retries };
      }

      // Status não ok - vai tentar retry
      lastError = `HTTP ${response.status}: ${response.statusText}`;
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    // Se não é última tentativa, aguarda antes de retry
    if (attempt < finalConfig.maxRetries) {
      retries++;
      const delay = Math.min(
        finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay
      );

      await updateWebhookLog(logId, {
        status: 'retrying',
        retry_count: retries,
        last_error: lastError
      });

      console.log(`[Webhook Retry] ${webhookType} - Tentativa ${retries + 1}/${finalConfig.maxRetries + 1} em ${delay}ms`);
      await sleep(delay);
    }
  }

  // Todas as tentativas falharam
  await updateWebhookLog(logId, {
    status: 'failed',
    retry_count: retries,
    last_error: lastError
  });

  return { success: false, error: lastError, retries };
}

/**
 * Registra tentativa de webhook no banco
 */
async function logWebhookAttempt(log: WebhookLog): Promise<string> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('webhook_logs')
      .insert({
        workspace_id: log.workspace_id,
        webhook_type: log.webhook_type,
        payload: log.payload,
        status: log.status,
        retry_count: log.retry_count,
        last_error: log.last_error
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Webhook Log] Erro ao salvar:', error);
      return 'fallback-' + Date.now();
    }

    return data.id;
  } catch (error) {
    console.error('[Webhook Log] Erro crítico:', error);
    return 'fallback-' + Date.now();
  }
}

/**
 * Atualiza log de webhook
 */
async function updateWebhookLog(
  logId: string,
  updates: Partial<WebhookLog>
): Promise<void> {
  if (logId.startsWith('fallback-')) return;

  try {
    const supabase = createClient();
    
    await supabase
      .from('webhook_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId);
  } catch (error) {
    console.error('[Webhook Log] Erro ao atualizar:', error);
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reprocessa webhooks falhados
 */
export async function reprocessFailedWebhooks(
  workspaceId?: string,
  webhookType?: string
): Promise<{ processed: number; succeeded: number; failed: number }> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('webhook_logs')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    if (webhookType) {
      query = query.eq('webhook_type', webhookType);
    }

    const { data: failedWebhooks, error } = await query;

    if (error || !failedWebhooks) {
      console.error('[Webhook Reprocess] Erro:', error);
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const webhook of failedWebhooks) {
      const result = await executeWebhookWithRetry(
        webhook.webhook_type,
        webhook.payload,
        webhook.workspace_id
      );

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return {
      processed: failedWebhooks.length,
      succeeded,
      failed
    };
  } catch (error) {
    console.error('[Webhook Reprocess] Erro crítico:', error);
    return { processed: 0, succeeded: 0, failed: 0 };
  }
}
