/**
 * Setup Elasticsearch index with Brazilian Portuguese analyzer.
 * Run once: npx tsx scripts/setup-elasticsearch.ts
 */

import { Client } from "@elastic/elasticsearch";

const ES_URL = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
const INDEX_NAME = "whatsapp_messages_v2";

async function main() {
  console.log("[ES Setup] Connecting to", ES_URL);
  const client = new Client({ node: ES_URL });

  const ping = await client.ping();
  console.log("[ES Setup] Ping:", ping ? "OK" : "FAILED");

  // Check if index exists
  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists) {
    console.log(`[ES Setup] Index '${INDEX_NAME}' already exists. Deleting...`);
    await client.indices.delete({ index: INDEX_NAME });
  }

  console.log(`[ES Setup] Creating index '${INDEX_NAME}'...`);

  await client.indices.create({
    index: INDEX_NAME,
    body: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          filter: {
            brazilian_stop: {
              type: "stop",
              stopwords: "_brazilian_",
            },
            brazilian_stemmer: {
              type: "stemmer",
              language: "brazilian",
            },
            edge_ngram_filter: {
              type: "edge_ngram",
              min_gram: 2,
              max_gram: 20,
            },
          },
          analyzer: {
            brazilian_full: {
              type: "custom",
              tokenizer: "standard",
              filter: [
                "lowercase",
                "brazilian_stop",
                "brazilian_stemmer",
              ],
            },
            autocomplete: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "edge_ngram_filter"],
            },
            autocomplete_search: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase"],
            },
          },
        },
      },
      mappings: {
        properties: {
          workspace_id: { type: "integer" },
          phone_number: { type: "keyword" },
          remote_jid: { type: "keyword" },
          message_id: { type: "keyword" },
          instance_name: { type: "keyword" },
          message_text: {
            type: "text",
            analyzer: "brazilian_full",
            fields: {
              exact: { type: "text", analyzer: "standard" },
            },
          },
          contact_name: {
            type: "text",
            analyzer: "brazilian_full",
            fields: {
              autocomplete: {
                type: "text",
                analyzer: "autocomplete",
                search_analyzer: "autocomplete_search",
              },
              keyword: { type: "keyword" },
            },
          },
          message_type: { type: "keyword" },
          is_from_me: { type: "boolean" },
          is_group: { type: "boolean" },
          has_media: { type: "boolean" },
          timestamp: { type: "date" },
          status: { type: "keyword" },
        },
      },
    },
  });

  console.log(`[ES Setup] Index '${INDEX_NAME}' created successfully.`);
  await client.close();
}

main().catch((err) => {
  console.error("[ES Setup] Fatal error:", err);
  process.exit(1);
});
