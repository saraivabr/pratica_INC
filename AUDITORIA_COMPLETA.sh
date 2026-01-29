#!/bin/bash
echo "🔍 AUDITORIA COMPLETA - AppNovo Pratica"
echo "========================================"
echo ""

# 1. Verificar variáveis de ambiente críticas
echo "1️⃣ VARIÁVEIS DE AMBIENTE"
echo "------------------------"
if [ -f .env.local ]; then
  echo "✅ .env.local existe"
  echo "   ZAPI_INSTANCE_ID: $(grep ZAPI_INSTANCE_ID .env.local | cut -d'=' -f2 | head -c 20)..."
  echo "   DATABASE_URL: $(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2 | head -c 30)..."
  echo "   CVCRM_BASE_URL: $(grep CVCRM_BASE_URL .env.local | cut -d'=' -f2)"
else
  echo "❌ .env.local NÃO encontrado"
fi
echo ""

# 2. Verificar dependências
echo "2️⃣ DEPENDÊNCIAS"
echo "---------------"
if [ -d node_modules ]; then
  echo "✅ node_modules instalado"
  echo "   Pacotes: $(ls node_modules | wc -l | tr -d ' ') pacotes"
else
  echo "❌ node_modules não encontrado - rodar: npm install"
fi
echo ""

# 3. Verificar estrutura de arquivos críticos
echo "3️⃣ ARQUIVOS CRÍTICOS"
echo "--------------------"
FILES=(
  "lib/zapi.ts"
  "lib/db.ts"
  "lib/supabase.ts"
  "app/api/auth/send-otp/route.ts"
  "app/api/auth/verify-otp/route.ts"
  "app/api/webhook/zapi/route.ts"
  "lib/sofia/flows.ts"
  "lib/sofia/vendedor-imovel.ts"
  "lib/salva-leads/lead-scoring.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - FALTANDO!"
  fi
done
echo ""

# 4. Verificar APIs existentes
echo "4️⃣ APIS IMPLEMENTADAS"
echo "---------------------"
find app/api -name "route.ts" | wc -l | xargs echo "Total de endpoints:"
echo ""
echo "Principais endpoints:"
ls -1 app/api/auth/ 2>/dev/null | head -8
echo ""

# 5. Verificar migrations
echo "5️⃣ MIGRATIONS"
echo "-------------"
if [ -d lib/migrations ]; then
  echo "✅ Pasta migrations existe"
  ls -1 lib/migrations/ 2>/dev/null
else
  echo "⚠️  Pasta migrations não encontrada"
fi
echo ""

# 6. Verificar last build
echo "6️⃣ BUILD STATUS"
echo "---------------"
if [ -d .next ]; then
  echo "✅ .next existe (build anterior)"
  echo "   Última modificação: $(stat -f "%Sm" .next)"
else
  echo "⚠️  Nenhum build anterior encontrado"
fi
echo ""

# 7. Verificar Git status
echo "7️⃣ GIT STATUS"
echo "-------------"
echo "Branch atual: $(git branch --show-current)"
echo "Último commit: $(git log -1 --oneline)"
echo "Arquivos modificados: $(git status --short | wc -l | tr -d ' ')"
echo ""

echo "========================================"
echo "✅ Auditoria concluída!"
echo ""
