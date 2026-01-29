import { config } from "dotenv";
import path from "path";
import { Client } from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const { rows: vectorRows } = await client.query(
    "select exists(select 1 from pg_available_extensions where name = 'vector') as available"
  );
  if (!vectorRows[0]?.available) {
    throw new Error("pgvector not available on this server");
  }

  await client.query("create schema if not exists extensions;");
  await client.query("create extension if not exists vector with schema extensions;");

  const { rows: vectorTableRows } = await client.query(
    "select to_regclass('public.sofia_embeddings') is not null as exists"
  );
  if (!vectorTableRows[0]?.exists) {
    throw new Error("sofia_embeddings table not found. Run rag:setup first.");
  }

  const { rows: rawTableRows } = await client.query(
    "select to_regclass('public.sofia_embeddings_raw') is not null as exists"
  );
  if (!rawTableRows[0]?.exists) {
    console.log("sofia_embeddings_raw not found. Nothing to migrate.");
    await client.end();
    return;
  }

  const { rows: countRows } = await client.query(
    "select count(*)::int as count from sofia_embeddings_raw"
  );
  const total = countRows[0]?.count || 0;
  if (!total) {
    console.log("sofia_embeddings_raw is empty. Nothing to migrate.");
    await client.end();
    return;
  }

  await client.query(`
    insert into sofia_embeddings
      (id, content, embedding, metadata, source_type, source_id, created_at, updated_at)
    select
      id,
      content,
      embedding::vector,
      metadata,
      source_type,
      source_id,
      created_at,
      updated_at
    from sofia_embeddings_raw
    on conflict (id) do update
      set content = excluded.content,
          embedding = excluded.embedding,
          metadata = excluded.metadata,
          source_type = excluded.source_type,
          source_id = excluded.source_id,
          updated_at = now();
  `);

  console.log(`Migrated ${total} embeddings to sofia_embeddings.`);

  await client.end();
}

main().catch((error) => {
  console.error("RAG migrate failed:", error);
  process.exit(1);
});
