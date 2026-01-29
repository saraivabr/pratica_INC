#!/bin/bash

echo "🧪 TESTE COMPLETO - SOFIA & WHATSAPP"
echo "===================================="
echo ""

BASE_URL="${1:-http://localhost:3000}"

echo "📍 Testando em: $BASE_URL"
echo ""

# 1. Testar webhook GET
echo "1️⃣ Testando GET /api/webhook/zapi..."
curl -s "$BASE_URL/api/webhook/zapi" | jq '.'
echo ""

# 2. Testar webhook POST (simulando mensagem)
echo "2️⃣ Testando POST /api/webhook/zapi (mensagem simulada)..."
curl -s -X POST "$BASE_URL/api/webhook/zapi" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "phone": "5511999999999",
      "body": "Oi Sofia, preciso de ajuda",
      "fromMe": false,
      "messageId": "test-'$(date +%s)'",
      "type": "text",
      "momment": '$(date +%s)'000'
    },
    "type": "ReceivedCallback"
  }' | jq '.'
echo ""

# 3. Verificar conversation locks
echo "3️⃣ Verificando conversation locks no banco..."
echo "SELECT phone, locked_until, locked_until > NOW() as is_locked FROM conversation_locks ORDER BY locked_until DESC LIMIT 5;" | psql $DATABASE_URL 2>/dev/null || echo "❌ DATABASE_URL não configurada"
echo ""

# 4. Verificar últimas mensagens recebidas
echo "4️⃣ Últimas mensagens inbound..."
echo "SELECT message_id, phone, received_at FROM inbound_messages ORDER BY received_at DESC LIMIT 5;" | psql $DATABASE_URL 2>/dev/null || echo "❌ DATABASE_URL não configurada"
echo ""

# 5. Testar envio de mensagem diretamente
echo "5️⃣ Testando envio direto via Z-API..."
if [ ! -z "$ZAPI_INSTANCE_ID" ] && [ ! -z "$ZAPI_TOKEN" ] && [ ! -z "$ZAPI_CLIENT_TOKEN" ]; then
  curl -s -X POST "https://api.z-api.io/instances/$ZAPI_INSTANCE_ID/token/$ZAPI_TOKEN/send-text" \
    -H "Content-Type: application/json" \
    -H "Client-Token: $ZAPI_CLIENT_TOKEN" \
    -d '{
      "phone": "5511999999999",
      "message": "Teste automático via script"
    }' | jq '.'
else
  echo "⚠️ Variáveis Z-API não configuradas"
fi
echo ""

# 6. Verificar status Z-API
echo "6️⃣ Status da instância Z-API..."
if [ ! -z "$ZAPI_INSTANCE_ID" ] && [ ! -z "$ZAPI_TOKEN" ] && [ ! -z "$ZAPI_CLIENT_TOKEN" ]; then
  curl -s "https://api.z-api.io/instances/$ZAPI_INSTANCE_ID/token/$ZAPI_TOKEN/status" \
    -H "Client-Token: $ZAPI_CLIENT_TOKEN" | jq '.'
else
  echo "⚠️ Variáveis Z-API não configuradas"
fi
echo ""

echo "===================================="
echo "✅ Testes concluídos!"
echo ""
echo "📋 CHECKLIST:"
echo "- [ ] Webhook responde HTTP 200"
echo "- [ ] Mensagem processada sem erros"
echo "- [ ] Conversation locks não travados"
echo "- [ ] Z-API conectado e funcionando"
echo ""
echo "💡 PRÓXIMOS PASSOS:"
echo "1. Configurar webhook no Z-API: https://api.z-api.io/"
echo "2. URL do webhook: $BASE_URL/api/webhook/zapi"
echo "3. Enviar mensagem de teste real para o número conectado"
echo "4. Verificar logs: scalingo logs -f | grep sofia"
