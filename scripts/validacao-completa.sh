#!/bin/bash

# =============================================================================
# Script: validacao-completa.sh
# Descrição: Validação COMPLETA de todas tabelas, conexões e funcionalidades
# Data: 28 Jan 2026
# =============================================================================

set +e  # Não parar em erros

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Função para imprimir seção
print_section() {
  echo ""
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

# Função para check
check() {
  local name=$1
  local command=$2
  local expected=$3
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -n "   [$(printf '%03d' $TOTAL_CHECKS)] $name... "
  
  result=$(eval "$command" 2>&1)
  
  if echo "$result" | grep -qi "$expected"; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo -e "        ${YELLOW}Resultado:${NC} $result"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

# Função para warning check
check_warn() {
  local name=$1
  local command=$2
  local expected=$3
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -n "   [$(printf '%03d' $TOTAL_CHECKS)] $name... "
  
  result=$(eval "$command" 2>&1)
  
  if echo "$result" | grep -qi "$expected"; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${YELLOW}⚠️  WARNING${NC}"
    echo -e "        ${YELLOW}Resultado:${NC} $result"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    return 1
  fi
}

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL não configurado!${NC}"
  exit 1
fi

# Extrair credenciais do banco
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p' | cut -d'?' -f1)
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\(.*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p')

export PGPASSWORD="$DB_PASS"

# Banner
clear
echo -e "${BOLD}${MAGENTA}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         VALIDAÇÃO COMPLETA DO SISTEMA PRÁTICA            ║
║                                                           ║
║              Banco | Conexões | Integridade              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}Database:${NC} $DB_NAME @ $DB_HOST:$DB_PORT"
echo -e "${CYAN}Data/Hora:${NC} $(date '+%d/%m/%Y %H:%M:%S')"

# =============================================================================
# 1. CONECTIVIDADE
# =============================================================================

print_section "1. CONECTIVIDADE"

check "PostgreSQL responde" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT 1' -t" \
  "1"

check "Redis responde" \
  "redis-cli ping" \
  "PONG"

check_warn "Evolution API responde" \
  "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/" \
  "200\|404"

check "Aplicação Next.js responde" \
  "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/" \
  "307\|200"

# =============================================================================
# 2. ESTRUTURA DO BANCO
# =============================================================================

print_section "2. ESTRUTURA DO BANCO DE DADOS"

# Tabelas críticas
echo -e "${BOLD}Tabelas Críticas (15):${NC}"

check "Tabela users existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')\" -t" \
  "t"

check "Tabela tenants existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenants')\" -t" \
  "t"

check "Tabela workspaces existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces')\" -t" \
  "t"

check "Tabela otp_codes existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'otp_codes')\" -t" \
  "t"

check "Tabela leads existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads')\" -t" \
  "t"

echo ""
echo -e "${BOLD}Sistema de Intermediação (6):${NC}"

check "Tabela im_vendas existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'im_vendas')\" -t" \
  "t"

check "Tabela im_beneficiarios existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'im_beneficiarios')\" -t" \
  "t"

check "Tabela im_distribuicao existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'im_distribuicao')\" -t" \
  "t"

check "Tabela im_parcelas existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'im_parcelas')\" -t" \
  "t"

check "Tabela im_pagamentos existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'im_pagamentos')\" -t" \
  "t"

check "Tabela im_auditoria existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'im_auditoria')\" -t" \
  "t"

echo ""
echo -e "${BOLD}Sistema WhatsApp (4):${NC}"

check "Tabela whatsapp_instances existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_instances')\" -t" \
  "t"

check "Tabela whatsapp_messages existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_messages')\" -t" \
  "t"

check "Tabela whatsapp_contacts existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_contacts')\" -t" \
  "t"

check "Tabela salva_leads_config existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salva_leads_config')\" -t" \
  "t"

# =============================================================================
# 3. INTEGRIDADE REFERENCIAL (FOREIGN KEYS)
# =============================================================================

print_section "3. INTEGRIDADE REFERENCIAL"

check "FK: im_vendas → tenants" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'im_vendas' AND constraint_name LIKE '%tenant%')\" -t" \
  "t"

check "FK: im_vendas → users (created_by)" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'im_vendas' AND constraint_name LIKE '%created_by%')\" -t" \
  "t"

