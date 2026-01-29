/**
 * @fileoverview Tipos TypeScript para o sistema de sincronizacao WhatsApp
 * @module lib/whatsapp-sync/types
 * @description Define interfaces e tipos para chats sincronizados, contatos,
 * execucoes de sync e integracao com a Evolution API.
 */

// =============================================================================
// TIPOS DE STATUS
// =============================================================================

/**
 * Potencial de recuperacao de um lead baseado na analise do historico
 * @description Classificacao automatica do potencial de recuperar o lead
 * - alto: Lead com grande chance de conversao (resposta recente, interesse demonstrado)
 * - medio: Lead com potencial moderado (alguma interacao, mas sem compromisso)
 * - baixo: Lead com baixa probabilidade (pouca interacao, muito tempo sem resposta)
 * - none: Sem potencial identificado ou conversa encerrada
 */
export type RecoveryPotential = 'alto' | 'medio' | 'baixo' | 'none';

/**
 * Status de uma execucao de sincronizacao
 * @description Indica o estado atual do processo de sync
 * - running: Sincronizacao em andamento
 * - completed: Sincronizacao finalizada com sucesso
 * - failed: Sincronizacao falhou com erro
 */
export type SyncRunStatus = 'running' | 'completed' | 'failed';

// =============================================================================
// CHAT SINCRONIZADO
// =============================================================================

/**
 * Chat sincronizado do WhatsApp
 * @description Representa uma conversa sincronizada da Evolution API,
 * com dados de matching de leads e analise de recuperacao
 */
export interface WhatsAppSyncedChat {
  /** Identificador unico do chat no banco de dados */
  id: number;
  /** ID do tenant (imobiliaria) */
  tenant_id: number;
  /** JID remoto do WhatsApp (identificador unico da conversa) */
  remote_jid: string;
  /** Numero de telefone extraido do JID */
  phone_number: string;
  /** Nome do contato no WhatsApp (pode ser null se nao disponivel) */
  contact_name: string | null;
  /** Indica se e um chat de grupo */
  is_group: boolean;
  /** Timestamp da ultima mensagem (ISO string) */
  last_message_at: string | null;
  /** Texto da ultima mensagem (preview) */
  last_message_text: string | null;
  /** Indica se a ultima mensagem foi enviada pelo corretor */
  last_message_from_me: boolean;
  /** Quantidade de mensagens nao lidas */
  unread_count: number;
  /** Total de mensagens na conversa */
  total_messages: number;

  // ---------------------------------------------------------------------------
  // Campos de analise
  // ---------------------------------------------------------------------------

  /** ID do lead correspondente no CV CRM (se encontrado) */
  matched_lead_id: string | null;
  /** Nome do lead correspondente (para referencia rapida) */
  matched_lead_name: string | null;
  /** Dias sem resposta do lead (null se nao aplicavel) */
  days_without_response: number | null;
  /** Potencial de recuperacao calculado */
  recovery_potential: RecoveryPotential | null;
  /** Mensagem sugerida pelo sistema para reengajar o lead */
  suggested_message: string | null;

  // ---------------------------------------------------------------------------
  // Campos de controle
  // ---------------------------------------------------------------------------

  /** Timestamp da ultima sincronizacao (ISO string) */
  synced_at: string;
  /** Timestamp da ultima analise (ISO string, null se nunca analisado) */
  analyzed_at: string | null;
}

// =============================================================================
// CONTATO SINCRONIZADO
// =============================================================================

/**
 * Contato sincronizado do WhatsApp
 * @description Representa um contato da agenda do WhatsApp sincronizado
 * da Evolution API, com informacoes de matching com leads
 */
export interface WhatsAppSyncedContact {
  /** Identificador unico do contato no banco de dados */
  id: number;
  /** ID do tenant (imobiliaria) */
  tenant_id: number;
  /** JID remoto do WhatsApp (identificador unico do contato) */
  remote_jid: string;
  /** Numero de telefone extraido do JID */
  phone_number: string;
  /** Nome de exibicao no WhatsApp (push name) */
  push_name: string | null;
  /** URL da foto de perfil (pode expirar) */
  profile_picture_url: string | null;
  /** Indica se e uma conta Business */
  is_business: boolean;
  /** ID do lead correspondente no CV CRM (se encontrado) */
  matched_lead_id: string | null;
  /** Timestamp da ultima sincronizacao (ISO string) */
  synced_at: string;
}

// =============================================================================
// EXECUCAO DE SYNC (RUN)
// =============================================================================

