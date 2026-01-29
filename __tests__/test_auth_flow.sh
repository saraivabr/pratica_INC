#!/bin/bash

# Script de Teste - Fluxo de Autenticação Completo
# Sistema Prática - corretorparceria.com.br

set -e

BASE_URL="http://localhost:3000"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}🔐 Teste de Autenticação - Sistema Prática${NC}\n"

# Pedir telefone
read -p "Digite o telefone para teste (com +55): " TELEFONE

if [[ -z "$TELEFONE" ]]; then
    echo -e "${RED}❌ Telefone não pode ser vazio${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📱 Telefone: $TELEFONE${NC}\n"

# Verificar se usuário existe
echo -e "${BOLD}1️⃣  Verificando se usuário existe no banco...${NC}"
USER_CHECK=$(sudo -u postgres psql pratica -t -A -c "SELECT id, nome, role FROM users WHERE telefone = '$TELEFONE' LIMIT 1" 2>/dev/null)

if [[ -z "$USER_CHECK" ]]; then
    echo -e "${YELLOW}⚠️  Usuário não encontrado. Criando usuário de teste...${NC}"

    read -p "Nome do usuário: " NOME
    if [[ -z "$NOME" ]]; then
        NOME="Usuário Teste"
    fi

    sudo -u postgres psql pratica -c "
    INSERT INTO users (telefone, nome, role, is_active, workspace_id)
    VALUES ('$TELEFONE', '$NOME', 'corretor', true, 1)
    RETURNING id, nome, role
    " 2>/dev/null

    echo -e "${GREEN}✅ Usuário criado${NC}\n"
