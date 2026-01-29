/**
 * Silence Monitor - Detecta quando corretor não respondeu o lead
 * 
 * Monitora conversas onde o lead mandou mensagem e o corretor
 * não respondeu dentro do tempo configurado. Quando o timer vence,
 * Luna entra como assistente do corretor.
 * 
 * ARQUITETURA:
 * - Redis: Timers de silêncio (TTL automático, keys expiráveis)
 * - PostgreSQL: Config por corretor, persistência de conversas
 * - Webhook: Registra timer quando lead manda msg, cancela quando corretor responde
 * - Cron: /api/salva-leads/check-silence verifica timers vencidos
 */

import { getRedis } from '@/lib/redis';
import { dbQuery } from '@/lib/db';

// Redis key prefixes
const SILENCE_PREFIX = 'salva-leads:silence';
const SILENCE_ACTIVE_PREFIX = 'salva-leads:silence-active'; // Set of active timers per workspace

// ============================================================================
// TYPES
// ============================================================================

export interface SilenceTimer {
  workspaceId: number;
  leadPhone: string;
  leadName: string | null;
  corretorId: string;
  corretorPhone: string | null;
  instanceName: string;
  messageText: string;
  createdAt: number; // timestamp ms
  timeoutMinutes: number;
  expiresAt: number; // timestamp ms
}

export interface SilenceConfig {
  autoAssistantEnabled: boolean;
  silenceTimeoutMinutes: number;
  businessHoursStart: number;
  businessHoursEnd: number;
  assistantName: string;
}

const DEFAULT_CONFIG: SilenceConfig = {
  autoAssistantEnabled: true,
  silenceTimeoutMinutes: 10,
  businessHoursStart: 8,
  businessHoursEnd: 20,
  assistantName: 'Luna',
};

// ============================================================================
// CONFIG - Per-broker settings
// ============================================================================

/**
 * Get silence config for a corretor. Falls back to defaults.
 * Uses salva_leads_config.settings JSONB field.
 */
