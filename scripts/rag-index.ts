import fs from "fs";
import path from "path";
import { config } from "dotenv";
import OpenAI from "openai";
import { Client } from "pg";
import { FAQ } from "../lib/sofia/faq";
import { KNOWLEDGE } from "../lib/sofia/knowledge";

config({ path: path.resolve(process.cwd(), ".env.local") });

type SourceType = "faq" | "knowledge" | "empreendimento" | "policy" | "conversation";

interface EmbeddingDocument {
  content: string;
  source_type: SourceType;
  source_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
  separator: string;
}

const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: "\n\n",
};

function formatEmbeddingVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function chunkText(text: string, config: ChunkConfig): string[] {
  const clean = text.replace(/[ \t]+/g, " ").trim();
  if (!clean) return [];

  const splitLong = (value: string): string[] => {
    if (value.length <= config.chunkSize) return [value];
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += config.chunkSize) {
      chunks.push(value.slice(i, i + config.chunkSize));
    }
    return chunks;
  };

  const parts = clean.split(config.separator).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const partChunks = splitLong(part);
    for (const partChunk of partChunks) {
      const next = current ? `${current}${config.separator}${partChunk}` : partChunk;
      if (next.length <= config.chunkSize) {
        current = next;
        continue;
      }
      if (current) chunks.push(current);
      current = partChunk;
    }
  }

  if (current) chunks.push(current);

  if (config.chunkOverlap > 0 && chunks.length > 1) {
    return chunks.map((chunk, index) => {
      if (index === 0) return chunk;
      const prev = chunks[index - 1];
      const overlap = prev.slice(-config.chunkOverlap);
      return `${overlap}${chunk}`;
    });
  }

  return chunks;
}

async function loadChunkConfig(client: Client): Promise<ChunkConfig> {
  try {
    const { rows } = await client.query(
      `select config_value
       from sofia_rag_config
       where config_key = 'chunking_config' and is_active = true
       limit 1`
    );
    const value = rows[0]?.config_value || {};
    return {
      chunkSize: Number(value.chunk_size) || DEFAULT_CHUNK_CONFIG.chunkSize,
      chunkOverlap: Number(value.chunk_overlap) || DEFAULT_CHUNK_CONFIG.chunkOverlap,
      separator: typeof value.separator === "string" ? value.separator : DEFAULT_CHUNK_CONFIG.separator,
    };
  } catch {
    return DEFAULT_CHUNK_CONFIG;
  }
}

async function extractPdfText(filePath: string): Promise<{ text: string; pages: number }> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;

  let fullText = "";
  const numPages = pdfDocument.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += `${pageText}\n`;
  }

  return { text: fullText.trim(), pages: numPages };
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