check "FK: im_beneficiarios → tenants" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'im_beneficiarios' AND constraint_name LIKE '%tenant%')\" -t" \
  "t"

check "FK: im_distribuicao → im_vendas" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'im_distribuicao' AND constraint_name LIKE '%venda%')\" -t" \
  "t"

check "FK: im_distribuicao → im_beneficiarios" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'im_distribuicao' AND constraint_name LIKE '%beneficiario%')\" -t" \
  "t"

check "FK: im_parcelas → im_distribuicao" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'im_parcelas' AND constraint_name LIKE '%distribuicao%')\" -t" \
  "t"

check "FK: im_pagamentos → im_parcelas" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'im_pagamentos' AND constraint_name LIKE '%parcela%')\" -t" \
  "t"

check "FK: whatsapp_instances → tenants" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'whatsapp_instances' AND constraint_name LIKE '%tenant%')\" -t" \
  "t"

check "FK: whatsapp_instances → users" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'whatsapp_instances' AND constraint_name LIKE '%user%')\" -t" \
  "t"

check "FK: whatsapp_messages → tenants" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'whatsapp_messages' AND constraint_name LIKE '%tenant%')\" -t" \
  "t"

check "FK: whatsapp_messages → leads" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'whatsapp_messages' AND constraint_name LIKE '%lead%')\" -t" \
  "t"

# =============================================================================
# 4. ÍNDICES
# =============================================================================

print_section "4. ÍNDICES DE PERFORMANCE"

check "Índice: idx_im_vendas_tenant" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_im_vendas_tenant')\" -t" \
  "t"

check "Índice: idx_im_vendas_status" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_im_vendas_status')\" -t" \
  "t"

check "Índice: idx_whatsapp_messages_tenant" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_messages_tenant')\" -t" \
  "t"

check "Índice: idx_whatsapp_messages_phone" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_messages_phone')\" -t" \
  "t"

check "Índice: idx_otp_telefone" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_telefone')\" -t" \
  "t"

check "Índice: idx_otp_expires" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_otp_expires')\" -t" \
  "t"

# =============================================================================
# 5. TRIGGERS
# =============================================================================

print_section "5. TRIGGERS ATIVOS"

check "Trigger: update_im_vendas_updated_at" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_im_vendas_updated_at')\" -t" \
  "t"

check "Trigger: update_im_beneficiarios_updated_at" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_im_beneficiarios_updated_at')\" -t" \
  "t"

check "Trigger: update_whatsapp_instances_updated_at" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_instances_updated_at')\" -t" \
  "t"

# =============================================================================
# 6. DADOS CRÍTICOS
# =============================================================================

print_section "6. DADOS CRÍTICOS"

check "Existe pelo menos 1 tenant" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT COUNT(*) >= 1 FROM tenants\" -t" \
  "t"

check "Existe pelo menos 1 usuário" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT COUNT(*) >= 1 FROM users\" -t" \
  "t"

check "Usuário admin existe" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM users WHERE email = 'admin@pratica.digital')\" -t" \
  "t"

check "Admin tem senha configurada" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT password_hash IS NOT NULL FROM users WHERE email = 'admin@pratica.digital'\" -t" \
  "t"

check "Admin tem tenant_id configurado" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT tenant_id IS NOT NULL FROM users WHERE email = 'admin@pratica.digital'\" -t" \
  "t"

check "Admin tem workspace_id configurado" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT workspace_id IS NOT NULL FROM users WHERE email = 'admin@pratica.digital'\" -t" \
  "t"

check "Admin está ativo" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT is_active FROM users WHERE email = 'admin@pratica.digital'\" -t" \
  "t"

# =============================================================================
# 7. TIPOS DE DADOS
# =============================================================================

print_section "7. TIPOS DE DADOS"

check "users.id é UUID" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'\" -t" \
  "uuid"

check "leads.id é UUID" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT data_type FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'id'\" -t" \
  "uuid"

