#!/bin/bash

# =============================================================================
# Script: apply-critical-migrations.sh
# Descrição: Aplica migrações críticas no banco de produção
# Data: 28 Jan 2026
# =============================================================================

set -e

echo "🚀 Aplicando migrações críticas..."
echo ""

# Verificar se DATABASE_URL está configurado
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não configurado"
  echo "Configure com: export DATABASE_URL='postgresql://user:pass@host:port/db'"
  exit 1
fi

# Extrair dados da connection string
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p' | cut -d'?' -f1)
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\(.*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p')

echo "🔍 Conectando em: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Exportar senha para psql
export PGPASSWORD="$DB_PASS"

# Função para aplicar migração
apply_migration() {
  local file=$1
  echo "📝 Aplicando: $(basename $file)"
  
  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" > /dev/null 2>&1; then
    echo "   ✅ Sucesso"
  else
    echo "   ❌ Erro ao aplicar $file"
    return 1
  fi
}

# Aplicar migrações na ordem
echo "1️⃣  Criando tabela otp_codes..."
apply_migration "migrations/020_otp_codes.sql"
echo ""

echo "2️⃣  Criando sistema de intermediação (6 tabelas)..."
apply_migration "migrations/021_sistema_intermediacao.sql"
echo ""

# Verificar se tabelas foram criadas
echo "🔍 Verificando tabelas criadas..."
echo ""

TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('otp_codes', 'im_vendas', 'im_beneficiarios', 'im_distribuicao', 'im_parcelas', 'im_pagamentos', 'im_auditoria')
ORDER BY table_name;
")

if [ -z "$TABLES" ]; then
  echo "❌ Nenhuma tabela encontrada!"
  exit 1
fi

echo "✅ Tabelas criadas:"
echo "$TABLES" | while read -r table; do
  if [ ! -z "$table" ]; then
    echo "   • $(echo $table | xargs)"
  fi
done

echo ""
echo "🎉 Migrações aplicadas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Testar login por telefone (OTP)"
echo "   2. Testar cadastro de venda"
echo "   3. Testar distribuição de comissão"
echo "   4. Verificar logs de erro"
