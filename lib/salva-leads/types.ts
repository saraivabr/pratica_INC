/**
 * @fileoverview Tipos TypeScript para o sistema Salva-Leads
 * @module lib/salva-leads/types
 * @description Define interfaces e tipos para conversas, execucoes, tool calls
 * e configuracoes do sistema de recuperacao automatica de leads.
 */

// =============================================================================
// TIPOS DE STATUS
// =============================================================================

/**
 * Status possiveis de uma conversa no Salva-Leads
 */
export type SalvaLeadsConversationStatus =
  | 'pending'
  | 'active'
  | 'paused_by_corretor'
  | 'completed'
  | 'expired';

/**
 * Classificacao da conversa pelo bot
 */
export type SalvaLeadsClassification = 'tem_potencial' | 'encerrada' | null;

/**
 * Status de uma execucao do Salva-Leads
 */
export type SalvaLeadsRunStatus = 'scheduled' | 'running' | 'completed' | 'failed';

/**
 * Status de uma chamada de ferramenta
 */
export type SalvaLeadsToolCallStatus = 'pending' | 'completed' | 'failed';

/**
 * Role de uma mensagem na conversa
 */
export type SalvaLeadsMessageRole = 'user' | 'assistant' | 'system';

// =============================================================================
// MENSAGENS
// =============================================================================

/**
 * Mensagem em uma conversa do Salva-Leads
 * @description Representa uma mensagem individual trocada na conversa
 */
export interface SalvaLeadsMessage {
  /** Role da mensagem (user, assistant, system) */
  role: SalvaLeadsMessageRole;
  /** Conteudo da mensagem */
  content: string;
  /** Timestamp da mensagem (ISO string) */
  timestamp: string;
}

/**
 * Mensagem pendente aguardando envio
 * @description Mensagens que ainda nao foram processadas pelo debounce
 */
export interface SalvaLeadsPendingMessage {
  /** Texto da mensagem */
  text: string;
  /** Timestamp de recebimento (ISO string) */
  timestamp: string;
}

// =============================================================================
// CONVERSA
// =============================================================================

/**
 * Conversa do Salva-Leads
 * @description Representa uma conversa completa entre o bot e um lead
 */
export interface SalvaLeadsConversation {
  /** Identificador unico da conversa */
  id: number;
  /** ID do tenant (imobiliaria) */
  workspace_id: number;
  /** ID do atendimento no CV CRM */
  atendimento_id: string;
  /** Telefone do lead */
  lead_phone: string;
  /** Nome do lead (opcional) */
  lead_name: string | null;
  /** ID do corretor responsavel */
  corretor_id: string;
  /** Telefone do corretor (opcional) */
  corretor_phone: string | null;
  /** Status atual da conversa */
  status: SalvaLeadsConversationStatus;
  /** Classificacao da conversa pelo bot */
  classification: SalvaLeadsClassification;
  /** Contexto adicional da conversa (JSON) */
  context: Record<string, any>;
  /** Historico de mensagens da conversa */
  messages: SalvaLeadsMessage[];
  /** Mensagens pendentes aguardando processamento */
  pending_messages: SalvaLeadsPendingMessage[];
  /** Timestamp ate quando aguardar debounce (ISO string) */
  debounce_until: string | null;
  /** Se o bot esta pausado nesta conversa */
  bot_paused: boolean;
  /** Timestamp de quando o bot foi pausado (ISO string) */
  bot_paused_at: string | null;
  /** Data de criacao (ISO string) */
  created_at: string;
  /** Data de atualizacao (ISO string) */
  updated_at: string;
}

// =============================================================================
// EXECUCAO (RUN)
// =============================================================================

/**
 * Execucao do Salva-Leads
 * @description Representa uma execucao agendada ou realizada do sistema
 */
export interface SalvaLeadsRun {
  /** Identificador unico da execucao */
  id: number;
  /** ID do tenant (opcional, null para execucoes globais) */
  workspace_id: number | null;
  /** ID do corretor (opcional, null para todos os corretores) */
  corretor_id: string | null;
  /** Data/hora agendada para execucao (ISO string) */
  scheduled_for: string;
  /** Status da execucao */
  status: SalvaLeadsRunStatus;
  /** Quantidade de leads processados */
  leads_processed: number;
  /** Quantidade de leads que receberam mensagem */
  leads_sent: number;
  /** Resultados detalhados da execucao */
  results: Array<any>;
  /** Data de criacao (ISO string) */
  created_at: string;
}

// =============================================================================
// TOOL CALLS
// =============================================================================

/**
 * Chamada de ferramenta do Salva-Leads
 * @description Registro de uma ferramenta executada durante a conversa
 */
export interface SalvaLeadsToolCall {
  /** Identificador unico da chamada */
  id: number;
  /** ID da conversa associada */
  conversation_id: number;
  /** Nome da ferramenta chamada */
  tool_name: string;
  /** Parametros de entrada da ferramenta */
  tool_input: Record<string, any> | null;
  /** Resultado da execucao da ferramenta */
  tool_output: Record<string, any> | null;
  /** Status da chamada */
  status: SalvaLeadsToolCallStatus;
  /** Data de criacao (ISO string) */
  created_at: string;
}

/**
 * Definicao de uma ferramenta do Salva-Leads
 * @description Schema para registrar ferramentas disponiveis ao bot
 */
export interface SalvaLeadsToolDefinition {
  /** Nome unico da ferramenta */
  name: string;
  /** Descricao do que a ferramenta faz */
  description: string;
  /** Schema dos parametros (JSON Schema) */
  parameters: Record<string, any>;
  /** Funcao de execucao da ferramenta */
  execute: (
    args: any,
    context: SalvaLeadsConversation,
    workspaceId: number
  ) => Promise<any>;
}

// =============================================================================
// PARAMETROS DE CRIACAO
// =============================================================================

/**
 * Parametros para criar uma nova conversa
 * @description Dados necessarios para iniciar uma conversa no Salva-Leads
 */
export interface CreateConversationParams {
  /** ID do tenant (imobiliaria) */
  workspaceId: number;
  /** ID do atendimento no CV CRM */
  atendimentoId: string;
  /** Telefone do lead */
  leadPhone: string;
  /** Nome do lead (opcional) */
  leadName?: string;
  /** ID do corretor responsavel */
  corretorId: string;
  /** Telefone do corretor (opcional) */
  corretorPhone?: string;
}
