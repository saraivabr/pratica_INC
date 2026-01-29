/**
 * Script para sincronizar corretores do CV CRM para a tabela users
 *
 * 1. Busca corretores únicos dos leads já sincronizados
 * 2. Cria usuários novos ou atualiza cvcrm_id dos existentes
 * 3. Mapeia por telefone ou email quando possível
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface CorretorFromLeads {
  corretor_id: number;
  nome: string;
  email: string;
  total_leads: number;
}

async function syncCorretoresToUsers() {
  console.log('=== Sincronizando Corretores para Users ===\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Buscar todos os corretores únicos dos leads
    console.log('1. Buscando corretores dos leads sincronizados...');
    const corretoresResult = await client.query<CorretorFromLeads>(`
      SELECT DISTINCT
        corretor_id,
        corretor->>'nome' as nome,
        corretor->>'email' as email,
        COUNT(*) as total_leads
      FROM cvcrm_leads
      WHERE corretor_id IS NOT NULL
      GROUP BY corretor_id, corretor->>'nome', corretor->>'email'
      ORDER BY total_leads DESC
    `);

    console.log(`   Encontrados ${corretoresResult.rows.length} corretores únicos\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const corretor of corretoresResult.rows) {
      // 2. Verificar se já existe usuário com esse cvcrm_id
      const existingById = await client.query(
        'SELECT id, nome FROM users WHERE cvcrm_id = $1',
        [corretor.corretor_id]
      );

      if (existingById.rows.length > 0) {
        skipped++;
        continue;
      }

      // 3. Tentar encontrar por email
      if (corretor.email) {
        const existingByEmail = await client.query(
          'SELECT id, nome, cvcrm_id FROM users WHERE email = $1',
          [corretor.email.toLowerCase()]
        );

        if (existingByEmail.rows.length > 0 && !existingByEmail.rows[0].cvcrm_id) {
          await client.query(
            'UPDATE users SET cvcrm_id = $1 WHERE id = $2',
            [corretor.corretor_id, existingByEmail.rows[0].id]
          );
          console.log(`   ✅ Atualizado ${corretor.nome} (por email)`);
          updated++;
          continue;
        }
      }

      // 4. Tentar encontrar por nome similar
      const existingByName = await client.query(
        `SELECT id, nome, cvcrm_id FROM users
         WHERE cvcrm_id IS NULL
         AND (
           LOWER(nome) LIKE LOWER($1)
           OR LOWER($2) LIKE '%' || LOWER(SPLIT_PART(nome, ' ', 1)) || '%'
         )
         LIMIT 1`,
        [`%${corretor.nome.split(' ')[0]}%`, corretor.nome]
      );

      if (existingByName.rows.length > 0) {
        await client.query(
          'UPDATE users SET cvcrm_id = $1, email = COALESCE(email, $2) WHERE id = $3',
          [corretor.corretor_id, corretor.email, existingByName.rows[0].id]
        );
        console.log(`   ✅ Atualizado ${existingByName.rows[0].nome} -> cvcrm_id: ${corretor.corretor_id}`);
        updated++;
        continue;
      }

      // 5. Criar novo usuário se não encontrou correspondência
      // Gerar telefone placeholder único
      const placeholderPhone = `+5511${900000000 + corretor.corretor_id}`;

      try {
        await client.query(`
          INSERT INTO users (
            telefone, nome, email, role, cvcrm_id,
            is_active, onboarding_status, created_at
          ) VALUES (
            $1, $2, $3, 'corretor', $4,
            true, 'completed', NOW()
          )
          ON CONFLICT (telefone) DO UPDATE SET
            cvcrm_id = EXCLUDED.cvcrm_id,
            email = COALESCE(users.email, EXCLUDED.email)
        `, [placeholderPhone, corretor.nome, corretor.email, corretor.corretor_id]);

        console.log(`   ➕ Criado ${corretor.nome} (${corretor.total_leads} leads)`);
        created++;
      } catch (err: any) {
        console.log(`   ⚠️  Erro ao criar ${corretor.nome}: ${err.message}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n=== Resumo ===');
    console.log(`   Criados: ${created}`);
    console.log(`   Atualizados: ${updated}`);
    console.log(`   Já mapeados: ${skipped}`);

    // 6. Mostrar resultado final
    console.log('\n=== Corretores com leads após sync ===\n');
    const finalResult = await client.query(`
      SELECT u.nome, u.cvcrm_id, u.email,
             (SELECT COUNT(*) FROM cvcrm_leads l WHERE l.corretor_id = u.cvcrm_id) as leads
      FROM users u
      WHERE u.cvcrm_id IS NOT NULL AND u.role = 'corretor'
      ORDER BY leads DESC
      LIMIT 15
    `);

    finalResult.rows.forEach((r, i) => {
      console.log(`${i+1}. ${r.nome} | cvcrm_id: ${r.cvcrm_id} | Leads: ${r.leads}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

syncCorretoresToUsers()
  .then(() => {
    console.log('\n✅ Sincronização concluída!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Falha na sincronização:', err);
    process.exit(1);
  });
