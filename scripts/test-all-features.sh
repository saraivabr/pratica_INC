#!/bin/bash

# =============================================================================
# Script: test-all-features.sh
# Descrição: Testa todas as funcionalidades principais do sistema
# Data: 28 Jan 2026
# =============================================================================

set -e

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

echo "🧪 TESTE COMPLETO DO SISTEMA PRÁTICA"
echo "===================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
  local name=$1
  local url=$2
  local expected_code=${3:-200}
  
  echo -n "   Testando $name... "
  
  local code=$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)
  
  if [ "$code" = "$expected_code" ]; then
    echo -e "${GREEN}✅ OK (HTTP $code)${NC}"
    return 0
  else
    echo -e "${RED}❌ FALHOU (HTTP $code, esperado $expected_code)${NC}"
    return 1
  fi
}

# Função para testar API POST
test_api_post() {
  local name=$1
  local url=$2
  local data=$3
  local expected_pattern=$4
  
  echo -n "   Testando $name... "
  
  local response=$(curl -s -X POST "$url" \
    -H "Content-Type: application/json" \
    -d "$data" 2>/dev/null)
  
  if echo "$response" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}✅ OK${NC}"
    return 0
  else
    echo -e "${RED}❌ FALHOU${NC}"
    echo "      Resposta: $response"
    return 1
  fi
}

# ===========================================================================
# 1. TESTE DE PÁGINAS PRINCIPAIS
# ===========================================================================

echo "1️⃣  PÁGINAS PRINCIPAIS"
echo "-------------------"

test_endpoint "Home" "$BASE_URL/" 307 # Redirect para login se não autenticado
test_endpoint "Login" "$BASE_URL/login" 200
test_endpoint "Cadastro" "$BASE_URL/signup" 200

echo ""

# ===========================================================================
# 2. TESTE DE APIs BÁSICAS
# ===========================================================================

echo "2️⃣  APIs BÁSICAS"
echo "-------------------"

test_endpoint "Health Check" "$API_URL/health" 200

# Testar se health retorna JSON válido
echo -n "   Validando JSON do health... "
HEALTH_JSON=$(curl -s "$API_URL/health")
if echo "$HEALTH_JSON" | jq . > /dev/null 2>&1; then
  echo -e "${GREEN}✅ JSON válido${NC}"
  echo "      Status: $(echo $HEALTH_JSON | jq -r '.status')"
else
  echo -e "${RED}❌ JSON inválido${NC}"
fi

echo ""

# ===========================================================================
# 3. TESTE DE AUTENTICAÇÃO
# ===========================================================================

echo "3️⃣  AUTENTICAÇÃO"
echo "-------------------"

# Testar endpoint de login (deve retornar 401 sem credenciais)
test_endpoint "Endpoint de Login" "$API_URL/auth/login" 405 # POST only

# Testar OTP request
echo -n "   Testando requisição OTP... "
OTP_RESPONSE=$(curl -s -X POST "$API_URL/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+5511999999999"}' 2>/dev/null)

if echo "$OTP_RESPONSE" | grep -q "code\|error\|success"; then
  echo -e "${GREEN}✅ API responde${NC}"
  echo "      Resposta: $OTP_RESPONSE"
else
  echo -e "${YELLOW}⚠️  Resposta inesperada${NC}"
  echo "      Resposta: $OTP_RESPONSE"
fi

echo ""

# ===========================================================================
# 4. TESTE DE WHATSAPP (Evolution API)
# ===========================================================================

echo "4️⃣  WHATSAPP (EVOLUTION API)"
echo "-------------------"

# Verificar se Evolution API está configurado
if [ ! -z "$EVOLUTION_API_URL" ]; then
  echo -n "   Testando conexão Evolution API... "
  EVO_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$EVOLUTION_API_URL/" 2>/dev/null || echo "000")
  
  if [ "$EVO_CODE" = "200" ] || [ "$EVO_CODE" = "404" ]; then
    echo -e "${GREEN}✅ API acessível (HTTP $EVO_CODE)${NC}"
  else
    echo -e "${YELLOW}⚠️  API não acessível (HTTP $EVO_CODE)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  EVOLUTION_API_URL não configurado${NC}"
fi

# Testar endpoints de WhatsApp do sistema
test_endpoint "WhatsApp Status API" "$API_URL/whatsapp/status" 401 # Requer auth

echo ""

# ===========================================================================
# 5. TESTE DE BANCO DE DADOS
# ===========================================================================

echo "5️⃣  BANCO DE DADOS"
echo "-------------------"

if [ ! -z "$DATABASE_URL" ]; then
  # Extrair credenciais
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p' | cut -d'?' -f1)
  DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\(.*\):.*/\1/p')
  DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p')
  
  export PGPASSWORD="$DB_PASS"
  
  echo "   Conectando em: $DB_NAME @ $DB_HOST:$DB_PORT"
  echo ""
  
  # Contar tabelas críticas
  echo -n "   Verificando tabelas críticas... "
  
  CRITICAL_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'users', 'tenants', 'workspaces',
      'otp_codes',
      'im_vendas', 'im_beneficiarios', 'im_distribuicao', 'im_parcelas', 'im_pagamentos', 'im_auditoria',
      'whatsapp_instances', 'whatsapp_messages', 'whatsapp_contacts',
      'salva_leads_config', 'leads'
    );
  " 2>/dev/null | xargs)
  
  if [ "$CRITICAL_TABLES" = "15" ]; then
    echo -e "${GREEN}✅ Todas as 15 tabelas críticas existem${NC}"
  else
    echo -e "${YELLOW}⚠️  Apenas $CRITICAL_TABLES/15 tabelas encontradas${NC}"
  fi
  
  # Contar usuários
  echo -n "   Verificando usuários... "
  USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
  echo -e "${GREEN}✅ $USER_COUNT usuários cadastrados${NC}"
  
  # Verificar admin
  echo -n "   Verificando usuário admin... "
  ADMIN_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@pratica.digital');
  " 2>/dev/null | xargs)
  
  if [ "$ADMIN_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ Admin existe${NC}"
  else
    echo -e "${RED}❌ Admin não encontrado${NC}"
  fi
  
else
  echo -e "${RED}❌ DATABASE_URL não configurado${NC}"
fi

echo ""

# ===========================================================================
# 6. RESUMO FINAL
# ===========================================================================

echo "📊 RESUMO"
echo "========="
echo ""
echo "Sistema: http://185.182.184.122:3000"
echo "Status: $(curl -s $API_URL/health | jq -r '.status')"
echo ""
echo "✅ Testes concluídos!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Testar login manual: http://185.182.184.122:3000/login"
echo "   2. Email: admin@pratica.digital"
echo "   3. Senha: admin123"
echo "   4. Verificar se WhatsApp conecta"
echo "   5. Testar cadastro de venda"
