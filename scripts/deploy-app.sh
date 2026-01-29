#!/bin/bash
set -e

echo "🚀 Fazendo deploy da aplicação Prática..."

# Criar diretório e descomprimir
echo "📦 Descomprimindo código..."
mkdir -p /var/www
cd /var/www
rm -rf pratica
mkdir pratica
cd pratica
tar -xzf /tmp/pratica-deploy.tar.gz
echo "✅ Código descomprimido"

# Criar arquivo .env
echo "🔧 Configurando variáveis de ambiente..."
cat > .env.production <<'EOF'
# =============================================================================
# SERVIDOR VPS - PostgreSQL Local (Sem Supabase, Sem Scalingo)
# =============================================================================

# Database - PostgreSQL Local
DATABASE_URL="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica"
POSTGRES_URL="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica"
POSTGRES_PRISMA_URL="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica"

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="http://185.182.184.122:3000"
PORT=3000

# Auth
JWT_SECRET="pratica_jwt_secure_key_2026_production"
NEXTAUTH_URL="http://185.182.184.122:3000"
NEXTAUTH_SECRET="pratica_nextauth_secret_2026"

# Evolution API
EVOLUTION_API_URL="https://evoapi.pratica.digital"
EVOLUTION_API_KEY=""
WEBHOOK_BASE_URL="http://185.182.184.122:3000"

# OpenAI
OPENAI_API_KEY=""
EOF

# Copiar como .env.local também
cp .env.production .env.local

echo "✅ Variáveis configuradas"

# Instalar dependências
echo "📦 Instalando dependências..."
pnpm install --frozen-lockfile

echo "✅ Deploy preparado!"
echo ""
echo "Próximos passos:"
echo "  1. Executar migrações: psql pratica < migrations/022_user_workspace_architecture.sql"
echo "  2. Build: pnpm build"
echo "  3. Start: pm2 start ecosystem.config.js"
