import "server-only";
import {
  searchSimilar,
  type SearchResult,
  type SourceType,
  type EmbeddingMetadata,
} from "./embeddings";

export interface RAGContext {
  query: string;
  results: SearchResult[];
  contextText: string;
}

const DEFAULT_WEIGHTS: Record<SourceType, number> = {
  faq: 1.0,
  knowledge: 0.9,
  empreendimento: 0.95,
  policy: 0.85,
  conversation: 0.7,
};

export async function retrieveContext(
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    sourceType?: SourceType;
    metadataFilter?: EmbeddingMetadata;
    maxChars?: number;
  }
): Promise<RAGContext> {
  const results = await searchSimilar(query, {
    limit: options?.limit ?? 6,
    threshold: options?.threshold ?? 0.72,
    sourceType: options?.sourceType,
    metadataFilter: options?.metadataFilter,
  });

  const weighted = results
    .map((result) => ({
      ...result,
      weightedScore: result.similarity * (DEFAULT_WEIGHTS[result.source_type] || 1),
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const maxChars = options?.maxChars ?? 3000;
  let usedChars = 0;
  const contextLines: string[] = [];

  for (const result of weighted) {
    const line = `[${result.source_type}] ${result.content}`.trim();
    if (!line) continue;
    if (usedChars + line.length > maxChars) break;
    contextLines.push(line);
    usedChars += line.length;
  }

  return {
    query,
    results: weighted,
    contextText: contextLines.join("\n\n"),
  };
}

export function buildRAGPrompt(context: RAGContext, query?: string): string {
  if (!context.contextText) return "";
  return [
    "CONHECIMENTO RELEVANTE (use apenas se for pertinente):",
    context.contextText,
    query ? `PERGUNTA DO USUARIO: ${query}` : "",
    "Responda com base no conhecimento acima. Se algo nao estiver claro, faca uma pergunta curta para esclarecer.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getRelevantKnowledge(
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    sourceType?: SourceType;
    metadataFilter?: EmbeddingMetadata;
  }
): Promise<string> {
  const context = await retrieveContext(query, options);
  return context.contextText;
}

export function shouldUseRAG(text: string): boolean {
  const input = text.toLowerCase().trim();
  if (!input || input.length < 8) return false;

  const greetings = [
    "oi",
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "tudo bem",
    "e ai",
    "e aí",
  ];
  if (greetings.some((g) => input === g || input.startsWith(`${g} `))) {
    return false;
  }

  return true;
}
