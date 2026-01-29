/**
 * Salva-Leads Redis State Manager
 *
 * Gerencia estado de conversas no Redis para performance.
 * Usa Redis para:
 * - Debounce de mensagens (acumular mensagens rapidas)
 * - Cache de mensagens pendentes
 * - Historico temporario de conversas
 */

import { getRedis } from '@/lib/redis';

// Prefixos de chaves
const PREFIX = 'salva-leads';
const DEBOUNCE_PREFIX = `${PREFIX}:debounce`;
const PENDING_PREFIX = `${PREFIX}:pending`;
const HISTORY_PREFIX = `${PREFIX}:history`;
const LOCK_PREFIX = `${PREFIX}:lock`;

// TTLs em segundos
const DEBOUNCE_TTL = 15; // 15 segundos para debounce
const PENDING_TTL = 300; // 5 minutos para mensagens pendentes
const HISTORY_TTL = 3600; // 1 hora para historico
const LOCK_TTL = 30; // 30 segundos para lock

// ============================================================================
// DEBOUNCE - Acumular mensagens rapidas
// ============================================================================

/**
 * Adiciona mensagem ao debounce
 * Retorna true se eh a primeira mensagem do periodo de debounce
 */
export async function addToDebounce(
  workspaceId: number,
  phone: string,
  message: string
): Promise<{ isFirst: boolean; count: number }> {
  const redis = getRedis();
  if (!redis) {
    return { isFirst: true, count: 1 };
  }

  const key = `${DEBOUNCE_PREFIX}:${workspaceId}:${phone}`;

  try {
    // Usar MULTI para atomicidade
    const pipeline = redis.multi();

    // Verificar se ja existe
    pipeline.exists(key);

    // Adicionar mensagem a lista
    pipeline.rpush(key, JSON.stringify({
      text: message,
      timestamp: Date.now()
    }));

    // Renovar TTL
    pipeline.expire(key, DEBOUNCE_TTL);

    // Contar total
    pipeline.llen(key);

    const results = await pipeline.exec();

    const existed = results?.[0]?.[1] === 1;
    const count = (results?.[3]?.[1] as number) || 1;

    return {
      isFirst: !existed,
      count
    };
  } catch (error) {
    console.error('[Redis State] Erro em addToDebounce:', error);
    return { isFirst: true, count: 1 };
  }
}

/**
 * Busca mensagens acumuladas no debounce
 */
export async function getDebounceMessages(
  workspaceId: number,
  phone: string
): Promise<Array<{ text: string; timestamp: number }>> {
  const redis = getRedis();
  if (!redis) return [];

  const key = `${DEBOUNCE_PREFIX}:${workspaceId}:${phone}`;

  try {
    const messages = await redis.lrange(key, 0, -1);
    return messages.map(m => JSON.parse(m));
  } catch (error) {
    console.error('[Redis State] Erro em getDebounceMessages:', error);
    return [];
  }
}

/**
 * Limpa debounce apos processar
 */
export async function clearDebounce(
  workspaceId: number,
  phone: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = `${DEBOUNCE_PREFIX}:${workspaceId}:${phone}`;

  try {
    await redis.del(key);
  } catch (error) {
    console.error('[Redis State] Erro em clearDebounce:', error);
  }
}

/**
 * Verifica se debounce expirou (pronto para processar)
 */
export async function isDebounceReady(
  workspaceId: number,
  phone: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  const key = `${DEBOUNCE_PREFIX}:${workspaceId}:${phone}`;

  try {
    const ttl = await redis.ttl(key);
    // Se TTL < 5 segundos ou nao existe (-2), esta pronto
    return ttl <= 5 || ttl === -2;
  } catch (error) {
    return true;
  }
}

// ============================================================================
// HISTORICO - Cache de conversa para contexto
// ============================================================================

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Adiciona mensagem ao historico
 */
export async function addToHistory(
  workspaceId: number,
  phone: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = `${HISTORY_PREFIX}:${workspaceId}:${phone}`;

  try {
    const message: HistoryMessage = {
      role,
      content,
      timestamp: Date.now()
    };

    // Adicionar ao final da lista
    await redis.rpush(key, JSON.stringify(message));

    // Manter apenas ultimas 20 mensagens
    await redis.ltrim(key, -20, -1);

    // Renovar TTL
    await redis.expire(key, HISTORY_TTL);
  } catch (error) {
    console.error('[Redis State] Erro em addToHistory:', error);
  }
}

