#!/bin/bash
# Test WhatsApp Features: Busca de Imóveis + Agendamento

BASE_URL="http://localhost:3000"
WORKSPACE_ID=1

echo "=========================================="
echo "TESTE: WhatsApp & Sofia IA Features"
echo "=========================================="
echo ""

# Get workspace token for auth
echo "1. Getting workspace authentication..."
WORKSPACE_TOKEN=$(psql $DATABASE_URL -t -c "SELECT auth_token FROM workspaces WHERE id = $WORKSPACE_ID LIMIT 1" | xargs)

if [ -z "$WORKSPACE_TOKEN" ]; then
    echo "❌ Workspace token não encontrado! Gerando..."
    WORKSPACE_TOKEN=$(openssl rand -hex 32)
    psql $DATABASE_URL -c "UPDATE workspaces SET auth_token = '$WORKSPACE_TOKEN' WHERE id = $WORKSPACE_ID"
fi

echo "✅ Token: ${WORKSPACE_TOKEN:0:20}..."
echo ""

# Test 1: Sofia Config
echo "2. Testing Sofia Config..."
SOFIA_CONFIG=$(curl -s -X GET \
  -H "Authorization: Bearer $WORKSPACE_TOKEN" \
  "$BASE_URL/api/sofia/config?workspaceId=$WORKSPACE_ID")

echo "$SOFIA_CONFIG" | jq '.'
echo ""

# Test 2: Search Empreendimentos (via CV CRM)
echo "3. Testing Busca de Imóveis (CV CRM)..."
IMOVEIS=$(curl -s -X GET \
  -H "Authorization: Bearer $WORKSPACE_TOKEN" \
  "$BASE_URL/api/empreendimentos?limit=3")

echo "$IMOVEIS" | jq '.data[0] // .'
echo ""

# Test 3: Simular Financiamento
echo "4. Testing Simulação Financeira..."
SIMULACAO=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKSPACE_TOKEN" \
  "$BASE_URL/api/simular" \
  -d '{
    "valorImovel": 300000,
    "percentualEntrada": 20,
    "prazoMeses": 360,
    "taxaAnual": 10.5
  }')

echo "$SIMULACAO" | jq '.'
echo ""

# Test 4: Create Lead (for scheduling test)
echo "5. Creating test lead..."
TEST_PHONE="+5511999998888"
LEAD=$(psql $DATABASE_URL -t -c "
  INSERT INTO users (workspace_id, telefone, nome, email, tipo, created_at)
  VALUES ($WORKSPACE_ID, '$TEST_PHONE', 'Lead Teste Agendamento', 'teste@example.com', 'lead', NOW())
  ON CONFLICT (workspace_id, telefone) DO UPDATE SET nome = EXCLUDED.nome
  RETURNING id
" | xargs)

echo "✅ Lead ID: $LEAD"
echo ""

# Test 5: Agendar Visita
echo "6. Testing Agendamento de Visita..."
TOMORROW=$(date -d "tomorrow 15:00" +"%Y-%m-%dT%H:%M:%S")
AGENDAMENTO=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKSPACE_TOKEN" \
  "$BASE_URL/api/agendamentos" \
  -d "{
    \"lead_id\": $LEAD,
    \"lead_nome\": \"Lead Teste Agendamento\",
    \"data_hora\": \"$TOMORROW\",
    \"tipo\": \"visita\",
    \"observacoes\": \"Teste automatizado - visita ao Residencial Aurora\"
  }")

echo "$AGENDAMENTO" | jq '.'
echo ""

# Test 6: List Agendamentos
echo "7. Listing Agendamentos..."
LISTA=$(curl -s -X GET \
  -H "Authorization: Bearer $WORKSPACE_TOKEN" \
  "$BASE_URL/api/agendamentos?limit=5")

echo "$LISTA" | jq '.'
echo ""

# Test 7: WhatsApp Instances Status
echo "8. Checking WhatsApp Instances..."
INSTANCES=$(curl -s -H "apikey: pratica_evolution_key_2026_secure" \
  http://localhost:8080/instance/fetchInstances | jq '[.[] | {name, status: .connectionStatus, number}]')

echo "$INSTANCES"
echo ""

echo "=========================================="
echo "✅ TESTES CONCLUÍDOS"
echo "=========================================="
