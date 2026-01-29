import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('=== Debug Leads API ===\n');

  // Check tenant_id distribution
  const tenantResult = await pool.query(`
    SELECT tenant_id, COUNT(*) as total
    FROM cvcrm_leads
    GROUP BY tenant_id
    ORDER BY total DESC
  `);
  console.log('Leads por tenant_id:');
  tenantResult.rows.forEach(r => console.log(`  tenant_id=${r.tenant_id}: ${r.total} leads`));

  // Check if leads exist without tenant_id
  const noTenantResult = await pool.query(`
    SELECT COUNT(*) as total FROM cvcrm_leads WHERE tenant_id IS NULL
  `);
  console.log(`\nLeads sem tenant_id: ${noTenantResult.rows[0].total}`);

  // Sample lead
  const sampleResult = await pool.query(`
    SELECT idlead, nome, corretor_id, tenant_id, synced_at
    FROM cvcrm_leads
    LIMIT 3
  `);
  console.log('\nAmostra de leads:');
  sampleResult.rows.forEach(r => console.log(`  ${r.idlead}: ${r.nome} | corretor_id=${r.corretor_id} | tenant_id=${r.tenant_id}`));

  await pool.end();
}

main();
