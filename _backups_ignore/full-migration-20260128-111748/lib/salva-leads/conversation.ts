/**
 * Gerenciamento de Conversas do Salva-Leads
 *
 * Funcoes CRUD para manipular conversas de reengajamento de leads abandonados.
 * Segue o schema da migration 006_salva_leads.sql
 *
 * ARQUITETURA DE CACHE (Redis):
 * - Redis é usado como cache primário para debounce (alta performance)
 * - PostgreSQL é a fonte de verdade (persistência)
 * - Se Redis não estiver disponível, fallback para PostgreSQL
 */

import pool from '@/lib/db';
import type {
  SalvaLeadsConversation,
  SalvaLeadsMessage,
  SalvaLeadsPendingMessage,
  CreateConversationParams,
} from './types';
import {
  addToDebounce,
  getDebounceMessages,
  clearDebounce,
  addToHistory,
  getHistory,
  acquireLock,
  releaseLock,
  combineDebounceMessages,
  formatHistoryForPrompt,
} from './redis-state';

// Re-export types for convenience
export type {
  SalvaLeadsConversation,
  SalvaLeadsMessage,
  SalvaLeadsPendingMessage,
  CreateConversationParams,
};

// Re-export Redis utilities for external use
export {
  acquireLock,
  releaseLock,
  getHistory as getRedisHistory,
  formatHistoryForPrompt,
  combineDebounceMessages,
};

// ============================================
// FUNCOES CRUD
// ============================================

/**
 * Busca ou cria uma conversa.
 * Usa INSERT ... ON CONFLICT DO UPDATE para upsert atomico.
 */
export async function getOrCreateConversation(
  params: CreateConversationParams
): Promise<SalvaLeadsConversation> {
  const {
    tenantId,
    atendimentoId,
    leadPhone,
    leadName,
    corretorId,
    corretorPhone,
  } = params;

  const result = await pool.query(
    `INSERT INTO salva_leads_conversations (
      tenant_id, atendimento_id, lead_phone, lead_name,
      corretor_id, corretor_phone
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (tenant_id, atendimento_id)
    DO UPDATE SET
      lead_name = COALESCE(EXCLUDED.lead_name, salva_leads_conversations.lead_name),
      corretor_phone = COALESCE(EXCLUDED.corretor_phone, salva_leads_conversations.corretor_phone),
      updated_at = NOW()
    RETURNING *`,
    [tenantId, atendimentoId, leadPhone, leadName || null, corretorId, corretorPhone || null]
  );

  return parseConversation(result.rows[0]);
}

/**
 * Busca conversa por ID
 */
export async function getConversation(
  id: number
): Promise<SalvaLeadsConversation | null> {
  const result = await pool.query(
    `SELECT * FROM salva_leads_conversations WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseConversation(result.rows[0]);
}

/**
 * Busca conversa por telefone do lead.
 * Retorna a mais recente que esteja ativa (pending ou active).
 * Usado no webhook para encontrar a conversa do lead.
 */
export async function getConversationByPhone(
  tenantId: number,
  phone: string
): Promise<SalvaLeadsConversation | null> {
  const result = await pool.query(
    `SELECT * FROM salva_leads_conversations
     WHERE tenant_id = $1
       AND lead_phone = $2
       AND status IN ('pending', 'active')
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId, phone]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseConversation(result.rows[0]);
}

/**
 * Atualiza status da conversa
 */
export async function updateConversationStatus(
  id: number,
  status: string
): Promise<void> {
  await pool.query(
    `UPDATE salva_leads_conversations
     SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, id]
  );
}

/**
 * Adiciona mensagem ao historico da conversa.
 * Usa operador || do JSONB para append eficiente.
 *
 * HÍBRIDO: Salva em PostgreSQL (persistência) e Redis (cache para IA).
 */
export async function addMessage(
  id: number,
  role: string,
  content: string,
  context?: { tenantId: number; phone: string }
): Promise<void> {
  const message: SalvaLeadsMessage = {
    role: role as SalvaLeadsMessage['role'],
    content,
    timestamp: new Date().toISOString(),
  };

  // Salvar no PostgreSQL (fonte de verdade)
  await pool.query(
    `UPDATE salva_leads_conversations
     SET messages = messages || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(message), id]
  );

  // Também salvar no Redis (cache para IA) se temos contexto
  if (context) {
    await addToHistory(
      context.tenantId,
      context.phone,
      role as 'user' | 'assistant',
      content
    );
  }
}

/**
 * Adiciona mensagem ao buffer de pending_messages (para debounce).
 * Permite acumular mensagens antes de processar.
 *
 * HÍBRIDO: Salva em Redis (cache rápido) e PostgreSQL (persistência).
 * Redis é preferido para leitura, PostgreSQL é backup.
 */
