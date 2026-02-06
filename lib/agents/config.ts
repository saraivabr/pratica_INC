/**
 * Funções de configuração de Agentes IA
 */

import { withTenant } from '@/lib/tenant-context';
import type { AgentConfig, AgentConfigInput, ConversationLog } from './types';

/**
 * Busca configuração do agente para uma instância específica
 */
export async function getAgentConfig(
  workspaceId: number,
  instanceName: string
): Promise<AgentConfig | null> {
  try {
    return await withTenant(workspaceId, async (client) => {
      const { rows } = await client.query(
        `SELECT
          id,
          workspace_id,
          instance_name,
          is_active,
          agent_name,
          agent_role,
          personality,
          trait_openness,
          trait_conscientiousness,
          trait_extraversion,
          trait_agreeableness,
          trait_neuroticism,
          greeting_message,
          fallback_message,
          escalation_message,
          out_of_hours_message,
          auto_reply,
          typing_delay_ms,
          max_message_length,
          business_hours_only,
          business_hours_start,
          business_hours_end,
          business_days,
          escalation_keywords,
          escalation_frustration_threshold,
          use_psychological_analysis,
          use_proactive_messages,
          metadata,
          created_at,
          updated_at,
          created_by
        FROM agent_configs
        WHERE workspace_id = $1 AND instance_name = $2
        LIMIT 1`,
        [workspaceId, instanceName]
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return mapRowToAgentConfig(row);
    });
  } catch (error) {
    console.error('[AgentConfig] Error fetching config:', error);
    return null;
  }
}

/**
 * Busca todas as configurações de agentes de um tenant
 */
export async function getAgentConfigs(workspaceId: number): Promise<AgentConfig[]> {
  try {
    return await withTenant(workspaceId, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM agent_configs WHERE workspace_id = $1 ORDER BY created_at DESC`,
        [workspaceId]
      );

      return rows.map(mapRowToAgentConfig);
    });
  } catch (error) {
    console.error('[AgentConfig] Error fetching configs:', error);
    return [];
  }
}

/**
 * Cria ou atualiza configuração do agente (upsert)
 */
export async function upsertAgentConfig(
  workspaceId: number,
  input: AgentConfigInput,
  userId?: string
): Promise<AgentConfig | null> {
  try {
    return await withTenant(workspaceId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO agent_configs (
          workspace_id,
          instance_name,
          is_active,
          agent_name,
          agent_role,
          personality,
          trait_openness,
          trait_conscientiousness,
          trait_extraversion,
          trait_agreeableness,
          trait_neuroticism,
          greeting_message,
          fallback_message,
          escalation_message,
          out_of_hours_message,
          auto_reply,
          typing_delay_ms,
          max_message_length,
          business_hours_only,
          business_hours_start,
          business_hours_end,
          business_days,
          escalation_keywords,
          escalation_frustration_threshold,
          use_psychological_analysis,
          use_proactive_messages,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        ON CONFLICT (workspace_id, instance_name)
        DO UPDATE SET
          is_active = COALESCE(EXCLUDED.is_active, agent_configs.is_active),
          agent_name = COALESCE(EXCLUDED.agent_name, agent_configs.agent_name),
          agent_role = COALESCE(EXCLUDED.agent_role, agent_configs.agent_role),
          personality = COALESCE(EXCLUDED.personality, agent_configs.personality),
          trait_openness = COALESCE(EXCLUDED.trait_openness, agent_configs.trait_openness),
          trait_conscientiousness = COALESCE(EXCLUDED.trait_conscientiousness, agent_configs.trait_conscientiousness),
          trait_extraversion = COALESCE(EXCLUDED.trait_extraversion, agent_configs.trait_extraversion),
          trait_agreeableness = COALESCE(EXCLUDED.trait_agreeableness, agent_configs.trait_agreeableness),
          trait_neuroticism = COALESCE(EXCLUDED.trait_neuroticism, agent_configs.trait_neuroticism),
          greeting_message = COALESCE(EXCLUDED.greeting_message, agent_configs.greeting_message),
          fallback_message = COALESCE(EXCLUDED.fallback_message, agent_configs.fallback_message),
          escalation_message = COALESCE(EXCLUDED.escalation_message, agent_configs.escalation_message),
          out_of_hours_message = COALESCE(EXCLUDED.out_of_hours_message, agent_configs.out_of_hours_message),
          auto_reply = COALESCE(EXCLUDED.auto_reply, agent_configs.auto_reply),
          typing_delay_ms = COALESCE(EXCLUDED.typing_delay_ms, agent_configs.typing_delay_ms),
          max_message_length = COALESCE(EXCLUDED.max_message_length, agent_configs.max_message_length),
          business_hours_only = COALESCE(EXCLUDED.business_hours_only, agent_configs.business_hours_only),
          business_hours_start = COALESCE(EXCLUDED.business_hours_start, agent_configs.business_hours_start),
          business_hours_end = COALESCE(EXCLUDED.business_hours_end, agent_configs.business_hours_end),
          business_days = COALESCE(EXCLUDED.business_days, agent_configs.business_days),
          escalation_keywords = COALESCE(EXCLUDED.escalation_keywords, agent_configs.escalation_keywords),
          escalation_frustration_threshold = COALESCE(EXCLUDED.escalation_frustration_threshold, agent_configs.escalation_frustration_threshold),
          use_psychological_analysis = COALESCE(EXCLUDED.use_psychological_analysis, agent_configs.use_psychological_analysis),
          use_proactive_messages = COALESCE(EXCLUDED.use_proactive_messages, agent_configs.use_proactive_messages),
          updated_at = NOW()
        RETURNING *`,
        [
          workspaceId,
          input.instanceName,
          input.isActive ?? false,
          input.agentName ?? 'Sofia',
          input.agentRole ?? 'Assistente de vendas e suporte',
          input.personality ?? 'amigavel',
          input.traits?.openness ?? 80,
          input.traits?.conscientiousness ?? 90,
          input.traits?.extraversion ?? 70,
          input.traits?.agreeableness ?? 90,
          input.traits?.neuroticism ?? 20,
          input.greetingMessage,
          input.fallbackMessage,
          input.escalationMessage,
          input.outOfHoursMessage,
          input.autoReply ?? true,
          input.typingDelayMs ?? 1500,
          input.maxMessageLength ?? 500,
          input.businessHours?.enabled ?? false,
          input.businessHours?.start ?? '08:00',
          input.businessHours?.end ?? '18:00',
          input.businessHours?.days ?? [1, 2, 3, 4, 5],
          input.escalationKeywords ?? ['gerente', 'humano', 'atendente'],
          input.escalationFrustrationThreshold ?? 7,
          input.usePsychologicalAnalysis ?? false,
          input.useProactiveMessages ?? false,
          userId,
        ]
      );

      if (rows.length === 0) {
        return null;
      }

      return mapRowToAgentConfig(rows[0]);
    });
  } catch (error) {
    console.error('[AgentConfig] Error upserting config:', error);
    throw error;
  }
}

