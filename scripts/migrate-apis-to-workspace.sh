#!/bin/bash
#
# Script para migrar APIs de tenant_id para workspace_id
# User Workspace Architecture (v2)
#
# Execute: bash scripts/migrate-apis-to-workspace.sh
#

echo "🔄 Migrando APIs para User Workspace Architecture..."
echo ""

# Backup antes de modificar
BACKUP_DIR="backups/pre-workspace-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Criando backup em $BACKUP_DIR..."
cp -r app/api "$BACKUP_DIR/"
cp -r lib "$BACKUP_DIR/"
echo "✅ Backup criado"
echo ""

# Contador
CHANGED=0

echo "📝 Substituindo tenant_id → workspace_id em arquivos..."
echo ""

# Função para processar arquivo
process_file() {
  local file=$1
  local changes=0
  
  # Substituições
  if grep -q "tenantId" "$file" || grep -q "tenant_id" "$file" || grep -q "TenantContext" "$file"; then
    # TypeScript/JavaScript
    sed -i '' 's/tenantId/workspaceId/g' "$file"
    sed -i '' 's/tenant_id/workspace_id/g' "$file"
    sed -i '' 's/TenantContext/WorkspaceContext/g' "$file"
    sed -i '' 's/requireTenantContext/requireWorkspaceContext/g' "$file"
    sed -i '' 's/findUserTenant/findUserWorkspace/g' "$file"
    sed -i '' 's/ctx\.tenant/ctx\.workspace/g' "$file"
    sed -i '' 's/getTenant/getWorkspace/g' "$file"
    sed -i '' 's/updateTenant/updateWorkspace/g' "$file"
    
    echo "  ✅ $file"
    ((CHANGED++))
  fi
}

# Processar arquivos de API
find app/api -name "*.ts" -type f | while read file; do
  process_file "$file"
done

# Processar libs
find lib -name "*.ts" -type f | while read file; do
  process_file "$file"
done

echo ""
echo "✅ $CHANGED arquivos modificados"
echo ""

# Verificação pós-migração
echo "🔍 Verificando se ainda existem referências a tenant..."
echo ""

REMAINING=$(grep -r "tenantId\|tenant_id" app/api lib --include="*.ts" 2>/dev/null | grep -v "// " | grep -v "workspace_id" | wc -l | tr -d ' ')

if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️  Ainda existem $REMAINING referências a 'tenant' que podem precisar de atenção manual:"
  echo ""
  grep -rn "tenantId\|tenant_id" app/api lib --include="*.ts" 2>/dev/null | grep -v "// " | grep -v "workspace_id" | head -20
else
  echo "✅ Nenhuma referência a 'tenant' encontrada (exceto comentários e workspace_id)"
fi

echo ""
echo "📋 Próximos passos:"
echo "  1. Revisar mudanças: git diff"
echo "  2. Testar localmente"
echo "  3. Aplicar migração SQL: migrations/022_user_workspace_architecture.sql"
echo "  4. Atualizar webhooks: tsx scripts/update-webhook-urls.ts"
echo "  5. Deploy"
echo ""
echo "💾 Backup salvo em: $BACKUP_DIR"