export async function appendPendingMessage(
  id: number,
  text: string,
  context?: { tenantId: number; phone: string }
): Promise<{ isFirst: boolean; count: number }> {
  const pendingMessage: SalvaLeadsPendingMessage = {
    text,
    timestamp: new Date().toISOString(),
  };

  // Salvar no PostgreSQL (fonte de verdade)
  await pool.query(
    `UPDATE salva_leads_conversations
     SET pending_messages = pending_messages || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(pendingMessage), id]
  );

  // Se temos contexto, também salvar no Redis (cache rápido)
  if (context) {
    const redisResult = await addToDebounce(context.tenantId, context.phone, text);
    return redisResult;
  }

  return { isFirst: true, count: 1 };
}

/**
 * Limpa pending_messages e retorna as mensagens que estavam la.
 * Usa CTE para buscar e limpar atomicamente.
 *
 * HÍBRIDO: Limpa tanto Redis quanto PostgreSQL.
 */
export async function clearPendingMessages(
  id: number,
  context?: { tenantId: number; phone: string }
): Promise<string[]> {
  // Limpar no PostgreSQL
  const result = await pool.query<{ old_messages: SalvaLeadsPendingMessage[] | string }>(
    `WITH old AS (
       SELECT pending_messages FROM salva_leads_conversations WHERE id = $1
     )
     UPDATE salva_leads_conversations
     SET pending_messages = '[]'::jsonb,
         retry_count = 0,
         updated_at = NOW()
     WHERE id = $1
     RETURNING (SELECT pending_messages FROM old) as old_messages`,
    [id]
  );

  // Também limpar no Redis se temos contexto
  if (context) {
    await clearDebounce(context.tenantId, context.phone);
  }

  if (result.rows.length === 0) {
    return [];
  }

  const messages = result.rows[0].old_messages;
  const parsed: SalvaLeadsPendingMessage[] = typeof messages === 'string'
    ? JSON.parse(messages)
    : messages || [];

  return parsed.map(m => m.text);
}

/**
 * Busca mensagens pendentes SEM limpar (para read-before-process pattern).
 * Use clearPendingMessages() DEPOIS de processar com sucesso.
 *
 * HÍBRIDO: Tenta Redis primeiro (mais rápido), fallback para PostgreSQL.
 */
export async function getPendingMessages(
  id: number,
  context?: { tenantId: number; phone: string }
): Promise<string[]> {
  // Tentar Redis primeiro se temos contexto
  if (context) {
    const redisMessages = await getDebounceMessages(context.tenantId, context.phone);
    if (redisMessages.length > 0) {
      return redisMessages.map(m => m.text);
    }
  }

  // Fallback para PostgreSQL
  const result = await pool.query<{ pending_messages: SalvaLeadsPendingMessage[] | string }>(
    `SELECT pending_messages FROM salva_leads_conversations WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return [];
  }

  const messages = result.rows[0].pending_messages;
  const parsed: SalvaLeadsPendingMessage[] = typeof messages === 'string'
    ? JSON.parse(messages)
    : messages || [];

  return parsed.map(m => m.text);
}

/**
 * Incrementa contador de retry e adia próximo processamento.
 * Usado quando processWithAgent falha para evitar loop infinito.
 *
 * Exponential backoff: 1min, 2min, 4min, 8min, 16min, 30min (máximo).
 * Isso evita sobrecarregar o sistema em caso de falhas persistentes,
 * enquanto ainda permite recuperação rápida para falhas transitórias.
 */
export async function incrementRetryCount(id: number): Promise<number> {
  // Primeiro buscar o retry_count atual para calcular o backoff
  const currentResult = await pool.query<{ retry_count: number }>(
    `SELECT COALESCE(retry_count, 0) as retry_count FROM salva_leads_conversations WHERE id = $1`,
    [id]
  );

  const currentRetry = currentResult.rows[0]?.retry_count || 0;

  // Exponential backoff: 2^0=1, 2^1=2, 2^2=4, 2^3=8, 2^4=16, max=30 minutos
  const backoffMinutes = Math.min(Math.pow(2, currentRetry), 30);

  const result = await pool.query<{ retry_count: number }>(
    `UPDATE salva_leads_conversations
     SET retry_count = COALESCE(retry_count, 0) + 1,
         debounce_until = NOW() + INTERVAL '1 minute' * $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING retry_count`,
    [id, backoffMinutes]
  );

  return result.rows[0]?.retry_count || 0;
}

/**
 * Define debounce_until para aguardar mais mensagens antes de processar.
 */
