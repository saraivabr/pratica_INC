import "server-only";
import fs from "fs";
import path from "path";
import { dbQuery } from "@/lib/db";
import { FAQ } from "../faq";
import { KNOWLEDGE } from "../knowledge";
import {
  bulkStoreEmbeddings,
  clearEmbeddings,
  type EmbeddingDocument,
  type SourceType,
} from "./embeddings";

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

async function loadChunkConfig(): Promise<ChunkConfig> {
  try {
    const { rows } = await dbQuery<{ config_value: any }>(
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
      if (current) {
        chunks.push(current);
      }
      current = partChunk;
    }
  }

  if (current) {
    chunks.push(current);
  }

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

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export async function indexFAQ(): Promise<number> {
  const documents: EmbeddingDocument[] = [];

  Object.values(FAQ).forEach((category) => {
    Object.entries(category.perguntas).forEach(([question, answer]) => {
      documents.push({
        content: `Pergunta: ${question}\nResposta: ${answer}`,
        source_type: "faq",
        source_id: `${category.nome}:${question}`,
        metadata: { categoria: category.nome },
      });
    });
  });

  return bulkStoreEmbeddings(documents);
}

export async function indexKnowledge(): Promise<number> {
  const docs: EmbeddingDocument[] = [];

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

  return bulkStoreEmbeddings(docs);
}

export async function indexEmpreendimentos(): Promise<number> {
  const { rows } = await dbQuery<any>(
    `select cvcrm_id, nome, descricao, tipo, status, endereco_completo,
            cep, cidade, uf, data_lancamento, data_entrega_prevista, total_unidades, cvcrm_data
     from cvcrm_empreendimentos`
  );

  const config = await loadChunkConfig();
  const docs: EmbeddingDocument[] = [];

  rows.forEach((row) => {
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
    const chunks = chunkText(baseText, config);
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

  return bulkStoreEmbeddings(docs);
}

export async function indexResponses(): Promise<number> {
  // Respostas conversacionais mais usadas para ajudar o modelo com tom e vocabulário.
  const docs: EmbeddingDocument[] = [
    {
      content:
        "Sou a Sofia, especialista comercial da Pratica. Posso ajudar com simulacoes, tabelas, materiais e informacoes dos empreendimentos.",
      source_type: "knowledge",
      source_id: "respostas:identidade",
      metadata: { categoria: "respostas" },
    },
    {
      content:
        "Se precisar, me diga o perfil do cliente, faixa de preco e bairro que ja te indico as melhores opcoes.",
      source_type: "knowledge",
      source_id: "respostas:qualificacao",
      metadata: { categoria: "respostas" },
    },
  ];

  return bulkStoreEmbeddings(docs);
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
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += `${pageText}\n`;
  }

  return { text: fullText.trim(), pages: numPages };
}

export async function indexMemorialPdf(): Promise<number> {
  const fileName = "AF_Memorial cliente versao 2110 (sem personalizacao).pdf";
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const { text, pages } = await extractPdfText(filePath);
  const config = await loadChunkConfig();
  const chunks = chunkText(text, config);

  const docs: EmbeddingDocument[] = chunks.map((chunk, index) => ({
    content: chunk,
    source_type: "knowledge",
    source_id: "memorial_2110",
    metadata: {
      source: "memorial_descritivo",
      file: fileName,
      pages,
      chunk_index: index,
      chunk_total: chunks.length,
    },
  }));

  return bulkStoreEmbeddings(docs);
}

export async function reindexAll(): Promise<{
  faq: number;
  knowledge: number;
  empreendimentos: number;
  responses: number;
  memorial: number;
}> {
  const sourceTypes: SourceType[] = [
    "faq",
    "knowledge",
    "empreendimento",
    "policy",
    "conversation",
  ];

  await clearEmbeddings(sourceTypes);

  const faq = await indexFAQ();
  const knowledge = await indexKnowledge();
  const empreendimentos = await indexEmpreendimentos();
  const responses = await indexResponses();
  const memorial = await indexMemorialPdf();

  return { faq, knowledge, empreendimentos, responses, memorial };
}

export async function getIndexStats(): Promise<
  Array<{ source_type: string; count: number }>
> {
  const { rows } = await dbQuery<{ source_type: string; count: string }>(
    `select source_type, count(*)::text as count
     from sofia_embeddings
     group by source_type
     order by source_type`
  );
  return rows.map((row) => ({
    source_type: row.source_type,
    count: Number(row.count),
  }));
}
