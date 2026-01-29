import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('=== Corrigindo tenant_id dos leads ===\n');

  // Update leads with null tenant_id to tenant_id = 1
  const result = await pool.query(`
    UPDATE cvcrm_leads
    SET tenant_id = 1
    WHERE tenant_id IS NULL
  `);

  console.log(`Leads atualizados: ${result.rowCount}`);

  // Verify
  const verifyResult = await pool.query(`
    SELECT tenant_id, COUNT(*) as total
    FROM cvcrm_leads
    GROUP BY tenant_id
    ORDER BY total DESC
  `);
  console.log('\nLeads por tenant_id após correção:');
  verifyResult.rows.forEach(r => console.log(`  tenant_id=${r.tenant_id}: ${r.total} leads`));

  await pool.end();
}

main();
