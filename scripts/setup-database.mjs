import pg from 'pg';

const { Client } = pg;

// Database connection
const connectionString = '${process.env.DATABASE_URL}';

async function setupDatabase() {
  console.log('Connecting to Supabase PostgreSQL...');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // Create users table
    console.log('\nCreating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telefone VARCHAR(20) UNIQUE NOT NULL,
        nome VARCHAR(255),
        role VARCHAR(20) DEFAULT 'corretor' CHECK (role IN ('corretor', 'gerente', 'admin')),
        imobiliaria_id UUID,
        gerente_id UUID REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        onboarding_status VARCHAR(20) DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'name_requested', 'completed')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Users table created!');

    // Create sessions table
    console.log('\nCreating sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        otp_code VARCHAR(6),
        otp_expires_at TIMESTAMPTZ,
        is_verified BOOLEAN DEFAULT false,
        device_info JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_activity TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Sessions table created!');

    // Create tracking_events table
    console.log('\nCreating tracking_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        page VARCHAR(255),
        session_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Tracking events table created!');

    // Create conversations table
    console.log('\nCreating conversations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        telefone VARCHAR(20) NOT NULL,
        messages JSONB DEFAULT '[]',
        context JSONB,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Conversations table created!');

    // Create whatsapp_queue table
    console.log('\nCreating whatsapp_queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telefone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      )
    `);
    console.log('WhatsApp queue table created!');

    // Create indexes
    console.log('\nCreating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_telefone ON users(telefone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tracking_user ON tracking_events(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tracking_type ON tracking_events(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_queue(status)`);
    console.log('Indexes created!');

    // Insert admin users
    console.log('\nInserting admin users...');

    const admins = [
      { telefone: '5511991143605', nome: 'Admin Saraiva', role: 'admin' },
      { telefone: '5511940716662', nome: 'Admin 2', role: 'admin' }
    ];

    for (const admin of admins) {
      const result = await client.query(`
        INSERT INTO users (telefone, nome, role, is_active, onboarding_status)
        VALUES ($1, $2, $3, true, 'completed')
        ON CONFLICT (telefone) DO UPDATE SET
          nome = EXCLUDED.nome,
          role = EXCLUDED.role,
          is_active = true,
          onboarding_status = 'completed'
        RETURNING id, telefone, nome, role
      `, [admin.telefone, admin.nome, admin.role]);

      console.log(`Admin created/updated: ${result.rows[0].nome} (${result.rows[0].telefone}) - role: ${result.rows[0].role}`);
    }

    // Verify setup
    console.log('\n--- Verification ---');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    console.log('Tables created:', tables.rows.map(r => r.table_name).join(', '));

    const users = await client.query('SELECT id, telefone, nome, role FROM users');
    console.log('\nUsers in database:');
    users.rows.forEach(u => {
      console.log(`  - ${u.nome} (${u.telefone}) - ${u.role}`);
    });

    console.log('\n✅ Database setup completed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('\nTrying alternative connection...');
      // Try direct connection without pooler
      const altClient = new Client({
        connectionString: 'postgresql://postgres:bedfc102-a7b6-40aa-b1fb-abf016c1f7f5@db.eulzstvztprrhxrbkzyg.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
      });
      try {
        await altClient.connect();
        console.log('Alternative connection successful!');
        // Re-run setup with altClient...
      } catch (altError) {
        console.error('Alternative connection also failed:', altError.message);
      }
    }
  } finally {
    await client.end();
  }
}

setupDatabase();
