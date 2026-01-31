import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Connection string
const connectionString = '${process.env.DATABASE_URL}';

async function runUpdate() {
  console.log('Connecting to Supabase...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected!');

    const sqlPath = path.join(__dirname, 'z2a_schema_update.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL update...');
    await client.query(sql);
    console.log('✅ Update executed successfully!');
    
    // Verify funnels
    const res = await client.query('SELECT * FROM funnels');
    console.log('Funnels:', res.rows);

  } catch (error) {
    console.error('Error executing update:', error);
  } finally {
    await client.end();
  }
}

runUpdate();
