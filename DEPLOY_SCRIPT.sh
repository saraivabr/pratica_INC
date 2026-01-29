#!/bin/bash

# ============================================
# SCRIPT DE DEPLOYMENT - Integração Sofia + CRM + Salva-Leads
# ============================================

set -e

echo "🚀 INICIANDO DEPLOYMENT"
echo "========================"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# PASSO 1: Verificar se está no diretório correto
echo -e "${YELLOW}PASSO 1: Verificando diretório...${NC}"
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Erro: package.json não encontrado${NC}"
  echo "Execute este script da raiz do projeto appnovo_pratica"
  exit 1
fi
echo -e "${GREEN}✅ Diretório correto${NC}\n"

# PASSO 2: Limpar node_modules e reinstalar
echo -e "${YELLOW}PASSO 2: Limpando cache...${NC}"
rm -rf .next
rm -rf out
echo -e "${GREEN}✅ Cache limpo${NC}\n"

# PASSO 3: Build
echo -e "${YELLOW}PASSO 3: Executando build...${NC}"
npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Build executado com sucesso!${NC}"
else
  echo -e "${RED}❌ Erro no build${NC}"
  exit 1
fi
echo ""

# PASSO 4: Executar migrations do banco (se aplicável)
echo -e "${YELLOW}PASSO 4: Verificando migrations...${NC}"
if [ -f "lib/migrations/salva-leads-schema.sql" ]; then
  echo "📄 Arquivo de migrations encontrado"
  echo "   ⚠️  IMPORTANTE: Execute o SQL em seu banco de dados ANTES do deploy:"
  echo "   📝 psql \$DATABASE_URL < lib/migrations/salva-leads-schema.sql"
  echo ""
else
  echo "⚠️  Arquivo de migrations não encontrado"
fi

# PASSO 5: Git commit
echo -e "${YELLOW}PASSO 5: Fazendo commit...${NC}"
git add -A

# Verificar se há mudanças para commitar
if git diff-index --quiet HEAD --; then
  echo "ℹ️  Nenhuma mudança para commitar"
else
  git commit -m "feat: integração completa sofia+crm+salva-leads

- ✅ Sofia Vendedor: detecção de intenção de compra
- ✅ CRM Corretor: endpoints de leads e agendamentos
- ✅ Salva-Leads: lead-scoring, crm-sync, follow-up-automation
- ✅ Database: schema para leads, interactions, visits, followups
- ✅ Endpoints: novo-lead, get-leads, agendar-visita"
  echo -e "${GREEN}✅ Commit realizado${NC}"
fi
echo ""

# PASSO 6: Deploy para Scalingo
echo -e "${YELLOW}PASSO 6: Fazendo push para Scalingo...${NC}"
echo "⏳ Aguardando... isso pode levar alguns minutos"
git push scalingo main

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Deploy enviado para Scalingo!${NC}"
  echo ""
  echo "📋 Próximos passos:"
  echo "1. Monitore o deployment em:"
  echo "   scalingo logs -e production"
  echo ""
  echo "2. Execute as migrations do banco (se necessário):"
  echo "   scalingo run psql \$DATABASE_URL < lib/migrations/salva-leads-schema.sql"
  echo ""
  echo "3. Teste em produção:"
  echo "   https://pratica.osc-fr1.scalingo.io/corretor"
  echo ""
else
  echo -e "${RED}❌ Erro ao fazer push${NC}"
  exit 1
fi

echo -e "${GREEN}========================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT CONCLUÍDO!${NC}"
echo -e "${GREEN}========================${NC}"
