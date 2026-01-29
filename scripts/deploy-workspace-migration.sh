#!/bin/bash
#
# 🚀 Deploy User Workspace Architecture - One-Click
#
# Este script executa TODA a migração de uma vez:
# 1. Migração SQL
# 2. Atualização de código
# 3. Atualização de webhooks
# 4. Commit e push
#
# Execute: bash scripts/deploy-workspace-migration.sh
#

set -e  # Exit on error

echo "🚀 Deploy User Workspace Architecture"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de confirmação
confirm() {
  read -p "$1 (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operação cancelada"
    exit 1
  fi
}

echo "⚠️  ATENÇÃO: Esta operação vai:"
echo "  • Modificar o banco de dados (adicionar workspace_id)"
echo "  • Migrar dados existentes"
echo "  • Atualizar código automaticamente"
echo "  • Fazer commit e push"
echo ""
confirm "Deseja continuar?"

echo ""
echo "📦 Criando backup do código..."
BACKUP_DIR="backups/full-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r app "$BACKUP_DIR/"
cp -r lib "$BACKUP_DIR/"
cp -r migrations "$BACKUP_DIR/"
echo "✅ Backup criado em: $BACKUP_DIR"

echo ""
echo "🗃️  Fase 1: Aplicando migração SQL..."
echo "======================================"
if cat migrations/022_user_workspace_architecture.sql | \
   scalingo -a pratica --region osc-fr1 pgsql-console; then
  echo -e "${GREEN}✅ Migração SQL aplicada com sucesso${NC}"
else
  echo -e "${RED}❌ Erro na migração SQL!${NC}"
  echo "Verifique os logs acima."
  echo "Backup do código em: $BACKUP_DIR"
  exit 1
fi

echo ""
echo "⏳ Aguardando 5 segundos para garantir que migração foi commitada..."
sleep 5

echo ""
echo "💻 Fase 2: Atualizando código..."
echo "======================================"
if bash scripts/migrate-apis-to-workspace.sh; then
  echo -e "${GREEN}✅ Código atualizado${NC}"
else
  echo -e "${RED}❌ Erro ao atualizar código!${NC}"
  exit 1
fi

echo ""
echo "🔗 Fase 3: Atualizando webhooks Evolution..."
echo "======================================"
if pnpm install --silent && tsx scripts/update-webhook-urls.ts; then
  echo -e "${GREEN}✅ Webhooks atualizados${NC}"
else
  echo -e "${YELLOW}⚠️  Aviso: Não foi possível atualizar webhooks automaticamente${NC}"
  echo "Execute manualmente depois: tsx scripts/update-webhook-urls.ts"
fi

echo ""
echo "📊 Fase 4: Validando migração..."
echo "======================================"

# Validar workspaces
WORKSPACES=$(echo "SELECT COUNT(*) FROM workspaces;" | \
  scalingo -a pratica --region osc-fr1 pgsql-console 2>/dev/null | \
  grep -oE '[0-9]+' | head -1 || echo "0")

echo "Workspaces criados: $WORKSPACES"

# Validar users
USERS_WITH_WORKSPACE=$(echo "SELECT COUNT(*) FROM users WHERE workspace_id IS NOT NULL;" | \
  scalingo -a pratica --region osc-fr1 pgsql-console 2>/dev/null | \
  grep -oE '[0-9]+' | head -1 || echo "0")

echo "Usuários com workspace_id: $USERS_WITH_WORKSPACE"

if [ "$WORKSPACES" -gt 0 ] && [ "$USERS_WITH_WORKSPACE" -gt 0 ]; then
  echo -e "${GREEN}✅ Validação OK${NC}"
else
  echo -e "${YELLOW}⚠️  Validação incompleta - verifique manualmente${NC}"
fi

echo ""
echo "📝 Fase 5: Commit e Push..."
echo "======================================"

# Ver o que mudou
echo "Arquivos modificados:"
git status --short

echo ""
confirm "Fazer commit e push?"

git add .

COMMIT_MSG="feat: implement User Workspace Architecture

- Replace tenant_id with workspace_id across all tables
- Each user has isolated workspace (1 user = 1 workspace)
- Better data isolation and security
- Auto-create workspace for new users via trigger
- Migrate existing data from tenant to workspace
- Update all API routes to use workspace_id
- Update Evolution webhook URLs to workspace-based
- Add backward compatibility aliases

Migration: 022_user_workspace_architecture.sql
Changes: ~${WORKSPACES} workspaces created, ${USERS_WITH_WORKSPACE} users migrated

Breaking Changes:
- APIs now expect workspace_id instead of tenant_id
- Webhook URLs changed: /evolution/{tenantId} → /evolution/{workspaceId}
- Session cookies now include workspaceId

Co-authored-by: Claude (Moltbot) <noreply@anthropic.com>
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Pushing to origin main..."
if git push origin main; then
  echo -e "${GREEN}✅ Push realizado com sucesso${NC}"
else
  echo -e "${RED}❌ Erro no push!${NC}"
  echo "Commit local foi feito. Tente push manualmente: git push origin main"
  exit 1
fi

echo ""
echo "🎉 MIGRAÇÃO COMPLETA!"
echo "======================================"
echo ""
echo "✅ Próximos passos:"
echo "  1. Aguardar deploy automático no Scalingo"
echo "  2. Monitorar logs: scalingo -a pratica --region osc-fr1 logs -f"
echo "  3. Testar login em: https://app.pratica.com/login"
echo "  4. Validar isolamento de dados"
echo ""
echo "📚 Documentação:"
echo "  • DEPLOY_USER_WORKSPACE.md - Guia completo"
echo "  • ARQUITETURA_USER_WORKSPACE.md - Arquitetura técnica"
echo "  • RESUMO_WORKSPACE_MIGRATION.md - Resumo executivo"
echo ""
echo "💾 Backup salvo em: $BACKUP_DIR"
echo ""
echo -e "${GREEN}🚀 Sistema migrando para User Workspace Architecture!${NC}"
