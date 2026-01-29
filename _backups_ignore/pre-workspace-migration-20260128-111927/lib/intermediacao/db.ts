/**
 * @fileoverview Cliente de banco de dados para o Sistema de Intermediacao
 * @module lib/intermediacao/db
 * @description Conexao dedicada com Supabase para o modulo de intermediacao
 */

import "server-only";
import { Pool, PoolClient, QueryResultRow } from "pg";

declare global {
  var __intermediacaoPool: Pool | undefined;
}

function getIntermediacacaoPool(): Pool {
  if (!global.__intermediacaoPool) {
    // Usa SUPABASE_DB_URL se disponivel, senao DATABASE_URL
    const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("SUPABASE_DB_URL or DATABASE_URL is required for intermediacao module");
    }
    global.__intermediacaoPool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined
    });
  }
  return global.__intermediacaoPool;
}

/**
 * Executa uma query no banco de dados do sistema de intermediacao
 */
export async function intermediacaoQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: any[] = []
) {
  return getIntermediacacaoPool().query<T>(text, params);
}

/**
 * Executa multiplas queries em uma transacao
 */
export async function intermediacaoTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getIntermediacacaoPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default getIntermediacacaoPool();
