const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || require('fs').readFileSync('.env.local', 'utf8')
  .split('\n')
  .find(line => line.startsWith('DATABASE_URL='))
  ?.replace('DATABASE_URL=', '')
  ?.replace(/"/g, '')
  ?.trim();

async function testDatabase() {
  console.log('🗄️  TESTE DE CONEXÃO - BANCO DE DADOS');
  console.log('=====================================\n');

  if (!DATABASE_URL) {
    console.log('❌ DATABASE_URL não encontrada');
    return;
  }

  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Aceitar certificados auto-assinados
  });

  try {
    // 1. Teste de conexão
    console.log('1️⃣ Testando conexão...');
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ Conectado! Timestamp: ${result.rows[0].now}\n`);

    // 2. Verificar tabelas existentes
    console.log('2️⃣ Verificando tabelas...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✅ Total de tabelas: ${tables.rows.length}`);
    console.log('Tabelas principais:');
    tables.rows.slice(0, 15).forEach(t => console.log(`   - ${t.table_name}`));
    if (tables.rows.length > 15) console.log(`   ... e mais ${tables.rows.length - 15}`);
    console.log('');

    // 3. Verificar tabela users
    console.log('3️⃣ Testando tabela USERS...');
    try {
      const users = await pool.query('SELECT COUNT(*) as total FROM users');
      console.log(`✅ Total de usuários: ${users.rows[0].total}\n`);
    } catch (e) {
      console.log(`⚠️  Tabela users: ${e.message}\n`);
    }

    // 4. Verificar tabela leads
    console.log('4️⃣ Testando tabela LEADS...');
    try {
      const leads = await pool.query('SELECT COUNT(*) as total FROM leads');
      console.log(`✅ Total de leads: ${leads.rows[0].total}\n`);
    } catch (e) {
      console.log(`⚠️  Tabela leads: ${e.message}\n`);
    }

    // 5. Verificar tabela sessions
    console.log('5️⃣ Testando tabela SESSIONS...');
    try {
      const sessions = await pool.query('SELECT COUNT(*) as total FROM sessions WHERE created_at > NOW() - INTERVAL \'7 days\'');
      console.log(`✅ Sessões ativas (últimos 7 dias): ${sessions.rows[0].total}\n`);
    } catch (e) {
      console.log(`⚠️  Tabela sessions: ${e.message}\n`);
    }

    // 6. Verificar tabelas salva-leads
    console.log('6️⃣ Verificando sistema SALVA-LEADS...');
    const salvaLeadsTables = tables.rows.filter(t => 
      t.table_name.includes('salva_leads') || 
      t.table_name.includes('followup') ||
      t.table_name.includes('agendamento') ||
      t.table_name.includes('notificac')
    );
    
    if (salvaLeadsTables.length > 0) {
      console.log(`✅ Encontradas ${salvaLeadsTables.length} tabelas relacionadas:`);
      salvaLeadsTables.forEach(t => console.log(`   - ${t.table_name}`));
    } else {
      console.log('⚠️  Nenhuma tabela salva-leads encontrada');
      console.log('   💡 Precisa rodar: psql $DATABASE_URL < lib/migrations/salva-leads-schema.sql');
    }
    console.log('');

    console.log('=====================================');
    console.log('✅ Auditoria de banco concluída!\n');

  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
