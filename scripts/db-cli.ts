import { Pool, QueryResultRow } from "pg";
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(text: string, params: any[] = []) {
  return getPool().query<T>(text, params);
}