export async function setDebounceUntil(
  id: number,
  until: Date
): Promise<void> {
  await pool.query(
    `UPDATE salva_leads_conversations
     SET debounce_until = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [until.toISOString(), id]
  );
}

/**
 * Pausa o bot (corretor assumiu a conversa).
 * Define bot_paused = true e bot_paused_at = NOW().
 */
export async function pauseBot(id: number): Promise<void> {
  await pool.query(
    `UPDATE salva_leads_conversations
     SET bot_paused = TRUE,
         bot_paused_at = NOW(),
         status = 'paused_by_corretor',
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

/**
 * Retoma o bot.
 * Define bot_paused = false.
 */
export async function resumeBot(id: number): Promise<void> {
  await pool.query(
    `UPDATE salva_leads_conversations
     SET bot_paused = FALSE,
         bot_paused_at = NULL,
         status = 'active',
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

/**
 * Atualiza o contexto da conversa (merge com existente).
 * Usa operador || do JSONB para merge.
 */
export async function updateContext(
  id: number,
  context: Record<string, any>
): Promise<void> {
  await pool.query(
    `UPDATE salva_leads_conversations
     SET context = context || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(context), id]
  );
}

/**
 * Lista conversas com filtros opcionais.
 */
export async function listConversations(
  tenantId: number,
  filters?: {
    status?: string;
    corretorId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<SalvaLeadsConversation[]> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filters?.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.corretorId) {
    conditions.push(`corretor_id = $${paramIndex}`);
    params.push(filters.corretorId);
    paramIndex++;
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  const query = `
    SELECT * FROM salva_leads_conversations
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const result = await pool.query(query, params);

  return result.rows.map(parseConversation);
}

// ============================================
// FUNCOES AUXILIARES
// ============================================

/**
 * Busca conversas prontas para processar (debounce expirado).
 */
export async function getConversationsReadyToProcess(
  tenantId: number
): Promise<SalvaLeadsConversation[]> {
  const result = await pool.query(
    `SELECT * FROM salva_leads_conversations
     WHERE tenant_id = $1
       AND status IN ('pending', 'active')
       AND bot_paused = FALSE
       AND debounce_until IS NOT NULL
       AND debounce_until <= NOW()
       AND jsonb_array_length(pending_messages) > 0
     ORDER BY debounce_until ASC`,
    [tenantId]
  );

  return result.rows.map(parseConversation);
}

/**
 * Atualiza classificacao da conversa.
 */
export async function updateClassification(
  id: number,
  classification: SalvaLeadsConversation['classification']
): Promise<void> {
  await pool.query(
    `UPDATE salva_leads_conversations
     SET classification = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [classification, id]
  );
}

/**
 * Busca conversa por atendimento_id.
 */
export async function getConversationByAtendimento(
  tenantId: number,
  atendimentoId: string
): Promise<SalvaLeadsConversation | null> {
  const result = await pool.query(
    `SELECT * FROM salva_leads_conversations
     WHERE tenant_id = $1 AND atendimento_id = $2`,
    [tenantId, atendimentoId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseConversation(result.rows[0]);
}

/**
 * Conta conversas ativas por corretor.
 */
export async function countActiveByCorretor(
  tenantId: number,
  corretorId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM salva_leads_conversations
     WHERE tenant_id = $1
       AND corretor_id = $2
       AND status IN ('pending', 'active')`,
    [tenantId, corretorId]
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Expira conversas antigas sem atividade.
 */
export async function expireInactiveConversations(
  tenantId: number,
  hoursInactive: number = 72
): Promise<number> {
  const result = await pool.query(
    `UPDATE salva_leads_conversations
     SET status = 'expired',
         updated_at = NOW()
     WHERE tenant_id = $1
       AND status IN ('pending', 'active')
       AND updated_at < NOW() - INTERVAL '1 hour' * $2
     RETURNING id`,
    [tenantId, hoursInactive]
  );

  return result.rows.length;
}

// ============================================
// UTILITARIOS
// ============================================

/**
 * Parseia o resultado do banco para o tipo correto.
 * Converte campos JSONB de string para objeto quando necessario.
 * Converte Date para ISO string conforme esperado pelo tipo.
 */
function parseConversation(row: any): SalvaLeadsConversation {
  return {
    ...row,
    context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context || {},
    messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages || [],
    pending_messages: typeof row.pending_messages === 'string'
      ? JSON.parse(row.pending_messages)
      : row.pending_messages || [],
    debounce_until: row.debounce_until ? new Date(row.debounce_until).toISOString() : null,
    bot_paused_at: row.bot_paused_at ? new Date(row.bot_paused_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

// ============================================
// FUNÇÕES DE HISTÓRICO OTIMIZADO PARA IA
// ============================================

/**
 * Busca histórico de conversa otimizado para prompt da IA.
 * Tenta Redis primeiro (cache rápido), fallback para PostgreSQL.
 *
 * @param tenantId - ID do tenant
 * @param phone - Telefone do lead
 * @param conversationId - ID da conversa (opcional, para fallback PostgreSQL)
 * @param maxChars - Máximo de caracteres no histórico (default: 2000)
 */
export async function getConversationHistoryForAI(
  tenantId: number,
  phone: string,
  conversationId?: number,
  maxChars: number = 2000
): Promise<string> {
  // Tentar Redis primeiro
  const redisHistory = await getHistory(tenantId, phone, 10);

  if (redisHistory.length > 0) {
    return formatHistoryForPrompt(redisHistory, maxChars);
  }

  // Fallback para PostgreSQL se não tem Redis ou está vazio
  if (conversationId) {
    const conv = await getConversation(conversationId);
    if (conv && conv.messages && conv.messages.length > 0) {
      // Converter formato do PostgreSQL para formato compatível
      const historyMessages = conv.messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp).getTime(),
      }));
      return formatHistoryForPrompt(historyMessages, maxChars);
    }
  }

  return '';
}

/**
 * Contexto para funções que precisam de tenant + phone.
 * Usado para integrar Redis com PostgreSQL.
 */
export interface ConversationContext {
  tenantId: number;
  phone: string;
}
