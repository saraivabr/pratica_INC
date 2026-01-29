import { config } from 'dotenv';
config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    // Get column info
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'cvcrm_leads'
      ORDER BY ordinal_position
    `);

    console.log('COLUNAS DISPONÍVEIS NA TABELA cvcrm_leads:\n');
    for (const col of columns.rows) {
      console.log(`  ${col.column_name.padEnd(40)} | ${col.data_type}`);
    }

    // Get one lead sample with all data
    console.log('\n\n' + '='.repeat(60));
    console.log('EXEMPLO COMPLETO DE UM LEAD (Mônica Chagas):');
    console.log('='.repeat(60) + '\n');

    const sample = await client.query(`
      SELECT * FROM cvcrm_leads
      WHERE nome ILIKE '%mônica chagas%'
      LIMIT 1
    `);

    if (sample.rows[0]) {
      const lead = sample.rows[0];
      for (const [key, value] of Object.entries(lead)) {
        if (value !== null && value !== '' && JSON.stringify(value) !== '[]') {
          const valStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          console.log(`${key}:`);
          if (valStr.length > 300) {
            console.log(`  ${valStr.substring(0, 300)}...`);
          } else {
            console.log(`  ${valStr}`);
          }
          console.log('');
        }
      }
    }

    // Check another lead with more data
    console.log('\n' + '='.repeat(60));
    console.log('OUTRO LEAD COM MAIS DADOS (Davi A rocha):');
    console.log('='.repeat(60) + '\n');

    const sample2 = await client.query(`
      SELECT * FROM cvcrm_leads
      WHERE nome ILIKE '%davi%rocha%'
      LIMIT 1
    `);

    if (sample2.rows[0]) {
      const lead = sample2.rows[0];
      for (const [key, value] of Object.entries(lead)) {
        if (value !== null && value !== '' && JSON.stringify(value) !== '[]') {
          const valStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          console.log(`${key}:`);
          if (valStr.length > 300) {
            console.log(`  ${valStr.substring(0, 300)}...`);
          } else {
            console.log(`  ${valStr}`);
          }
          console.log('');
        }
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}
main();
