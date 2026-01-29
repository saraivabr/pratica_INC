#!/bin/bash
# validate-security.sh - Validar implementações de segurança

set -e

echo "🔒 Validando Implementações de Segurança - Pratica CRM"
echo "=========================================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
  echo -e "${RED}❌ $1${NC}"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

section() {
  echo ""
  echo "=== $1 ==="
  echo ""
}

# ============================================================================
# 1. Environment Variables
# ============================================================================
section "1. Environment Variables"

check_env_var() {
  VAR_NAME=$1
  if grep -q "^${VAR_NAME}=" .env.local 2>/dev/null; then
    success "$VAR_NAME configurado"
  else
    error "$VAR_NAME não encontrado em .env.local"
  fi
}

if [ ! -f .env.local ]; then
  error ".env.local não existe!"
else
  check_env_var "EVOLUTION_WEBHOOK_SECRET"
  check_env_var "JWT_SECRET"
  check_env_var "NEXTAUTH_SECRET"
  check_env_var "DATABASE_URL"
  check_env_var "SUPABASE_DB_URL"
  check_env_var "NEXT_PUBLIC_SUPABASE_URL"
  check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  check_env_var "NODE_ENV"
fi

# ============================================================================
# 2. Security Libraries
# ============================================================================
section "2. Security Libraries"

check_file() {
  FILE=$1
  DESC=$2
  if [ -f "$FILE" ]; then
    success "$DESC implementado: $FILE"
  else
    error "$DESC não encontrado: $FILE"
  fi
}

check_file "lib/security/rate-limiter.ts" "Rate Limiter"
check_file "lib/security/validation.ts" "Input Validation"
check_file "lib/security/secure-route.ts" "Secure Route Wrapper"
check_file "lib/security/headers.ts" "Security Headers"
check_file "lib/security/index.ts" "Security Module Index"

# ============================================================================
# 3. Monitoring
# ============================================================================
section "3. Monitoring & Logging"

check_file "lib/monitoring/logger.ts" "Structured Logger"
check_file "lib/monitoring/index.ts" "Monitoring Module Index"
check_file "app/api/health/detailed/route.ts" "Health Check Endpoint"

# ============================================================================
# 4. PM2 Configuration
# ============================================================================
section "4. PM2 Configuration"

if [ -f ecosystem.config.js ]; then
  success "ecosystem.config.js existe"
  
  # Verificar se tem configurações críticas
  if grep -q "instances.*max" ecosystem.config.js; then
    success "Cluster mode configurado (instances: max)"
  else
    warn "Cluster mode não está usando 'max' instances"
  fi
  
  if grep -q "max_memory_restart" ecosystem.config.js; then
    success "Memory limit configurado"
  else
    warn "Memory limit não configurado"
  fi
  
  if grep -q "error_file.*log" ecosystem.config.js; then
    success "Log files configurados"
  else
    warn "Log files não configurados"
  fi
else
  error "ecosystem.config.js não encontrado"
fi

# ============================================================================
# 5. Database RLS
# ============================================================================
section "5. Row Level Security (RLS)"

if [ -f FIX_RLS_WORKSPACE_ONLY.sql ]; then
  success "Script RLS existe"
  
  # Verificar se foi aplicado (checar COMMIT)
  if grep -q "^COMMIT;" FIX_RLS_WORKSPACE_ONLY.sql; then
    success "Script RLS configurado para COMMIT"
  else
    warn "Script RLS ainda em modo ROLLBACK"
  fi
else
  error "Script RLS não encontrado"
fi

# Tentar validar no banco (se psql disponível)
if command -v psql &> /dev/null; then
  if [ -f .env.local ]; then
    # Extrair credenciais
    DB_URL=$(grep "^SUPABASE_DB_URL=" .env.local | cut -d= -f2- | tr -d '"')
    
    if [ -n "$DB_URL" ]; then
      echo "  Verificando RLS no banco..."
      
      # Extrair componentes da URL
      DB_PASSWORD=$(echo "$DB_URL" | grep -oP '://postgres:\K[^@]+')
      DB_HOST=$(echo "$DB_URL" | grep -oP '@\K[^:]+')
      
      if [ -n "$DB_PASSWORD" ] && [ -n "$DB_HOST" ]; then
        RLS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U postgres -d postgres -tAc "
          SELECT COUNT(*)
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename IN ('agent_configs', 'automacoes_followup', 'lembretes', 'notificacoes')
            AND rowsecurity = true;
        " 2>/dev/null || echo "0")
        
        if [ "$RLS_COUNT" = "4" ]; then
          success "RLS ativo em todas 4 tabelas (agent_configs, automacoes_followup, lembretes, notificacoes)"
        else
          warn "RLS ativo em apenas $RLS_COUNT de 4 tabelas"
        fi
      else
        warn "Não foi possível extrair credenciais do DATABASE_URL"
      fi
    else
      warn "DATABASE_URL não encontrado"
    fi
  fi
else
  warn "psql não disponível - pulando validação de RLS no banco"
fi

# ============================================================================
# 6. Build & Dependencies
# ============================================================================
section "6. Build & Dependencies"

if [ -f package.json ]; then
  success "package.json existe"
  
  # Verificar se Zod está instalado (necessário para validation)
  if grep -q '"zod"' package.json; then
    success "Zod instalado (necessário para validação)"
  else
    error "Zod não encontrado em dependencies"
  fi
else
  error "package.json não encontrado"
fi

if [ -d node_modules ]; then
  success "node_modules existe"
else
  warn "node_modules não existe - rodar 'pnpm install'"
fi

if [ -d .next ]; then
  success "Build Next.js existe (.next/)"
else
  warn "Build Next.js não existe - rodar 'pnpm run build'"
fi

# ============================================================================
# 7. Logs Directory
# ============================================================================
section "7. Logs & Monitoring"

if [ -d /var/log/pratica ]; then
  success "Diretório de logs existe: /var/log/pratica"
  
  # Verificar permissões
  if [ -w /var/log/pratica ]; then
    success "Permissão de escrita em /var/log/pratica"
  else
    error "Sem permissão de escrita em /var/log/pratica"
  fi
else
  warn "Diretório /var/log/pratica não existe - criar: mkdir -p /var/log/pratica"
fi

# ============================================================================
# 8. Documentation
# ============================================================================
section "8. Documentação"

check_file "SECURITY_INDEX.md" "Índice de Segurança"
check_file "README.md" "README principal"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=========================================================="
echo "RESUMO"
echo "=========================================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ PERFEITO! Todas as verificações passaram.${NC}"
  echo ""
  echo "Sistema pronto para produção!"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  OK com warnings: $WARNINGS warning(s)${NC}"
  echo ""
  echo "Sistema funcional mas requer atenção."
  exit 0
else
  echo -e "${RED}❌ FALHOU: $ERRORS erro(s), $WARNINGS warning(s)${NC}"
  echo ""
  echo "Corrigir erros antes de deploy em produção!"
  exit 1
fi
