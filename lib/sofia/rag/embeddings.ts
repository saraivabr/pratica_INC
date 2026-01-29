import "server-only";
import OpenAI from "openai";
import { dbQuery } from "@/lib/db";

export type SourceType =
  | "faq"
  | "knowledge"
  | "empreendimento"
  | "policy"
  | "conversation";

export interface EmbeddingMetadata {
  [key: string]: unknown;
}

export interface EmbeddingDocument {
  content: string;
  source_type: SourceType;
  source_id?: string | null;
  metadata?: EmbeddingMetadata;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: EmbeddingMetadata;
  source_type: SourceType;
  source_id: string | null;
  similarity: number;
  created_at: string;
}

let _openai: OpenAI | null = null;
let _hasVectorSupport: boolean | null = null;
let _useVectorStorage: boolean | null = null;
let _useRawStorage: boolean | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

function formatEmbeddingVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

async function hasVectorSupport(): Promise<boolean> {
  if (_hasVectorSupport !== null) return _hasVectorSupport;
  const { rows } = await dbQuery<{ exists: boolean }>(
    "select exists(select 1 from pg_available_extensions where name = 'vector') as exists"
  );
  _hasVectorSupport = Boolean(rows[0]?.exists);
  return _hasVectorSupport;
}

async function hasVectorTable(): Promise<boolean> {
  if (_useVectorStorage !== null) return _useVectorStorage;
  const { rows } = await dbQuery<{ exists: boolean }>(
    "select to_regclass('public.sofia_embeddings') is not null as exists"
  );
  _useVectorStorage = Boolean(rows[0]?.exists);
  return _useVectorStorage;
}

async function hasRawTable(): Promise<boolean> {
  if (_useRawStorage !== null) return _useRawStorage;
  const { rows } = await dbQuery<{ exists: boolean }>(
    "select to_regclass('public.sofia_embeddings_raw') is not null as exists"
  );
  _useRawStorage = Boolean(rows[0]?.exists);
  return _useRawStorage;
}

async function hasMatchFunction(): Promise<boolean> {
  const { rows } = await dbQuery<{ exists: boolean }>(
    "select to_regproc('match_sofia_documents') is not null as exists"
  );
  return Boolean(rows[0]?.exists);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replace(/\s+/g, " ").trim();
  if (!input) {
    throw new Error("Cannot generate embedding for empty text");
  }
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data[0]?.embedding || [];
}

export async function storeEmbedding(
  document: EmbeddingDocument,
  embedding?: number[]
): Promise<string | null> {
  const vector = embedding || (await generateEmbedding(document.content));
  if (!vector.length) return null;
  const vectorSupported = await hasVectorSupport();
  const useVector = vectorSupported && (await hasVectorTable());
  const table = useVector ? "sofia_embeddings" : "sofia_embeddings_raw";

  const { rows } = await dbQuery<{ id: string }>(
    `insert into ${table}
      (content, embedding, metadata, source_type, source_id)
     values ($1, $2${useVector ? "::vector" : "::float8[]"}, $3::jsonb, $4, $5)
     returning id`,
    [
      document.content,
      useVector ? formatEmbeddingVector(vector) : vector,
      JSON.stringify(document.metadata || {}),
      document.source_type,
      document.source_id || null,
    ]
  );
  return rows[0]?.id || null;
}

