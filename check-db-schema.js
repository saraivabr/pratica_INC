require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function checkSchema() {
  try {
    // List all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n=== TABLES IN DATABASE ===');
    tables.rows.forEach(r => console.log('-', r.table_name));
    
    // Check whatsapp_contacts columns
    console.log('\n=== whatsapp_contacts COLUMNS ===');
    const whatsappColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_contacts'
      ORDER BY ordinal_position
    `);
    
    if (whatsappColumns.rows.length === 0) {
      console.log('❌ Table whatsapp_contacts does NOT exist');
    } else {
      whatsappColumns.rows.forEach(r => console.log('-', r.column_name, ':', r.data_type));
    }
    
    // Check onboarding_leads table
    console.log('\n=== onboarding_leads TABLE ===');
    const onboardingCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'onboarding_leads'
      );
    `);
    console.log('Exists:', onboardingCheck.rows[0].exists);
    
    // Check agent_configs columns
    console.log('\n=== agent_configs COLUMNS ===');
    const agentConfigColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agent_configs'
      ORDER BY ordinal_position
    `);
    
    if (agentConfigColumns.rows.length === 0) {
      console.log('❌ Table agent_configs does NOT exist');
    } else {
      agentConfigColumns.rows.forEach(r => console.log('-', r.column_name, ':', r.data_type));
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