/**
 * Busca historico de conversa
 */
export async function getHistory(
  workspaceId: number,
  phone: string,
  limit: number = 10
): Promise<HistoryMessage[]> {
  const redis = getRedis();
  if (!redis) return [];

  const key = `${HISTORY_PREFIX}:${workspaceId}:${phone}`;

  try {
    const messages = await redis.lrange(key, -limit, -1);
    return messages.map(m => JSON.parse(m));
  } catch (error) {
    console.error('[Redis State] Erro em getHistory:', error);
    return [];
  }
}

/**
 * Limpa historico
 */
export async function clearHistory(
  workspaceId: number,
  phone: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = `${HISTORY_PREFIX}:${workspaceId}:${phone}`;

  try {
    await redis.del(key);
  } catch (error) {
    console.error('[Redis State] Erro em clearHistory:', error);
  }
}

// ============================================================================
// LOCK - Evitar processamento duplicado
// ============================================================================

/**
 * Resultado da tentativa de adquirir lock
 */
export interface AcquireLockResult {
  acquired: boolean;
  lockValue: string | null;
}

/**
 * Tenta adquirir lock para processar conversa
 * Retorna objeto com status e valor unico do lock (para release atomico)
 */
export async function acquireLock(
  workspaceId: number,
  phone: string
): Promise<AcquireLockResult> {
  const redis = getRedis();
  if (!redis) return { acquired: true, lockValue: null }; // Sem Redis, assume que pode prosseguir

  const key = `${LOCK_PREFIX}:${workspaceId}:${phone}`;
  // Valor unico para identificar este processo
  const lockValue = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  try {
    // SET NX (only if not exists) com TTL
    const result = await redis.set(key, lockValue, 'EX', LOCK_TTL, 'NX');
    if (result === 'OK') {
      return { acquired: true, lockValue };
    }
    return { acquired: false, lockValue: null };
  } catch (error) {
    console.error('[Redis State] Erro em acquireLock:', error);
    return { acquired: true, lockValue: null };
  }
}

// Lua script para release atomico - deleta apenas se o valor for igual
const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

/**
 * Libera lock apos processar
 * @param workspaceId - ID do tenant
 * @param phone - Telefone do contato
 * @param lockValue - Valor unico retornado por acquireLock (opcional para backward compatibility)
 *
 * Se lockValue for fornecido, usa Lua script para garantir atomicidade
 * (so deleta se o valor ainda for o mesmo, evitando deletar lock de outro processo)
 *
 * Se lockValue nao for fornecido, usa comportamento antigo (delete simples)
 */
export async function releaseLock(
  workspaceId: number,
  phone: string,
  lockValue?: string | null
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = `${LOCK_PREFIX}:${workspaceId}:${phone}`;

  try {
    if (lockValue) {
      // Release atomico usando Lua script
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, key, lockValue);
    } else {
      // Backward compatibility: delete simples (comportamento antigo)
      await redis.del(key);
    }
  } catch (error) {
    console.error('[Redis State] Erro em releaseLock:', error);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Combina mensagens de debounce em uma unica string
 */
export function combineDebounceMessages(
  messages: Array<{ text: string; timestamp: number }>
): string {
  if (messages.length === 0) return '';
  if (messages.length === 1) return messages[0].text;

  // Ordenar por timestamp
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  // Combinar textos
  return sorted.map(m => m.text).join('\n');
}

/**
 * Formata historico para prompt do LLM
 */
export function formatHistoryForPrompt(
  history: HistoryMessage[],
  maxChars: number = 2000
): string {
  if (history.length === 0) return '';

  let result = '';
  let charCount = 0;

  // Iterar do mais recente para o mais antigo
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const prefix = msg.role === 'user' ? 'Cliente: ' : 'Luna: ';
    const line = `${prefix}${msg.content}\n`;

    if (charCount + line.length > maxChars) break;

    result = line + result;
    charCount += line.length;
  }

  return result.trim();
}
