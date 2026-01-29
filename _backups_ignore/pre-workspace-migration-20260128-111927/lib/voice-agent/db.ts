/**
 * Database utilities for Voice Agent
 * This is a standalone version that doesn't use Next.js server-only
 */
import { Pool, QueryResultRow } from 'pg'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is required')
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: any[] = []
) {
  return getPool().query<T>(text, params)
}

export default { dbQuery }
