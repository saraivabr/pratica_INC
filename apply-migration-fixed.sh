#!/bin/bash
echo "🔧 APLICANDO MIGRATION 002 (FIXED)"
echo "=================================="
echo ""

DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2- | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não encontrada"
  exit 1
fi

echo "📍 Aplicando lib/migrations/002_melhorias_clawd_fixed.sql..."
NODE_TLS_REJECT_UNAUTHORIZED=0 PGPASSWORD="" psql "$DATABASE_URL" < lib/migrations/002_melhorias_clawd_fixed.sql

echo ""
echo "✅ Verificando tabelas criadas..."
NODE_TLS_REJECT_UNAUTHORIZED=0 PGPASSWORD="" psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('notificacoes', 'agendamentos', 'followups', 'simulacoes') ORDER BY table_name;"

echo ""
echo "=================================="
echo "✅ Migration 002 aplicada!"
