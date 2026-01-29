#!/bin/bash
# test-email-auth.sh - Testes de autenticação email/senha

set -e

API_URL="http://localhost:3000"
TEST_EMAIL="teste-$(date +%s)@example.com"
TEST_PASSWORD="teste123456"
TEST_NAME="Usuário Teste"

echo "🧪 Testando Autenticação Email/Senha"
echo "======================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Função para extrair sessionId de JSON
extract_field() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | cut -d'"' -f4
}

echo "📝 Dados do teste:"
echo "  Email: $TEST_EMAIL"
echo "  Senha: $TEST_PASSWORD"
echo "  Nome: $TEST_NAME"
echo ""

# ==============================================================================
# Teste 1: Registro com email/senha
# ==============================================================================
info "Teste 1: Registrar novo usuário com email/senha"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"$TEST_NAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"role\": \"corretor\"
  }")

echo "  Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  pass "Registro bem-sucedido"
  USER_ID=$(extract_field "$REGISTER_RESPONSE" "id")
  SESSION_ID=$(extract_field "$REGISTER_RESPONSE" "sessionId")
  echo "  User ID: $USER_ID"
  echo "  Session ID: $SESSION_ID"
else
  fail "Falha no registro: $REGISTER_RESPONSE"
fi
echo ""

# ==============================================================================
# Teste 2: Tentar registrar novamente com mesmo email (deve falhar)
# ==============================================================================
info "Teste 2: Tentar registrar com email duplicado (deve falhar)"

DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"Outro Usuário\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"outrasenha123\",
    \"role\": \"corretor\"
  }")

if echo "$DUPLICATE_RESPONSE" | grep -q '"error"'; then
  pass "Email duplicado rejeitado corretamente"
  echo "  Erro: $(extract_field "$DUPLICATE_RESPONSE" "error")"
else
  fail "Deveria ter rejeitado email duplicado"
fi
echo ""

# ==============================================================================
# Teste 3: Login com credenciais corretas
# ==============================================================================
info "Teste 3: Login com credenciais corretas"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "  Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  pass "Login bem-sucedido"
  LOGIN_SESSION_ID=$(extract_field "$LOGIN_RESPONSE" "sessionId")
  echo "  Session ID: $LOGIN_SESSION_ID"
else
  fail "Falha no login: $LOGIN_RESPONSE"
fi
echo ""

# ==============================================================================
# Teste 4: Login com senha incorreta (deve falhar)
# ==============================================================================
info "Teste 4: Login com senha incorreta (deve falhar)"

WRONG_PASSWORD_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"senhaerrada123\"
  }")

if echo "$WRONG_PASSWORD_RESPONSE" | grep -q '"error"'; then
  pass "Senha incorreta rejeitada corretamente"
  echo "  Erro: $(echo "$WRONG_PASSWORD_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)"
else
  fail "Deveria ter rejeitado senha incorreta"
fi
echo ""

# ==============================================================================
# Teste 5: Login com email inexistente (deve falhar)
# ==============================================================================
info "Teste 5: Login com email inexistente (deve falhar)"

NONEXISTENT_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"naoexiste@example.com\",
    \"password\": \"qualquercoisa123\"
  }")

if echo "$NONEXISTENT_RESPONSE" | grep -q '"error"'; then
  pass "Email inexistente rejeitado corretamente"
else
  fail "Deveria ter rejeitado email inexistente"
fi
echo ""

# ==============================================================================
# Teste 6: Validação de email inválido
# ==============================================================================
info "Teste 6: Validação de email inválido (deve falhar)"

INVALID_EMAIL_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"emailinvalido\",
    \"password\": \"senha123\"
  }")

if echo "$INVALID_EMAIL_RESPONSE" | grep -q '"error"'; then
  pass "Email inválido rejeitado corretamente"
else
  fail "Deveria ter rejeitado email inválido"
fi
echo ""

# ==============================================================================
# Teste 7: Validação de senha curta (deve falhar)
# ==============================================================================
info "Teste 7: Validação de senha curta (deve falhar)"

SHORT_PASSWORD_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"Teste\",
    \"email\": \"novo@example.com\",
    \"password\": \"123\",
    \"role\": \"corretor\"
  }")

if echo "$SHORT_PASSWORD_RESPONSE" | grep -q '"error"'; then
  pass "Senha curta rejeitada corretamente"
else
  fail "Deveria ter rejeitado senha curta"
fi
echo ""

# ==============================================================================
# Resumo
# ==============================================================================
echo "======================================="
echo -e "${GREEN}✓ Todos os testes passaram!${NC}"
echo ""
echo "📊 Resumo:"
echo "  ✓ Registro com email/senha funciona"
echo "  ✓ Prevenção de email duplicado funciona"
echo "  ✓ Login com credenciais corretas funciona"
echo "  ✓ Rejeição de senha incorreta funciona"
echo "  ✓ Rejeição de email inexistente funciona"
echo "  ✓ Validação de email funciona"
echo "  ✓ Validação de senha funciona"
echo ""
echo "🔐 Usuário de teste criado:"
echo "  Email: $TEST_EMAIL"
echo "  User ID: $USER_ID"
echo ""
echo "✨ Sistema de autenticação email/senha está funcionando!"
