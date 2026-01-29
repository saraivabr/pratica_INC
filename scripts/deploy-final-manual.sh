#!/bin/bash
# Deploy Final Manual - Execute no VPS via SSH
# ssh [usuario]@185.182.184.122
# Depois copie e cole este script

set -e

echo "🚀 Deploy Final - corretorparceria.com.br"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/var/www/pratica"

# Verificar se está no diretório certo
if [ ! -d "$APP_DIR" ]; then
  echo "${RED}❌ Erro: Diretório $APP_DIR não existe!${NC}"
  echo "Execute primeiro o deploy básico."
  exit 1
fi

cd $APP_DIR
echo "${GREEN}✅ Diretório: $APP_DIR${NC}"
echo ""

# 1. MIGRAÇÃO DO BANCO
echo "${YELLOW}📍 PASSO 1/5: Executando migração do banco...${NC}"
echo "=============================================="
if [ -f "migrations/022_user_workspace_architecture.sql" ]; then
  PGPASSWORD='pratica_secure_2026!' psql -U pratica -d pratica -h localhost < migrations/022_user_workspace_architecture.sql
  echo "${GREEN}✅ Migração executada com sucesso!${NC}"
else
  echo "${RED}❌ Arquivo de migração não encontrado!${NC}"
  exit 1
fi
echo ""

# 2. ATUALIZAR .ENV COM DOMÍNIO
echo "${YELLOW}📍 PASSO 2/5: Atualizando .env.production...${NC}"
echo "=============================================="
cat > .env.production <<'EOF'
# =============================================================================
# SERVIDOR VPS - PostgreSQL Local
# Domínio: corretorparceria.com.br
# =============================================================================

# Database - PostgreSQL Local
DATABASE_URL="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica"
POSTGRES_URL="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica"
POSTGRES_PRISMA_URL="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica"

# App - DOMÍNIO ATUALIZADO
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://corretorparceria.com.br"
PORT=3000

# Auth
JWT_SECRET="pratica_jwt_secure_key_2026_production"
NEXTAUTH_URL="https://corretorparceria.com.br"
NEXTAUTH_SECRET="pratica_nextauth_secret_2026"

# Evolution API
EVOLUTION_API_URL="https://evoapi.pratica.digital"
EVOLUTION_API_KEY=""
WEBHOOK_BASE_URL="https://corretorparceria.com.br"

# OpenAI
OPENAI_API_KEY=""
EOF

cp .env.production .env.local
echo "${GREEN}✅ .env atualizado com domínio corretorparceria.com.br${NC}"
echo ""

# 3. BUILD DA APLICAÇÃO
echo "${YELLOW}📍 PASSO 3/5: Build da aplicação...${NC}"
echo "=============================================="
pnpm build
echo "${GREEN}✅ Build concluído!${NC}"
echo ""

# 4. PARAR PM2 ANTERIOR
echo "${YELLOW}📍 PASSO 4/5: Parando PM2 anterior...${NC}"
echo "=============================================="
pm2 delete pratica 2>/dev/null || echo "  → Nenhuma instância anterior"
pm2 delete all 2>/dev/null || echo "  → Limpando PM2"
echo "${GREEN}✅ PM2 limpo${NC}"
echo ""

# 5. INICIAR COM PM2
echo "${YELLOW}📍 PASSO 5/5: Iniciando aplicação com PM2...${NC}"
echo "=============================================="
pm2 start ecosystem.config.js
pm2 save
echo "${GREEN}✅ Aplicação iniciada!${NC}"
echo ""

# VERIFICAÇÃO FINAL
echo "${BLUE}🔍 Verificação Final${NC}"
echo "=============================================="
echo ""
pm2 status
echo ""
echo "${GREEN}✅✅✅ DEPLOY COMPLETO! ✅✅✅${NC}"
echo ""
echo "🌐 ${GREEN}Site no ar em: https://corretorparceria.com.br${NC}"
echo ""
echo "📋 Comandos úteis:"
echo "  • Ver logs:      ${YELLOW}pm2 logs pratica${NC}"
echo "  • Ver status:    ${YELLOW}pm2 status${NC}"
echo "  • Restart:       ${YELLOW}pm2 restart pratica${NC}"
echo "  • Ver últimos:   ${YELLOW}pm2 logs pratica --lines 100${NC}"
echo ""
echo "🔍 Teste agora: ${BLUE}https://corretorparceria.com.br${NC}"