async function generateEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const input = text.replace(/\s+/g, " ").trim();
  if (!input) return [];
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data[0]?.embedding || [];
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = Math.min(5000, 1000 * attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function bulkInsert(
  client: Client,
  docs: EmbeddingDocument[],
  openai: OpenAI,
  useVector: boolean
): Promise<number> {
  const batchSize = 20;
  let inserted = 0;
  const table = useVector ? "sofia_embeddings" : "sofia_embeddings_raw";

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const embeddings: number[][] = [];
    for (const doc of batch) {
      const embedding = await withRetry(() => generateEmbedding(openai, doc.content), 4);
      embeddings.push(embedding);
    }

    const values: any[] = [];
    const rows: string[] = [];

    batch.forEach((doc, index) => {
      const embedding = embeddings[index];
      if (!embedding || !embedding.length) return;
      const baseIndex = values.length;
      values.push(
        doc.content,
        useVector ? formatEmbeddingVector(embedding) : embedding,
        JSON.stringify(doc.metadata || {}),
        doc.source_type,
        doc.source_id || null
      );
      rows.push(
        `($${baseIndex + 1}, $${baseIndex + 2}${useVector ? "::vector" : "::float8[]"}, $${baseIndex + 3}::jsonb, $${baseIndex + 4}, $${baseIndex + 5})`
      );
    });

    if (!rows.length) continue;
    await client.query(
      `insert into ${table}
        (content, embedding, metadata, source_type, source_id)
       values ${rows.join(", ")}`,
      values
    );
    inserted += rows.length;
  }

  return inserted;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const [{ rows: vectorRows }, { rows: tableRows }] = await Promise.all([
    client.query("select exists(select 1 from pg_available_extensions where name = 'vector') as available"),
    client.query("select to_regclass('public.sofia_embeddings') is not null as exists"),
  ]);
  const vectorAvailable = Boolean(vectorRows[0]?.available);
  const vectorTable = Boolean(tableRows[0]?.exists);
  const useVector = vectorAvailable && vectorTable;

  const sourceTypes: SourceType[] = ["faq", "knowledge", "empreendimento", "policy", "conversation"];
  await client.query(
    `delete from ${useVector ? "sofia_embeddings" : "sofia_embeddings_raw"}
     where source_type = any($1::text[])`,
    [sourceTypes]
  );

  const openai = new OpenAI({ apiKey, timeout: 60000 });
  const chunkConfig = await loadChunkConfig(client);

  const docs: EmbeddingDocument[] = [];

  Object.values(FAQ).forEach((category) => {
    Object.entries(category.perguntas).forEach(([question, answer]) => {
      docs.push({
        content: `Pergunta: ${question}\nResposta: ${answer}`,
        source_type: "faq",
        source_id: `${category.nome}:${question}`,
        metadata: { categoria: category.nome },
      });
    });
  });

  const politicas = KNOWLEDGE.POLITICAS;
  docs.push({
    content: [
      "Politica de reserva:",
      `Valor minimo: ${politicas.reserva.valorMinimoFormatado}`,
      `Prazo maximo: ${politicas.reserva.prazoMaximoDias} dias`,
      "Documentos obrigatorios:",
      formatList(politicas.reserva.documentosObrigatorios),
      "Observacoes:",
      formatList(politicas.reserva.observacoes),
    ].join("\n"),
    source_type: "policy",
    source_id: "politicas:reserva",
    metadata: { categoria: "politicas", tema: "reserva" },
  });

  docs.push({
    content: [
      "Politica de comissao:",
      `Percentual padrao: ${politicas.comissao.percentualPadrao}%`,
      `Percentual maximo: ${politicas.comissao.percentualMaximo}%`,
      `Prazo pagamento: ${politicas.comissao.prazoPagamentoDias} dias`,
      "Condicoes de pagamento:",
      formatList(politicas.comissao.condicoesPagamento),
      "Observacoes:",
      formatList(politicas.comissao.observacoes),
    ].join("\n"),
    source_type: "policy",
    source_id: "politicas:comissao",
    metadata: { categoria: "politicas", tema: "comissao" },
  });

  docs.push({
    content: [
      "Politica de desconto:",
      `Percentual maximo autorizado: ${politicas.desconto.percentualMaximoAutorizado}%`,
      `Ate gerente: ${politicas.desconto.percentualGerenteAte}%`,
      `Ate diretoria: ${politicas.desconto.percentualDiretoriaAte}%`,
      "Condicoes especiais:",
      formatList(politicas.desconto.condicoesEspeciais),
      "Observacoes:",
      formatList(politicas.desconto.observacoes),
    ].join("\n"),
    source_type: "policy",
    source_id: "politicas:desconto",
    metadata: { categoria: "politicas", tema: "desconto" },
  });

  Object.entries(KNOWLEDGE.ARGUMENTOS_VENDA).forEach(([key, data]) => {
    docs.push({
      content: [
        `Objecao: ${data.objecao}`,
        "Argumentos:",
        formatList(data.argumentos),
        "Perguntas de qualificacao:",
        formatList(data.perguntasQualificacao),
        "Frases chave:",
        formatList(data.frasesChave),
      ].join("\n"),
      source_type: "knowledge",
      source_id: `argumentos:${key}`,
      metadata: { categoria: "argumentos_venda", objecao: key },
    });
  });

  Object.entries(KNOWLEDGE.DIFERENCIAIS_PRATICA).forEach(([key, data]) => {
    docs.push({
      content: [
        `Diferencial: ${data.titulo}`,
        `Descricao: ${data.descricao}`,
        `Beneficio para o cliente: ${data.beneficioCliente}`,
        `Como usar: ${data.comoUsar}`,
      ].join("\n"),
      source_type: "knowledge",
      source_id: `diferenciais:${key}`,
      metadata: { categoria: "diferenciais", diferencial: key },
    });
  });

  docs.push({
    content:
      "Sou a Sofia, especialista comercial da Pratica. Posso ajudar com simulacoes, tabelas, materiais e informacoes dos empreendimentos.",
    source_type: "knowledge",
    source_id: "respostas:identidade",
    metadata: { categoria: "respostas" },
  });
  docs.push({
    content:
      "Se precisar, me diga o perfil do cliente, faixa de preco e bairro que ja te indico as melhores opcoes.",
    source_type: "knowledge",
    source_id: "respostas:qualificacao",
    metadata: { categoria: "respostas" },
  });

  const { rows: empreendimentos } = await client.query(
    `select cvcrm_id, nome, descricao, tipo, status, endereco_completo,
            cep, cidade, uf, data_lancamento, data_entrega_prevista, total_unidades, cvcrm_data
     from cvcrm_empreendimentos`
  );
  empreendimentos.forEach((row: any) => {
    const data = row.cvcrm_data || {};
    const lines = [
      `Empreendimento: ${row.nome}`,
      row.descricao ? `Descricao: ${row.descricao}` : "",
      row.tipo ? `Tipo: ${row.tipo}` : "",
      row.status ? `Status: ${row.status}` : "",
      row.endereco_completo ? `Endereco: ${row.endereco_completo}` : "",
      row.cidade ? `Cidade: ${row.cidade}` : "",
      row.uf ? `UF: ${row.uf}` : "",
      row.cep ? `CEP: ${row.cep}` : "",
      row.data_lancamento ? `Lancamento: ${row.data_lancamento}` : "",
      row.data_entrega_prevista ? `Entrega prevista: ${row.data_entrega_prevista}` : "",
      row.total_unidades ? `Total de unidades: ${row.total_unidades}` : "",
      data?.bairro ? `Bairro: ${data.bairro}` : "",
      data?.preco_minimo ? `Preco minimo: ${data.preco_minimo}` : "",
      data?.preco_maximo ? `Preco maximo: ${data.preco_maximo}` : "",
      data?.diferenciais ? `Diferenciais: ${Array.isArray(data.diferenciais) ? data.diferenciais.join(", ") : data.diferenciais}` : "",
    ].filter(Boolean);

    const baseText = lines.join("\n");
    const chunks = chunkText(baseText, chunkConfig);
    chunks.forEach((chunk, index) => {
      docs.push({
        content: chunk,
        source_type: "empreendimento",
        source_id: String(row.cvcrm_id),
        metadata: {
          nome: row.nome,
          cidade: row.cidade,
          uf: row.uf,
          chunk_index: index,
          chunk_total: chunks.length,
        },
      });
    });
  });

  const memorialName = "AF_Memorial cliente versao 2110 (sem personalizacao).pdf";
  const memorialPath = path.resolve(process.cwd(), memorialName);
  if (fs.existsSync(memorialPath)) {
    const { text, pages } = await extractPdfText(memorialPath);
    const chunks = chunkText(text, chunkConfig);
    chunks.forEach((chunk, index) => {
      docs.push({
        content: chunk,
        source_type: "knowledge",
        source_id: "memorial_2110",
        metadata: {
          source: "memorial_descritivo",
          file: memorialName,
          pages,
          chunk_index: index,
          chunk_total: chunks.length,
        },
      });
    });
  } else {
    console.warn(`PDF nao encontrado: ${memorialName}`);
  }

  console.log(`Indexing ${docs.length} documentos...`);
  const inserted = await bulkInsert(client, docs, openai, useVector);
  console.log(`Indexacao concluida. Inseridos: ${inserted}`);

  const table = useVector ? "sofia_embeddings" : "sofia_embeddings_raw";
  const { rows: stats } = await client.query(
    `select source_type, count(*)::int as count
     from ${table}
     group by source_type
     order by source_type`
  );
  console.log("Index stats:", stats);

  await client.end();
}

main().catch((error) => {
  console.error("RAG index failed:", error);
  process.exit(1);
});
