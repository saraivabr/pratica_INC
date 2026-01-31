#!/bin/bash

# Script para finalizar a migração para o Supabase
# Execute após a importação de dados completar

set -e

DB_HOST="${SUPABASE_DB_HOST:-}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
MIGRATION_DIR="/Users/saraiva/_Projetos/appnovo_pratica/supabase/migrations/full_migration"

export PGPASSWORD=$DB_PASSWORD

echo "=== Finalizando Migração para Supabase ==="

# 1. Verificar contagem de registros
echo ""
echo "1. Verificando contagem de registros..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT
  relname as tabela,
  n_live_tup as registros
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND n_live_tup > 0
ORDER BY n_live_tup DESC;
"

# 2. Aplicar Foreign Keys
echo ""
echo "2. Aplicando Foreign Keys..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$MIGRATION_DIR/04_foreign_keys.sql" 2>&1 || echo "Alguns FKs podem já existir ou falhar - verificar manualmente se necessário"

# 3. Aplicar Indexes
echo ""
echo "3. Aplicando Indexes..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$MIGRATION_DIR/05_indexes.sql" 2>&1 || echo "Alguns indexes podem já existir"

# 4. Atualizar sequences para evitar conflitos de ID
echo ""
echo "4. Atualizando sequences..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
DO \$\$
DECLARE
    r RECORD;
    max_val BIGINT;
    seq_name TEXT;
BEGIN
    FOR r IN
        SELECT
            t.table_name,
            c.column_name,
            pg_get_serial_sequence(t.table_name, c.column_name) as seq
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_default LIKE 'nextval%'
    LOOP
        IF r.seq IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_val;
            IF max_val > 0 THEN
                EXECUTE format('SELECT setval(%L, %s)', r.seq, max_val);
                RAISE NOTICE 'Updated % to %', r.seq, max_val;
            END IF;
        END IF;
    END LOOP;
END \$\$;
"

# 5. Verificar integridade
echo ""
echo "5. Verificando integridade das tabelas principais..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT
  (SELECT COUNT(*) FROM cvcrm_leads) as leads,
  (SELECT COUNT(*) FROM cvcrm_corretores) as corretores,
  (SELECT COUNT(*) FROM cvcrm_unidades) as unidades,
  (SELECT COUNT(*) FROM cvcrm_empreendimentos) as empreendimentos,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM tenants) as tenants;
"

echo ""
echo "=== Migração Finalizada ==="
echo "O sistema está pronto para usar o Supabase!"
