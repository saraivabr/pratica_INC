#!/bin/bash

echo "🔧 REMOVENDO AUTENTICAÇÃO E CORRIGINDO TIPOS"
echo "============================================="

# Lista de arquivos para corrigir
files=(
  "app/api/notificacoes/route.ts"
  "app/api/notificacoes/[id]/route.ts"
  "app/api/notificacoes/unread-count/route.ts"
  "app/api/acoes/simulacao/route.ts"
  "app/api/acoes/agendar-visita/route.ts"
  "app/api/acoes/gerar-post/route.ts"
  "app/api/analytics/conversao/route.ts"
  "app/api/analytics/vendas/route.ts"
  "app/api/analytics/tempo-medio/route.ts"
  "app/api/analytics/top-imoveis/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processando: $file"
    
    # Remover import auth-middleware
    sed -i '' '/import.*auth-middleware/d' "$file"
    
    # Remover chamadas requireUser - VERSÃO 1: const user = await
    sed -i '' '/const user = await requireUser/d' "$file"
    
    # Remover verificação if (!user) - PRÓXIMAS 2 LINHAS
    sed -i '' '/if (!user) {/{N;d;}' "$file"
    
    # Comentar user.id - substituir por 'default-user'
    sed -i '' "s/user\.id/'default-user'/g" "$file"
  fi
done

echo ""
echo "✅ Correções aplicadas!"
