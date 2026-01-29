/**
 * RAG (Retrieval-Augmented Generation) Module
 *
 * Este modulo fornece funcionalidades de RAG para a Sofia,
 * incluindo embeddings, indexacao e recuperacao de contexto.
 */

// ============================================================================
// Embeddings - Geracao e busca de embeddings vetoriais
// ============================================================================
export {
  generateEmbedding,
  storeEmbedding,
  searchSimilar,
  updateEmbedding,
  deleteEmbedding,
  bulkStoreEmbeddings,
} from './embeddings';

export type {
  EmbeddingDocument,
  SearchResult,
  EmbeddingMetadata,
} from './embeddings';

// ============================================================================
// Indexer - Indexacao de documentos e conhecimento
// ============================================================================
export {
  indexFAQ,
  indexKnowledge,
  indexEmpreendimentos,
  indexResponses,
  reindexAll,
  getIndexStats,
} from './indexer';

// ============================================================================
// Retriever - Recuperacao de contexto para RAG
// ============================================================================
export {
  retrieveContext,
  buildRAGPrompt,
  getRelevantKnowledge,
  shouldUseRAG,
} from './retriever';

export type { RAGContext } from './retriever';

// ============================================================================
// Importacoes para o objeto RAG default
// ============================================================================
import { searchSimilar } from './embeddings';
import { reindexAll, getIndexStats } from './indexer';
import { retrieveContext } from './retriever';

// ============================================================================
// Objeto RAG - Interface principal para uso simplificado
// ============================================================================
/**
 * Objeto principal do modulo RAG com as funcoes mais utilizadas.
 *
 * @example
 * ```typescript
 * import RAG from '@/lib/sofia/rag';
 *
 * // Buscar documentos similares
 * const results = await RAG.search('pergunta do usuario');
 *
 * // Reindexar toda a base de conhecimento
 * await RAG.index();
 *
 * // Recuperar contexto para uma pergunta
 * const context = await RAG.retrieve('pergunta do usuario');
 *
 * // Obter estatisticas dos indices
 * const stats = await RAG.stats();
 * ```
 */
const RAG = {
  /**
   * Busca documentos similares usando embeddings vetoriais.
   * @param query - Texto para busca
   * @param options - Opcoes de busca (limit, threshold, filter)
   * @returns Array de resultados ordenados por similaridade
   */
  search: searchSimilar,

  /**
   * Reindexa toda a base de conhecimento.
   * Inclui FAQs, conhecimento, empreendimentos e respostas.
   * @returns Resultado da reindexacao
   */
  index: reindexAll,

  /**
   * Recupera contexto relevante para uma pergunta.
   * Usado para construir prompts com RAG.
   * @param query - Pergunta do usuario
   * @param options - Opcoes de recuperacao
   * @returns Contexto formatado para o prompt
   */
  retrieve: retrieveContext,

  /**
   * Retorna estatisticas dos indices RAG.
   * @returns Objeto com contagens e metricas dos indices
   */
  stats: getIndexStats,
};

export default RAG;
