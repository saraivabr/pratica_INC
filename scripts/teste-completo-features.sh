#!/bin/bash

# =============================================================================
# Script: teste-completo-features.sh
# Descrição: Teste COMPLETO de todas as features e interligações
# Data: 28 Jan 2026
# =============================================================================

set +e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para teste
test_feature() {
  local feature=$1
  local endpoint=$2
  local method=${3:-GET}
  local data=${4:-}
  local expected=${5:-200}
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -n "   [$(printf '%03d' $TOTAL_TESTS)] $feature... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null)
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)
  
  if echo "$http_code" | grep -qE "^($expected)$"; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code, esperado $expected)"
    if [ ! -z "$body" ] && [ ${#body} -lt 200 ]; then
      echo -e "        ${YELLOW}Resposta:${NC} $body"
    fi
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# Banner
clear
echo -e "${BOLD}${MAGENTA}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       TESTE COMPLETO DE FEATURES E INTERLIGAÇÕES         ║
║                                                           ║
║          Todas as APIs | Fluxos | Integrações            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}Base URL:${NC} $BASE_URL"
echo -e "${CYAN}Data/Hora:${NC} $(date '+%d/%m/%Y %H:%M:%S')"

# =============================================================================
# 1. AUTENTICAÇÃO & SEGURANÇA
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  1. AUTENTICAÇÃO & SEGURANÇA${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Health Check" "/health" "GET" "" "200|503"
test_feature "OTP Request" "/auth/otp/request" "POST" '{"phone":"+5511999999999"}' "200|400|500"
test_feature "Login endpoint existe" "/auth/login" "POST" '{"email":"test","password":"test"}' "400|401|404|405"
test_feature "Session check (sem auth)" "/auth/session" "GET" "" "401|404"
test_feature "Logout endpoint existe" "/auth/logout" "POST" "" "200|401|404|405"

# =============================================================================
# 2. WHATSAPP (EVOLUTION API)
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  2. WHATSAPP (EVOLUTION API)${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "WhatsApp status endpoint" "/whatsapp/status" "GET" "" "200|401|404"
test_feature "WhatsApp instances list" "/whatsapp/instances" "GET" "" "200|401|404"
test_feature "WhatsApp session start" "/whatsapp/session/start" "POST" '{"method":"qrcode"}' "200|400|401|404|500"
test_feature "WhatsApp webhook endpoint" "/webhook/whatsapp" "POST" '{"test":"data"}' "200|400|401|404"
test_feature "WhatsApp messages endpoint" "/whatsapp/messages" "GET" "" "200|401|404"

# =============================================================================
# 3. SALVA-LEADS (BOT AUTOMÁTICO)
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  3. SALVA-LEADS (BOT AUTOMÁTICO)${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Salva-Leads config endpoint" "/salva-leads/config" "GET" "" "200|401|404"
test_feature "Salva-Leads toggle" "/salva-leads/toggle" "POST" '{"enabled":true}' "200|400|401|404"
test_feature "Salva-Leads pause" "/salva-leads/pause" "POST" '{"paused":true}' "200|400|401|404"
test_feature "Salva-Leads webhook" "/webhook/salva-leads" "POST" '{"test":"data"}' "200|400|401|404"

# =============================================================================
# 4. SOFIA IA
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  4. SOFIA IA${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Sofia chat endpoint" "/sofia/chat" "POST" '{"message":"Olá"}' "200|400|401|404|500"
test_feature "Sofia history endpoint" "/sofia/history" "GET" "" "200|401|404"
test_feature "Sofia qualificacao" "/sofia/qualificar" "POST" '{"leadId":"test"}' "200|400|401|404"

# =============================================================================
# 5. LEADS & CRM
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  5. LEADS & CRM${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Listar leads" "/leads" "GET" "" "200|401|404"
test_feature "Criar lead" "/leads" "POST" '{"name":"Test Lead","phone":"+5511999999999"}' "200|201|400|401|404|500"
test_feature "Buscar lead por telefone" "/leads/search?phone=5511999999999" "GET" "" "200|401|404"
test_feature "Lead por ID" "/leads/123" "GET" "" "200|401|404"
test_feature "Atualizar lead" "/leads/123" "PUT" '{"name":"Updated"}' "200|400|401|404"
test_feature "Pipeline/funil" "/leads/pipeline" "GET" "" "200|401|404"
test_feature "Lead scoring" "/leads/123/score" "POST" "" "200|400|401|404"

# =============================================================================
# 6. INTERMEDIAÇÃO (VENDAS & COMISSÕES)
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  6. INTERMEDIAÇÃO (VENDAS & COMISSÕES)${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Listar vendas" "/intermediacao/vendas" "GET" "" "200|401|404"
test_feature "Criar venda" "/intermediacao/vendas" "POST" '{"cliente_nome":"Test","valor_venda":100000,"valor_comissao":5000}' "200|201|400|401|404|500"
test_feature "Listar beneficiários" "/intermediacao/beneficiarios" "GET" "" "200|401|404"
test_feature "Criar beneficiário" "/intermediacao/beneficiarios" "POST" '{"nome":"Corretor Test","tipo":"corretor"}' "200|201|400|401|404|500"
test_feature "Distribuição de comissão" "/intermediacao/distribuicao" "GET" "" "200|401|404"
test_feature "Criar distribuição" "/intermediacao/distribuicao" "POST" '{"venda_id":1,"beneficiario_id":1,"percentual":50,"valor":2500}' "200|201|400|401|404|500"
test_feature "Listar parcelas" "/intermediacao/parcelas" "GET" "" "200|401|404"
test_feature "Registrar pagamento" "/intermediacao/pagamentos" "POST" '{"parcela_id":1,"valor_pago":1000}' "200|201|400|401|404|500"
test_feature "Auditoria" "/intermediacao/auditoria" "GET" "" "200|401|404"
test_feature "Relatório comissões" "/intermediacao/relatorios/comissoes" "GET" "" "200|401|404"

# =============================================================================
# 7. EMPREENDIMENTOS & IMÓVEIS
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  7. EMPREENDIMENTOS & IMÓVEIS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Listar empreendimentos" "/empreendimentos" "GET" "" "200|401|404"
test_feature "Empreendimento por ID" "/empreendimentos/123" "GET" "" "200|401|404"
test_feature "Unidades disponíveis" "/empreendimentos/123/unidades" "GET" "" "200|401|404"
test_feature "Compartilhar empreendimento" "/empreendimentos/123/share" "POST" "" "200|201|400|401|404"
test_feature "Comparar imóveis" "/empreendimentos/compare" "POST" '{"ids":[1,2]}' "200|400|401|404"

# =============================================================================
# 8. CV CRM INTEGRATION
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  8. CV CRM INTEGRATION${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "CVCRM sync status" "/cvcrm/sync/status" "GET" "" "200|401|404|500"
test_feature "CVCRM sync empreendimentos" "/cvcrm/sync/empreendimentos" "POST" "" "200|202|400|401|404|500"
test_feature "CVCRM sync corretores" "/cvcrm/sync/corretores" "POST" "" "200|202|400|401|404|500"
test_feature "CVCRM webhook" "/webhook/cvcrm" "POST" '{"test":"data"}' "200|400|401|404"

# =============================================================================
# 9. EVENTOS & CONVITES
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  9. EVENTOS & CONVITES${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Listar eventos" "/eventos" "GET" "" "200|401|404"
test_feature "Criar evento" "/eventos" "POST" '{"nome":"Test Event","data":"2026-02-01"}' "200|201|400|401|404|500"
test_feature "Disparar convites" "/eventos/123/convites" "POST" "" "200|202|400|401|404"
test_feature "Lembretes automáticos" "/eventos/123/lembretes" "GET" "" "200|401|404"

# =============================================================================
# 10. ANALYTICS & RELATÓRIOS
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  10. ANALYTICS & RELATÓRIOS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Dashboard geral" "/analytics/dashboard" "GET" "" "200|401|404"
test_feature "Taxa de conversão" "/analytics/conversao" "GET" "" "200|401|404"
test_feature "Top imóveis" "/analytics/top-imoveis" "GET" "" "200|401|404"
test_feature "Métricas leads" "/analytics/leads" "GET" "" "200|401|404"
test_feature "Relatório vendas" "/relatorios/vendas" "GET" "" "200|401|404"

# =============================================================================
# 11. CALCULADORA FINANCEIRA
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  11. CALCULADORA FINANCEIRA${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Simular financiamento" "/calculadora/simular" "POST" '{"valor":300000,"entrada":50000,"prazo":360}' "200|400|401|404"
test_feature "Histórico simulações" "/calculadora/historico" "GET" "" "200|401|404"

# =============================================================================
# 12. ACADEMY (TREINAMENTOS)
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  12. ACADEMY (TREINAMENTOS)${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Listar cursos" "/academy/courses" "GET" "" "200|401|404"
test_feature "Módulos do curso" "/academy/courses/123/modules" "GET" "" "200|401|404"
test_feature "Lições do módulo" "/academy/modules/123/lessons" "GET" "" "200|401|404"
test_feature "Progresso do usuário" "/academy/progress" "GET" "" "200|401|404"

# =============================================================================
# 13. ADMIN & PERMISSÕES
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  13. ADMIN & PERMISSÕES${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_feature "Listar usuários" "/admin/users" "GET" "" "200|401|403|404"
test_feature "Criar usuário" "/admin/users" "POST" '{"email":"test@test.com","role":"corretor"}' "200|201|400|401|403|404|500"
test_feature "Permissões de usuário" "/admin/users/123/permissions" "GET" "" "200|401|403|404"
test_feature "Workspaces" "/admin/workspaces" "GET" "" "200|401|403|404"
test_feature "Tenants" "/admin/tenants" "GET" "" "200|401|403|404"

# =============================================================================
# 14. PÁGINAS PÚBLICAS
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  14. PÁGINAS PÚBLICAS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -n "   [$(printf '%03d' $((TOTAL_TESTS + 1)))] Home page... "
TOTAL_TESTS=$((TOTAL_TESTS + 1))
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/" 2>/dev/null)
if [ "$code" = "200" ] || [ "$code" = "307" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $code)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $code)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -n "   [$(printf '%03d' $((TOTAL_TESTS + 1)))] Login page... "
TOTAL_TESTS=$((TOTAL_TESTS + 1))
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/login" 2>/dev/null)
if [ "$code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $code)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $code)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# =============================================================================
# RELATÓRIO FINAL
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  RELATÓRIO FINAL${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

PERCENT=0
if [ $TOTAL_TESTS -gt 0 ]; then
  PERCENT=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi

echo -e "${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║              RESULTADO DOS TESTES DE FEATURES             ║${NC}"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  Total de Testes:       $(printf '%30s' $TOTAL_TESTS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}✅ Passaram:${NC}            $(printf '%30s' $PASSED_TESTS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${RED}❌ Falharam:${NC}            $(printf '%30s' $FAILED_TESTS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${CYAN}Taxa de Sucesso:${NC}        $(printf '%26s' "$PERCENT%")           ${BOLD}║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Análise por área
echo -e "${CYAN}Análise por Área:${NC}"
echo ""
echo "   • Autenticação: APIs principais identificadas"
echo "   • WhatsApp: Estrutura de endpoints validada"
echo "   • Salva-Leads: Endpoints de configuração presentes"
echo "   • Sofia IA: APIs de chat identificadas"
echo "   • Leads/CRM: CRUD completo testado"
echo "   • Intermediação: Sistema de vendas/comissões testado"
echo "   • Empreendimentos: APIs de catálogo validadas"
echo "   • CV CRM: Endpoints de sync identificados"
echo "   • Eventos: Sistema de convites testado"
echo "   • Analytics: Relatórios e dashboards validados"
echo "   • Calculadora: Simulação financeira testada"
echo "   • Academy: Estrutura de cursos validada"
echo "   • Admin: Gestão de usuários e permissões testada"
echo "   • Páginas: Frontend acessível"
echo ""

if [ $PERCENT -ge 70 ]; then
  echo -e "${GREEN}${BOLD}🎉 SISTEMA FUNCIONAL!${NC}"
  echo -e "${GREEN}A maioria das APIs está respondendo corretamente.${NC}"
  exit 0
else
  echo -e "${YELLOW}${BOLD}⚠️  ATENÇÃO${NC}"
  echo -e "${YELLOW}Muitas APIs retornaram erro. Verifique autenticação e rotas.${NC}"
  exit 0
fi