/**
 * Ativa ou desativa um agente
 */
export async function toggleAgentActive(
  workspaceId: number,
  instanceName: string,
  isActive: boolean
): Promise<boolean> {
  try {
    return await withTenant(workspaceId, async (client) => {
      const { rowCount } = await client.query(
        `UPDATE agent_configs
         SET is_active = $3, updated_at = NOW()
         WHERE workspace_id = $1 AND instance_name = $2`,
        [workspaceId, instanceName, isActive]
      );

      return (rowCount ?? 0) > 0;
    });
  } catch (error) {
    console.error('[AgentConfig] Error toggling active:', error);
    return false;
  }
}

/**
 * Verifica se está dentro do horário de funcionamento
 */
export function isWithinBusinessHours(config: AgentConfig): boolean {
  if (!config.businessHours.enabled) {
    return true; // Sem restrição de horário
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  // Verifica dia da semana
  if (!config.businessHours.days.includes(currentDay)) {
    return false;
  }

  // Verifica horário
  const { start, end } = config.businessHours;
  return currentTime >= start && currentTime <= end;
}

/**
 * Verifica se a mensagem contém palavras de escalação
 */
export function shouldEscalate(config: AgentConfig, message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return config.escalationKeywords.some(keyword =>
    lowerMessage.includes(keyword.toLowerCase())
  );
}

/**
 * Registra log de conversa
 */
export async function logConversation(
  workspaceId: number,
  data: {
    agentConfigId?: string;
    instanceName: string;
    phoneNumber: string;
    leadId?: number;
    sessionId?: string;
    messageReceived: string;
    messageType?: string;
    intentDetected?: string;
    intentConfidence?: number;
    sentiment?: string;
    frustrationLevel?: number;
    responseGenerated?: string;
    responseSent?: boolean;
    responseTimeMs?: number;
    wasEscalated?: boolean;
    escalationReason?: string;
  }
): Promise<void> {
  try {
    await withTenant(workspaceId, async (client) => {
      await client.query(
        `INSERT INTO agent_conversation_logs (
          workspace_id, agent_config_id, instance_name, phone_number, lead_id,
          session_id, message_received, message_type, intent_detected,
          intent_confidence, sentiment, frustration_level, response_generated,
          response_sent, response_time_ms, was_escalated, escalation_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          workspaceId,
          data.agentConfigId,
          data.instanceName,
          data.phoneNumber,
          data.leadId,
          data.sessionId,
          data.messageReceived,
          data.messageType ?? 'text',
          data.intentDetected,
          data.intentConfidence,
          data.sentiment,
          data.frustrationLevel,
          data.responseGenerated,
          data.responseSent ?? false,
          data.responseTimeMs,
          data.wasEscalated ?? false,
          data.escalationReason,
        ]
      );
    });
  } catch (error) {
    console.error('[AgentConfig] Error logging conversation:', error);
  }
}

/**
 * Deleta configuração de agente
 */
export async function deleteAgentConfig(
  workspaceId: number,
  instanceName: string
): Promise<boolean> {
  try {
    return await withTenant(workspaceId, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM agent_configs
         WHERE workspace_id = $1 AND instance_name = $2`,
        [workspaceId, instanceName]
      );

      return (rowCount ?? 0) > 0;
    });
  } catch (error) {
    console.error('[AgentConfig] Error deleting config:', error);
    return false;
  }
}

/**
 * Busca logs de conversa com paginação
 */
export async function getConversationLogs(
  workspaceId: number,
  instanceName: string,
  options: {
    page?: number;
    limit?: number;
    phoneNumber?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{ logs: ConversationLog[]; total: number; page: number; limit: number }> {
  try {
    return await withTenant(workspaceId, async (client) => {
      const { page = 1, limit = 20, phoneNumber, startDate, endDate } = options;
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions = ['workspace_id = $1', 'instance_name = $2'];
      const params: (number | string)[] = [workspaceId, instanceName];
      let paramIndex = 3;

      if (phoneNumber) {
        conditions.push(`phone_number = $${paramIndex}`);
        params.push(phoneNumber);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM agent_conversation_logs WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Get paginated logs
      const { rows } = await client.query(
        `SELECT * FROM agent_conversation_logs
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const logs = rows.map(mapRowToConversationLog);

      return { logs, total, page, limit };
    });
  } catch (error) {
    console.error('[AgentConfig] Error fetching conversation logs:', error);
    return { logs: [], total: 0, page: 1, limit: 20 };
  }
}

/**
 * Mapeia row do banco para ConversationLog
 */
function mapRowToConversationLog(row: Record<string, unknown>): ConversationLog {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as number,
    agentConfigId: row.agent_config_id as string | undefined,
    instanceName: row.instance_name as string,
    phoneNumber: row.phone_number as string,
    leadId: row.lead_id as number | undefined,
    sessionId: row.session_id as string | undefined,
    messageReceived: row.message_received as string,
    messageType: row.message_type as string,
    intentDetected: row.intent_detected as string | undefined,
    intentConfidence: row.intent_confidence as number | undefined,
    sentiment: row.sentiment as string | undefined,
    frustrationLevel: row.frustration_level as number | undefined,
    responseGenerated: row.response_generated as string | undefined,
    responseSent: row.response_sent as boolean,
    responseTimeMs: row.response_time_ms as number | undefined,
    wasEscalated: row.was_escalated as boolean,
    escalationReason: row.escalation_reason as string | undefined,
    createdAt: row.created_at as string,
  };
}

/**
 * Mapeia row do banco para AgentConfig
 */
function mapRowToAgentConfig(row: Record<string, unknown>): AgentConfig {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as number,
    instanceName: row.instance_name as string,
    isActive: row.is_active as boolean,
    agentName: row.agent_name as string,
    agentRole: row.agent_role as string,
    personality: row.personality as AgentConfig['personality'],
    traits: {
      openness: row.trait_openness as number,
      conscientiousness: row.trait_conscientiousness as number,
      extraversion: row.trait_extraversion as number,
      agreeableness: row.trait_agreeableness as number,
      neuroticism: row.trait_neuroticism as number,
    },
    greetingMessage: row.greeting_message as string,
    fallbackMessage: row.fallback_message as string,
    escalationMessage: row.escalation_message as string,
    outOfHoursMessage: row.out_of_hours_message as string,
    autoReply: row.auto_reply as boolean,
    typingDelayMs: row.typing_delay_ms as number,
    maxMessageLength: row.max_message_length as number,
    businessHours: {
      enabled: row.business_hours_only as boolean,
      start: row.business_hours_start as string,
      end: row.business_hours_end as string,
      days: row.business_days as number[],
    },
    escalationKeywords: row.escalation_keywords as string[],
    escalationFrustrationThreshold: row.escalation_frustration_threshold as number,
    usePsychologicalAnalysis: row.use_psychological_analysis as boolean,
    useProactiveMessages: row.use_proactive_messages as boolean,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string | undefined,
  };
}
