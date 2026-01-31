/**
 * Migrate remaining tables with special handling
 */

import { Pool } from 'pg';

const SOURCE_DB = {
  connectionString: process.env.SOURCE_DATABASE_URL || '',
};

const TARGET_DB = {
  connectionString: process.env.TARGET_DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
};

const sourcePool = new Pool(SOURCE_DB);
const targetPool = new Pool(TARGET_DB);

async function migrateTenants() {
  console.log('📦 Migrating tenants...');

  const { rows } = await sourcePool.query(`
    SELECT id, slug, name, cvcrm_config, status, plan, max_leads, max_users,
           max_whatsapp_instances, metadata, settings, evolution_instances,
           created_at, updated_at, suspended_at, cancelled_at
    FROM tenants
  `);

  for (const row of rows) {
    try {
      await targetPool.query(`
        INSERT INTO tenants (id, slug, name, cvcrm_config, status, plan, max_leads, max_users,
          max_whatsapp_instances, metadata, settings, evolution_instances,
          created_at, updated_at, suspended_at, cancelled_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING
      `, [
        row.id, row.slug, row.name, row.cvcrm_config, row.status, row.plan,
        row.max_leads, row.max_users, row.max_whatsapp_instances, row.metadata,
        row.settings, row.evolution_instances, row.created_at, row.updated_at,
        row.suspended_at, row.cancelled_at
      ]);
    } catch (error: any) {
      console.error(`   Error inserting tenant ${row.id}:`, error.message);
    }
  }
  console.log(`   ✅ ${rows.length} tenants migrated`);
}

async function migrateSofiaEmbeddings() {
  console.log('📦 Migrating sofia_embeddings...');

  // Check source columns
  const { rows: columns } = await sourcePool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sofia_embeddings'
    ORDER BY ordinal_position
  `);

  console.log('   Source columns:', columns.map(c => c.column_name).join(', '));

  // Check target columns
  const { rows: targetCols } = await targetPool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sofia_embeddings'
    ORDER BY ordinal_position
  `);

  console.log('   Target columns:', targetCols.map(c => c.column_name).join(', '));

  // Find common columns
  const sourceColSet = new Set(columns.map(c => c.column_name));
  const targetColSet = new Set(targetCols.map(c => c.column_name));
  const commonCols = [...sourceColSet].filter(c => targetColSet.has(c));

  console.log('   Common columns:', commonCols.join(', '));

  if (commonCols.length === 0) {
    console.log('   ⚠️  No common columns, skipping');
    return;
  }

  const colList = commonCols.map(c => `"${c}"`).join(', ');

  const { rows } = await sourcePool.query(`SELECT ${colList} FROM sofia_embeddings`);

  await targetPool.query('TRUNCATE TABLE sofia_embeddings CASCADE');

  for (const row of rows) {
    const placeholders = commonCols.map((_, i) => `$${i + 1}`).join(', ');
    const values = commonCols.map(c => row[c]);

    try {
      await targetPool.query(
        `INSERT INTO sofia_embeddings (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
    } catch (error: any) {
      console.error(`   Error:`, error.message);
    }
  }
  console.log(`   ✅ ${rows.length} embeddings migrated`);
}

async function migrateSyncLogs() {
  console.log('📦 Migrating sync_logs...');

  // Check columns first
  const { rows: sourceCols } = await sourcePool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'sync_logs'
    ORDER BY ordinal_position
  `);

  const { rows: targetCols } = await targetPool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'sync_logs'
    ORDER BY ordinal_position
  `);

  console.log('   Source:', sourceCols.map(c => c.column_name).join(', '));
  console.log('   Target:', targetCols.map(c => c.column_name).join(', '));

  const sourceColSet = new Set(sourceCols.map(c => c.column_name));
  const targetColSet = new Set(targetCols.map(c => c.column_name));
  const commonCols = [...sourceColSet].filter(c => targetColSet.has(c));

  if (commonCols.length === 0) {
    console.log('   ⚠️  No common columns, skipping');
    return;
  }

  const colList = commonCols.map(c => `"${c}"`).join(', ');
  const { rows } = await sourcePool.query(`SELECT ${colList} FROM sync_logs`);

  await targetPool.query('TRUNCATE TABLE sync_logs CASCADE');

  let migrated = 0;
  for (const row of rows) {
    const placeholders = commonCols.map((_, i) => `$${i + 1}`).join(', ');
    const values = commonCols.map(c => row[c]);

    try {
      await targetPool.query(
        `INSERT INTO sync_logs (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      migrated++;
    } catch (error: any) {
      console.error(`   Error:`, error.message);
    }
  }
  console.log(`   ✅ ${migrated}/${rows.length} sync_logs migrated`);
}

async function main() {
  console.log('🚀 Migrating remaining tables\n');

  try {
    await migrateTenants();
    await migrateSofiaEmbeddings();
    await migrateSyncLogs();

    // Check final status
    console.log('\n📊 Final status:');
    const tables = ['tenants', 'sofia_embeddings', 'sync_logs'];
    for (const table of tables) {
      const { rows } = await targetPool.query(`SELECT COUNT(*) as c FROM "${table}"`);
      console.log(`   ${table}: ${rows[0].c} rows`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main();
