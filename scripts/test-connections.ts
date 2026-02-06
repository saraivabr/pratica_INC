/**
 * Test all database connections: PostgreSQL, MongoDB, Elasticsearch, Redis.
 * Run: npx tsx scripts/test-connections.ts
 */

import { Pool } from "pg";
import { MongoClient } from "mongodb";
import { Client as ESClient } from "@elastic/elasticsearch";
import Redis from "ioredis";

const results: { name: string; status: string; detail?: string }[] = [];

async function testPostgreSQL() {
  const url = process.env.DATABASE_URL || "postgresql://pratica:pratica2026secure@localhost:5432/pratica";
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query("SELECT NOW() as time, current_database() as db");
    results.push({ name: "PostgreSQL", status: "OK", detail: `db=${rows[0].db}, time=${rows[0].time}` });
  } catch (err: any) {
    results.push({ name: "PostgreSQL", status: "FAIL", detail: err.message });
  } finally {
    await pool.end();
  }
}

async function testMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://pratica:pratica_mongo_2026!@localhost:27017/pratica?authSource=pratica";
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const result = await client.db().command({ ping: 1 });
    const collections = await client.db().listCollections().toArray();
    results.push({
      name: "MongoDB",
      status: "OK",
      detail: `ping=${result.ok}, collections=${collections.map(c => c.name).join(",")}`,
    });
  } catch (err: any) {
    results.push({ name: "MongoDB", status: "FAIL", detail: err.message });
  } finally {
    await client.close();
  }
}

async function testElasticsearch() {
  const url = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
  const client = new ESClient({ node: url, requestTimeout: 5000 });
  try {
    const info = await client.info();
    const indices = await client.cat.indices({ format: "json" });
    const indexNames = (indices as any[]).map((i: any) => i.index).join(",");
    results.push({
      name: "Elasticsearch",
      status: "OK",
      detail: `version=${(info as any).version?.number}, indices=${indexNames}`,
    });
  } catch (err: any) {
    results.push({ name: "Elasticsearch", status: "FAIL", detail: err.message });
  } finally {
    await client.close();
  }
}

async function testRedis() {
  const url = process.env.SCALINGO_REDIS_URL || "redis://localhost:6379";
  const client = new Redis(url, { lazyConnect: true, connectTimeout: 5000 });
  try {
    await client.connect();
    const pong = await client.ping();
    const info = await client.info("memory");
    const memMatch = info.match(/used_memory_human:(\S+)/);
    results.push({
      name: "Redis",
      status: "OK",
      detail: `ping=${pong}, memory=${memMatch?.[1] || "unknown"}`,
    });
  } catch (err: any) {
    results.push({ name: "Redis", status: "FAIL", detail: err.message });
  } finally {
    await client.quit();
  }
}

async function main() {
  console.log("=== Connection Tests ===\n");

  await Promise.allSettled([
    testPostgreSQL(),
    testMongoDB(),
    testElasticsearch(),
    testRedis(),
  ]);

  const maxNameLen = Math.max(...results.map(r => r.name.length));
  for (const r of results) {
    const icon = r.status === "OK" ? "✓" : "✗";
    console.log(`  ${icon} ${r.name.padEnd(maxNameLen)}  ${r.status}  ${r.detail || ""}`);
  }

  const failed = results.filter(r => r.status !== "OK");
  if (failed.length > 0) {
    console.log(`\n${failed.length} connection(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll connections OK.");
  }
}

main();
