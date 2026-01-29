const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const DATABASE_URL = dbUrlLine?.replace('DATABASE_URL=', '').replace(/"/g, '').trim();

async function checkLeadsTable() {
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n📊 ESTRUTURA DA TABELA LEADS\n');
    
    const columns = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'leads'
      ORDER BY ordinal_position
    `);
    
    if (columns.rows.length === 0) {
      console.log('❌ Tabela leads não existe!');
      return;
    }
    
    console.log('Colunas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n📊 CONSTRAINTS E ÍNDICES\n');
    
    const constraints = await pool.query(`
      SELECT
        con.conname as constraint_name,
        con.contype as constraint_type
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'leads'
    `);
    
    if (constraints.rows.length > 0) {
      console.log('Constraints:');
      constraints.rows.forEach(c => {
        const type = {
          'p': 'PRIMARY KEY',
          'f': 'FOREIGN KEY',
          'u': 'UNIQUE',
          'c': 'CHECK'
        }[c.constraint_type] || c.constraint_type;
        console.log(`  - ${c.constraint_name} (${type})`);
      });
    }
    
    console.log('\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkLeadsTable();
