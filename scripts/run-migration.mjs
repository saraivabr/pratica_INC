import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Creating salva_leads_conversations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS salva_leads_conversations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        atendimento_id VARCHAR(100) NOT NULL,
        lead_phone VARCHAR(50) NOT NULL,
        lead_name VARCHAR(255),
        corretor_id VARCHAR(100) NOT NULL,
        corretor_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        classification VARCHAR(50),
        context JSONB DEFAULT '{}'::jsonb,
        messages JSONB DEFAULT '[]'::jsonb,
        pending_messages JSONB DEFAULT '[]'::jsonb,
        debounce_until TIMESTAMP,
        bot_paused BOOLEAN DEFAULT FALSE,
        bot_paused_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, atendimento_id)
      )
    `);
    console.log('✓ Created salva_leads_conversations');

    console.log('Creating salva_leads_runs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS salva_leads_runs (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id),
        corretor_id VARCHAR(100),
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        leads_processed INTEGER DEFAULT 0,
        leads_sent INTEGER DEFAULT 0,
        results JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created salva_leads_runs');

    console.log('Creating salva_leads_tool_calls...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS salva_leads_tool_calls (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES salva_leads_conversations(id),
        tool_name VARCHAR(100) NOT NULL,
        tool_input JSONB,
        tool_output JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created salva_leads_tool_calls');

    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_slc_phone ON salva_leads_conversations(lead_phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_slc_status ON salva_leads_conversations(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_slr_tenant ON salva_leads_runs(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sltc_conversation ON salva_leads_tool_calls(conversation_id)');
    console.log('✓ Created indexes');

    // Create trigger if not exists
    console.log('Creating trigger...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_salva_leads_conversations_updated_at') THEN
          CREATE TRIGGER update_salva_leads_conversations_updated_at
          BEFORE UPDATE ON salva_leads_conversations
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END
      $$;
    `);
    console.log('✓ Created trigger');

    // Verify
    const result = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'salva_leads%'");
    console.log('\nTables created:', result.rows.map(r => r.table_name).join(', '));
    console.log('\n✓ Migration completed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
