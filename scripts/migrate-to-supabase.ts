/**
 * Script de Migracao Completa para Supabase
 *
 * Este script:
 * 1. Exporta o schema do banco atual
 * 2. Exporta todos os dados
 * 3. Importa no Supabase
 *
 * Executa: npx tsx scripts/migrate-to-supabase.ts
 */

import { Pool, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Configuracoes
const SOURCE_DB = {
  host: '84.247.128.56',
  port: 3005,
  user: 'postgres',
  password: '356d20e7786bbbe6f375',
  database: 'pratica',
};

const TARGET_DB = {
  connectionString: 'postgresql://postgres:57fMaSlXw2cvpmH2@db.uwuwahlmykfkfxshnlbv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
};

const OUTPUT_DIR = '/Users/saraiva/_Projetos/appnovo_pratica/supabase/migrations/full_migration';

// Tabelas do sistema de intermediacao (ja existem no Supabase)
const SKIP_TABLES = [
  'vendas_intermediacao',
  'beneficiarios_intermediacao',
  'distribuicao_comissao',
  'parcelas_intermediacao',
  'pagamentos_intermediacao',
  'log_auditoria_intermediacao',
  'regras_parcelamento'
];

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey?: string;
  foreignKeys: ForeignKeyInfo[];
}

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  characterMaxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
}

interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

const sourcePool = new Pool(SOURCE_DB);
const targetPool = new Pool(TARGET_DB);

async function getTableList(): Promise<string[]> {
  const { rows } = await sourcePool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return rows.map(r => r.table_name).filter(t => !SKIP_TABLES.includes(t));
}

async function getTableInfo(tableName: string): Promise<TableInfo> {
  // Get columns
  const { rows: columns } = await sourcePool.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  // Get primary key
  const { rows: pkRows } = await sourcePool.query(`
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary
  `, [tableName]);

  // Get foreign keys
  const { rows: fkRows } = await sourcePool.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = $1
  `, [tableName]);

  return {
    name: tableName,
    columns: columns.map(c => ({
      name: c.column_name,
      dataType: mapDataType(c.data_type, c.udt_name),
      isNullable: c.is_nullable === 'YES',
      defaultValue: c.column_default,
      characterMaxLength: c.character_maximum_length,
      numericPrecision: c.numeric_precision,
      numericScale: c.numeric_scale,
    })),
    primaryKey: pkRows[0]?.attname,
    foreignKeys: fkRows.map(fk => ({
      constraintName: fk.constraint_name,
      columnName: fk.column_name,
      referencedTable: fk.foreign_table_name,
      referencedColumn: fk.foreign_column_name,
    })),
  };
}

function mapDataType(dataType: string, udtName: string): string {
  // Map PostgreSQL types
  const typeMap: Record<string, string> = {
    'character varying': `VARCHAR`,
    'character': 'CHAR',
    'integer': 'INTEGER',
    'bigint': 'BIGINT',
    'smallint': 'SMALLINT',
    'boolean': 'BOOLEAN',
    'text': 'TEXT',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ',
    'date': 'DATE',
    'time without time zone': 'TIME',
    'time with time zone': 'TIMETZ',
    'numeric': 'NUMERIC',
    'real': 'REAL',
    'double precision': 'DOUBLE PRECISION',
    'jsonb': 'JSONB',
    'json': 'JSON',
    'uuid': 'UUID',
    'bytea': 'BYTEA',
    'ARRAY': udtName.replace('_', '') + '[]',
    'USER-DEFINED': udtName === 'geometry' ? 'GEOMETRY' : udtName.toUpperCase(),
  };

  return typeMap[dataType] || dataType.toUpperCase();
}

function generateColumnSQL(col: ColumnInfo): string {
  let sql = `  "${col.name}" ${col.dataType}`;

  if (col.characterMaxLength && col.dataType === 'VARCHAR') {
    sql = `  "${col.name}" VARCHAR(${col.characterMaxLength})`;
  }

  if (col.numericPrecision && col.dataType === 'NUMERIC') {
    sql = `  "${col.name}" NUMERIC(${col.numericPrecision}${col.numericScale ? ',' + col.numericScale : ''})`;
  }

  if (!col.isNullable) {
    sql += ' NOT NULL';
  }

  if (col.defaultValue) {
    // Clean up default value
    let defaultVal = col.defaultValue;
    // Remove type casts that might not exist
    defaultVal = defaultVal.replace(/::character varying/g, '');
    defaultVal = defaultVal.replace(/::text/g, '');
    sql += ` DEFAULT ${defaultVal}`;
  }

  return sql;
}

function generateCreateTableSQL(table: TableInfo): string {
  const columns = table.columns.map(generateColumnSQL).join(',\n');

  let sql = `-- Table: ${table.name}\n`;
  sql += `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`;
  sql += columns;

  if (table.primaryKey) {
    sql += `,\n  PRIMARY KEY ("${table.primaryKey}")`;
  }

  sql += '\n);\n\n';

  return sql;
}

function generateForeignKeysSQL(table: TableInfo): string {
  if (table.foreignKeys.length === 0) return '';

  let sql = `-- Foreign Keys for ${table.name}\n`;
  for (const fk of table.foreignKeys) {
    sql += `ALTER TABLE "${table.name}" ADD CONSTRAINT "${fk.constraintName}" `;
    sql += `FOREIGN KEY ("${fk.columnName}") REFERENCES "${fk.referencedTable}"("${fk.referencedColumn}");\n`;
  }
  return sql + '\n';
}

async function getRowCount(tableName: string): Promise<number> {
  const { rows } = await sourcePool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
  return parseInt(rows[0].count);
}

async function exportTableData(tableName: string, outputFile: string): Promise<number> {
  const count = await getRowCount(tableName);
  if (count === 0) return 0;

  const { rows: columns } = await sourcePool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const columnList = columns.map(c => `"${c.column_name}"`).join(', ');

  // Export in batches for large tables
  const batchSize = 1000;
  let offset = 0;
  let allData: any[] = [];

  while (offset < count) {
    const { rows } = await sourcePool.query(
      `SELECT ${columnList} FROM "${tableName}" LIMIT ${batchSize} OFFSET ${offset}`
    );
    allData = allData.concat(rows);
    offset += batchSize;
  }

  // Generate INSERT statements
  let sql = `-- Data for ${tableName} (${count} rows)\n`;

  if (allData.length > 0) {
    // Use INSERT ... VALUES for each row (safer for special characters)
    for (const row of allData) {
      const values = columns.map(c => {
        const val = row[c.column_name];
        if (val === null) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return val.toString();
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');

      sql += `INSERT INTO "${tableName}" (${columnList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
    }
  }

  fs.appendFileSync(outputFile, sql);
  return count;
}

