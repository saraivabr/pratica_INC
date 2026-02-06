import "server-only";
import { Client } from "@elastic/elasticsearch";

declare global {
  var __esClient: Client | undefined;
}

function getClient(): Client {
  if (!global.__esClient) {
    const url = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

    global.__esClient = new Client({
      node: url,
      maxRetries: 3,
      requestTimeout: 30000,
    });
  }
  return global.__esClient;
}

export function getElasticsearch(): Client {
  return getClient();
}

export const ES_INDEX = "whatsapp_messages_v2";

export default getElasticsearch;
