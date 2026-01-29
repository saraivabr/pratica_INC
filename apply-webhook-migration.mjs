import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('📦 Aplicando migration 029_webhook_logs.sql...\n');
  
  const sql = fs.readFileSync('./migrations/029_webhook_logs.sql', 'utf8');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    // Try direct execution if rpc fails
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error: stmtError } = await supabase.from('_temp').select('*').limit(0);
        // This is just to test connection - actual SQL needs to be run via psql
      }
    }
    
    console.log('⚠️  Migration precisa ser aplicada via psql:');
    console.log('   psql $DATABASE_URL < migrations/029_webhook_logs.sql\n');
    return false;
  }
  
  console.log('✅ Migration aplicada com sucesso!\n');
  return true;
}

applyMigration();
