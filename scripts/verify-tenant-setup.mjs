#!/usr/bin/env node
/**
 * Script de verificação do setup de tenant/imobiliaria
 *
 * Verifica se a migration 013 foi aplicada e se os dados estão consistentes
 *
 * Uso: node scripts/verify-tenant-setup.mjs
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  console.log('🔍 Verificando setup de tenant/imobiliaria...\n');

  let hasErrors = false;

  try {
    // 1. Verificar se coluna tenant_id existe em imobiliarias
    console.log('1. Verificando coluna tenant_id em imobiliarias...');
    const imobColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'imobiliarias' AND column_name = 'tenant_id'
    `);

    if (imobColumns.rows.length === 0) {
      console.log('   ❌ Coluna tenant_id NÃO existe em imobiliarias');
      console.log('   ⚠️  Execute a migration: migrations/013_fix_tenant_relations.sql');
      hasErrors = true;
    } else {
      console.log('   ✅ Coluna tenant_id existe em imobiliarias');
    }

    // 2. Verificar se coluna tenant_id existe em users
    console.log('\n2. Verificando coluna tenant_id em users...');
    const usersColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'tenant_id'
    `);

    if (usersColumns.rows.length === 0) {
      console.log('   ❌ Coluna tenant_id NÃO existe em users');
      console.log('   ⚠️  Execute a migration: migrations/013_fix_tenant_relations.sql');
      hasErrors = true;
    } else {
      console.log('   ✅ Coluna tenant_id existe em users');
    }

    // 3. Verificar imobiliarias sem tenant_id
    console.log('\n3. Verificando imobiliarias sem tenant_id...');
    const imobsSemTenant = await pool.query(`
      SELECT id, nome FROM imobiliarias WHERE tenant_id IS NULL
    `);

    if (imobsSemTenant.rows.length > 0) {
      console.log(`   ⚠️  ${imobsSemTenant.rows.length} imobiliaria(s) sem tenant_id:`);
      imobsSemTenant.rows.forEach(row => {
        console.log(`      - ${row.nome} (${row.id})`);
      });
      hasErrors = true;
    } else {
      console.log('   ✅ Todas as imobiliarias têm tenant_id');
    }

    // 4. Verificar usuarios sem tenant_id
    console.log('\n4. Verificando usuarios sem tenant_id...');
    const usersSemTenant = await pool.query(`
      SELECT id, nome, email FROM users WHERE tenant_id IS NULL AND imobiliaria_id IS NOT NULL
    `);

    if (usersSemTenant.rows.length > 0) {
      console.log(`   ⚠️  ${usersSemTenant.rows.length} usuario(s) com imobiliaria mas sem tenant_id:`);
      usersSemTenant.rows.slice(0, 5).forEach(row => {
        console.log(`      - ${row.nome} (${row.email})`);
      });
      if (usersSemTenant.rows.length > 5) {
        console.log(`      ... e mais ${usersSemTenant.rows.length - 5}`);
      }
    } else {
      console.log('   ✅ Todos os usuarios com imobiliaria têm tenant_id');
    }

    // 5. Verificar tenants com evolution_instances
    console.log('\n5. Verificando tenants com WhatsApp configurado...');
    const tenantsComWhatsapp = await pool.query(`
      SELECT id, name, slug, evolution_instances
      FROM tenants
      WHERE evolution_instances IS NOT NULL
        AND jsonb_array_length(evolution_instances) > 0
    `);

    console.log(`   📱 ${tenantsComWhatsapp.rows.length} tenant(s) com WhatsApp:`);
    tenantsComWhatsapp.rows.forEach(row => {
      const instances = row.evolution_instances || [];
      console.log(`      - ${row.name} (${row.slug}): ${instances.length} instancia(s)`);
      instances.forEach((inst, i) => {
        console.log(`        ${i + 1}. ${inst.instance_name} - ${inst.status || 'unknown'}`);
      });
    });

    // 6. Verificar mensagens WhatsApp por tenant
    console.log('\n6. Verificando mensagens WhatsApp por tenant...');
    const msgsPorTenant = await pool.query(`
      SELECT
        tenant_id,
        instance_name,
        COUNT(*) as total_msgs,
        MAX(created_at) as ultima_msg
      FROM whatsapp_messages
      GROUP BY tenant_id, instance_name
      ORDER BY ultima_msg DESC
      LIMIT 10
    `);

    if (msgsPorTenant.rows.length > 0) {
      console.log(`   💬 Mensagens por tenant/instância:`);
      msgsPorTenant.rows.forEach(row => {
        console.log(`      - Tenant ${row.tenant_id} / ${row.instance_name}: ${row.total_msgs} msgs (última: ${new Date(row.ultima_msg).toLocaleString()})`);
      });
    } else {
      console.log('   📭 Nenhuma mensagem WhatsApp encontrada');
    }

    // Resumo final
    console.log('\n' + '='.repeat(50));
    if (hasErrors) {
      console.log('❌ Verificação encontrou problemas. Corrija antes de continuar.');
      process.exit(1);
    } else {
      console.log('✅ Verificação concluída com sucesso!');
      console.log('\nO sistema de tenant/imobiliaria está configurado corretamente.');
    }

  } catch (error) {
    console.error('\n❌ Erro durante verificação:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