else
    USER_ID=$(echo "$USER_CHECK" | cut -d'|' -f1)
    USER_NAME=$(echo "$USER_CHECK" | cut -d'|' -f2)
    USER_ROLE=$(echo "$USER_CHECK" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Usuário encontrado: $USER_NAME ($USER_ROLE) - ID: $USER_ID${NC}\n"
fi

# Etapa 1: Enviar OTP
echo -e "${BOLD}2️⃣  Enviando OTP para $TELEFONE...${NC}"

SEND_OTP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/send-otp" \
    -H "Content-Type: application/json" \
    -d "{\"telefone\":\"$TELEFONE\"}")

echo "$SEND_OTP_RESPONSE" | jq '.' 2>/dev/null || echo "$SEND_OTP_RESPONSE"

# Verificar se foi bem-sucedido
SUCCESS=$(echo "$SEND_OTP_RESPONSE" | jq -r '.success' 2>/dev/null)
if [[ "$SUCCESS" != "true" ]]; then
    echo -e "\n${RED}❌ Erro ao enviar OTP${NC}"
    echo "$SEND_OTP_RESPONSE" | jq -r '.error' 2>/dev/null || echo "Erro desconhecido"
    exit 1
fi

SESSION_ID=$(echo "$SEND_OTP_RESPONSE" | jq -r '.sessionId' 2>/dev/null)
echo -e "\n${GREEN}✅ OTP enviado com sucesso!${NC}"
echo -e "📋 Session ID: ${YELLOW}$SESSION_ID${NC}\n"

# Verificar OTP no banco
echo -e "${BOLD}3️⃣  Verificando OTP no banco de dados...${NC}"
OTP_DATA=$(sudo -u postgres psql pratica -t -A -c "
    SELECT otp_code, otp_expires_at, is_verified,
           EXTRACT(EPOCH FROM (otp_expires_at - now())) as seconds_left
    FROM sessions
    WHERE id = '$SESSION_ID'
    LIMIT 1
" 2>/dev/null)

if [[ -z "$OTP_DATA" ]]; then
    echo -e "${RED}❌ Sessão não encontrada no banco${NC}"
    exit 1
fi

OTP_CODE=$(echo "$OTP_DATA" | cut -d'|' -f1)
OTP_EXPIRES=$(echo "$OTP_DATA" | cut -d'|' -f2)
IS_VERIFIED=$(echo "$OTP_DATA" | cut -d'|' -f3)
SECONDS_LEFT=$(echo "$OTP_DATA" | cut -d'|' -f4 | cut -d'.' -f1)

echo -e "${GREEN}✅ Sessão encontrada no banco${NC}"
echo -e "🔢 Código OTP: ${BOLD}${GREEN}$OTP_CODE${NC}"
echo -e "⏰ Expira em: ${YELLOW}${SECONDS_LEFT}s${NC}"
echo -e "✓ Verificado: ${IS_VERIFIED}\n"

# Opção de usar OTP do banco ou digitar manualmente
echo -e "${YELLOW}Escolha uma opção:${NC}"
echo "1) Usar OTP do banco ($OTP_CODE)"
echo "2) Digitar OTP manualmente (se recebeu por WhatsApp)"
read -p "Opção [1]: " OTP_OPTION

if [[ "$OTP_OPTION" == "2" ]]; then
    read -p "Digite o código OTP recebido: " OTP_CODE
    if [[ -z "$OTP_CODE" ]]; then
        echo -e "${RED}❌ OTP não pode ser vazio${NC}"
        exit 1
    fi
fi

# Etapa 2: Verificar OTP
echo -e "\n${BOLD}4️⃣  Verificando OTP ($OTP_CODE)...${NC}"

VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-otp" \
    -H "Content-Type: application/json" \
    -d "{
        \"sessionId\":\"$SESSION_ID\",
        \"code\":\"$OTP_CODE\",
        \"telefone\":\"$TELEFONE\"
    }")

echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"

# Verificar se foi bem-sucedido
VERIFY_SUCCESS=$(echo "$VERIFY_RESPONSE" | jq -r '.success' 2>/dev/null)
if [[ "$VERIFY_SUCCESS" != "true" ]]; then
    echo -e "\n${RED}❌ Erro ao verificar OTP${NC}"
    echo "$VERIFY_RESPONSE" | jq -r '.error' 2>/dev/null || echo "Erro desconhecido"
    exit 1
fi

echo -e "\n${GREEN}✅ OTP verificado com sucesso!${NC}\n"

# Extrair dados do usuário da resposta
USER_DATA=$(echo "$VERIFY_RESPONSE" | jq -r '.user')
USER_ID=$(echo "$USER_DATA" | jq -r '.id')
USER_PHONE=$(echo "$USER_DATA" | jq -r '.telefone')
USER_ROLE=$(echo "$USER_DATA" | jq -r '.role')
WORKSPACE_ID=$(echo "$USER_DATA" | jq -r '.workspace_id // .workspaceId // 1')

echo -e "${BOLD}👤 Dados do Usuário:${NC}"
echo "$USER_DATA" | jq '.'

# Criar cookie pratica-session (como o frontend faz)
echo -e "\n${BOLD}5️⃣  Criando cookie de sessão...${NC}"

COOKIE_JSON="{\"userId\":\"$USER_ID\",\"phone\":\"$USER_PHONE\",\"sessionId\":\"$SESSION_ID\",\"role\":\"$USER_ROLE\",\"workspaceId\":$WORKSPACE_ID}"
COOKIE_ENCODED=$(echo -n "$COOKIE_JSON" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")

echo -e "${GREEN}✅ Cookie criado:${NC}"
echo -e "${YELLOW}$COOKIE_JSON${NC}\n"

# Etapa 3: Testar autenticação com cookie
echo -e "${BOLD}6️⃣  Testando autenticação com /api/auth/me...${NC}"

ME_RESPONSE=$(curl -s -H "Cookie: pratica-session=$COOKIE_ENCODED" "$BASE_URL/api/auth/me")

echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"

ME_SUCCESS=$(echo "$ME_RESPONSE" | jq -r '.success' 2>/dev/null)
if [[ "$ME_SUCCESS" != "true" ]]; then
    echo -e "\n${RED}❌ Erro ao validar autenticação${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Autenticação validada!${NC}\n"

# Etapa 4: Testar acesso a endpoints protegidos
echo -e "${BOLD}7️⃣  Testando acesso a endpoints protegidos...${NC}\n"

# Teste 1: Profile
echo -e "📋 GET /api/auth/profile"
PROFILE=$(curl -s -H "Cookie: pratica-session=$COOKIE_ENCODED" "$BASE_URL/api/auth/profile")
PROFILE_SUCCESS=$(echo "$PROFILE" | jq -r '.success' 2>/dev/null)
if [[ "$PROFILE_SUCCESS" == "true" ]]; then
    echo -e "${GREEN}   ✅ Profile acessível${NC}"
else
    echo -e "${YELLOW}   ⚠️  Profile: $(echo "$PROFILE" | jq -r '.error')${NC}"
fi

# Teste 2: Empreendimentos
echo -e "📋 GET /api/empreendimentos"
EMPREENDIMENTOS=$(curl -s -H "Cookie: pratica-session=$COOKIE_ENCODED" "$BASE_URL/api/empreendimentos")
EMPRE_COUNT=$(echo "$EMPREENDIMENTOS" | jq -r 'length' 2>/dev/null)
if [[ "$EMPRE_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${GREEN}   ✅ Empreendimentos: $EMPRE_COUNT itens${NC}"
else
    echo -e "${YELLOW}   ⚠️  Empreendimentos: erro${NC}"
fi

# Teste 3: Admin page
echo -e "📋 GET /admin"
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Cookie: pratica-session=$COOKIE_ENCODED" "$BASE_URL/admin")
if [[ "$ADMIN_STATUS" == "200" ]]; then
    echo -e "${GREEN}   ✅ Admin acessível (200)${NC}"
else
    echo -e "${YELLOW}   ⚠️  Admin: $ADMIN_STATUS${NC}"
fi

# Teste 4: WhatsApp status
echo -e "📋 GET /api/whatsapp/session/status"
WA_STATUS=$(curl -s -H "Cookie: pratica-session=$COOKIE_ENCODED" "$BASE_URL/api/whatsapp/session/status")
WA_SUCCESS=$(echo "$WA_STATUS" | jq -r '.success' 2>/dev/null)
if [[ "$WA_SUCCESS" == "true" ]]; then
    WA_CONNECTED=$(echo "$WA_STATUS" | jq -r '.connected' 2>/dev/null)
    echo -e "${GREEN}   ✅ WhatsApp status: connected=$WA_CONNECTED${NC}"
else
    echo -e "${YELLOW}   ⚠️  WhatsApp: $(echo "$WA_STATUS" | jq -r '.error')${NC}"
fi

# Resumo Final
echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 RESUMO DO TESTE${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 1. OTP enviado e salvo no banco${NC}"
echo -e "${GREEN}✅ 2. OTP verificado com sucesso${NC}"
echo -e "${GREEN}✅ 3. Cookie de sessão criado${NC}"
echo -e "${GREEN}✅ 4. Autenticação validada (/api/auth/me)${NC}"
echo -e "${GREEN}✅ 5. Endpoints protegidos testados${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BOLD}${GREEN}🎉 Fluxo de autenticação funcionando 100%!${NC}\n"

# Salvar cookie para uso posterior
echo -e "${YELLOW}💾 Cookie salvo em /tmp/pratica_test_cookie.txt para testes futuros${NC}"
echo "$COOKIE_ENCODED" > /tmp/pratica_test_cookie.txt
echo -e "\nUse: ${BOLD}curl -H \"Cookie: pratica-session=\$(cat /tmp/pratica_test_cookie.txt)\" ...${NC}\n"
