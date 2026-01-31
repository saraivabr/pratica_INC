/**
 * Sofia - Sistema Conversacional da Pratica Incorporadora
 *
 * Modulo principal que exporta todas as funcionalidades da assistente virtual Sofia.
 * Este arquivo serve como ponto de entrada unico para todos os recursos da Sofia.
 */

// ============================================================================
// PERSONA E CONFIGURACOES
// ============================================================================

export {
  SOFIA,
  MESSAGE_LIMITS,
  buildSofiaSystemPrompt,
  getTypingDelay,
  delay,
  getPersonaByUser,
  getPersonaByUserSync,
  getCorretorStats,
  type PersonaConfig,
  type PersonaTracos,
  type PersonaDiretrizes,
  type PersonaAdaptada,
  type TomComunicacao,
  type NivelDetalhe,
  type CorretorStats,
  type UserForPersona,
} from './persona';

// ============================================================================
// TEMPLATES DE RESPOSTAS
// ============================================================================

export {
  ONBOARDING,
  SAUDACOES,
  BUSCA,
  SIMULACAO,
  TABELA,
  SUPORTE,
  FEEDBACK,
  NAO_CADASTRADO,
  CADASTRO,
  getSaudacaoHorario,
  splitMessage,
} from './responses';

// ============================================================================
// SISTEMA DE INTENTS
// ============================================================================

export {
  detectIntent,
  isSimpleGreeting,
  isHumanRequest,
  type Intent,
  type IntentCategory,
  type IntentResult,
  type ExtractedEntities,
} from './intents';

// ============================================================================
// ANALISE DE SENTIMENTO
// ============================================================================

export {
  analyzeSentiment,
  shouldEscalate,
  decayFrustration,
  getSentimentEmoji,
  getEmpathyMessage,
  type Sentiment,
  type SentimentAnalysis,
  type SentimentRecommendations,
} from './sentiment';

// ============================================================================
// GERENCIAMENTO DE CONTEXTO
// ============================================================================

export {
  createNewContext,
  updateContext,
  escalateContext,
  clearEntities,
  getOrCreateConversation,
  saveConversation,
  addMessage,
  isInActiveFlow,
  isWarmContext,
  formatMessagesForPrompt,
  getContextSummary,
  type FlowType,
  type ConversationContext,
  type ConversationMessage,
} from './context';

// ============================================================================
// FLUXOS CONVERSACIONAIS
// ============================================================================

export {
  processMessage,
  handleOnboarding,
  handleUnregisteredUser,
  handleUnregisteredUserConversation,
} from './flows';

// ============================================================================
// FAQ DINAMICO
// ============================================================================

export {
  FAQ,
  buscarNoFAQ,
  listarPerguntasCategoria,
  listarCategorias,
  type FAQCategory,
  type FAQData,
} from './faq';

// ============================================================================
// BASE DE CONHECIMENTO
// ============================================================================

export {
  KNOWLEDGE,
  POLITICAS,
  ARGUMENTOS_VENDA,
  DIFERENCIAIS_PRATICA,
  type Knowledge,
  type Politicas,
  type PoliticaReserva,
  type PoliticaComissao,
  type PoliticaDesconto,
  type ArgumentosVenda,
  type ArgumentoVenda,
  type DiferenciaisPratica,
  type Diferencial,
} from './knowledge';

// ============================================================================
// CONSULTAS CV CRM
// ============================================================================

export {
  getLeadsByCorretor,
  getReservaStatus,
  getComissoesCorretor,
  getProximasAtividades,
  getRankingEquipe,
  getMetasCorretor,
  formatCurrency,
  getCorretorIdByUserId,
  type Lead as CvCrmLead,
  type ReservaStatus,
  type Comissao,
  type Atividade as CvCrmAtividade,
  type RankingCorretor,
  type MetaCorretor,
} from './cvcrm-queries';

// ============================================================================
// ACOES EXECUTAVEIS
// ============================================================================

export {
  agendarVisita,
  enviarMaterial,
  criarLembrete,
  escalarParaGerente,
  validarHorario,
  validarTelefone,
  formatarTelefone,
  type AgendarVisitaResult,
  type EnviarMaterialResult,
  type CriarLembreteResult,
  type EscalarParaGerenteResult,
} from './actions';

// ============================================================================
// SISTEMA PROATIVO
// ============================================================================

export {
  PROACTIVE_TRIGGERS,
  checkProactiveTriggers,
  getProactiveMessage,
  getProactiveMessagesForUser,
  markTriggerShown,
  type ProactiveTrigger,
  type TriggerData,
  type Lead as ProactiveLead,
  type MetaInfo,
  type Empreendimento,
  type Atividade as ProactiveAtividade,
  type Venda,
  type ProactiveMessage,
  type TriggerCheckResult,
} from './proactive';

// ============================================================================
// MEMORIA DE LONGO PRAZO
// ============================================================================

export {
  getUserMemory,
  updateUserMemory,
  learnFromInteraction,
  getSuggestedEmpreendimentos,
  isUserActiveHours,
  getMemorySummary,
  CREATE_TABLE_SQL,
  type UserPreferences,
  type UserHistory,
  type UserBehavior,
  type UserMemory,
  type Interaction,
} from './user-memory';

// ============================================================================
// RAG (RETRIEVAL-AUGMENTED GENERATION)
// ============================================================================

// Re-exporta todo o modulo RAG
export * from './rag';

// Export nomeado das funcoes principais do RAG
export {
  searchSimilar,
  reindexAll,
  retrieveContext,
  generateEmbedding,
  storeEmbedding,
  indexFAQ,
  indexKnowledge,
  indexEmpreendimentos,
  getIndexStats,
  buildRAGPrompt,
  getRelevantKnowledge,
  shouldUseRAG,
} from './rag';

// ============================================================================
// EXPORT DEFAULT - FUNCOES PRINCIPAIS
// ============================================================================

import { processMessage } from './flows';
import { detectIntent } from './intents';
import { analyzeSentiment } from './sentiment';
import { buildSofiaSystemPrompt, getPersonaByUser } from './persona';

/**
 * Funcoes principais da Sofia exportadas como default
 * Para uso simplificado: import Sofia from '@/lib/sofia'
 */
const Sofia = {
  /**
   * Processa uma mensagem do usuario e retorna a resposta da Sofia
   */
  processMessage,

  /**
   * Detecta a intencao do usuario a partir da mensagem
   */
  detectIntent,

  /**
   * Analisa o sentimento da mensagem do usuario
   */
  analyzeSentiment,

  /**
   * Constroi o system prompt personalizado para a Sofia
   */
  buildSofiaSystemPrompt,

  /**
   * Retorna persona adaptada ao perfil do usuario
   */
  getPersonaByUser,
};

export default Sofia;
