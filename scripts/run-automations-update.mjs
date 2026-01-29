import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = 'postgres://postgres:356d20e7786bbbe6f375@84.247.128.56:3005/pratica?sslmode=disable';

async function runUpdate() {
  console.log('Connecting to database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected!');

    const sqlPath = path.join(__dirname, 'z2a_automations_campaigns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing Automations & Campaigns schema update...');
    await client.query(sql);
    console.log('✅ Schema updated successfully!');

  } catch (error) {
    console.error('Error executing update:', error);
  } finally {
    await client.end();
  }
}

runUpdate();
