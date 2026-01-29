const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const DATABASE_URL = dbUrlLine?.replace('DATABASE_URL=', '').replace(/"/g, '').trim();

async function listTables() {
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`\n📊 TODAS AS ${tables.rows.length} TABELAS NO BANCO:\n`);
    tables.rows.forEach((t, i) => {
      console.log(`${String(i + 1).padStart(3, ' ')}. ${t.table_name}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

listTables();
