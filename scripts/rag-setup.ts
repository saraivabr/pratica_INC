import { config } from "dotenv";
import path from "path";
import { Client } from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_CONFIGS = [
  {
    key: "embedding_model",
    value: { model: "text-embedding-3-small", dimensions: 1536, provider: "openai" },
    description: "Model configuration for generating embeddings",
  },
  {
    key: "search_defaults",
    value: { match_threshold: 0.7, match_count: 5, include_metadata: true },
    description: "Default parameters for similarity search",
  },
  {
    key: "chunking_config",
    value: { chunk_size: 1000, chunk_overlap: 200, separator: "\n\n" },
    description: "Text chunking configuration for document processing",
  },
  {
    key: "source_priorities",
    value: { faq: 1.0, knowledge: 0.9, empreendimento: 0.95, policy: 0.85, conversation: 0.7 },
    description: "Priority weights for different source types in search results",
  },
];

async function ensureUpdatedAtFunction(client: Client) {
  await client.query(`
    create or replace function update_updated_at_column()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;
  `);
}

async function ensureRagConfig(client: Client) {
  await client.query(`
    create table if not exists sofia_rag_config (
      id uuid primary key default gen_random_uuid(),
      config_key text unique not null,
      config_value jsonb not null default '{}'::jsonb,
      description text,
      is_active boolean default true,
      created_at timestamptz default now() not null,
      updated_at timestamptz default now() not null
    );
  `);

  await ensureUpdatedAtFunction(client);
  await client.query(`
    drop trigger if exists update_sofia_rag_config_updated_at on sofia_rag_config;
    create trigger update_sofia_rag_config_updated_at
      before update on sofia_rag_config
      for each row execute function update_updated_at_column();
  `);

  for (const cfg of DEFAULT_CONFIGS) {
    await client.query(
      `
      insert into sofia_rag_config (config_key, config_value, description, is_active)
      values ($1, $2::jsonb, $3, true)
      on conflict (config_key) do nothing
      `,
      [cfg.key, JSON.stringify(cfg.value), cfg.description]
    );
  }
}

async function ensureVectorSchema(client: Client) {
  await client.query(`create schema if not exists extensions;`);
  await client.query(`create extension if not exists vector with schema extensions;`);

  await client.query(`
    create table if not exists sofia_embeddings (
      id uuid primary key default gen_random_uuid(),
      content text not null,
      embedding vector(1536) not null,
      metadata jsonb default '{}'::jsonb,
      source_type text not null check (source_type in ('faq','knowledge','empreendimento','policy','conversation')),
      source_id text,
      created_at timestamptz default now() not null,
      updated_at timestamptz default now() not null
    );
  `);

  await client.query(`
    create index if not exists sofia_embeddings_embedding_idx
    on sofia_embeddings using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);
  `);
  await client.query(`create index if not exists sofia_embeddings_source_type_idx on sofia_embeddings (source_type);`);
  await client.query(`create index if not exists sofia_embeddings_source_id_idx on sofia_embeddings (source_id);`);
  await client.query(`create index if not exists sofia_embeddings_metadata_idx on sofia_embeddings using gin (metadata);`);
  await client.query(`create index if not exists sofia_embeddings_created_at_idx on sofia_embeddings (created_at desc);`);

  await ensureUpdatedAtFunction(client);
  await client.query(`
    drop trigger if exists update_sofia_embeddings_updated_at on sofia_embeddings;
    create trigger update_sofia_embeddings_updated_at
      before update on sofia_embeddings
      for each row execute function update_updated_at_column();
  `);

  await client.query(`
    create or replace function match_sofia_documents(
      query_embedding vector(1536),
      match_threshold float default 0.7,
      match_count int default 5,
      filter_source_type text default null,
      filter_metadata jsonb default null
    )
    returns table (
      id uuid,
      content text,
      metadata jsonb,
      source_type text,
      source_id text,
      similarity float,
      created_at timestamptz
    )
    language plpgsql stable as $$
    begin
      return query
      select
        se.id,
        se.content,
        se.metadata,
        se.source_type,
        se.source_id,
        1 - (se.embedding <=> query_embedding) as similarity,
        se.created_at
      from sofia_embeddings se
      where
        1 - (se.embedding <=> query_embedding) >= match_threshold
        and (filter_source_type is null or se.source_type = filter_source_type)
        and (filter_metadata is null or se.metadata @> filter_metadata)
      order by se.embedding <=> query_embedding
      limit match_count;
    end;
    $$;
  `);
}

async function ensureRawSchema(client: Client) {
  await client.query(`
    create table if not exists sofia_embeddings_raw (
      id uuid primary key default gen_random_uuid(),
      content text not null,
      embedding float8[] not null,
      metadata jsonb default '{}'::jsonb,
      source_type text not null check (source_type in ('faq','knowledge','empreendimento','policy','conversation')),
      source_id text,
      created_at timestamptz default now() not null,
      updated_at timestamptz default now() not null
    );
  `);

  await client.query(`create index if not exists sofia_embeddings_raw_source_type_idx on sofia_embeddings_raw (source_type);`);
  await client.query(`create index if not exists sofia_embeddings_raw_source_id_idx on sofia_embeddings_raw (source_id);`);
  await client.query(`create index if not exists sofia_embeddings_raw_metadata_idx on sofia_embeddings_raw using gin (metadata);`);
  await client.query(`create index if not exists sofia_embeddings_raw_created_at_idx on sofia_embeddings_raw (created_at desc);`);

  await ensureUpdatedAtFunction(client);
  await client.query(`
    drop trigger if exists update_sofia_embeddings_raw_updated_at on sofia_embeddings_raw;
    create trigger update_sofia_embeddings_raw_updated_at
      before update on sofia_embeddings_raw
      for each row execute function update_updated_at_column();
  `);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const { rows } = await client.query(
    "select exists(select 1 from pg_available_extensions where name = 'vector') as available"
  );
  const vectorAvailable = Boolean(rows[0]?.available);

  await ensureRagConfig(client);

  if (vectorAvailable) {
    await ensureVectorSchema(client);
    console.log("RAG setup complete: vector storage enabled.");
  } else {
    await ensureRawSchema(client);
    console.log("RAG setup complete: raw storage fallback enabled.");
  }

  await client.end();
}

main().catch((error) => {
  console.error("RAG setup failed:", error);
  process.exit(1);
});
