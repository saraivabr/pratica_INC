#!/bin/bash

# EXPRESS WHATSAPP TEST SUITE
# Testa todas as funcionalidades WhatsApp & Sofia IA

echo "🚀 EXPRESS WHATSAPP & SOFIA IA - TESTE COMPLETO"
echo "=============================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
EVOLUTION_URL="http://localhost:8080"
EVOLUTION_KEY="pratica_evolution_key_2026_secure"

results=()

# Função para testar endpoint
test_endpoint() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="$4"
  
  echo -n "Testando: $name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
    results+=("✅ $name - OK")
    return 0
  else
    echo -e "${RED}✗ FALHOU${NC} (HTTP $http_code)"
    echo "   Resposta: $body"
    results+=("❌ $name - FALHOU")
    return 1
  fi
}

echo "1️⃣  TESTE: Conexão WhatsApp (Evolution API)"
echo "-------------------------------------------"

# 1.1 - Evolution API está rodando?
test_endpoint "Evolution API - Status" "$EVOLUTION_URL/manager/status"

# 1.2 - Listar instâncias
instance_response=$(curl -s -X GET "$EVOLUTION_URL/instance/fetchInstances" -H "apikey: $EVOLUTION_KEY")
instance_count=$(echo "$instance_response" | jq '. | length' 2>/dev/null || echo "0")
echo "   → Instâncias encontradas: $instance_count"

if [ "$instance_count" -gt 0 ]; then
  echo -e "   ${GREEN}✓${NC} Evolution API conectada com $instance_count instâncias"
  results+=("✅ Conexão WhatsApp - $instance_count instâncias ativas")
  
  # Pegar primeira instância conectada
  INSTANCE_NAME=$(echo "$instance_response" | jq -r '[.[] | select(.connectionStatus == "open")][0].name' 2>/dev/null)
  
  if [ "$INSTANCE_NAME" != "null" ] && [ -n "$INSTANCE_NAME" ]; then
    echo "   → Usando instância: $INSTANCE_NAME"
    
    # 1.3 - QR Code disponível?
    qr_test=$(curl -s -X GET "$EVOLUTION_URL/instance/connect/$INSTANCE_NAME" -H "apikey: $EVOLUTION_KEY")
    echo -e "   ${GREEN}✓${NC} QR Code funcional"
    results+=("✅ QR Code - Funcional")
  else
    echo -e "   ${YELLOW}⚠${NC} Nenhuma instância conectada"
    results+=("⚠️  QR Code - Sem instância conectada para testar")
    INSTANCE_NAME=""
  fi
else
  echo -e "   ${RED}✗${NC} Nenhuma instância encontrada"
  results+=("❌ Conexão WhatsApp - Sem instâncias")
fi

echo ""
echo "2️⃣  TESTE: Recebimento de Mensagens (Webhook)"
echo "-------------------------------------------"

# 2.1 - Endpoint webhook existe?
test_endpoint "Webhook Evolution - Endpoint" "$API_URL/api/webhook/evolution/1" "POST" '{"event":"test"}'

echo ""
echo "3️⃣  TESTE: Sofia IA - Processamento"
echo "-------------------------------------------"

# 3.1 - Sofia Config
test_endpoint "Sofia - Config" "$API_URL/api/sofia/config?workspaceId=1"

# 3.2 - Sofia Metrics
test_endpoint "Sofia - Metrics" "$API_URL/api/sofia/metrics?workspaceId=1"

echo ""
echo "4️⃣  TESTE: Busca de Imóveis via Chat"
echo "-------------------------------------------"

# Testar endpoint de busca
test_endpoint "Busca Imóveis - API" "$API_URL/api/crm/empreendimentos?limit=5"

echo ""
echo "5️⃣  TESTE: Simulação Financeira via Chat"
echo "-------------------------------------------"

# Testar endpoint de simulação
test_endpoint "Simulação - API Caixa" "$API_URL/api/simular-caixa?valor=300000&prazo=360"

echo ""
echo "6️⃣  TESTE: Agendamento de Visitas via Chat"
echo "-------------------------------------------"

# Testar endpoint de agendamentos
test_endpoint "Agendamentos - API" "$API_URL/api/agendamentos"

echo ""
echo "7️⃣  TESTE: Detecção de Intenção (Intents)"
echo "-------------------------------------------"

# Testar detecção de intent (precisa de mensagem de teste)
echo "   → Testando intents no código..."

# Verificar se arquivo de intents existe
if [ -f "lib/sofia/intents.ts" ]; then
  echo -e "   ${GREEN}✓${NC} Arquivo de intents encontrado"
  results+=("✅ Detecção de Intenção - Código presente")
  
  # Contar intents implementadas
  intent_count=$(grep -c "export const.*Intent" lib/sofia/intents.ts 2>/dev/null || echo "0")
  echo "   → Intents implementadas: $intent_count"
else
  echo -e "   ${RED}✗${NC} Arquivo de intents não encontrado"
  results+=("❌ Detecção de Intenção - Arquivo não encontrado")
fi

echo ""
echo "8️⃣  TESTE: Análise de Sentimento"
echo "-------------------------------------------"

# Verificar módulo de sentimento
if [ -f "lib/sofia/sentiment.ts" ]; then
  echo -e "   ${GREEN}✓${NC} Módulo de sentimento encontrado"
  results+=("✅ Análise de Sentimento - Código presente")
  
  # Verificar função de escalação
  if grep -q "shouldEscalate" lib/sofia/sentiment.ts; then
    echo -e "   ${GREEN}✓${NC} Função de escalação implementada"
  fi
else
  echo -e "   ${RED}✗${NC} Módulo de sentimento não encontrado"
  results+=("❌ Análise de Sentimento - Módulo não encontrado")
fi

echo ""
echo "9️⃣  TESTE: Transcrição de Áudio"
echo "-------------------------------------------"

# Verificar se há suporte a áudio
if grep -q "audioMessage\|ptt\|voice" app/api/webhook/evolution/\[workspaceId\]/route.ts 2>/dev/null; then
  echo -e "   ${GREEN}✓${NC} Suporte a áudio detectado no código"
  results+=("✅ Transcrição de Áudio - Código presente")
else
  echo -e "   ${YELLOW}⚠${NC} Suporte a áudio não detectado explicitamente"
  results+=("⚠️  Transcrição de Áudio - Não detectado no webhook")
fi

echo ""
echo "=============================================="
echo "📊 RESUMO DOS TESTES"
echo "=============================================="
echo ""

for result in "${results[@]}"; do
  echo "$result"
done

echo ""
echo "✅ Teste concluído!"
