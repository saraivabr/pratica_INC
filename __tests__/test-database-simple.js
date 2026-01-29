const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const DATABASE_URL = dbUrlLine?.replace('DATABASE_URL=', '').replace(/"/g, '').trim();

async function testDatabase() {
  console.log('🗄️  TESTE RÁPIDO - BANCO DE DADOS');
  console.log('==================================\n');

  if (!DATABASE_URL) {
    console.log('❌ DATABASE_URL não encontrada');
    return;
  }

  console.log('📍 Servidor:', DATABASE_URL.match(/@([^:]+)/)?.[1] || 'desconhecido');
  console.log('');

  // Detectar se é Scalingo e usar SSL
  const isScalingo = DATABASE_URL.includes('scalingo-dbs.com');
  const isSupabase = DATABASE_URL.includes('supabase.co');
  
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: (isScalingo || isSupabase) ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Conectando...');
    const result = await pool.query('SELECT NOW(), current_database() as db');
    console.log(`✅ CONECTADO!`);
    console.log(`   Database: ${result.rows[0].db}`);
    console.log(`   Timestamp: ${result.rows[0].now}\n`);

    console.log('📊 Verificando tabelas...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`✅ Total: ${tables.rows.length} tabelas\n`);
    
    // Mostrar tabelas importantes
    const importantes = ['users', 'sessions', 'leads', 'empreendimentos', 'unidades'];
    console.log('🔍 Tabelas importantes:');
    
    for (const tabela of importantes) {
      const existe = tables.rows.find(t => t.table_name === tabela);
      if (existe) {
        try {
          const count = await pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
          console.log(`   ✅ ${tabela.padEnd(20)} - ${count.rows[0].total} registros`);
        } catch (e) {
          console.log(`   ⚠️  ${tabela.padEnd(20)} - Erro ao contar`);
        }
      } else {
        console.log(`   ❌ ${tabela.padEnd(20)} - NÃO EXISTE`);
      }
    }
    
    console.log('\n==================================');
    console.log('✅ Teste concluído!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('\n💡 Dica: Verifique se DATABASE_URL está correto em .env.local\n');
  } finally {
    await pool.end();
  }
}

testDatabase();