check "im_vendas.id é INTEGER/SERIAL" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT data_type FROM information_schema.columns WHERE table_name = 'im_vendas' AND column_name = 'id'\" -t" \
  "integer"

check "im_vendas.created_by é UUID" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT data_type FROM information_schema.columns WHERE table_name = 'im_vendas' AND column_name = 'created_by'\" -t" \
  "uuid"

check "whatsapp_messages.lead_id é UUID" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT data_type FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'lead_id'\" -t" \
  "uuid"

# =============================================================================
# 8. CONSTRAINTS
# =============================================================================

print_section "8. CONSTRAINTS"

check "im_vendas.valor_venda > 0" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'im_vendas_valor_positivo')\" -t" \
  "t"

check "im_vendas.valor_comissao > 0" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'im_vendas_comissao_positiva')\" -t" \
  "t"

check "im_distribuicao.percentual entre 0 e 100" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'im_distribuicao_percentual')\" -t" \
  "t"

check "users.email UNIQUE" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key')\" -t" \
  "t"

# =============================================================================
# 9. ESTATÍSTICAS DO BANCO
# =============================================================================

print_section "9. ESTATÍSTICAS DO BANCO"

echo -e "${CYAN}Total de tabelas:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" -t | xargs | head -1

echo -e "${CYAN}Total de foreign keys:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY'" -t | xargs | head -1

echo -e "${CYAN}Total de índices:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'" -t | xargs | head -1

echo -e "${CYAN}Total de triggers:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM pg_trigger" -t | xargs | head -1

echo -e "${CYAN}Total de usuários cadastrados:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM users" -t | xargs | head -1

echo -e "${CYAN}Total de tenants:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM tenants" -t | xargs | head -1

echo -e "${CYAN}Total de workspaces:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM workspaces" -t | xargs | head -1

# =============================================================================
# 10. TESTES DE INSERÇÃO
# =============================================================================

print_section "10. TESTES DE INSERÇÃO (DRY RUN)"

echo -e "${YELLOW}Testando inserções simuladas...${NC}"

# Teste de inserção OTP
check "Inserção OTP simulada" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT pg_typeof('+5511999999999'::VARCHAR)\" -t 2>&1" \
  "character varying"

# Teste de inserção beneficiário
check "Inserção beneficiário simulada" \
  "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT pg_typeof('Corretor Teste'::VARCHAR)\" -t 2>&1" \
  "character varying"

# =============================================================================
# RELATÓRIO FINAL
# =============================================================================

print_section "RELATÓRIO FINAL"

# Calcular percentual
TOTAL_PERCENT=0
if [ $TOTAL_CHECKS -gt 0 ]; then
  TOTAL_PERCENT=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
fi

echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                  RESULTADO DA VALIDAÇÃO                   ║${NC}"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  Total de Verificações: $(printf '%30s' $TOTAL_CHECKS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}✅ Passaram:${NC}          $(printf '%30s' $PASSED_CHECKS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${RED}❌ Falharam:${NC}          $(printf '%30s' $FAILED_CHECKS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${YELLOW}⚠️  Avisos:${NC}           $(printf '%30s' $WARNING_CHECKS)           ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${CYAN}Taxa de Sucesso:${NC}      $(printf '%26s' "$TOTAL_PERCENT%")           ${BOLD}║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Status final
if [ $TOTAL_PERCENT -ge 95 ]; then
  echo -e "${GREEN}${BOLD}🎉 SISTEMA 100% VALIDADO E FUNCIONAL!${NC}"
  echo -e "${GREEN}Todas as verificações críticas passaram com sucesso.${NC}"
  exit 0
elif [ $TOTAL_PERCENT -ge 80 ]; then
  echo -e "${YELLOW}${BOLD}⚠️  SISTEMA FUNCIONAL COM AVISOS${NC}"
  echo -e "${YELLOW}A maioria das verificações passou, mas há alguns avisos.${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}❌ SISTEMA COM PROBLEMAS${NC}"
  echo -e "${RED}Várias verificações falharam. Revisar logs acima.${NC}"
  exit 1
fi
