#!/bin/bash

# ============================================================================
# TEST: Validação Completa do Sistema de Autenticação
# ============================================================================
# Data: 29 Jan 2025
# Testa todas as funcionalidades de auth identificadas no EXPRESS_AUTH.md
# ============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
API_URL="${API_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-pratica}"
DB_NAME="${DB_NAME:-pratica}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔐 VALIDAÇÃO SISTEMA DE AUTENTICAÇÃO${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================================================
# 1. VALIDAÇÃO DATABASE
# ============================================================================

echo -e "${YELLOW}📊 1. Validando Database...${NC}"

# Validar workspace_id
ORPHAN_USERS=$(PGPASSWORD='pratica_secure_2026!' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM users WHERE workspace_id IS NULL;")

if [ "$ORPHAN_USERS" -eq 0 ]; then
  echo -e "  ${GREEN}✅ Todos os usuários têm workspace_id${NC}"
else
  echo -e "  ${RED}❌ $ORPHAN_USERS usuários SEM workspace_id!${NC}"
fi

# Validar dados órfãos
ORPHAN_LEADS=$(PGPASSWORD='pratica_secure_2026!' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM cvcrm_leads WHERE workspace_id IS NULL;")

if [ "$ORPHAN_LEADS" -eq 0 ]; then
  echo -e "  ${GREEN}✅ Todos os leads têm workspace_id${NC}"
else
  echo -e "  ${RED}❌ $ORPHAN_LEADS leads SEM workspace_id! Execute FIX_WORKSPACE_ORPHANS.sql${NC}"
fi

ORPHAN_MSGS=$(PGPASSWORD='pratica_secure_2026!' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM whatsapp_messages WHERE workspace_id IS NULL;")

if [ "$ORPHAN_MSGS" -eq 0 ]; then
  echo -e "  ${GREEN}✅ Todas as mensagens têm workspace_id${NC}"
else
  echo -e "  ${RED}❌ $ORPHAN_MSGS mensagens SEM workspace_id! Execute FIX_WORKSPACE_ORPHANS.sql${NC}"
fi

# Validar RLS
RLS_DISABLED=$(PGPASSWORD='pratica_secure_2026!' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE 'cvcrm_%' OR tablename LIKE 'whatsapp_%') AND rowsecurity = false;")

if [ "$RLS_DISABLED" -lt 5 ]; then
  echo -e "  ${GREEN}✅ RLS ativo na maioria das tabelas${NC}"
else
  echo -e "  ${YELLOW}⚠️  $RLS_DISABLED tabelas SEM RLS. Execute FIX_RLS_MISSING.sql${NC}"
fi

echo ""

# ============================================================================
# 2. TESTAR ENDPOINT SEND-OTP
# ============================================================================

echo -e "${YELLOW}📱 2. Testando Send OTP...${NC}"

# Usar telefone de teste (deve retornar 400 ou 200, não 500)
SEND_OTP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"telefone": "+5511999999999"}' \
  -w "%{http_code}")

HTTP_CODE="${SEND_OTP_RESPONSE: -3}"

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "404" ]; then
  echo -e "  ${GREEN}✅ Endpoint /api/auth/send-otp respondendo (HTTP $HTTP_CODE)${NC}"
else
  echo -e "  ${RED}❌ Endpoint /api/auth/send-otp falhou (HTTP $HTTP_CODE)${NC}"
fi

echo ""

# ============================================================================
# 3. TESTAR ENDPOINT VALIDATE
# ============================================================================

echo -e "${YELLOW}🔒 3. Testando Validate...${NC}"

# Deve retornar 200 com valid: false (sem sessão)
VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/validate" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "invalid-session"}' \
  -w "%{http_code}")

HTTP_CODE="${VALIDATE_RESPONSE: -3}"

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "  ${GREEN}✅ Endpoint /api/auth/validate respondendo${NC}"
else
  echo -e "  ${RED}❌ Endpoint /api/auth/validate falhou (HTTP $HTTP_CODE)${NC}"
fi

echo ""

# ============================================================================
# 4. TESTAR ENDPOINT REGISTER
# ============================================================================

echo -e "${YELLOW}📝 4. Testando Register...${NC}"

# Tentar registrar com telefone duplicado (deve retornar 409)
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "+5511999999999",
    "nome": "Teste"
  }' \
  -w "%{http_code}")

HTTP_CODE="${REGISTER_RESPONSE: -3}"

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "409" ] || [ "$HTTP_CODE" == "400" ]; then
  echo -e "  ${GREEN}✅ Endpoint /api/auth/register respondendo (HTTP $HTTP_CODE)${NC}"
else
  echo -e "  ${RED}❌ Endpoint /api/auth/register falhou (HTTP $HTTP_CODE)${NC}"
fi

echo ""

