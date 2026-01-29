#!/usr/bin/env node
const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importar() {
  console.log('🏢 Importando empreendimentos...\n');
  
  const data = JSON.parse(fs.readFileSync('/var/www/pratica/data/buildings_map.json', 'utf8'));
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    let imported = 0;
    
    for (const b of data) {
      try {
        await client.query(`
          INSERT INTO cvcrm_empreendimentos (cvcrm_id, nome, endereco_completo, cidade, uf, status)
          VALUES ($1, $2, $3, $4, $5, 'ativo')
          ON CONFLICT (cvcrm_id) DO UPDATE 
          SET nome = EXCLUDED.nome, endereco_completo = EXCLUDED.endereco_completo
        `, [b.id, b.nome || b.name, b.endereco || b.address, b.cidade || 'São Paulo', b.estado || 'SP']);
        imported++;
        process.stdout.write(`\r   Importados: ${imported}`);
      } catch (err) {
        console.error(`\nErro:`, err.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ ${imported} empreendimentos importados!\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

importar();
