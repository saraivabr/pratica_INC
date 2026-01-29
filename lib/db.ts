import "server-only";
import { Pool, QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }

    // Check if using Supabase (requires SSL)
    const isSupabase = connectionString.includes('supabase.co');

    global.__pgPool = new Pool({
      connectionString,
      ...(isSupabase && { ssl: { rejectUnauthorized: false } })
    });
  }
  return global.__pgPool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(text: string, params: any[] = []) {
  return getPool().query<T>(text, params);
}

// Export pool for direct access (used by tenant-context)
const pool = getPool();
export default pool;
