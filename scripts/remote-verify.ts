import { Pool } from 'pg';

const pool = new Pool({
  connectionString: "${process.env.DATABASE_URL}"
});

async function main() {
  console.log('🚀 Iniciando Validação do Sistema no Banco Remoto...\n');

  // 1. Verificar Leads
  const leadsResult = await pool.query('SELECT COUNT(*) as total FROM cvcrm_leads');
  console.log(`✅ Total de Leads no banco: ${leadsResult.rows[0].total}`);

  // 2. Verificar Usuários e Roles
  const usersResult = await pool.query(`
    SELECT role, COUNT(*) as total 
    FROM users 
    GROUP BY role
  `);
  console.log(`\n✅ Usuários por Perfil:`);
  usersResult.rows.forEach(r => console.log(`   - ${r.role}: ${r.total}`));

  // 3. Verificar Corretores com mais Leads
  const topCorretores = await pool.query(`
    SELECT corretor->>'nome' as nome, COUNT(*) as total
    FROM cvcrm_leads
    WHERE corretor_id IS NOT NULL
    GROUP BY corretor->>'nome'
    ORDER BY total DESC
    LIMIT 5
  `);
  console.log(`\n✅ Top 5 Corretores por volume de Leads:`);
  topCorretores.rows.forEach((r, i) => console.log(`   ${i+1}. ${r.nome}: ${r.total} leads`));

  // 4. Verificar Imobiliárias com mais Leads
  const topImobs = await pool.query(`
    SELECT imobiliaria->>'nome' as nome, COUNT(*) as total
    FROM cvcrm_leads
    WHERE imobiliaria_id IS NOT NULL
    GROUP BY imobiliaria->>'nome'
    ORDER BY total DESC
    LIMIT 5
  `);
  console.log(`\n✅ Top 5 Imobiliárias por volume de Leads:`);
  topImobs.rows.forEach((r, i) => console.log(`   ${i+1}. ${r.nome}: ${r.total} leads`));

  // 5. Verificar Academy
  const academyResult = await pool.query('SELECT COUNT(*) as total FROM academy_lessons');
  console.log(`\n✅ Lições no Academy: ${academyResult.rows[0].total}`);

  // 6. Verificar Assistências
  const assistResult = await pool.query('SELECT COUNT(*) as total FROM cvcrm_assistencias');
  console.log(`\n✅ Assistências Sincronizadas: ${assistResult.rows[0].total}`);

  await pool.end();
  console.log('\n✨ Validação de dados concluída.');
}

main().catch(console.error);