/**
 * Execucao de sincronizacao do WhatsApp
 * @description Representa uma execucao do processo de sync,
 * com estatisticas e status de conclusao
 */
export interface WhatsAppSyncRun {
  /** Identificador unico da execucao */
  id: number;
  /** ID do tenant (imobiliaria) */
  tenant_id: number;
  /** Status atual da execucao */
  status: SyncRunStatus;
  /** Quantidade de chats sincronizados nesta execucao */
  chats_synced: number;
  /** Quantidade de contatos sincronizados nesta execucao */
  contacts_synced: number;
  /** Quantidade de leads correspondentes encontrados */
  leads_matched: number;
  /** Quantidade de oportunidades de recuperacao identificadas */
  opportunities_found: number;
  /** Mensagem de erro (se status = 'failed') */
  error_message: string | null;
  /** Timestamp de inicio da execucao (ISO string) */
  started_at: string;
  /** Timestamp de conclusao da execucao (ISO string, null se ainda running) */
  completed_at: string | null;
}

// =============================================================================
// EVOLUTION API - TIPOS DE RESPOSTA
// =============================================================================

/**
 * Chat retornado pela Evolution API
 * @description Estrutura de dados de um chat conforme retornado
 * pelo endpoint de listagem de chats da Evolution API
 */
export interface EvolutionChat {
  /** ID interno do chat na Evolution API */
  id: string;
  /** JID remoto do WhatsApp */
  remoteJid: string;
  /** Nome do chat (contato ou grupo) */
  name?: string;
  /** Nome de exibicao no WhatsApp (push name) */
  pushName?: string;
  /** Quantidade de mensagens nao lidas */
  unreadCount?: number;
  /** Ultima mensagem do chat */
  lastMessage?: {
    /** Chave da mensagem */
    key: {
      /** Indica se a mensagem foi enviada pelo usuario */
      fromMe: boolean;
    };
    /** Conteudo da mensagem */
    message?: {
      /** Texto de mensagem simples */
      conversation?: string;
      /** Texto de mensagem extendida (com link preview, etc) */
      extendedTextMessage?: {
        text?: string;
      };
    };
    /** Timestamp Unix da mensagem */
    messageTimestamp?: number;
  };
}

/**
 * Contato retornado pela Evolution API
 * @description Estrutura de dados de um contato conforme retornado
 * pelo endpoint de listagem de contatos da Evolution API
 */
export interface EvolutionContact {
  /** ID interno do contato na Evolution API */
  id: string;
  /** JID remoto do WhatsApp */
  remoteJid: string;
  /** Nome de exibicao no WhatsApp */
  pushName?: string;
  /** URL da foto de perfil */
  profilePictureUrl?: string;
  /** Indica se e uma conta Business */
  isBusiness?: boolean;
}

// =============================================================================
// OPORTUNIDADE DE RECUPERACAO
// =============================================================================

/**
 * Oportunidade de recuperacao de lead
 * @description Representa uma oportunidade identificada pelo sistema
 * para reengajar um lead inativo ou sem resposta
 */
export interface RecoveryOpportunity {
  /** Chat associado a oportunidade */
  chat: WhatsAppSyncedChat;
  /** Dados do lead correspondente (null se nao encontrado no CRM) */
  lead: {
    /** ID do lead no CV CRM */
    idlead: string;
    /** Nome do lead */
    nome: string;
    /** Telefone do lead */
    telefone: string;
    /** Situacao atual do lead no CRM */
    situacao: string;
    /** Empreendimento de interesse (opcional) */
    empreendimento?: string;
  } | null;
  /** Motivo pelo qual foi identificada como oportunidade */
  reason: string;
  /**
   * Prioridade da oportunidade
   * - 1: Alta prioridade (acao imediata recomendada)
   * - 2: Media prioridade (acao em breve)
   * - 3: Baixa prioridade (pode aguardar)
   */
  priority: 1 | 2 | 3;
}

// =============================================================================
// RESULTADO DA ANALISE
// =============================================================================

/**
 * Resultado da analise de sincronizacao
 * @description Resumo consolidado apos uma execucao de sync,
 * com totais e lista de oportunidades identificadas
 */
export interface SyncAnalysisResult {
  /** Total de chats sincronizados */
  total_chats: number;
  /** Total de contatos sincronizados */
  total_contacts: number;
  /** Quantidade de leads correspondentes encontrados */
  leads_matched: number;
  /** Lista de oportunidades de recuperacao identificadas */
  opportunities: RecoveryOpportunity[];
}
