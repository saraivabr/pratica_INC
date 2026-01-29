#!/bin/bash

# =============================================================================
# Script: check-database-status.sh
# Descrição: Verifica estado do banco e identifica o que falta
# Data: 28 Jan 2026
# =============================================================================

set -e

echo "🔍 Verificando estado do banco de dados..."
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

# Exportar senha para psql
export PGPASSWORD="$DB_PASS"

echo "📊 Banco: $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""

# Função para verificar tabela
check_table() {
  local table=$1
  local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '$table'
    );
  " | xargs)
  
  if [ "$exists" = "t" ]; then
    local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" | xargs)
    echo "   ✅ $table ($count registros)"
  else
    echo "   ❌ $table (NÃO EXISTE)"
  fi
}

# Verificar tabelas críticas
echo "📋 Tabelas de Autenticação:"
check_table "users"
check_table "otp_codes"
echo ""

echo "📋 Tabelas de Intermediação:"
check_table "im_vendas"
check_table "im_beneficiarios"
check_table "im_distribuicao"
check_table "im_parcelas"
check_table "im_pagamentos"
check_table "im_auditoria"
echo ""

echo "📋 Tabelas Multi-Tenant:"
check_table "tenants"
check_table "workspaces"
check_table "workspace_members"
echo ""

echo "📋 Tabelas WhatsApp:"
check_table "whatsapp_instances"
check_table "whatsapp_messages"
check_table "salva_leads_config"
echo ""

echo "📋 Tabelas CV CRM:"
check_table "leads"
check_table "empreendimentos"
check_table "produtos"
check_table "corretores"
echo ""

# Verificar se há usuários
echo "👥 Verificando usuários..."
ADMIN_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT EXISTS (
    SELECT FROM users WHERE email = 'admin@pratica.digital'
  );
" | xargs)

if [ "$ADMIN_EXISTS" = "t" ]; then
  echo "   ✅ Usuário admin existe"
else
  echo "   ⚠️  Usuário admin NÃO existe"
fi

echo ""
echo "✅ Verificação concluída!"
