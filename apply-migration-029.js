#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const isSupabase = connectionString.includes('supabase.co');
const pool = new Pool({
  connectionString,
  ...(isSupabase && { ssl: { rejectUnauthorized: false } })
});

async function run() {
  try {
    console.log('📋 Aplicando migration 029_crm_automations.sql...');
    
    const sql = fs.readFileSync('./migrations/029_crm_automations.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Migration 029 aplicada com sucesso!');
    console.log('\nTabelas criadas:');
    console.log('  - notificacoes');
    console.log('  - automacoes_followup (com 3 automações padrão)');
    console.log('  - automacoes_execucoes');
    console.log('  - lembretes');
    console.log('  - salva_leads_config');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
