#!/bin/bash
echo "🔧 APLICANDO MIGRATIONS"
echo "======================"
echo ""

# Get DATABASE_URL from .env.local
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2- | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não encontrada em .env.local"
  exit 1
fi

echo "📍 Banco: $(echo $DATABASE_URL | grep -o '@[^:]*' | cut -c2-)"
echo ""

# Apply migrations in order
echo "1️⃣ Aplicando migration 001: salva-leads-schema.sql"
PGPASSWORD="" psql "$DATABASE_URL" < lib/migrations/salva-leads-schema.sql 2>&1 | grep -E '(CREATE|ERROR|NOTICE)' | head -20
echo ""

echo "2️⃣ Aplicando migration 002: melhorias_clawd.sql"
PGPASSWORD="" psql "$DATABASE_URL" < lib/migrations/002_melhorias_clawd.sql 2>&1 | grep -E '(CREATE|ERROR|NOTICE)' | head -30
echo ""

echo "✅ Verificando tabelas criadas..."
PGPASSWORD="" psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('notificacoes', 'agendamentos', 'followups', 'simulacoes') ORDER BY table_name;" 2>&1

echo ""
echo "======================"
echo "✅ Migrations aplicadas!"