# ============================================================================
# 5. TESTAR MIDDLEWARE
# ============================================================================

echo -e "${YELLOW}🛡️  5. Testando Middleware...${NC}"

# Acessar rota protegida sem sessão (deve redirecionar para login)
PROTECTED_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/corretor")

if [ "$PROTECTED_RESPONSE" == "307" ] || [ "$PROTECTED_RESPONSE" == "302" ]; then
  echo -e "  ${GREEN}✅ Middleware redirecionando rotas protegidas${NC}"
elif [ "$PROTECTED_RESPONSE" == "200" ]; then
  echo -e "  ${YELLOW}⚠️  Middleware pode estar permitindo acesso sem auth${NC}"
else
  echo -e "  ${RED}❌ Middleware não está funcionando (HTTP $PROTECTED_RESPONSE)${NC}"
fi

echo ""

# ============================================================================
# 6. TESTAR ROTAS ADMIN
# ============================================================================

echo -e "${YELLOW}👑 6. Testando Rotas Admin...${NC}"

# Acessar admin sem secret key (deve redirecionar)
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/admin")

if [ "$ADMIN_RESPONSE" == "307" ] || [ "$ADMIN_RESPONSE" == "302" ]; then
  echo -e "  ${GREEN}✅ Rotas admin protegidas${NC}"
else
  echo -e "  ${YELLOW}⚠️  Admin respondeu HTTP $ADMIN_RESPONSE (esperado: 307/302)${NC}"
fi

echo ""

# ============================================================================
# 7. VALIDAR ESTRUTURA DE TABELAS
# ============================================================================

echo -e "${YELLOW}🗂️  7. Validando Estrutura de Tabelas...${NC}"

# Verificar se workspaces existe
WORKSPACES_EXISTS=$(PGPASSWORD='pratica_secure_2026!' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'workspaces';")

if [ "$WORKSPACES_EXISTS" -eq 1 ]; then
  echo -e "  ${GREEN}✅ Tabela workspaces existe${NC}"
else
  echo -e "  ${RED}❌ Tabela workspaces NÃO existe! Execute migration 022${NC}"
fi

# Verificar se users.workspace_id existe
WORKSPACE_ID_EXISTS=$(PGPASSWORD='pratica_secure_2026!' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'workspace_id';")

if [ "$WORKSPACE_ID_EXISTS" -eq 1 ]; then
  echo -e "  ${GREEN}✅ Coluna users.workspace_id existe${NC}"
else
  echo -e "  ${RED}❌ Coluna users.workspace_id NÃO existe! Execute migration 022${NC}"
fi

# Verificar se trigger auto_create_workspace existe
TRIGGER_EXISTS=$(PGPASSWORD='pratica_secure_2026!' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trigger_auto_create_workspace';")

if [ "$TRIGGER_EXISTS" -eq 1 ]; then
  echo -e "  ${GREEN}✅ Trigger auto_create_workspace existe${NC}"
else
  echo -e "  ${RED}❌ Trigger auto_create_workspace NÃO existe! Execute migration 022${NC}"
fi

echo ""

# ============================================================================
# RESUMO FINAL
# ============================================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 RESUMO DA VALIDAÇÃO${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Calcular score
TOTAL_TESTS=12
PASSED=0

[ "$ORPHAN_USERS" -eq 0 ] && ((PASSED++))
[ "$ORPHAN_LEADS" -eq 0 ] && ((PASSED++))
[ "$ORPHAN_MSGS" -eq 0 ] && ((PASSED++))
[ "$RLS_DISABLED" -lt 5 ] && ((PASSED++))
[ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "400" ] && ((PASSED++))
[ "$WORKSPACES_EXISTS" -eq 1 ] && ((PASSED++))
[ "$WORKSPACE_ID_EXISTS" -eq 1 ] && ((PASSED++))
[ "$TRIGGER_EXISTS" -eq 1 ] && ((PASSED++))

SCORE=$((PASSED * 100 / TOTAL_TESTS))

echo "Testes passados: $PASSED/$TOTAL_TESTS"
echo "Score: $SCORE%"
echo ""

if [ "$SCORE" -ge 90 ]; then
  echo -e "${GREEN}✅ Sistema de autenticação está FUNCIONANDO!${NC}"
  exit 0
elif [ "$SCORE" -ge 70 ]; then
  echo -e "${YELLOW}⚠️  Sistema de autenticação está PARCIALMENTE FUNCIONAL${NC}"
  echo -e "${YELLOW}Corrija os problemas identificados acima${NC}"
  exit 1
else
  echo -e "${RED}❌ Sistema de autenticação está QUEBRADO${NC}"
  echo -e "${RED}AÇÃO URGENTE: Execute FIX_WORKSPACE_ORPHANS.sql e FIX_RLS_MISSING.sql${NC}"
  exit 2
fi
