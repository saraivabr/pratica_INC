require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function applyMigration() {
  try {
    console.log('Applying migration 027...');
    const sql = fs.readFileSync('./migrations/027_fix_missing_columns_critical.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Migration 027 applied successfully');
    
    // Verify
    const check = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_contacts' 
      AND column_name IN ('total_messages_received', 'total_messages_sent')
    `);
    console.log('Verified columns:', check.rows.map(r => r.column_name));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigration();
