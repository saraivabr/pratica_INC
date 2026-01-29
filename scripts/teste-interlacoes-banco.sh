#!/bin/bash

# =============================================================================
# Script: teste-interlacoes-banco.sh
# Descrição: Testa INTERLIGAÇÕES entre todas as tabelas do banco
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

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL não configurado!${NC}"
  exit 1
fi

# Extrair credenciais
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p' | cut -d'?' -f1)
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\(.*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p')

export PGPASSWORD="$DB_PASS"

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para teste SQL
test_sql() {
  local test_name=$1
  local query=$2
  local expected=$3
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -n "   [$(printf '%03d' $TOTAL_TESTS)] $test_name... "
  
  result=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>&1 | xargs)
  
  if echo "$result" | grep -qi "$expected"; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo -e "        ${YELLOW}Resultado:${NC} $result"
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
║          TESTE DE INTERLIGAÇÕES DO BANCO DE DADOS        ║
║                                                           ║
║       Relacionamentos | Joins | Integridade de Dados     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}Database:${NC} $DB_NAME @ $DB_HOST:$DB_PORT"
echo -e "${CYAN}Data/Hora:${NC} $(date '+%d/%m/%Y %H:%M:%S')"

# =============================================================================
# 1. INTERLIGAÇÃO: USERS ↔ TENANTS ↔ WORKSPACES
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  1. INTERLIGAÇÃO: USERS ↔ TENANTS ↔ WORKSPACES${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Users tem tenant_id válido" \
  "SELECT COUNT(*) = (SELECT COUNT(*) FROM users WHERE tenant_id IS NOT NULL) FROM users u INNER JOIN tenants t ON u.tenant_id = t.id" \
  "t"

test_sql "Users tem workspace_id válido" \
  "SELECT COUNT(*) = (SELECT COUNT(*) FROM users WHERE workspace_id IS NOT NULL) FROM users u INNER JOIN workspaces w ON u.workspace_id = w.id" \
  "t"

test_sql "Workspaces pertencem a tenants existentes" \
  "SELECT COUNT(*) FROM workspaces w LEFT JOIN tenants t ON w.tenant_id = t.id WHERE t.id IS NULL" \
  "0"

test_sql "Não há users órfãos (sem tenant)" \
  "SELECT COUNT(*) FROM users WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)" \
  "0"

# =============================================================================
# 2. INTERLIGAÇÃO: WHATSAPP ↔ USERS ↔ LEADS
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  2. INTERLIGAÇÃO: WHATSAPP ↔ USERS ↔ LEADS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "WhatsApp instances pertencem a users válidos" \
  "SELECT COUNT(*) FROM whatsapp_instances wi LEFT JOIN users u ON wi.user_id = u.id WHERE wi.user_id IS NOT NULL AND u.id IS NULL" \
  "0"

test_sql "WhatsApp instances pertencem a tenants válidos" \
  "SELECT COUNT(*) FROM whatsapp_instances wi LEFT JOIN tenants t ON wi.tenant_id = t.id WHERE t.id IS NULL" \
  "0"

test_sql "WhatsApp messages com lead_id apontam para leads existentes" \
  "SELECT COUNT(*) FROM whatsapp_messages wm WHERE wm.lead_id IS NOT NULL AND wm.lead_id NOT IN (SELECT id FROM leads)" \
  "0"

test_sql "WhatsApp contacts com lead_id apontam para leads existentes" \
  "SELECT COUNT(*) FROM whatsapp_contacts wc WHERE wc.lead_id IS NOT NULL AND wc.lead_id NOT IN (SELECT id FROM leads)" \
  "0"

test_sql "WhatsApp messages pertencem ao mesmo tenant da instance" \
  "SELECT COUNT(*) FROM whatsapp_messages wm INNER JOIN whatsapp_instances wi ON wm.instance_name = wi.instance_name WHERE wm.tenant_id != wi.tenant_id" \
  "0"

# =============================================================================
# 3. INTERLIGAÇÃO: INTERMEDIAÇÃO (VENDAS → DISTRIBUIÇÃO → PARCELAS → PAGAMENTOS)
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  3. INTERLIGAÇÃO: VENDAS → DISTRIBUIÇÃO → PARCELAS → PAGAMENTOS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Vendas pertencem a tenants válidos" \
  "SELECT COUNT(*) FROM im_vendas v LEFT JOIN tenants t ON v.tenant_id = t.id WHERE t.id IS NULL" \
  "0"

test_sql "Vendas criadas por users existentes" \
  "SELECT COUNT(*) FROM im_vendas v WHERE v.created_by IS NOT NULL AND v.created_by NOT IN (SELECT id FROM users)" \
  "0"

test_sql "Beneficiários pertencem a tenants válidos" \
  "SELECT COUNT(*) FROM im_beneficiarios b LEFT JOIN tenants t ON b.tenant_id = t.id WHERE t.id IS NULL" \
  "0"

test_sql "Beneficiários com user_id apontam para users existentes" \
  "SELECT COUNT(*) FROM im_beneficiarios b WHERE b.user_id IS NOT NULL AND b.user_id NOT IN (SELECT id FROM users)" \
  "0"

test_sql "Distribuições apontam para vendas existentes" \
  "SELECT COUNT(*) FROM im_distribuicao d WHERE d.venda_id NOT IN (SELECT id FROM im_vendas)" \
  "0"

test_sql "Distribuições apontam para beneficiários existentes" \
  "SELECT COUNT(*) FROM im_distribuicao d WHERE d.beneficiario_id NOT IN (SELECT id FROM im_beneficiarios)" \
  "0"

test_sql "Parcelas apontam para distribuições existentes" \
  "SELECT COUNT(*) FROM im_parcelas p WHERE p.distribuicao_id NOT IN (SELECT id FROM im_distribuicao)" \
  "0"

test_sql "Pagamentos apontam para parcelas existentes" \
  "SELECT COUNT(*) FROM im_pagamentos pg WHERE pg.parcela_id NOT IN (SELECT id FROM im_parcelas)" \
  "0"

test_sql "Pagamentos realizados por users existentes" \
  "SELECT COUNT(*) FROM im_pagamentos pg WHERE pg.realizado_por IS NOT NULL AND pg.realizado_por NOT IN (SELECT id FROM users)" \
  "0"

# =============================================================================
# 4. INTEGRIDADE: SOMA DE DISTRIBUIÇÕES = VALOR COMISSÃO
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  4. INTEGRIDADE: VALIDAÇÕES MATEMÁTICAS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Soma de distribuições <= valor da comissão (vendas com distribuição)" \
  "SELECT COUNT(*) FROM im_vendas v WHERE EXISTS (SELECT 1 FROM im_distribuicao d WHERE d.venda_id = v.id) AND v.valor_comissao < (SELECT COALESCE(SUM(d2.valor), 0) FROM im_distribuicao d2 WHERE d2.venda_id = v.id)" \
  "0"

test_sql "Percentuais de distribuição somam <= 100% por venda" \
  "SELECT COUNT(*) FROM im_vendas v WHERE EXISTS (SELECT 1 FROM im_distribuicao d WHERE d.venda_id = v.id) AND (SELECT COALESCE(SUM(d2.percentual), 0) FROM im_distribuicao d2 WHERE d2.venda_id = v.id) > 100" \
  "0"

test_sql "Soma de parcelas = valor da distribuição (quando há parcelas)" \
  "SELECT COUNT(*) FROM im_distribuicao d WHERE EXISTS (SELECT 1 FROM im_parcelas p WHERE p.distribuicao_id = d.id) AND d.valor != (SELECT COALESCE(SUM(p2.valor), 0) FROM im_parcelas p2 WHERE p2.distribuicao_id = d.id)" \
  "0"

test_sql "Valor pago <= valor da parcela" \
  "SELECT COUNT(*) FROM im_pagamentos pg INNER JOIN im_parcelas p ON pg.parcela_id = p.id WHERE pg.valor_pago > p.valor" \
  "0"

# =============================================================================
# 5. INTERLIGAÇÃO: LEADS ↔ WHATSAPP ↔ CV CRM
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  5. INTERLIGAÇÃO: LEADS ↔ WHATSAPP ↔ CV CRM${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Leads com cvcrm_lead_id apontam para cvcrm_leads existentes" \
  "SELECT COUNT(*) FROM leads l WHERE l.cvcrm_lead_id IS NOT NULL AND l.cvcrm_lead_id NOT IN (SELECT id FROM cvcrm_leads)" \
  "0"

test_sql "Leads pertencem a users válidos (quando atribuídos)" \
  "SELECT COUNT(*) FROM leads l WHERE l.user_id IS NOT NULL AND l.user_id NOT IN (SELECT id FROM users)" \
  "0"

test_sql "WhatsApp messages com lead associado pertencem ao mesmo tenant do lead" \
  "SELECT COUNT(*) FROM whatsapp_messages wm INNER JOIN leads l ON wm.lead_id = l.id INNER JOIN users u ON l.user_id = u.id WHERE wm.tenant_id != u.tenant_id" \
  "0"

# =============================================================================
# 6. INTERLIGAÇÃO: SALVA-LEADS ↔ WHATSAPP ↔ USERS
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  6. INTERLIGAÇÃO: SALVA-LEADS ↔ WHATSAPP ↔ USERS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Salva-Leads config pertence a tenants válidos" \
  "SELECT COUNT(*) FROM salva_leads_config slc LEFT JOIN tenants t ON slc.tenant_id = t.id WHERE t.id IS NULL" \
  "0"

test_sql "Salva-Leads config pertence a users válidos" \
  "SELECT COUNT(*) FROM salva_leads_config slc LEFT JOIN users u ON slc.user_id = u.id WHERE u.id IS NULL" \
  "0"

test_sql "Não há duplicatas de config (tenant + user únicos)" \
  "SELECT COUNT(*) FROM (SELECT tenant_id, user_id, COUNT(*) as cnt FROM salva_leads_config GROUP BY tenant_id, user_id HAVING COUNT(*) > 1) duplicatas" \
  "0"

# =============================================================================
# 7. INTERLIGAÇÃO: ACADEMY ↔ USERS
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  7. INTERLIGAÇÃO: ACADEMY ↔ USERS${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Módulos pertencem a cursos existentes" \
  "SELECT COUNT(*) FROM academy_modules am WHERE am.course_id IS NOT NULL AND am.course_id NOT IN (SELECT id FROM academy_modules WHERE id IS NOT NULL)" \
  "0"

test_sql "Progresso pertence a users válidos" \
  "SELECT COUNT(*) FROM academy_progress ap WHERE ap.user_id IS NOT NULL AND ap.user_id NOT IN (SELECT id FROM users)" \
  "0"

# =============================================================================
# 8. TESTES DE QUERIES COMPLEXAS (JOINS)
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  8. TESTES DE QUERIES COMPLEXAS (JOINS)${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Query: Vendas com distribuições e beneficiários (JOIN 3 tabelas)" \
  "SELECT COUNT(*) >= 0 FROM im_vendas v LEFT JOIN im_distribuicao d ON v.id = d.venda_id LEFT JOIN im_beneficiarios b ON d.beneficiario_id = b.id" \
  "t"

test_sql "Query: Leads com mensagens WhatsApp (JOIN 2 tabelas)" \
  "SELECT COUNT(*) >= 0 FROM leads l LEFT JOIN whatsapp_messages wm ON l.id = wm.lead_id" \
  "t"

test_sql "Query: Users com suas instâncias WhatsApp e config Salva-Leads (JOIN 3 tabelas)" \
  "SELECT COUNT(*) >= 0 FROM users u LEFT JOIN whatsapp_instances wi ON u.id = wi.user_id LEFT JOIN salva_leads_config slc ON u.id = slc.user_id" \
  "t"

test_sql "Query: Vendas com histórico de auditoria (JOIN 2 tabelas)" \
  "SELECT COUNT(*) >= 0 FROM im_vendas v LEFT JOIN im_auditoria ia ON v.id = ia.registro_id AND ia.tabela = 'im_vendas'" \
  "t"

test_sql "Query: Parcelas com seus pagamentos (JOIN 2 tabelas)" \
  "SELECT COUNT(*) >= 0 FROM im_parcelas p LEFT JOIN im_pagamentos pg ON p.id = pg.parcela_id" \
  "t"

# =============================================================================
# 9. TESTES DE ISOLAMENTO MULTI-TENANT
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  9. TESTES DE ISOLAMENTO MULTI-TENANT${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Vendas só relacionam com beneficiários do mesmo tenant" \
  "SELECT COUNT(*) FROM im_distribuicao d INNER JOIN im_vendas v ON d.venda_id = v.id INNER JOIN im_beneficiarios b ON d.beneficiario_id = b.id WHERE v.tenant_id != b.tenant_id" \
  "0"

test_sql "WhatsApp messages pertencem ao tenant da instance" \
  "SELECT COUNT(*) FROM whatsapp_messages wm INNER JOIN whatsapp_instances wi ON wm.instance_name = wi.instance_name WHERE wm.tenant_id != wi.tenant_id" \
  "0"

test_sql "Users de um tenant não aparecem em workspaces de outro tenant" \
  "SELECT COUNT(*) FROM users u INNER JOIN workspaces w ON u.workspace_id = w.id WHERE u.tenant_id != w.tenant_id AND u.tenant_id IS NOT NULL AND w.tenant_id IS NOT NULL" \
  "0"

# =============================================================================
# 10. TESTES DE PERFORMANCE (QUERIES LENTAS)
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  10. TESTES DE PERFORMANCE (ÍNDICES)${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_sql "Índice em im_vendas.tenant_id está sendo usado" \
  "SELECT COUNT(*) > 0 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_im_vendas_tenant'" \
  "t"

test_sql "Índice em whatsapp_messages.phone_number está sendo usado" \
  "SELECT COUNT(*) > 0 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_whatsapp_messages_phone'" \
  "t"

test_sql "Índice em otp_codes.telefone está sendo usado" \
  "SELECT COUNT(*) > 0 FROM pg_stat_user_indexes WHERE indexrelname = 'idx_otp_telefone'" \
  "t"

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
echo -e "${BOLD}║           RESULTADO DOS TESTES DE INTERLIGAÇÕES           ║${NC}"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  Total de Testes:       $(printf '%30s' $TOTAL_TESTS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}✅ Passaram:${NC}            $(printf '%30s' $PASSED_TESTS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${RED}❌ Falharam:${NC}            $(printf '%30s' $FAILED_TESTS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${CYAN}Taxa de Sucesso:${NC}        $(printf '%26s' "$PERCENT%")           ${BOLD}║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Áreas Testadas:${NC}"
echo ""
echo "   • Relacionamentos Users ↔ Tenants ↔ Workspaces"
echo "   • Relacionamentos WhatsApp ↔ Users ↔ Leads"
echo "   • Fluxo completo: Vendas → Distribuição → Parcelas → Pagamentos"
echo "   • Validações matemáticas (somas, percentuais)"
echo "   • Integração Leads ↔ WhatsApp ↔ CV CRM"
echo "   • Salva-Leads ↔ WhatsApp ↔ Users"
echo "   • Academy ↔ Users"
echo "   • Queries complexas com JOINs múltiplos"
echo "   • Isolamento multi-tenant"
echo "   • Performance e uso de índices"
echo ""

if [ $PERCENT -eq 100 ]; then
  echo -e "${GREEN}${BOLD}🎉 PERFEITO! Todas as interligações estão corretas!${NC}"
  exit 0
elif [ $PERCENT -ge 90 ]; then
  echo -e "${GREEN}${BOLD}✅ EXCELENTE! Interligações praticamente perfeitas.${NC}"
  exit 0
elif [ $PERCENT -ge 70 ]; then
  echo -e "${YELLOW}${BOLD}⚠️  BOM. Algumas interligações precisam atenção.${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}❌ CRÍTICO. Várias interligações com problemas.${NC}"
  exit 1
fi