async function generateIndexesSQL(): Promise<string> {
  const { rows } = await sourcePool.query(`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      AND indexdef NOT LIKE '%UNIQUE%'
    ORDER BY tablename, indexname
  `);

  let sql = '-- Indexes\n';
  for (const idx of rows) {
    sql += `${idx.indexdef};\n`;
  }
  return sql + '\n';
}

async function main() {
  console.log('========================================');
  console.log('  MIGRACAO COMPLETA PARA SUPABASE');
  console.log('========================================\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Step 1: Get all tables
    console.log('1. Listando tabelas...');
    const tables = await getTableList();
    console.log(`   ${tables.length} tabelas encontradas\n`);

    // Step 2: Generate schema
    console.log('2. Gerando schema...');
    const schemaFile = path.join(OUTPUT_DIR, '02_schema.sql');
    fs.writeFileSync(schemaFile, '-- Schema Migration\n-- Generated at: ' + new Date().toISOString() + '\n\n');

    // Enable extensions
    fs.appendFileSync(schemaFile, '-- Extensions\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nCREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n');

    const tableInfos: TableInfo[] = [];
    for (const tableName of tables) {
      const info = await getTableInfo(tableName);
      tableInfos.push(info);
      fs.appendFileSync(schemaFile, generateCreateTableSQL(info));
    }
    console.log(`   Schema gerado: ${schemaFile}\n`);

    // Step 3: Generate foreign keys (separate file for dependency order)
    console.log('3. Gerando foreign keys...');
    const fkFile = path.join(OUTPUT_DIR, '04_foreign_keys.sql');
    fs.writeFileSync(fkFile, '-- Foreign Keys\n\n');
    for (const info of tableInfos) {
      fs.appendFileSync(fkFile, generateForeignKeysSQL(info));
    }
    console.log(`   Foreign keys geradas: ${fkFile}\n`);

    // Step 4: Generate indexes
    console.log('4. Gerando indexes...');
    const indexFile = path.join(OUTPUT_DIR, '05_indexes.sql');
    const indexSQL = await generateIndexesSQL();
    fs.writeFileSync(indexFile, indexSQL);
    console.log(`   Indexes gerados: ${indexFile}\n`);

    // Step 5: Export data
    console.log('5. Exportando dados...');
    const dataFile = path.join(OUTPUT_DIR, '03_data.sql');
    fs.writeFileSync(dataFile, '-- Data Migration\n-- Generated at: ' + new Date().toISOString() + '\n\n');

    let totalRows = 0;
    for (const tableName of tables) {
      const count = await exportTableData(tableName, dataFile);
      if (count > 0) {
        console.log(`   ${tableName}: ${count} rows`);
        totalRows += count;
      }
    }
    console.log(`\n   Total: ${totalRows} rows exportadas\n`);

    // Step 6: Summary
    console.log('========================================');
    console.log('         ARQUIVOS GERADOS');
    console.log('========================================');
    console.log(`\n${OUTPUT_DIR}/`);
    console.log('  01_schema.sql      - Intermediacao (ja aplicado)');
    console.log('  02_schema.sql      - Schema completo');
    console.log('  03_data.sql        - Dados');
    console.log('  04_foreign_keys.sql - Foreign keys');
    console.log('  05_indexes.sql     - Indexes');

    console.log('\n========================================');
    console.log('         PROXIMOS PASSOS');
    console.log('========================================');
    console.log('\n1. Revisar os arquivos SQL gerados');
    console.log('2. Executar no Supabase na ordem:');
    console.log('   - 02_schema.sql');
    console.log('   - 03_data.sql');
    console.log('   - 04_foreign_keys.sql');
    console.log('   - 05_indexes.sql');
    console.log('3. Atualizar .env.local para usar SUPABASE_DB_URL');
    console.log('4. Testar a aplicacao\n');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(console.error);