export async function getCorretorConfig(userId: string): Promise<SilenceConfig> {
  try {
    const { rows } = await dbQuery(
      `SELECT settings FROM salva_leads_config WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) return DEFAULT_CONFIG;

    const settings = typeof rows[0].settings === 'string'
      ? JSON.parse(rows[0].settings)
      : rows[0].settings || {};

    return {
      autoAssistantEnabled: settings.auto_assistant_enabled ?? true,
      silenceTimeoutMinutes: settings.silence_timeout_minutes ?? 10,
      businessHoursStart: settings.business_hours_start ?? 8,
      businessHoursEnd: settings.business_hours_end ?? 20,
      assistantName: settings.assistant_name ?? 'Luna',
    };
  } catch (error) {
    console.error('[Silence Monitor] Error fetching config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save silence config for a corretor.
 * Merges into the existing salva_leads_config.settings JSONB.
 */
export async function saveCorretorConfig(
  userId: string,
  workspaceId: number,
  config: Partial<SilenceConfig>
): Promise<void> {
  // Build settings JSON with snake_case keys
  const settingsUpdate: Record<string, any> = {};
  if (config.autoAssistantEnabled !== undefined) settingsUpdate.auto_assistant_enabled = config.autoAssistantEnabled;
  if (config.silenceTimeoutMinutes !== undefined) settingsUpdate.silence_timeout_minutes = config.silenceTimeoutMinutes;
  if (config.businessHoursStart !== undefined) settingsUpdate.business_hours_start = config.businessHoursStart;
  if (config.businessHoursEnd !== undefined) settingsUpdate.business_hours_end = config.businessHoursEnd;
  if (config.assistantName !== undefined) settingsUpdate.assistant_name = config.assistantName;

  // Try to update existing record first, merge settings
  const { rowCount } = await dbQuery(
    `UPDATE salva_leads_config
     SET settings = settings || $1::jsonb
     WHERE user_id = $2`,
    [JSON.stringify(settingsUpdate), userId]
  );

  // If no existing record, insert
  if (!rowCount || rowCount === 0) {
    await dbQuery(
      `INSERT INTO salva_leads_config (tenant_id, user_id, instance_name, enabled, settings)
       VALUES ($1, $2, '', true, $3)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET
         settings = salva_leads_config.settings || $3::jsonb`,
      [workspaceId, userId, JSON.stringify(settingsUpdate)]
    );
  }
}

/**
 * Increment intervention/leads-saved counters in settings.
 */
export async function incrementConfigCounter(
  userId: string,
  workspaceId: number,
  counter: 'total_interventions' | 'total_leads_saved'
): Promise<void> {
  try {
    // Get current value
    const { rows } = await dbQuery(
      `SELECT settings FROM salva_leads_config WHERE user_id = $1`,
      [userId]
    );

    if (rows.length > 0) {
      const settings = typeof rows[0].settings === 'string'
        ? JSON.parse(rows[0].settings)
        : rows[0].settings || {};
      const currentValue = settings[counter] || 0;

      await dbQuery(
        `UPDATE salva_leads_config
         SET settings = settings || $1::jsonb
         WHERE user_id = $2`,
        [JSON.stringify({ [counter]: currentValue + 1 }), userId]
      );
    } else {
      await dbQuery(
        `INSERT INTO salva_leads_config (tenant_id, user_id, instance_name, enabled, settings)
         VALUES ($1, $2, '', true, $3)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET
           settings = salva_leads_config.settings || $3::jsonb`,
        [workspaceId, userId, JSON.stringify({ [counter]: 1 })]
      );
    }
  } catch (error) {
    console.error(`[Silence Monitor] Error incrementing ${counter}:`, error);
  }
}

// ============================================================================
// TIMER MANAGEMENT (Redis)
// ============================================================================

/**
 * Schedule a silence timer when lead sends message and corretor hasn't responded.
 * Timer key: salva-leads:silence:{workspaceId}:{leadPhone}
 * Active set: salva-leads:silence-active:{workspaceId} (sorted set by expiry)
 */
export async function scheduleSilenceTimer(timer: SilenceTimer): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    console.warn('[Silence Monitor] Redis unavailable, cannot schedule timer');
    return false;
  }

  const key = `${SILENCE_PREFIX}:${timer.workspaceId}:${timer.leadPhone}`;
  const activeKey = `${SILENCE_ACTIVE_PREFIX}:${timer.workspaceId}`;

  try {
    const pipeline = redis.multi();

    // Store timer data with TTL (timeout + 5min buffer for processing)
    const ttlSeconds = (timer.timeoutMinutes * 60) + 300;
    pipeline.set(key, JSON.stringify(timer), 'EX', ttlSeconds);

    // Add to sorted set (score = expiresAt timestamp for ordering)
    pipeline.zadd(activeKey, timer.expiresAt, timer.leadPhone);

    // Set TTL on the sorted set too (auto-cleanup)
    pipeline.expire(activeKey, 86400); // 24h

    await pipeline.exec();

    console.log(`[Silence Monitor] Timer scheduled for ${timer.leadPhone} in workspace ${timer.workspaceId}, expires in ${timer.timeoutMinutes}min`);
    return true;
  } catch (error) {
    console.error('[Silence Monitor] Error scheduling timer:', error);
    return false;
  }
}

/**
 * Cancel a silence timer (corretor responded).
 */
export async function cancelSilenceTimer(
  workspaceId: number,
  leadPhone: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  const key = `${SILENCE_PREFIX}:${workspaceId}:${leadPhone}`;
  const activeKey = `${SILENCE_ACTIVE_PREFIX}:${workspaceId}`;

  try {
    const pipeline = redis.multi();
    pipeline.del(key);
    pipeline.zrem(activeKey, leadPhone);
    await pipeline.exec();

    console.log(`[Silence Monitor] Timer cancelled for ${leadPhone} in workspace ${workspaceId}`);
    return true;
  } catch (error) {
    console.error('[Silence Monitor] Error cancelling timer:', error);
    return false;
  }
}

/**
 * Get all expired timers for a workspace.
 * Returns timers where expiresAt <= now.
 */
export async function getExpiredTimers(workspaceId: number): Promise<SilenceTimer[]> {
  const redis = getRedis();
  if (!redis) return [];

  const activeKey = `${SILENCE_ACTIVE_PREFIX}:${workspaceId}`;
  const now = Date.now();

  try {
    // Get all phones with expired timers (score <= now)
    const expiredPhones = await redis.zrangebyscore(activeKey, 0, now);

    if (expiredPhones.length === 0) return [];

    const timers: SilenceTimer[] = [];

    for (const phone of expiredPhones) {
      const key = `${SILENCE_PREFIX}:${workspaceId}:${phone}`;
      const data = await redis.get(key);

      if (data) {
        try {
          const timer = JSON.parse(data) as SilenceTimer;
          timers.push(timer);
        } catch {
          // Invalid data, clean up
          await redis.del(key);
          await redis.zrem(activeKey, phone);
        }
      } else {
        // Timer data expired but still in set, clean up
        await redis.zrem(activeKey, phone);
      }
    }

    return timers;
  } catch (error) {
    console.error('[Silence Monitor] Error getting expired timers:', error);
    return [];
  }
}

/**
 * Get all workspaces that have active timers.
 */
export async function getWorkspacesWithActiveTimers(): Promise<number[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    // Scan for all silence-active keys
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, foundKeys] = await redis.scan(
        cursor,
        'MATCH',
        `${SILENCE_ACTIVE_PREFIX}:*`,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    // Extract workspace IDs
    return keys
      .map(key => {
        const parts = key.split(':');
        return parseInt(parts[parts.length - 1]);
      })
      .filter(id => !isNaN(id));
  } catch (error) {
    console.error('[Silence Monitor] Error scanning workspaces:', error);
    return [];
  }
}

/**
 * Remove a timer after it's been processed (Luna entered).
 */
export async function removeProcessedTimer(
  workspaceId: number,
  leadPhone: string
): Promise<void> {
  await cancelSilenceTimer(workspaceId, leadPhone);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if current time is within business hours.
 */
export function isWithinBusinessHours(config: SilenceConfig): boolean {
  const now = new Date();
  // Use São Paulo timezone (Brazil)
  const brTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hour = brTime.getHours();

  return hour >= config.businessHoursStart && hour < config.businessHoursEnd;
}

/**
 * Check if message is just emoji/sticker (not worth triggering silence monitor).
 */
export function isEmojiOrStickerOnly(messageText: string): boolean {
  if (!messageText || messageText.trim() === '') return true;

  // Remove emojis and whitespace
  const stripped = messageText
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport & maps
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // variation selectors
    .replace(/[\u{200D}]/gu, '')             // zero width joiner
    .replace(/[\u{20E3}]/gu, '')             // combining enclosing keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, '') // tags
    .trim();

  return stripped.length === 0;
}

/**
 * Check if Luna is already active for this lead.
 */
export async function isLunaAlreadyActive(
  workspaceId: number,
  leadPhone: string
): Promise<boolean> {
  const { rows } = await dbQuery(
    `SELECT 1 FROM salva_leads_conversations
     WHERE workspace_id = $1 AND lead_phone = $2
       AND status IN ('active', 'pending')
       AND bot_paused = false
     LIMIT 1`,
    [workspaceId, leadPhone]
  );
  return rows.length > 0;
}

/**
 * Check if corretor has responded recently.
 */
export async function hasCorretorRespondedRecently(
  workspaceId: number,
  leadPhone: string,
  withinMinutes: number = 5
): Promise<boolean> {
  const { rows } = await dbQuery(
    `SELECT 1 FROM whatsapp_messages
     WHERE tenant_id = $1
       AND phone_number = $2
       AND is_from_me = true
       AND timestamp > NOW() - INTERVAL '1 minute' * $3
     LIMIT 1`,
    [workspaceId, leadPhone, withinMinutes]
  );
  return rows.length > 0;
}

/**
 * Find the corretor who owns the Evolution instance.
 */
export async function findCorretorByInstance(
  instanceName: string
): Promise<{ id: string; nome: string; workspace_id: number; telefone: string } | null> {
  const { rows } = await dbQuery(
    `SELECT id, nome, workspace_id, telefone
     FROM users
     WHERE evolution_instance_name = $1
     LIMIT 1`,
    [instanceName]
  );
  return rows[0] || null;
}
