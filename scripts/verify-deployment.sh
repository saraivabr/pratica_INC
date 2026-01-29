#!/bin/bash
# Script de Verificação de Deploy
# Verifica se todos os componentes estão funcionando

set -e

echo "🔍 Verificando Deploy de corretorparceria.com.br"
echo "================================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VPS_IP="185.182.184.122"
DOMAIN="corretorparceria.com.br"

# Função para verificar
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
  else
    echo -e "${RED}❌ $1${NC}"
  fi
}

# 1. Verificar DNS
echo "1️⃣ Verificando DNS..."
dig +short $DOMAIN | grep -q "." && check "DNS propagado" || check "Erro no DNS"
echo ""

# 2. Verificar SSL
echo "2️⃣ Verificando SSL/HTTPS..."
curl -sI https://$DOMAIN | grep -q "HTTP/2 200\|HTTP/1.1 200\|HTTP/1.1 307" && check "HTTPS funcionando" || check "Erro no HTTPS"
echo ""

# 3. Verificar se porta 3000 responde (SSH)
echo "3️⃣ Verificando Next.js (porta 3000)..."
echo "(Requer SSH configurado)"
# ssh root@$VPS_IP "curl -s http://localhost:3000 | head -1" && check "Next.js respondendo" || check "Next.js não responde"
echo ""

# 4. Verificar PM2 (SSH)
echo "4️⃣ Verificando PM2..."
echo "(Requer SSH configurado)"
# ssh root@$VPS_IP "pm2 list | grep -q 'online'" && check "PM2 online" || check "PM2 com problema"
echo ""

# 5. Verificar PostgreSQL (SSH)
echo "5️⃣ Verificando PostgreSQL..."
echo "(Requer SSH configurado)"
# ssh root@$VPS_IP "psql -U pratica -d pratica -c 'SELECT 1' &>/dev/null" && check "PostgreSQL conectado" || check "PostgreSQL com problema"
echo ""

# 6. Verificar Nginx (SSH)
echo "6️⃣ Verificando Nginx..."
echo "(Requer SSH configurado)"
# ssh root@$VPS_IP "systemctl is-active nginx &>/dev/null" && check "Nginx ativo" || check "Nginx inativo"
echo ""

# Resumo
echo ""
echo "================================================"
echo "✅ Verificação concluída!"
echo ""
echo "🌐 Acesse: https://$DOMAIN"
echo "📝 Documentação: DEPLOY_FINAL_COMPLETO.md"
