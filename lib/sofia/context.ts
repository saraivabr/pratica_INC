/**
 * Gerenciamento de Contexto da Conversa
 *
 * Persiste estado entre mensagens para continuidade
 */

import { dbQuery } from '@/lib/db';
import type { Sentiment } from './sentiment';
import type { Intent, IntentCategory, ExtractedEntities } from './intents';

// ============================================
// TIPOS
// ============================================

export type FlowType =
  | 'onboarding'
  | 'search'
  | 'simulate'
  | 'price_table'
  | 'material'
  | 'support'
  | 'general'
  | 'metas'
  | 'concorrencia'
  | 'status'
  | 'campanha'
  | 'ajuda_app'
  | 'comissao'
  | 'objecao'
  | 'venda_imovel'
  | null;

export interface ConversationContext {
  // Identificação
  session_id: string;
  user_id: string;
  started_at: string;
  last_activity: string;

  // Estado atual do fluxo
  current_flow: FlowType;
  current_step: number;
  awaiting_response: string | null;

  // Entidades coletadas durante a conversa
  entities: ExtractedEntities & {
    cliente_nome?: string;
  };

  // Histórico
  topics_discussed: string[];
  last_intent: Intent | null;
  last_category: IntentCategory | null;

  // Sentimento
  sentiment_history: Sentiment[];
  frustration_level: number;

  // Flags de controle
  escalated: boolean;
  escalated_to?: string;
  escalated_at?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: Intent;
  sentiment?: Sentiment;
}

// ============================================
// FUNÇÕES DE CONTEXTO
// ============================================

/**
 * Cria um novo contexto de conversa
 */
export function createNewContext(userId: string): ConversationContext {
  return {
    session_id: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    user_id: userId,
    started_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),

    current_flow: null,
    current_step: 0,
    awaiting_response: null,

    entities: {},

    topics_discussed: [],
    last_intent: null,
    last_category: null,

    sentiment_history: [],
    frustration_level: 0,

    escalated: false,
  };
}

/**
 * Atualiza o contexto com nova mensagem
 */
export function updateContext(
  context: ConversationContext,
  updates: {
    intent?: Intent;
    category?: IntentCategory;
    sentiment?: Sentiment;
    entities?: ExtractedEntities;
    flow?: FlowType;
    step?: number;
    awaiting?: string | null;
    frustration?: number;
    topic?: string;
  }
): ConversationContext {
  const updated = { ...context };

  updated.last_activity = new Date().toISOString();

  if (updates.intent) {
    updated.last_intent = updates.intent;
  }

  if (updates.category) {
    updated.last_category = updates.category;
  }

  if (updates.sentiment) {
    updated.sentiment_history = [
      ...updated.sentiment_history.slice(-9),
      updates.sentiment,
    ];
  }

  if (updates.entities) {
    updated.entities = { ...updated.entities, ...updates.entities };
  }

  if (updates.flow !== undefined) {
    updated.current_flow = updates.flow;
  }

  if (updates.step !== undefined) {
    updated.current_step = updates.step;
  }

  if (updates.awaiting !== undefined) {
    updated.awaiting_response = updates.awaiting;
  }

  if (updates.frustration !== undefined) {
    updated.frustration_level = updates.frustration;
  }

  if (updates.topic && !updated.topics_discussed.includes(updates.topic)) {
    updated.topics_discussed = [
      ...updated.topics_discussed.slice(-9),
      updates.topic,
    ];
  }

  return updated;
}

/**
 * Marca conversa como escalada
 */
export function escalateContext(
  context: ConversationContext,
  escalatedTo: string
): ConversationContext {
  return {
    ...context,
    escalated: true,
    escalated_to: escalatedTo,
    escalated_at: new Date().toISOString(),
  };
}

/**
 * Limpa entidades coletadas (para novo fluxo)
 */
export function clearEntities(
  context: ConversationContext
): ConversationContext {
  return {
    ...context,
    entities: {},
    current_step: 0,
  };
}

// ============================================
// PERSISTÊNCIA NO SUPABASE
// ============================================

/**
 * Busca ou cria conversa do dia para o usuário
 */
