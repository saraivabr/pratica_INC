import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query('SELECT COUNT(*) as total FROM cvcrm_leads');
  console.log('Total leads no banco:', result.rows[0].total);
  await pool.end();
}

main();
