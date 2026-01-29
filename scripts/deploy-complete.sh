#!/bin/bash
set -e

echo "🚀 Deploy Completo - corretorparceria.com.br"
echo "=============================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VPS_IP="185.182.184.122"
APP_DIR="/var/www/pratica"
DB_NAME="pratica"
DB_USER="pratica"

echo ""
echo "${YELLOW}📍 PASSO 1: Executar migração do banco${NC}"
echo "=============================================="
psql -U $DB_USER -d $DB_NAME < $APP_DIR/migrations/022_user_workspace_architecture.sql
echo "${GREEN}✅ Migração executada${NC}"

echo ""
echo "${YELLOW}📍 PASSO 2: Build da aplicação${NC}"
echo "=============================================="
cd $APP_DIR
pnpm build
echo "${GREEN}✅ Build concluído${NC}"

echo ""
echo "${YELLOW}📍 PASSO 3: Parar PM2 (se estiver rodando)${NC}"
echo "=============================================="
pm2 delete pratica || true
echo "${GREEN}✅ PM2 limpo${NC}"

echo ""
echo "${YELLOW}📍 PASSO 4: Iniciar aplicação${NC}"
echo "=============================================="
pm2 start ecosystem.config.js
pm2 save
echo "${GREEN}✅ Aplicação iniciada${NC}"

echo ""
echo "${YELLOW}📍 PASSO 5: Verificar status${NC}"
echo "=============================================="
pm2 status
pm2 logs pratica --lines 20

echo ""
echo "${GREEN}✅✅✅ DEPLOY COMPLETO! ✅✅✅${NC}"
echo ""
echo "🌐 Aplicação rodando em: http://$VPS_IP:3000"
echo ""
echo "📋 Próximos passos:"
echo "  1. Configurar Cloudflare para corretorparceria.com.br"
echo "  2. Apontar DNS para $VPS_IP"
echo "  3. Configurar SSL/HTTPS"
