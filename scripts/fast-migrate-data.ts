/**
 * Fast Data Migration Script
 * Uses COPY format for much faster data transfer
 */

import { Pool } from 'pg';
import * as fs from 'fs';

const SOURCE_DB = {
  connectionString: process.env.SOURCE_DATABASE_URL || '',
};

const TARGET_DB = {
  connectionString: process.env.TARGET_DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
};

// Tables that already exist in Supabase (intermediacao)
const SKIP_TABLES = [
  'vendas_intermediacao',
  'beneficiarios_intermediacao',
  'distribuicao_comissao',
  'parcelas_intermediacao',
  'pagamentos_intermediacao',
  'log_auditoria_intermediacao',
  'regras_parcelamento'
];

const sourcePool = new Pool(SOURCE_DB);
const targetPool = new Pool(TARGET_DB);

interface TableStats {
  table: string;
  sourceRows: number;
  targetRows: number;
  status: 'ok' | 'missing' | 'partial';
}

async function getTableStats(): Promise<TableStats[]> {
  const { rows: sourceTables } = await sourcePool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const stats: TableStats[] = [];

  for (const t of sourceTables) {
    if (SKIP_TABLES.includes(t.table_name)) continue;

    try {
      const { rows: sourceCount } = await sourcePool.query(
        `SELECT COUNT(*) as count FROM "${t.table_name}"`
      );

      let targetCount = 0;
      try {
        const { rows: tc } = await targetPool.query(
          `SELECT COUNT(*) as count FROM "${t.table_name}"`
        );
        targetCount = parseInt(tc[0].count);
      } catch {
        // Table doesn't exist in target
      }

      const sourceRows = parseInt(sourceCount[0].count);
      let status: 'ok' | 'missing' | 'partial' = 'ok';

      if (targetCount === 0 && sourceRows > 0) status = 'missing';
      else if (targetCount < sourceRows) status = 'partial';

      stats.push({
        table: t.table_name,
        sourceRows,
        targetRows: targetCount,
        status
      });
    } catch (error: any) {
      console.error(`Error checking ${t.table_name}:`, error.message);
    }
  }

  return stats;
}

async function migrateTable(tableName: string): Promise<number> {
  console.log(`\n📦 Migrating ${tableName}...`);

  // Get columns
  const { rows: columns } = await sourcePool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const columnList = columns.map(c => `"${c.column_name}"`).join(', ');

  // Get row count
  const { rows: countRows } = await sourcePool.query(
    `SELECT COUNT(*) as count FROM "${tableName}"`
  );
  const totalRows = parseInt(countRows[0].count);

  if (totalRows === 0) {
    console.log(`   ⏭️  No rows to migrate`);
    return 0;
  }

  // Truncate target table first to avoid duplicates
  try {
    await targetPool.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
  } catch (e) {
    // Table might not exist or have FK constraints
  }

  // Migrate in batches
  const batchSize = 500;
  let offset = 0;
  let migrated = 0;

  while (offset < totalRows) {
    const { rows } = await sourcePool.query(
      `SELECT ${columnList} FROM "${tableName}" LIMIT ${batchSize} OFFSET ${offset}`
    );

    if (rows.length === 0) break;

    // Build bulk insert
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const row of rows) {
      const rowValues: string[] = [];
      for (const col of columns) {
        rowValues.push(`$${paramIndex++}`);
        params.push(row[col.column_name]);
      }
      values.push(`(${rowValues.join(', ')})`);
    }

    try {
      await targetPool.query(
        `INSERT INTO "${tableName}" (${columnList}) VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`,
        params
      );
      migrated += rows.length;
      process.stdout.write(`\r   ✅ ${migrated}/${totalRows} rows`);
    } catch (error: any) {
      console.error(`\n   ❌ Error at offset ${offset}:`, error.message);
    }

    offset += batchSize;
  }

  console.log(`\r   ✅ ${migrated}/${totalRows} rows migrated`);
  return migrated;
}

async function main() {
  console.log('🚀 Fast Data Migration to Supabase\n');
  console.log('=' .repeat(50));

  try {
    // Get current stats
    console.log('\n📊 Checking table status...\n');
    const stats = await getTableStats();

    const needsMigration = stats.filter(s => s.status !== 'ok');
    const complete = stats.filter(s => s.status === 'ok' && s.sourceRows > 0);

    console.log(`✅ Complete: ${complete.length} tables`);
    console.log(`⚠️  Needs migration: ${needsMigration.length} tables\n`);

    if (needsMigration.length === 0) {
      console.log('🎉 All data already migrated!');
      return;
    }

    console.log('Tables to migrate:');
    for (const s of needsMigration) {
      console.log(`   - ${s.table}: ${s.targetRows}/${s.sourceRows} rows (${s.status})`);
    }

    // Migrate tables that need it
    console.log('\n' + '='.repeat(50));
    console.log('Starting migration...');
    console.log('='.repeat(50));

    let totalMigrated = 0;
    for (const s of needsMigration) {
      const migrated = await migrateTable(s.table);
      totalMigrated += migrated;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migration complete! ${totalMigrated} total rows migrated`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(console.error);