export async function updateEmbedding(
  id: string,
  data: Partial<EmbeddingDocument>
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.content !== undefined) {
    updates.push(`content = $${values.length + 1}`);
    values.push(data.content);
  }
  if (data.metadata !== undefined) {
    updates.push(`metadata = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(data.metadata));
  }
  if (data.source_type !== undefined) {
    updates.push(`source_type = $${values.length + 1}`);
    values.push(data.source_type);
  }
  if (data.source_id !== undefined) {
    updates.push(`source_id = $${values.length + 1}`);
    values.push(data.source_id);
  }

  if (!updates.length) return;

  values.push(id);
  await dbQuery(
    `update sofia_embeddings
     set ${updates.join(", ")}
     where id = $${values.length}`,
    values
  );
}

export async function deleteEmbedding(id: string): Promise<void> {
  const vectorSupported = await hasVectorSupport();
  if (vectorSupported && (await hasVectorTable())) {
    await dbQuery(`delete from sofia_embeddings where id = $1`, [id]);
    return;
  }
  if (await hasRawTable()) {
    await dbQuery(`delete from sofia_embeddings_raw where id = $1`, [id]);
  }
}

export async function bulkStoreEmbeddings(
  documents: EmbeddingDocument[],
  options?: { batchSize?: number }
): Promise<number> {
  const batchSize = options?.batchSize ?? 40;
  let inserted = 0;
  const vectorSupported = await hasVectorSupport();
  const useVector = vectorSupported && (await hasVectorTable());
  const table = useVector ? "sofia_embeddings" : "sofia_embeddings_raw";

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const embeddings = await Promise.all(
      batch.map((doc) => generateEmbedding(doc.content))
    );

    const values: any[] = [];
    const rows: string[] = [];

    batch.forEach((doc, index) => {
      const embedding = embeddings[index];
      if (!embedding || !embedding.length) return;
      const baseIndex = values.length;
      values.push(
        doc.content,
        formatEmbeddingVector(embedding),
        JSON.stringify(doc.metadata || {}),
        doc.source_type,
        doc.source_id || null
      );
      rows.push(
        `($${baseIndex + 1}, $${baseIndex + 2}${useVector ? "::vector" : "::float8[]"}, $${baseIndex + 3}::jsonb, $${baseIndex + 4}, $${baseIndex + 5})`
      );
    });

    if (!rows.length) continue;
    await dbQuery(
      `insert into ${table}
        (content, embedding, metadata, source_type, source_id)
       values ${rows.join(", ")}`,
      values
    );
    inserted += rows.length;
  }

  return inserted;
}

export async function clearEmbeddings(sourceTypes: SourceType[]): Promise<void> {
  const vectorSupported = await hasVectorSupport();
  if (vectorSupported && (await hasVectorTable())) {
    await dbQuery(
      `delete from sofia_embeddings where source_type = any($1::text[])`,
      [sourceTypes]
    );
    return;
  }
  if (await hasRawTable()) {
    await dbQuery(
      `delete from sofia_embeddings_raw where source_type = any($1::text[])`,
      [sourceTypes]
    );
  }
}

export async function searchSimilar(
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    sourceType?: SourceType;
    metadataFilter?: EmbeddingMetadata;
    candidateLimit?: number;
  }
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding.length) return [];

  const limit = options?.limit ?? 5;
  const threshold = options?.threshold ?? 0.7;
  const sourceType = options?.sourceType ?? null;
  const metadataFilter = options?.metadataFilter
    ? JSON.stringify(options.metadataFilter)
    : null;

  const vectorSupported = await hasVectorSupport();
  const useVector = vectorSupported && (await hasVectorTable()) && (await hasMatchFunction());
  if (useVector) {
    const { rows } = await dbQuery<SearchResult>(
      `select *
       from match_sofia_documents(
         $1::vector,
         $2::float,
         $3::int,
         $4::text,
         $5::jsonb
       )`,
      [formatEmbeddingVector(embedding), threshold, limit, sourceType, metadataFilter]
    );
    return rows;
  }

  if (!(await hasRawTable())) return [];

  const candidateLimit = options?.candidateLimit ?? 500;
  const params: any[] = [];
  let where = "where 1=1";

  if (sourceType) {
    params.push(sourceType);
    where += ` and source_type = $${params.length}`;
  }
  if (metadataFilter) {
    params.push(metadataFilter);
    where += ` and metadata @> $${params.length}::jsonb`;
  }

  params.push(candidateLimit);
  const { rows } = await dbQuery<
    SearchResult & { embedding: number[] }
  >(
    `select id, content, metadata, source_type, source_id, created_at, embedding
     from sofia_embeddings_raw
     ${where}
     limit $${params.length}`,
    params
  );

  const scored = rows
    .map((row) => ({
      ...row,
      similarity: cosineSimilarity(embedding, row.embedding || []),
    }))
    .filter((row) => row.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(({ embedding: _embedding, ...rest }) => rest as SearchResult);

  return scored;
}