export async function getOrCreateConversation(userId: string, workspaceId?: number): Promise<{
  id: string;
  messages: ConversationMessage[];
  context: ConversationContext;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tentar buscar conversa existente do dia (com isolamento workspace)
  const query = workspaceId
    ? `select * from conversations
       where user_id = $1 and workspace_id = $2 and created_at >= date_trunc('day', now())
       order by created_at desc
       limit 1`
    : `select * from conversations
       where user_id = $1 and created_at >= date_trunc('day', now())
       order by created_at desc
       limit 1`;
  const params = workspaceId ? [userId, workspaceId] : [userId];

  const { rows: existingRows } = await dbQuery(query, params);
  const existing = existingRows[0];

  if (existing) {
    const messages = typeof existing.messages === "string" ? JSON.parse(existing.messages) : existing.messages;
    const context = typeof existing.context === "string" ? JSON.parse(existing.context) : existing.context;
    return {
      id: existing.id,
      messages: messages || [],
      context: context || createNewContext(userId),
    };
  }

  // Criar nova conversa (incluindo workspace_id)
  const newContext = createNewContext(userId);
  const insertQuery = workspaceId
    ? `insert into conversations (user_id, workspace_id, messages, context)
       values ($1, $2, $3, $4)
       returning *`
    : `insert into conversations (user_id, messages, context)
       values ($1, $2, $3)
       returning *`;
  const insertParams = workspaceId
    ? [userId, workspaceId, JSON.stringify([]), JSON.stringify(newContext)]
    : [userId, JSON.stringify([]), JSON.stringify(newContext)];

  const { rows: newConvRows } = await dbQuery(insertQuery, insertParams);
  const newConv = newConvRows[0];

  if (!newConv) {
    console.error('Error creating conversation');
    return {
      id: '',
      messages: [],
      context: newContext,
    };
  }

  return {
    id: newConv.id,
    messages: [],
    context: newContext,
  };
}

/**
 * Salva conversa no Supabase
 */
export async function saveConversation(
  conversationId: string,
  messages: ConversationMessage[],
  context: ConversationContext
): Promise<void> {
  if (!conversationId) return;

  await dbQuery(
    `update conversations
     set messages = $1, context = $2, updated_at = now()
     where id = $3`,
    [JSON.stringify(messages), JSON.stringify(context), conversationId]
  );
}

/**
 * Adiciona mensagem à conversa
 */
export function addMessage(
  messages: ConversationMessage[],
  role: 'user' | 'assistant',
  content: string,
  extras?: { intent?: Intent; sentiment?: Sentiment }
): ConversationMessage[] {
  return [
    ...messages,
    {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...extras,
    },
  ];
}

// ============================================
// UTILITÁRIOS DE CONTEXTO
// ============================================

/**
 * Verifica se está em um fluxo ativo
 */
export function isInActiveFlow(context: ConversationContext): boolean {
  return context.current_flow !== null && context.awaiting_response !== null;
}

/**
 * Verifica se o contexto está "quente" (atividade recente)
 */
export function isWarmContext(context: ConversationContext): boolean {
  const lastActivity = new Date(context.last_activity);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastActivity.getTime()) / 1000 / 60;
  return diffMinutes < 30; // Considera quente se menos de 30 min
}

/**
 * Formata histórico de mensagens para o prompt
 */
export function formatMessagesForPrompt(
  messages: ConversationMessage[],
  limit = 6
): string {
  return messages
    .slice(-limit)
    .map((m) => `${m.role === 'user' ? 'Usuário' : 'Sofia'}: ${m.content}`)
    .join('\n');
}

/**
 * Obtém resumo do contexto atual
 */
export function getContextSummary(context: ConversationContext): string {
  const parts: string[] = [];

  if (context.current_flow) {
    parts.push(`Fluxo atual: ${context.current_flow}`);
  }

  if (context.awaiting_response) {
    parts.push(`Aguardando: ${context.awaiting_response}`);
  }

  if (context.entities.valor) {
    parts.push(`Valor: R$ ${context.entities.valor.toLocaleString('pt-BR')}`);
  }

  if (context.entities.quartos) {
    parts.push(`Quartos: ${context.entities.quartos}`);
  }

  if (context.frustration_level > 5) {
    parts.push(`⚠️ Frustração: ${context.frustration_level}/10`);
  }

  return parts.join(' | ');
}
